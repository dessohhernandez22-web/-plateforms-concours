"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { AuthActionState } from "@/lib/validations/auth-state";
import { initialAuthState } from "@/lib/validations/auth-state";
import { resetPasswordAction } from "@/server/actions/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    resetPasswordAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-stone-800">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none"
        />
        {state.errors?.password && (
          <span className="text-xs text-red-600">{state.errors.password[0]}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-stone-800">
          Confirmer le mot de passe
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none"
        />
        {state.errors?.confirmPassword && (
          <span className="text-xs text-red-600">{state.errors.confirmPassword[0]}</span>
        )}
      </div>

      <Button type="submit" fullWidth size="lg" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </Button>
    </form>
  );
}
