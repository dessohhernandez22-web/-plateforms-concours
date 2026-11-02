"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error && typeof error === "object" && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 px-5 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-700">
        Une erreur est survenue
      </p>
      <h1 className="font-editorial text-3xl font-semibold text-stone-900">
        Nous n&apos;avons pas pu afficher cette page.
      </h1>
      <p className="text-sm leading-6 text-stone-600">
        Réessayez dans quelques instants. Si le problème persiste, contactez
        l&apos;organisation en précisant la référence ci-dessous.
      </p>
      {digest && (
        <p className="rounded-lg bg-stone-100 px-3 py-2 font-mono text-xs text-stone-500">
          Référence : {digest}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-xl bg-clay-600 px-5 py-3 text-sm font-semibold text-white hover:bg-clay-700"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
