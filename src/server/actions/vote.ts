"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/db";
import {
  clientAddressKey,
  enforceRateLimit,
  hashRequestValue,
  rateLimitMessage,
} from "@/lib/rate-limit";
import {
  createSaspayCheckoutSession,
  isSaspayConfigured,
  SaspayError,
} from "@/lib/saspay";
import { requireUser } from "@/lib/session";
import { createVoteSchema } from "@/lib/validations/vote";

export type VoteActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  paymentId?: string;
  reference?: string;
  checkoutUrl?: string;
  amount?: number;
  quantity?: number;
};

export const initialVoteState: VoteActionState = { ok: false };

export async function createVoteAction(
  _prev: VoteActionState,
  formData: FormData,
): Promise<VoteActionState> {
  const user = await requireUser();

  const parsed = createVoteSchema.safeParse({
    candidateSlug: formData.get("candidateSlug"),
    quantity: formData.get("quantity"),
    provider: formData.get("provider") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Veuillez corriger les informations du vote.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const requestHeaders = await headers();
  const ip = clientAddressKey(requestHeaders);
  const userLimit = await enforceRateLimit(`vote:user:${user.id}`, 10, 60);
  if (!userLimit.ok) {
    return { ok: false, message: rateLimitMessage(userLimit.retryAfterSeconds) };
  }
  const ipLimit = await enforceRateLimit(`vote:ip:${ip}`, 30, 60 * 60);
  if (!ipLimit.ok) {
    return { ok: false, message: rateLimitMessage(ipLimit.retryAfterSeconds) };
  }

  const ipHash = hashRequestValue(ip);
  const deviceHash = hashRequestValue(requestHeaders.get("user-agent"));

  const candidate = await prisma.candidate.findUnique({
    where: { slug: data.candidateSlug },
    include: {
      contest: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          votingOpenAt: true,
          votingCloseAt: true,
          voteUnitPrice: true,
        },
      },
    },
  });

  if (!candidate || candidate.status !== "APPROVED") {
    return { ok: false, message: "Ce candidat n'est pas éligible au vote." };
  }

  const now = new Date();
  if (!["PUBLISHED", "REGISTRATION_CLOSED"].includes(candidate.contest.status)) {
    return { ok: false, message: "Les votes ne sont pas ouverts pour ce concours." };
  }
  if (now < candidate.contest.votingOpenAt || now > candidate.contest.votingCloseAt) {
    return { ok: false, message: "La période de vote est fermée pour ce concours." };
  }

  if (candidate.ownerId === user.id) {
    return { ok: false, message: "Vous ne pouvez pas voter pour votre propre candidature." };
  }

  const duplicateVote = await prisma.payment.findFirst({
    where: {
      purpose: "VOTE",
      candidateId: candidate.id,
      status: "SUCCESS",
      metadata: {
        path: ["votedByUserId"],
        equals: user.id,
      },
    },
    select: { id: true },
  });

  if (duplicateVote) {
    return {
      ok: false,
      message: "Vous avez déjà validé un vote pour ce candidat pour ce concours.",
    };
  }

  const amount = data.quantity * candidate.contest.voteUnitPrice;
  const existingOrder = await prisma.payment.findFirst({
    where: {
      purpose: "VOTE",
      candidateId: candidate.id,
      status: { in: ["PENDING", "AWAITING_CONFIRMATION"] },
      metadata: { path: ["votedByUserId"], equals: user.id },
    },
    include: { voteOrder: true },
  });

  if (existingOrder?.voteOrder) {
    return {
      ok: true,
      message: "Vous avez déjà une commande de vote en attente.",
      paymentId: existingOrder.id,
      reference: existingOrder.reference,
      checkoutUrl:
        existingOrder.metadata && typeof existingOrder.metadata === "object" &&
        !Array.isArray(existingOrder.metadata) && typeof existingOrder.metadata.checkoutUrl === "string"
          ? existingOrder.metadata.checkoutUrl
          : undefined,
      amount: existingOrder.amount,
      quantity: existingOrder.voteOrder.quantity,
    };
  }

  const reference = `VOTE-${new Date().getFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`;
  const provider =
    data.provider === "SASPAY" && isSaspayConfigured() ? "SASPAY" : "MANUAL";
  let checkoutSession: { id: string; checkoutUrl: string } | null = null;

  if (provider === "SASPAY") {
    try {
      checkoutSession = await createSaspayCheckoutSession({
        amount,
        candidateId: candidate.id,
        customerEmail: user.email ?? "",
        customerName: user.name ?? "Voteur",
        customerPhone: user.phone ?? "",
        paymentReference: reference,
        purpose: "VOTE",
        returnUrl: new URL(
          `/candidats/${candidate.slug}/voter`,
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        ).toString(),
      });
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof SaspayError
            ? error.message
            : "Impossible de créer le paiement SasPay.",
      };
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`vote:${user.id}:${candidate.id}`}))`;

    const alreadyVoted = await tx.payment.findFirst({
      where: {
        purpose: "VOTE",
        candidateId: candidate.id,
        status: "SUCCESS",
        metadata: { path: ["votedByUserId"], equals: user.id },
      },
      select: { id: true },
    });
    if (alreadyVoted) return { kind: "duplicate" as const };

    const pendingOrder = await tx.payment.findFirst({
      where: {
        purpose: "VOTE",
        candidateId: candidate.id,
        status: { in: ["PENDING", "AWAITING_CONFIRMATION"] },
        metadata: { path: ["votedByUserId"], equals: user.id },
      },
      include: { voteOrder: true },
    });
    if (pendingOrder?.voteOrder) return { kind: "existing" as const, payment: pendingOrder };

    const createdPayment = await tx.payment.create({
      data: {
        reference,
        provider,
        providerTransactionId: checkoutSession?.id ?? null,
        purpose: "VOTE",
        status: "PENDING",
        amount,
        currency: "XOF",
        payerName: user.name ?? "Voteur",
        payerPhone: user.phone ?? "",
        payerEmail: user.email ?? null,
        candidateId: candidate.id,
        metadata: {
          provider,
          checkoutUrl: checkoutSession?.checkoutUrl ?? null,
          votedByUserId: user.id,
          quantity: data.quantity,
        },
      },
      select: { id: true, reference: true },
    });
    await tx.voteOrder.create({
      data: {
        candidateId: candidate.id,
        paymentId: createdPayment.id,
        quantity: data.quantity,
        unitPrice: candidate.contest.voteUnitPrice,
        amount,
        status: "AWAITING_PAYMENT",
        ipHash,
        deviceHash,
      },
    });
    return { kind: "created" as const, payment: createdPayment };
  });

  if (result.kind === "duplicate") {
    return {
      ok: false,
      message: "Vous avez déjà validé un vote pour ce candidat pour ce concours.",
    };
  }

  if (result.kind === "existing") {
    const metadata = result.payment.metadata;
    return {
      ok: true,
      message: "Vous avez déjà une commande de vote en attente.",
      paymentId: result.payment.id,
      reference: result.payment.reference,
      checkoutUrl:
        metadata && typeof metadata === "object" && !Array.isArray(metadata) &&
        typeof metadata.checkoutUrl === "string"
          ? metadata.checkoutUrl
          : undefined,
      amount: result.payment.amount,
      quantity: result.payment.voteOrder?.quantity ?? data.quantity,
    };
  }

  return {
    ok: true,
    message:
      provider === "SASPAY"
        ? "Commande créée. Vous allez être redirigé vers SasPay pour régler le montant."
        : "Commande créée. Envoyez votre preuve de paiement pour vérification.",
    paymentId: result.payment.id,
    reference: result.payment.reference,
    checkoutUrl: checkoutSession?.checkoutUrl,
    amount,
    quantity: data.quantity,
  };
}
