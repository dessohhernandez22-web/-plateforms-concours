import Link from "next/link";
import { LogIn } from "lucide-react";

import { CONTACT_EMAIL, SITE } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/server/actions/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[rgba(255,255,255,0.78)] backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-3 font-black tracking-tight text-[#17372e]">
          <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#17372e] to-[#2e6955] text-sm font-black text-white shadow-lg shadow-emerald-950/20">
            SPP
          </span>
          <span className="hidden text-base sm:inline">{SITE.name}</span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="flex items-center gap-1 text-xs font-medium text-stone-700 sm:gap-1.5 sm:text-sm"
        >
          <Link href="/concours" className="rounded-lg px-2 py-2 transition hover:bg-stone-100 hover:text-stone-900 sm:px-3">
            Concours
          </Link>
          <Link href="/resultats" className="hidden rounded-lg px-3 py-2 transition hover:bg-stone-100 hover:text-stone-900 sm:inline-flex">
            Résultats
          </Link>

          {user ? (
            <Link
              href={
                user.role === "ADMIN"
                  ? "/admin"
                  : user.role === "ORGANIZER"
                    ? "/organisateur"
                    : "/compte"
              }
              className="rounded-lg px-2 py-2 transition hover:bg-stone-100 hover:text-stone-900 sm:px-3"
            >
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/connexion" aria-label="Connexion" title="Connexion" className="inline-flex size-9 items-center justify-center rounded-lg transition hover:bg-stone-100 hover:text-stone-900 sm:hidden">
                <LogIn className="size-4" />
              </Link>
              <Link href="/connexion" className="hidden rounded-lg px-3 py-2 transition hover:bg-stone-100 hover:text-stone-900 sm:inline-flex">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="rounded-lg bg-gradient-to-r from-[#17372e] to-[#2e6955] px-3 py-2 font-semibold text-white shadow-lg shadow-emerald-950/15 transition hover:translate-y-[-1px] hover:shadow-xl sm:px-4 sm:py-2.5"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
          {user && (
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-2 py-2 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 sm:px-3"
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
    <footer className="border-t border-[#34574c] bg-[#142d26] print:hidden">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-sm text-white/65 sm:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-white">{SITE.name}</p>
          <p className="max-w-xl leading-6">{SITE.description}</p>
          <p className="mt-2 text-xs text-white/45">
            Paiements sécurisés · Devise : FCFA · Données personnelles protégées.
          </p>
        </div>
        <nav aria-label="Liens utiles" className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Liens utiles
          </p>
          <Link href="/concours" className="w-fit hover:text-white">
            Concours
          </Link>
          <Link href="/resultats" className="w-fit hover:text-white">
            Résultats
          </Link>
          <Link href="/inscription" className="w-fit hover:text-white">
            Créer un compte
          </Link>
          <Link href="/connexion" className="w-fit hover:text-white">
            Connexion
          </Link>
          <Link href="/conditions-utilisation" className="w-fit hover:text-white">
            Conditions d’utilisation
          </Link>
          <Link href="/confidentialite" className="w-fit hover:text-white">
            Confidentialité
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="w-fit hover:text-white">
            Nous contacter
          </a>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-white/45">
          © {new Date().getFullYear()} {SITE.name}. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
