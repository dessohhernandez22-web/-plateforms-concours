import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDateTime, formatFcfa } from "@/lib/utils";
import { ContestForm, EventForm } from "./forms";

export const metadata: Metadata = { title: "Concours et événements" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  REGISTRATION_CLOSED: "Inscriptions closes",
  VOTING_CLOSED: "Votes clos",
  RESULTS_PUBLISHED: "Résultats publiés",
  ARCHIVED: "Archivé",
};

export default async function AdminContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; contest?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const [events, domains, organizers] = await Promise.all([
    prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        organizer: { select: { id: true, name: true } },
        contests: {
          orderBy: { createdAt: "desc" },
          include: {
            domain: { select: { name: true } },
            _count: { select: { candidates: true } },
          },
        },
      },
    }),
    prisma.domain.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({
      where: { role: "ORGANIZER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const eventOptions = events.map((event) => ({ id: event.id, title: event.title }));
  const domainOptions = domains.map((domain) => ({ id: domain.id, name: domain.name }));

  return (
    <main className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Concours et événements</h1>
        <p className="text-sm text-stone-600">
          Créez les événements et les concours visibles par les candidats et les votants.
        </p>
      </header>

      {params.event && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          L&apos;événement a bien été enregistré.
        </p>
      )}
      {params.contest && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Le concours a bien été enregistré.
        </p>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Événements</h2>
            <p className="text-sm text-stone-600">
              Un événement regroupe un ou plusieurs concours.
            </p>
          </div>
          <details className="w-full sm:w-auto">
            <summary className="cursor-pointer rounded-xl bg-clay-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-clay-800">
              Nouvel événement
            </summary>
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <EventForm organizers={organizers} />
            </div>
          </details>
        </div>

        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-600">
            Aucun événement. Créez-en un pour pouvoir ouvrir des concours.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-stone-900">{event.title}</h3>
                    <p className="text-sm text-stone-600">
                      {event.organizer.name} · {event.contests.length} concours ·{" "}
                      {STATUS_LABELS[event.status] ?? event.status}
                    </p>
                  </div>
                  <Link
                    href={`/admin/concours/evenements/${event.id}`}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Modifier
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Concours</h2>
            <p className="text-sm text-stone-600">
              Les concours publient les inscriptions, les votes et les résultats.
            </p>
          </div>
          <details className="w-full sm:w-auto">
            <summary
              className={`cursor-pointer rounded-xl px-4 py-2 text-center text-sm font-semibold text-white ${
                events.length === 0 ? "pointer-events-none bg-stone-400" : "bg-clay-700 hover:bg-clay-800"
              }`}
            >
              Nouveau concours
            </summary>
            {events.length > 0 && (
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <ContestForm events={eventOptions} domains={domainOptions} />
              </div>
            )}
          </details>
        </div>

        {events.every((event) => event.contests.length === 0) ? (
          <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-600">
            Aucun concours pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="py-2 pr-3">Concours</th>
                  <th className="py-2 pr-3">Domaine</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Votes</th>
                  <th className="py-2 pr-3">Candidats</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {events.flatMap((event) =>
                  event.contests.map((contest) => (
                    <tr key={contest.id} className="border-b border-stone-100">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-stone-900">{contest.title}</p>
                        <p className="text-xs text-stone-500">{event.title}</p>
                      </td>
                      <td className="py-3 pr-3 text-stone-700">{contest.domain.name}</td>
                      <td className="py-3 pr-3">
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                          {STATUS_LABELS[contest.status] ?? contest.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-stone-700">
                        {formatDateTime(contest.votingOpenAt)} →{" "}
                        {formatDateTime(contest.votingCloseAt)}
                        <span className="block text-xs text-stone-500">
                          {formatFcfa(contest.voteUnitPrice)} / vote
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-stone-700">
                        {contest._count.candidates}
                        {contest.maxCandidates ? ` / ${contest.maxCandidates}` : ""}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/concours/${contest.id}`}
                          className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                        >
                          Modifier
                        </Link>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
