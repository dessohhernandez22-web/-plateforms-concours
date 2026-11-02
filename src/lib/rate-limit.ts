import "server-only";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/db";

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

function rateLimitSecret(): string {
  return process.env.RATE_LIMIT_SECRET ?? process.env.AUTH_SECRET ?? "";
}

export function hashRequestValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const secret = rateLimitSecret();
  if (!secret) return null;
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim();
  return candidate || "unknown";
}

export function clientAddressKey(headers: Headers): string {
  return hashRequestValue(getClientIp(headers)) ?? "unknown";
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;

  const row = rows[0];
  if (!row) return { ok: true, remaining: limit };

  if (row.count > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(row.resetAt).getTime() - now.getTime()) / 1000),
    );
    return { ok: false, retryAfterSeconds };
  }

  return { ok: true, remaining: Math.max(0, limit - row.count) };
}

export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

export async function cleanupRateLimits(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: cutoff } } });
}
