import Link from "next/link";
import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/session";
import { logoutAction } from "@/server/actions/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Administration
        </p>
        <p className="mb-4 truncate text-sm font-semibold text-stone-900">{admin.name}</p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/admin" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Tableau de bord
          </Link>
          <Link href="/admin/concours" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Concours
          </Link>
          <Link href="/admin/candidatures" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Candidatures
          </Link>
          <Link href="/admin/paiements" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Paiements
          </Link>
          <Link href="/admin/resultats" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Résultats
          </Link>
          <Link href="/admin/notifications" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Notifications
          </Link>
          <Link href="/admin/utilisateurs" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Utilisateurs
          </Link>
          <Link href="/concours" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Voir le site
          </Link>
          <form action={logoutAction} className="mt-2 border-t border-stone-100 pt-2">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-stone-600 hover:bg-stone-100"
            >
              Déconnexion
            </button>
          </form>
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
