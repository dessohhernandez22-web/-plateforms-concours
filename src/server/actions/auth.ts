"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { clientAddressKey, enforceRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import type { AuthActionState } from "@/lib/validations/auth-state";

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    role: "CANDIDATE",
    acceptTerms: formData.get("acceptTerms") === "on",
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
  const ipLimit = await enforceRateLimit(`register:ip:${ip}`, 5, 60 * 60);
  if (!ipLimit.ok) {
    return { ok: false, message: rateLimitMessage(ipLimit.retryAfterSeconds) };
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: parsed.data.email }, { phone: parsed.data.phone }],
    },
    select: { email: true, phone: true },
  });

  if (existing) {
    return {
      ok: false,
      message: "Un compte existe déjà avec cet e-mail ou ce numéro.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash,
      role: parsed.data.role,
    },
  });

  const redirectTo = "/compte";

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
      callbackUrl: redirectTo,
      redirect: false,
    });

    if (result?.error) {
      return {
        ok: false,
        message: "Impossible de créer la session.",
      };
    }

    redirect(redirectTo);
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: true, message: "Compte créé. Connectez-vous." };
    }
    throw error;
  }

  return { ok: true };
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Identifiants invalides.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const requestHeaders = await headers();
  const ip = clientAddressKey(requestHeaders);
  const [ipLimit, loginLimit] = await Promise.all([
    enforceRateLimit(`login:ip:${ip}`, 30, 5 * 60),
    enforceRateLimit(`login:${ip}:${parsed.data.email.toLowerCase()}`, 10, 5 * 60),
  ]);
  if (!ipLimit.ok || !loginLimit.ok) {
    const retryAfter = !ipLimit.ok
      ? ipLimit.retryAfterSeconds
      : !loginLimit.ok
        ? loginLimit.retryAfterSeconds
        : 0;
    return { ok: false, message: rateLimitMessage(retryAfter) };
  }

  const requestedNext = String(formData.get("next") ?? "");
  const redirectTo =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/compte";

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
      callbackUrl: redirectTo,
      redirect: false,
    });

    if (result?.error) {
      return {
        ok: false,
        message: "E-mail ou mot de passe incorrect.",
      };
    }

    redirect(redirectTo);
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "E-mail ou mot de passe incorrect." };
    }
    throw error;
  }

  return { ok: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
