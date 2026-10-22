import Link from "next/link";

import { SITE } from "@/lib/constants";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/server/actions/auth";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight text-clay-700">
          <span className="flex size-8 items-center justify-center rounded-lg bg-clay-600 text-sm text-white">
            SPP
          </span>
          <span className="hidden sm:inline">{SITE.name}</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium text-stone-700">
          <Link href="/concours" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Concours
          </Link>
          <Link href="/resultats" className="rounded-lg px-3 py-2 hover:bg-stone-100">
            Résultats
          </Link>

          {session?.user ? (
            <Link
              href={session.user.role === "ADMIN" ? "/admin" : "/compte"}
              className="rounded-lg px-3 py-2 hover:bg-stone-100"
            >
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="rounded-lg px-3 py-2 hover:bg-stone-100">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="rounded-xl bg-clay-600 px-4 py-2 font-semibold text-white hover:bg-clay-700"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
          {session?.user && (
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100"
              >
                Déconnexion
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-stone-500">
        <p className="font-semibold text-stone-700">{SITE.name}</p>
        <p>{SITE.description}</p>
        <p className="text-xs">
          © {new Date().getFullYear()} {SITE.name}. Tous droits réservés. Devise : FCFA.
        </p>
      </div>
    </footer>
  );
}
