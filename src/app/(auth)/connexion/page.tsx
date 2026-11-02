import Link from "next/link";
import type { Metadata } from "next";

import { SITE } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: `Connectez-vous à votre espace ${SITE.name}.`,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col gap-2 text-center">
        <Link href="/" className="text-sm font-semibold text-clay-700">
          {SITE.name}
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Connexion</h1>
        <p className="text-sm text-stone-600">
          Accédez à votre espace candidat ou organisateur.
        </p>
      </header>

      {reset && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-800">
          Votre mot de passe a été mis à jour. Vous pouvez vous connecter.
        </p>
      )}

      <LoginForm next={next} />

      <p className="-mt-3 text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="font-medium text-stone-600 underline">
          Mot de passe oublié ?
        </Link>
      </p>

      <p className="text-center text-sm text-stone-600">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-clay-700 underline">
          Créer un compte
        </Link>
      </p>
    </main>
  );
}
