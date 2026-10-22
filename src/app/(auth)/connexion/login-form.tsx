"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { loginAction } from "@/server/actions/auth";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/validations/auth-state";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    loginAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-stone-800">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-stone-800">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none"
        />
      </div>

      <Button type="submit" fullWidth size="lg" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
