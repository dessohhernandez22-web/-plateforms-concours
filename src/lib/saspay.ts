import { createHmac, timingSafeEqual } from "node:crypto";

export const SaspayConfig = {
  apiBaseUrl: (process.env.SASPAY_API_BASE_URL ?? "https://api.saspay.me/api/v1").replace(/\/$/, ""),
  apiKey: process.env.SASPAY_API_KEY ?? "",
  webhookSecret: process.env.SASPAY_WEBHOOK_SECRET ?? "",
} as const;

export class SaspayError extends Error {}

export function isSaspayConfigured(): boolean {
  return Boolean(SaspayConfig.apiKey && SaspayConfig.webhookSecret);
}

type CheckoutSessionInput = {
  amount: number;
  candidateId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  paymentReference: string;
  purpose: "REGISTRATION" | "VOTE";
  returnUrl: string;
};

type CheckoutSession = {
  id: string;
  checkoutUrl: string;
};

export type VerifiedSaspayTransaction = {
  id: string;
  status: "SUCCESS" | "FAILED" | "CANCELLED" | "PENDING";
  amount: unknown;
  currency: unknown;
  description: string | null;
  reference: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function createSaspayCheckoutSession({
  amount,
  candidateId,
  customerEmail,
  customerName,
  customerPhone,
  paymentReference,
  purpose,
  returnUrl,
}: CheckoutSessionInput): Promise<CheckoutSession> {
  if (!SaspayConfig.apiKey) {
    throw new SaspayError("Le paiement Saspay n'est pas encore configuré.");
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new SaspayError("Le montant du paiement est invalide.");
  }

  let response: Response;
  try {
    response = await fetch(`${SaspayConfig.apiBaseUrl}/checkout-sessions/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SaspayConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: `${amount.toFixed(2)}`,
        currency: "XOF",
        country: "BJ",
        description: `SPP ${purpose.toLowerCase()} ${paymentReference}`,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        return_url: returnUrl,
        metadata: {
          application_reference: paymentReference,
          candidate_id: candidateId,
          purpose,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new SaspayError("Impossible de joindre Saspay. Réessayez dans quelques instants.");
  }

  const body = asRecord(await response.json().catch(() => null));
  const data = asRecord(body?.data);
  const checkoutUrl = typeof data?.checkout_url === "string" ? data.checkout_url : null;
  const sessionId = typeof data?.id === "string" ? data.id : null;

  if (!response.ok || body?.success !== true || !checkoutUrl || !sessionId) {
    const error = asRecord(body?.error);
    const message = typeof error?.message === "string" ? error.message : null;
    throw new SaspayError(message ?? "Saspay n'a pas pu créer la session de paiement.");
  }

  let parsedCheckoutUrl: URL;
  try {
    parsedCheckoutUrl = new URL(checkoutUrl);
  } catch {
    throw new SaspayError("Saspay a retourné un lien de paiement invalide.");
  }

  if (parsedCheckoutUrl.protocol !== "https:" || parsedCheckoutUrl.hostname !== "pay.saspay.me") {
    throw new SaspayError("Saspay a retourné un domaine de paiement inattendu.");
  }

  return { id: sessionId, checkoutUrl: parsedCheckoutUrl.toString() };
}

export async function verifySaspayTransaction(
  transactionId: string,
): Promise<VerifiedSaspayTransaction> {
  if (!SaspayConfig.apiKey) {
    throw new SaspayError("La vérification SasPay n'est pas configurée.");
  }

  let response: Response;
  try {
    response = await fetch(
      `${SaspayConfig.apiBaseUrl}/payments/${encodeURIComponent(transactionId)}/verify/`,
      {
        headers: { Authorization: `Bearer ${SaspayConfig.apiKey}` },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      },
    );
  } catch {
    throw new SaspayError("Impossible de vérifier la transaction auprès de SasPay.");
  }

  const body = asRecord(await response.json().catch(() => null));
  const data = asRecord(body?.data) ?? body;
  if (!response.ok || !data || body?.success === false) {
    throw new SaspayError("SasPay n'a pas pu vérifier cette transaction.");
  }

  const id = typeof data.id === "string" ? data.id : null;
  const status = normalizeSaspayStatus(data.status);
  if (id !== transactionId || !data.status) {
    throw new SaspayError("Réponse de vérification SasPay invalide.");
  }

  return {
    id,
    status,
    amount: data.requested_amount ?? data.amount,
    currency: data.currency,
    description: typeof data.description === "string" ? data.description : null,
    reference: typeof data.reference === "string" ? data.reference : null,
  };
}

export function verifySaspayWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!signature || !timestamp || !secret || !/^\d+$/.test(timestamp)) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest();

  let received: Buffer;
  try {
    received = Buffer.from(signature, "hex");
  } catch {
    return false;
  }

  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function normalizeSaspayStatus(value: unknown): "SUCCESS" | "FAILED" | "CANCELLED" | "PENDING" {
  const status = String(value ?? "").trim().toLowerCase();

  if (["success", "paid", "approved", "completed", "complete", "validated", "validation_success"].includes(status)) {
    return "SUCCESS";
  }

  if (["cancelled", "canceled", "aborted"].includes(status)) {
    return "CANCELLED";
  }

  if (["failed", "error", "rejected", "denied"].includes(status)) {
    return "FAILED";
  }

  return "PENDING";
}