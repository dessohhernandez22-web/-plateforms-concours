"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { registerAction } from "@/server/actions/auth";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/validations/auth-state";

const fieldClass =
  "h-11 rounded-xl border border-stone-300 bg-white px-3 text-sm focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    registerAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800"
        >
          {state.message}
        </p>
      )}

      <Field name="name" label="Nom complet" error={state.errors?.name} />
      <Field name="email" label="E-mail" type="email" error={state.errors?.email} />
      <Field
        name="phone"
        label="Téléphone (MTN / Moov)"
        type="tel"
        placeholder="0197000000"
        error={state.errors?.phone}
      />

      <Field
        name="password"
        label="Mot de passe"
        type="password"
        hint="Au moins 8 caractères."
        error={state.errors?.password}
      />
      <Field
        name="confirmPassword"
        label="Confirmer le mot de passe"
        type="password"
        error={state.errors?.confirmPassword}
      />

      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input type="checkbox" name="acceptTerms" className="mt-1 size-4 accent-clay-600" />
        <span>
          J&apos;accepte les{" "}
          <Link
            href="/conditions-utilisation"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-clay-700 underline"
          >
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link
            href="/confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-clay-700 underline"
          >
            politique de confidentialité
          </Link>
          {", y compris pour les candidats mineurs."}
        </span>
      </label>
      {state.errors?.acceptTerms && (
        <p className="text-xs font-medium text-red-600">{state.errors.acceptTerms[0]}</p>
      )}

      <Button type="submit" fullWidth size="lg" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  hint,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  error?: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-stone-800">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`${fieldClass} ${error ? "border-red-400" : ""}`.trim()}
      />
      {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error[0]}</p>}
    </div>
  );
}
