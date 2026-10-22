import type { Metadata } from "next";

import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Résultats" };
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const results = await prisma.contestResult.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ contestId: "asc" }, { rank: "asc" }],
    include: {
      contest: { include: { domain: true } },
      candidate: { select: { displayName: true, slug: true } },
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
          Résultats & classements
        </h1>
        <p className="text-sm text-stone-600">
          Les classements publiés par l&apos;organisation.
        </p>
      </header>

      {results.length ? (
        <div className="flex flex-col gap-6">
          {Object.entries(
            results.reduce<Record<string, typeof results>>((acc, result) => {
              const key = result.contest.title;
              (acc[key] ??= []).push(result);
              return acc;
            }, {}),
          ).map(([title, rows]) => (
            <section key={title} className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-stone-900">{title}</h2>
              <ol className="flex flex-col gap-2">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-clay-600 text-xs font-bold text-white">
                        {row.rank}
                      </span>
                      <span className="font-medium text-stone-800">
                        {row.candidate.displayName}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-clay-700">
                      {row.votes} voix
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-stone-500">
                Publié le {formatDate(rows[0]?.publishedAt ?? null)}
              </p>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
          Aucun résultat publié pour le moment.
        </p>
      )}
    </main>
  );
}
