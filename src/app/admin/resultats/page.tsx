import type { Metadata } from "next";

import { prisma } from "@/lib/db";
import { syncContestLifecycle } from "@/lib/contest-lifecycle";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { publishContestResultsAction } from "@/server/actions/results";

export const metadata: Metadata = { title: "Résultats — Administration" };
export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  await requireAdmin();
  await syncContestLifecycle();

  const contests = await prisma.contest.findMany({
    where: {
      status: { in: ["VOTING_CLOSED", "RESULTS_PUBLISHED"] },
    },
    orderBy: { votingCloseAt: "desc" },
    include: {
      domain: true,
      candidates: {
        where: { status: "APPROVED" },
        orderBy: { votesCount: "desc" },
        select: {
          id: true,
          displayName: true,
          votesCount: true,
          slug: true,
        },
      },
      results: {
        orderBy: { rank: "asc" },
        include: {
          candidate: { select: { displayName: true, slug: true } },
        },
      },
    },
  });

  return (
    <main>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Résultats et classements</h1>
          <p className="text-sm text-stone-600">Publiez le classement final d’un concours après la clôture des votes.</p>
        </div>
        <a
          href="/api/admin/export?type=resultats"
          className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Exporter en CSV
        </a>
      </header>

      {contests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          Aucun concours avec votes clôturés pour le moment.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {contests.map((contest) => (
            <section key={contest.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">{contest.title}</h2>
                  <p className="text-sm text-stone-600">
                    {contest.domain.name} · Clôture le {formatDate(contest.votingCloseAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    contest.status === "RESULTS_PUBLISHED"
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {contest.status === "RESULTS_PUBLISHED" ? "Résultats publiés" : "Votes clôturés"}
                </span>
              </div>

              <div className="mt-4 rounded-xl bg-stone-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
                  Classement actuel
                </p>
                <ol className="flex flex-col gap-2">
                  {(contest.results.length ? contest.results : contest.candidates).map((entry, index) => {
                    const candidateName = "candidate" in entry ? entry.candidate.displayName : entry.displayName;
                    const voteCount = "votes" in entry ? entry.votes : entry.votesCount;
                    const rank = "rank" in entry ? entry.rank : index + 1;

                    return (
                      <li
                        key={"candidateId" in entry ? entry.candidateId : entry.id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex size-7 items-center justify-center rounded-full bg-clay-600 text-xs font-bold text-white">
                            {rank}
                          </span>
                          <span className="font-medium text-stone-800">{candidateName}</span>
                        </span>
                        <span className="text-sm font-semibold text-clay-700">{voteCount} voix</span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {contest.status !== "RESULTS_PUBLISHED" && (
                <form action={publishContestResultsAction} className="mt-4">
                  <input type="hidden" name="contestId" value={contest.id} />
                  <button
                    type="submit"
                    className="rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-700"
                  >
                    Publier les résultats
                  </button>
                </form>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
