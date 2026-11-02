import Link from "next/link";
import type { Metadata } from "next";

import { SITE } from "@/lib/constants";
import { RequestPasswordResetForm } from "./request-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: `Réinitialisez le mot de passe de votre compte ${SITE.name}.`,
};

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col gap-2 text-center">
        <Link href="/" className="text-sm font-semibold text-clay-700">
          {SITE.name}
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Mot de passe oublié</h1>
        <p className="text-sm text-stone-600">
          Indiquez l&apos;adresse e-mail de votre compte. Vous recevrez un lien valable 30 minutes.
        </p>
      </header>

      <RequestPasswordResetForm />

      <p className="text-center text-sm text-stone-600">
        <Link href="/connexion" className="font-semibold text-clay-700 underline">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
