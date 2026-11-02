import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/session";

export const metadata: Metadata = { title: "Espace organisateur" };
export const dynamic = "force-dynamic";

export default async function OrganizerPage() {
  const user = await requireOrganizer();

  const events = await prisma.event.findMany({
    where: user.role === "ADMIN" ? undefined : { organizerId: user.id },
    include: {
      contests: {
        include: {
          domain: true,
          _count: { select: { candidates: true } },
        },
        orderBy: { domain: { sortOrder: "asc" } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold text-clay-700">Espace organisateur</p>
        <h1 className="text-2xl font-bold text-stone-900">Bonjour, {user.name}</h1>
        <p className="text-sm text-stone-600">
          Gérez vos concours, suivez les inscriptions et les votes.
        </p>
      </header>

      {events.length === 0 && (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
          Aucun événement ne vous est encore rattaché.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {events.map((event) => (
          <section key={event.id} className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{event.title}</h2>
                <p className="text-xs text-stone-500">{event.status}</p>
              </div>
              <Link
                href={`/organisateur/candidatures?eventId=${event.id}`}
                className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
              >
                Valider les candidatures
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {event.contests.map((contest) => (
                <li
                  key={contest.id}
                  className="rounded-xl border border-stone-200 p-4 text-sm"
                >
                  <p className="font-medium text-stone-900">{contest.domain.name}</p>
                  <p className="text-xs text-stone-500">
                    {contest._count.candidates} candidat(s) · {contest.status}
                  </p>
                  <Link
                    href={`/concours/${contest.slug}`}
                    className="mt-2 inline-block text-xs font-semibold text-clay-700 underline"
                  >
                    Voir la fiche
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
