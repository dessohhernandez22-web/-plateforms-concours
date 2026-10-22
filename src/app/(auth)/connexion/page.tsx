import Link from "next/link";
import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col gap-2 text-center">
        <Link href="/" className="text-sm font-semibold text-clay-700">
          SPP TALENT SHOWDOWN
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Connexion</h1>
        <p className="text-sm text-stone-600">
          Accédez à votre espace candidat ou organisateur.
        </p>
      </header>

      <LoginForm />

      <p className="text-center text-sm text-stone-600">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-clay-700 underline">
          Créer un compte
        </Link>
      </p>
    </main>
  );
}
