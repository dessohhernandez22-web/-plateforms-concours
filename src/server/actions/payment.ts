"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { notifyUserByEmail } from "@/lib/notifications";
import { enforceRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { requireAdmin, requireUser } from "@/lib/session";
import {
  createSaspayCheckoutSession,
  isSaspayConfigured,
  SaspayError,
} from "@/lib/saspay";
import { finalizeVotePayment } from "@/lib/vote-settlement";
import {
  createRegistrationPaymentSchema,
  submitPaymentProofSchema,
  verifyPaymentSchema,
} from "@/lib/validations/payment";
import type { PaymentActionState } from "@/lib/validations/payment-state";

function generateReference(): string {
  const year = new Date().getFullYear();
  const rand = randomBytes(8).toString("hex").toUpperCase();
  return `SPP-${year}-${rand}`;
}

function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `RCPT-${year}-${rand}`;
}

export async function createRegistrationPaymentAction(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const user = await requireUser();
  const rateLimit = await enforceRateLimit(`payment:create:${user.id}`, 5, 10 * 60);
  if (!rateLimit.ok) {
    return { ok: false, message: rateLimitMessage(rateLimit.retryAfterSeconds) };
  }

  const parsed = createRegistrationPaymentSchema.safeParse({
    candidateId: formData.get("candidateId"),
    payerName: formData.get("payerName"),
    payerPhone: formData.get("payerPhone"),
    provider: formData.get("provider") || "MANUAL",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Veuillez corriger les erreurs du formulaire.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  if (data.provider === "SASPAY" && !isSaspayConfigured()) {
    return {
      ok: false,
      message: "Le paiement en ligne n'est pas configuré. Choisissez le paiement Mobile Money manuel.",
    };
  }

  const candidate = await prisma.candidate.findFirst({
    where: { id: data.candidateId, ownerId: user.id },
    include: { contest: true, registrationPayment: true },
  });

  if (!candidate) {
    return { ok: false, message: "Candidature introuvable." };
  }

  if (candidate.registrationPaymentId && candidate.registrationPayment?.status === "SUCCESS") {
    return { ok: false, message: "Les frais d'inscription ont déjà été payés." };
  }

  if (candidate.status === "APPROVED") {
    return { ok: false, message: "Cette candidature est déjà validée." };
  }

  if (candidate.status === "REJECTED" || candidate.status === "DISQUALIFIED") {
    return { ok: false, message: "Cette candidature n'est pas éligible au paiement." };
  }

  const existing = await prisma.payment.findFirst({
    where: {
      candidateId: candidate.id,
      purpose: "REGISTRATION",
      status: { in: ["PENDING", "AWAITING_CONFIRMATION"] },
    },
  });

  if (existing) {
    const checkoutUrl =
      existing.metadata &&
      typeof existing.metadata === "object" &&
      !Array.isArray(existing.metadata) &&
      typeof existing.metadata.checkoutUrl === "string"
        ? existing.metadata.checkoutUrl
        : undefined;
    return {
      ok: true,
      message: "Un paiement en cours existe déjà.",
      paymentId: existing.id,
      reference: existing.reference,
      checkoutUrl,
    };
  }

  const reference = generateReference();
  let checkoutUrl: string | undefined;
  let checkoutSessionId: string | undefined;
  if (data.provider !== "MANUAL") {
    try {
      const checkoutSession = await createSaspayCheckoutSession({
        amount: candidate.contest.registrationFee,
        candidateId: candidate.id,
        customerEmail: user.email ?? "",
        customerName: data.payerName,
        customerPhone: data.payerPhone,
        paymentReference: reference,
        purpose: "REGISTRATION",
        returnUrl: new URL(
          `/compte/candidatures/${candidate.id}/paiement`,
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        ).toString(),
      });
      checkoutUrl = checkoutSession.checkoutUrl;
      checkoutSessionId = checkoutSession.id;
    } catch (error) {
      return {
        ok: false,
        message: error instanceof SaspayError ? error.message : "Impossible de créer le paiement SasPay.",
      };
    }
  }

  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        reference,
        provider: data.provider === "MANUAL" ? "MANUAL" : "SASPAY",
        purpose: "REGISTRATION",
        status: "PENDING",
        amount: candidate.contest.registrationFee,
        currency: "XOF",
        payerName: data.payerName,
        payerPhone: data.payerPhone,
        payerEmail: user.email,
        candidateId: candidate.id,
        submittedAt: new Date(),
        metadata: {
          provider: data.provider === "MANUAL" ? "MANUAL" : "SASPAY",
          checkoutUrl,
          checkoutSessionId,
        },
      },
      select: { id: true, reference: true },
    });
    await tx.candidate.update({
      where: { id: candidate.id },
      data: { registrationPaymentId: createdPayment.id },
    });
    return createdPayment;
  });

  revalidatePath("/compte/candidatures");
  return {
    ok: true,
    message:
      data.provider === "MANUAL"
        ? "Paiement créé. Envoyez votre preuve de paiement pour vérification."
          : "Paiement créé. Vous allez être redirigé vers SasPay.",
    paymentId: payment.id,
    reference: payment.reference,
    checkoutUrl,
  };
}

