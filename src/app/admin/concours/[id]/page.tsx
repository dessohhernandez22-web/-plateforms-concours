import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { toDateTimeLocal } from "@/lib/utils";
import { ContestForm } from "../forms";

export const metadata: Metadata = { title: "Modifier un concours" };
export const dynamic = "force-dynamic";

export default async function EditContestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [contest, events, domains] = await Promise.all([
    prisma.contest.findUnique({ where: { id } }),
    prisma.event.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.domain.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!contest) notFound();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Modifier le concours</h1>
          <p className="text-sm text-stone-600">{contest.title}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/concours"
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Retour
          </Link>
          {contest.status !== "DRAFT" && (
            <Link
              href={`/concours/${contest.slug}`}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Voir la page publique
            </Link>
          )}
        </div>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <ContestForm
          events={events}
          domains={domains}
          values={{
            id: contest.id,
            eventId: contest.eventId,
            domainId: contest.domainId,
            title: contest.title,
            slug: contest.slug,
            description: contest.description,
            rules: contest.rules,
            status: contest.status,
            registrationFee: contest.registrationFee,
            voteUnitPrice: contest.voteUnitPrice,
            registrationOpenAt: toDateTimeLocal(contest.registrationOpenAt),
            registrationCloseAt: toDateTimeLocal(contest.registrationCloseAt),
            votingOpenAt: toDateTimeLocal(contest.votingOpenAt),
            votingCloseAt: toDateTimeLocal(contest.votingCloseAt),
            resultsAt: toDateTimeLocal(contest.resultsAt),
            maxCandidates: contest.maxCandidates ? String(contest.maxCandidates) : "",
            coverUrl: contest.coverUrl ?? "",
          }}
        />
      </section>
    </main>
  );
}
