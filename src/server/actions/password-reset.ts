"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { notifyUserByEmail } from "@/lib/notifications";
import { hashPassword } from "@/lib/password";
import { clientAddressKey, enforceRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import type { AuthActionState } from "@/lib/validations/auth-state";

const TOKEN_TTL_MINUTES = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Veuillez saisir une adresse e-mail valide.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const requestHeaders = await headers();
  const ip = clientAddressKey(requestHeaders);
  const [ipLimit, emailLimit] = await Promise.all([
    enforceRateLimit(`password-reset:ip:${ip}`, 5, 60 * 60),
    enforceRateLimit(`password-reset:email:${parsed.data.email}`, 3, 60 * 60),
  ]);
  if (!ipLimit.ok || !emailLimit.ok) {
    const retryAfter = !ipLimit.ok
      ? ipLimit.retryAfterSeconds
      : !emailLimit.ok
        ? emailLimit.retryAfterSeconds
        : 0;
    return { ok: false, message: rateLimitMessage(retryAfter) };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, name: true },
  });

  if (user) {
    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(rawToken),
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = new URL("/reinitialiser-mot-de-passe", appUrl);
    resetUrl.searchParams.set("token", rawToken);

    await notifyUserByEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      template: "password_reset",
      link: resetUrl.toString(),
    });
  }

  return {
    ok: true,
    message:
      "Si un compte correspond à cette adresse, un e-mail de réinitialisation vient d'être envoyé.",
  };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Veuillez corriger les erreurs ci-dessous.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const requestHeaders = await headers();
  const ip = clientAddressKey(requestHeaders);
  const ipLimit = await enforceRateLimit(`password-reset:confirm:${ip}`, 10, 60 * 60);
  if (!ipLimit.ok) {
    return { ok: false, message: rateLimitMessage(ipLimit.retryAfterSeconds) };
  }

  const now = new Date();
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });

  if (!record || record.usedAt || record.expiresAt <= now) {
    return {
      ok: false,
      message: "Ce lien de réinitialisation est invalide ou a expiré.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const passwordChanged = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return false;

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    });
    await tx.auditLog.create({
      data: {
        actorId: record.userId,
        action: "USER_PASSWORD_RESET",
        entityType: "User",
        entityId: record.userId,
      },
    });
    return true;
  });

  if (!passwordChanged) {
    return {
      ok: false,
      message: "Ce lien de réinitialisation est invalide ou a expiré.",
    };
  }

  redirect("/connexion?reset=1");
}
