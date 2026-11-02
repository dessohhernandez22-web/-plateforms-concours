import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 px-5 py-16 text-center">
      <p className="font-editorial text-6xl font-semibold text-clay-600">404</p>
      <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
        Cette page n&apos;existe pas.
      </h1>
      <p className="text-sm leading-6 text-stone-600">
        Le lien est peut-être obsolète, ou la page a été déplacée. Retrouvez les
        concours ouverts depuis l&apos;accueil.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-clay-600 px-5 py-3 text-sm font-semibold text-white hover:bg-clay-700"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/concours"
          className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Voir les concours
        </Link>
      </div>
    </main>
  );
}
