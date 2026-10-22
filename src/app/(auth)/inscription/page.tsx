import Link from "next/link";
import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col gap-2 text-center">
        <Link href="/" className="text-sm font-semibold text-clay-700">
          SPP TALENT SHOWDOWN
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Créer un compte</h1>
        <p className="text-sm text-stone-600">
          Inscrivez-vous en quelques secondes. Les candidats mineurs devront
          fournir une autorisation parentale.
        </p>
      </header>

      <RegisterForm />

      <p className="text-center text-sm text-stone-600">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-clay-700 underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
