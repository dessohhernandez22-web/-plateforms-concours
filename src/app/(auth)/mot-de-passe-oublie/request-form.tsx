"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { AuthActionState } from "@/lib/validations/auth-state";
import { initialAuthState } from "@/lib/validations/auth-state";
import { requestPasswordResetAction } from "@/server/actions/password-reset";

export function RequestPasswordResetForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    requestPasswordResetAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && (
        <p
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-stone-800">
          E-mail du compte
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none"
        />
        {state.errors?.email && (
          <span className="text-xs text-red-600">{state.errors.email[0]}</span>
        )}
      </div>

      <Button type="submit" fullWidth size="lg" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir le lien"}
      </Button>
    </form>
  );
}
