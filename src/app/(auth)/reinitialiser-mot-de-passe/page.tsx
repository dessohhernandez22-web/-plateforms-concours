import Link from "next/link";
import type { Metadata } from "next";

import { SITE } from "@/lib/constants";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe",
  description: `Choisissez un nouveau mot de passe pour votre compte ${SITE.name}.`,
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col gap-2 text-center">
        <Link href="/" className="text-sm font-semibold text-clay-700">
          {SITE.name}
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Nouveau mot de passe</h1>
        <p className="text-sm text-stone-600">
          Choisissez un mot de passe de 8 caractères minimum.
        </p>
      </header>

      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          Lien de réinitialisation incomplet.{" "}
          <Link href="/mot-de-passe-oublie" className="font-semibold underline">
            Faire une nouvelle demande
          </Link>
          .
        </div>
      )}

      <p className="text-center text-sm text-stone-600">
        <Link href="/connexion" className="font-semibold text-clay-700 underline">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
