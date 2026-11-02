import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { notifyUserByEmail } from "@/lib/notifications";
import { finalizeVotePayment } from "@/lib/vote-settlement";
import {
  SaspayConfig,
  verifySaspayWebhookSignature,
  verifySaspayTransaction,
} from "@/lib/saspay";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNestedValue(data: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = data;

  for (const segment of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function resolvePaymentReference(data: Record<string, unknown>): string | null {
  const metadata = getNestedValue(data, ["metadata"]);
  const metadataReference =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? asString((metadata as Record<string, unknown>).application_reference)
      : null;
  if (metadataReference) return metadataReference;

  const description = asString(data.description);
  const match = description?.match(/^SPP (?:registration|vote) ((?:SPP|VOTE)-\d{4}-[A-F0-9]{12,16})$/i);
  return match?.[1] ?? null;
}

function parseXofAmount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const amount = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) return null;
  const [whole, fraction = ""] = amount.split(".");
  const minorUnits = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minorUnits) ? minorUnits : null;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Webhook trop volumineux." }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Webhook trop volumineux." }, { status: 413 });
  }

  if (!SaspayConfig.webhookSecret) {
    return NextResponse.json({ ok: false, error: "Webhook SasPay non configuré." }, { status: 503 });
  }

  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  if (!verifySaspayWebhookSignature(rawBody, signature, timestamp, SaspayConfig.webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Signature de webhook invalide." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload JSON invalide." }, { status: 400 });
  }

  const event = asString(payload.event);
  const headerEvent = request.headers.get("x-webhook-event");
  if (!event || (headerEvent && headerEvent !== event)) {
    return NextResponse.json({ ok: false, error: "Type d'événement incohérent." }, { status: 400 });
  }

  const eventStatuses: Record<string, "SUCCESS" | "FAILED" | "CANCELLED" | "PENDING"> = {
    "transaction.created": "PENDING",
    "transaction.success": "SUCCESS",
    "transaction.failed": "FAILED",
    "transaction.cancelled": "CANCELLED",
  };
  const eventStatus = eventStatuses[event];
  if (!eventStatus) return NextResponse.json({ ok: true, ignored: true });

  const data = getNestedValue(payload, ["data"]);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ ok: false, error: "Données de transaction absentes." }, { status: 400 });
  }
  const transaction = data as Record<string, unknown>;
  const transactionId = asString(transaction.id);
  if (!transactionId) {
    return NextResponse.json({ ok: false, error: "Identifiant de transaction absent." }, { status: 400 });
  }

  let verifiedTransaction;
  try {
    verifiedTransaction = await verifySaspayTransaction(transactionId);
  } catch {
    return NextResponse.json({ ok: false, error: "Vérification SasPay indisponible." }, { status: 502 });
  }
  const normalizedStatus = verifiedTransaction.status;
  if (eventStatus !== "PENDING" && normalizedStatus !== eventStatus) {
    return NextResponse.json({ ok: false, error: "Statut non confirmé par SasPay." }, { status: 409 });
  }

  const reference = resolvePaymentReference({
    ...verifiedTransaction,
    metadata: transaction.metadata,
  });
  if (!reference) {
    return NextResponse.json({ ok: false, error: "Référence SPP de paiement absente." }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { candidate: true, voteOrder: true },
  });

  if (!payment || payment.provider !== "SASPAY") {
    return NextResponse.json({ ok: false, error: "Paiement introuvable." }, { status: 404 });
  }

  const amount = parseXofAmount(verifiedTransaction.amount);
  if (amount !== payment.amount * 100 || verifiedTransaction.currency !== payment.currency) {
    return NextResponse.json({ ok: false, error: "Montant ou devise du paiement incohérent." }, { status: 400 });
  }

  const providerTransactionId = verifiedTransaction.id;
  const failureReason = asString(transaction.error_message) ?? asString(transaction.reason);
  const receiptNumber = `RCPT-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const externalId = `${asString(payload.id) ?? transactionId}:${event}`;
  const webhookEvent = await prisma.webhookEvent.upsert({
    where: { provider_externalId: { provider: "SASPAY", externalId } },
    update: {},
    create: {
      provider: "SASPAY",
      externalId,
      eventType: event,
      payload: payload as Prisma.InputJsonObject,
      status: "RECEIVED",
    },
  });

  if (webhookEvent.status === "PROCESSED") {
    return NextResponse.json({ ok: true, ignored: true, duplicate: true });
  }

  let notifyVoterId: string | null = null;
  let notifyCandidateOwnerId: string | null = null;
  let paymentSucceeded = false;

  try {
    await prisma.$transaction(async (tx) => {
      if (payment.status !== "SUCCESS") {
        if (payment.purpose === "VOTE" && normalizedStatus === "SUCCESS") {
          paymentSucceeded = await finalizeVotePayment(tx, payment);
          if (paymentSucceeded && payment.metadata && typeof payment.metadata === "object" &&
            !Array.isArray(payment.metadata) && "votedByUserId" in payment.metadata &&
            typeof payment.metadata.votedByUserId === "string") {
            notifyVoterId = payment.metadata.votedByUserId;
          }
        } else {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              providerTransactionId,
              status:
                normalizedStatus === "SUCCESS"
                  ? "SUCCESS"
                  : normalizedStatus === "FAILED"
                    ? "FAILED"
                    : normalizedStatus === "CANCELLED"
                      ? "CANCELLED"
                      : "PENDING",
              verifiedAt: normalizedStatus === "SUCCESS" ? new Date() : payment.verifiedAt,
              paidAt: normalizedStatus === "SUCCESS" ? new Date() : payment.paidAt,
              failureReason: normalizedStatus === "FAILED" || normalizedStatus === "CANCELLED"
                ? failureReason ?? "Paiement SasPay refusé ou annulé."
                : null,
            },
          });

          if (payment.purpose === "REGISTRATION" && normalizedStatus === "SUCCESS" && payment.candidateId && payment.candidate) {
            await tx.receipt.upsert({
              where: { paymentId: payment.id },
              update: {},
              create: { paymentId: payment.id, number: receiptNumber, issuedAt: new Date() },
            });
            await tx.candidate.update({
              where: { id: payment.candidateId },
              data: {
                status: payment.candidate.status === "DRAFT" ? "PENDING" : payment.candidate.status,
                registrationPaymentId: payment.id,
              },
            });
            notifyCandidateOwnerId = payment.candidate.ownerId;
            paymentSucceeded = true;
          }

          if (payment.purpose === "VOTE" && payment.voteOrder && normalizedStatus !== "SUCCESS") {
            await tx.voteOrder.update({
              where: { id: payment.voteOrder.id },
              data: { status: normalizedStatus === "FAILED" ? "FAILED" : normalizedStatus === "CANCELLED" ? "CANCELLED" : "AWAITING_PAYMENT" },
            });
          }
        }
      }

      await tx.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: "PROCESSED", processedAt: new Date(), error: null },
      });
    });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : "Traitement échoué." },
    });
    return NextResponse.json({ ok: false, error: "Échec du traitement du paiement." }, { status: 500 });
  }

  if (paymentSucceeded) {
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
          template: "admin_payment_received",
          paymentId: payment.id,
        }),
      ),
    );
  }
  if (notifyVoterId) {
    const voter = await prisma.user.findUnique({ where: { id: notifyVoterId }, select: { id: true, email: true, name: true } });
    if (voter?.email) {
      await notifyUserByEmail({ userId: voter.id, email: voter.email, name: voter.name, template: "vote_confirmed", paymentId: payment.id });
    }
  }
  if (notifyCandidateOwnerId) {
    const owner = await prisma.user.findUnique({ where: { id: notifyCandidateOwnerId }, select: { id: true, email: true, name: true } });
    if (owner?.email) {
      await notifyUserByEmail({ userId: owner.id, email: owner.email, name: owner.name, template: "payment_validated", paymentId: payment.id });
    }
  }

  revalidatePath("/admin/paiements");
  revalidatePath("/compte/candidatures");
  revalidatePath("/resultats");

  return NextResponse.json({
    ok: true,
    status: normalizedStatus,
    reference,
    paymentId: payment.id,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "saspay-callback" });
}
