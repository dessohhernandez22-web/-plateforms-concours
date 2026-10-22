import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <header className="mb-8 flex flex-col gap-1">
        <p className="text-sm font-semibold text-clay-700">Mon compte</p>
        <h1 className="text-2xl font-bold text-stone-900">Bonjour, {user.name}</h1>
        <p className="text-sm text-stone-600">{user.email}</p>
      </header>

      <dl className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-stone-500">Rôle</dt>
          <dd className="font-medium text-stone-900">{roleLabel(user.role)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-stone-500">Statut</dt>
          <dd className="font-medium text-forest">Compte actif</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        {user.role === "CANDIDATE" && (
          <Button asChild>
            <Link href="/concours">Voir les concours</Link>
          </Button>
        )}
        {(user.role === "ORGANIZER" || user.role === "ADMIN") && (
          <Button asChild>
            <Link href="/organisateur">Espace organisateur</Link>
          </Button>
        )}
        {user.role === "ADMIN" && (
          <Button variant="secondary" asChild>
            <Link href="/admin">Administration</Link>
          </Button>
        )}
        <form action={logoutAction}>
          <Button variant="ghost" type="submit">
            Se déconnecter
          </Button>
        </form>
      </div>
    </main>
  );
}

function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Administrateur";
    case "ORGANIZER":
      return "Organisateur";
    default:
      return "Candidat / Équipe";
  }
}