export async function submitPaymentProofAction(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const user = await requireUser();
  const rateLimit = await enforceRateLimit(`payment:proof:${user.id}`, 10, 60 * 60);
  if (!rateLimit.ok) {
    return { ok: false, message: rateLimitMessage(rateLimit.retryAfterSeconds) };
  }

  const parsed = submitPaymentProofSchema.safeParse({
    paymentId: formData.get("paymentId"),
    declaredTransactionId: formData.get("declaredTransactionId") ?? "",
    proofMediaId: formData.get("proofMediaId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Veuillez corriger les erreurs du formulaire.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const payment = await prisma.payment.findUnique({
    where: { id: data.paymentId },
    include: { candidate: true },
  });

  if (!payment) {
    return { ok: false, message: "Paiement introuvable." };
  }

  const isPaymentOwner =
    payment.purpose === "REGISTRATION"
      ? payment.candidate?.ownerId === user.id
      : payment.purpose === "VOTE" &&
        typeof payment.metadata === "object" &&
        payment.metadata !== null &&
        !Array.isArray(payment.metadata) &&
        "votedByUserId" in payment.metadata &&
        payment.metadata.votedByUserId === user.id;

  if (!isPaymentOwner) {
    return { ok: false, message: "Paiement introuvable." };
  }

  if (payment.status === "SUCCESS") {
    return { ok: false, message: "Ce paiement est déjà validé." };
  }

  if (
    payment.status === "FAILED" ||
    payment.status === "CANCELLED" ||
    payment.status === "REFUNDED"
  ) {
    return { ok: false, message: "Ce paiement ne peut plus être modifié." };
  }

  const proof = await prisma.media.findFirst({
    where: {
      id: data.proofMediaId,
      uploaderId: user.id,
      type: { in: ["IMAGE", "DOCUMENT"] },
    },
    select: { id: true },
  });

  if (!proof) {
    return { ok: false, message: "Preuve de paiement invalide ou introuvable." };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      proofMediaId: proof.id,
      declaredTransactionId: data.declaredTransactionId || null,
      status: "AWAITING_CONFIRMATION",
      submittedAt: new Date(),
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", email: { not: "" } },
    select: { id: true, email: true, name: true },
  });
  await Promise.allSettled(
    admins.map((admin) =>
      notifyUserByEmail({
        userId: admin.id,
        email: admin.email,
        name: admin.name,
        template: "admin_payment_proof_received",
        paymentId: payment.id,
      }),
    ),
  );

  revalidatePath("/admin/paiements");

  if (payment.purpose === "REGISTRATION") {
    revalidatePath("/compte/candidatures");
    redirect(`/compte/candidatures/${payment.candidateId}/paiement?submitted=1`);
  }

  const candidate = payment.candidateId
    ? await prisma.candidate.findUnique({
        where: { id: payment.candidateId },
        select: { slug: true },
      })
    : null;

  redirect(candidate ? `/candidats/${candidate.slug}/voter?submitted=1` : "/concours");
}

export async function submitRegistrationPaymentProofAction(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  return submitPaymentProofAction(_prev, formData);
}

export async function verifyPaymentAction(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const admin = await requireAdmin();

  const parsed = verifyPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    action: formData.get("action"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Données invalides.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const payment = await prisma.payment.findUnique({
    where: { id: data.paymentId },
    include: { candidate: true, receipt: true, voteOrder: true },
  });

  if (!payment) {
    return { ok: false, message: "Paiement introuvable." };
  }

  if (payment.status === "SUCCESS") {
    return { ok: false, message: "Ce paiement est déjà validé." };
  }

  if (payment.status === "FAILED" || payment.status === "CANCELLED" || payment.status === "REFUNDED") {
    return { ok: false, message: "Ce paiement ne peut plus être validé." };
  }

  if (data.action === "APPROVE" && !payment.proofMediaId) {
    return {
      ok: false,
      message: "Une preuve de paiement est requise avant de valider ce paiement.",
    };
  }

  if (data.action === "APPROVE") {
    const result = await prisma.$transaction(async (tx) => {
      if (payment.purpose === "VOTE") {
        const finalized = await finalizeVotePayment(tx, payment, admin.id);
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: finalized ? "PAYMENT_APPROVED" : "PAYMENT_ALREADY_SETTLED",
            entityType: "Payment",
            entityId: payment.id,
            metadata: { purpose: payment.purpose, reference: payment.reference, amount: payment.amount },
          },
        });
        return { receipt: await tx.receipt.findUnique({ where: { paymentId: payment.id } }) };
      }

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          verifiedAt: new Date(),
          verifiedById: admin.id,
          paidAt: new Date(),
          failureReason: null,
        },
      });

      const receipt = await tx.receipt.upsert({
        where: { paymentId: payment.id },
        update: {},
        create: {
          paymentId: payment.id,
          number: generateReceiptNumber(),
          issuedAt: new Date(),
        },
      });

      if (payment.candidateId && payment.candidate) {
        await tx.candidate.update({
          where: { id: payment.candidateId },
          data: {
            registrationPaymentId: payment.id,
            status: payment.candidate.status === "DRAFT" ? "PENDING" : payment.candidate.status,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "PAYMENT_APPROVED",
          entityType: "Payment",
          entityId: payment.id,
          metadata: { purpose: payment.purpose, reference: payment.reference, amount: payment.amount },
        },
      });

      return { updated, receipt };
    });

    const candidateOwner = payment.purpose === "REGISTRATION" && payment.candidate?.ownerId
      ? await prisma.user.findUnique({
          where: { id: payment.candidate.ownerId },
          select: { id: true, email: true, name: true },
        })
      : null;

    if (candidateOwner?.email) {
      await notifyUserByEmail({
        userId: candidateOwner.id,
        email: candidateOwner.email,
        name: candidateOwner.name,
        template: "payment_validated",
        paymentId: payment.id,
      });
    }

    if (payment.purpose === "VOTE") {
      const votedByUserId =
        payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata) &&
        "votedByUserId" in payment.metadata && typeof payment.metadata.votedByUserId === "string"
          ? payment.metadata.votedByUserId
          : null;
      const voter = votedByUserId
        ? await prisma.user.findUnique({ where: { id: votedByUserId }, select: { id: true, email: true, name: true } })
        : null;
      if (voter?.email) {
        await notifyUserByEmail({
          userId: voter.id,
          email: voter.email,
          name: voter.name,
          template: "vote_confirmed",
          paymentId: payment.id,
        });
      }
    }

    revalidatePath("/admin/paiements");
    revalidatePath("/admin/candidatures");
    revalidatePath("/compte/candidatures");
    return {
      ok: true,
      message: payment.purpose === "VOTE"
        ? `Vote comptabilisé. Reçu ${result.receipt?.number ?? "généré"}.`
        : `Paiement validé. Reçu ${result.receipt?.number ?? "généré"} généré.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        verifiedAt: new Date(),
        verifiedById: admin.id,
        failureReason: data.reason || "Preuve de paiement rejetée",
      },
    });
    if (payment.voteOrder) {
      await tx.voteOrder.update({ where: { paymentId: payment.id }, data: { status: "FAILED" } });
    }
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "PAYMENT_REJECTED",
        entityType: "Payment",
        entityId: payment.id,
        metadata: {
          purpose: payment.purpose,
          reference: payment.reference,
          amount: payment.amount,
          reason: data.reason || "Preuve de paiement rejetée",
        },
      },
    });
  });

  revalidatePath("/admin/paiements");
  revalidatePath("/compte/candidatures");
  return { ok: true, message: "Paiement rejeté." };
}
