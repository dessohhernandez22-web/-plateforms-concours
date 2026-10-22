import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, FileText, Users } from "lucide-react";

import { DomainIcon } from "@/components/domain-icon";
import { prisma } from "@/lib/db";
import { formatDateTime, formatFcfa } from "@/lib/utils";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const contest = await prisma.contest.findUnique({
    where: { slug },
    select: { title: true, description: true },
  });
  if (!contest) return { title: "Concours introuvable" };
  return { title: contest.title, description: contest.description };
}

export const dynamic = "force-dynamic";

export default async function ContestPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const contest = await prisma.contest.findUnique({
    where: { slug },
    include: {
      domain: true,
      event: true,
      candidates: {
        where: { status: "APPROVED" },
        orderBy: { votesCount: "desc" },
        take: 12,
        select: { id: true, displayName: true, slug: true, votesCount: true },
      },
      _count: { select: { candidates: true } },
    },
  });

  if (!contest) notFound();

  const isRegistrationOpen =
    contest.status === "PUBLISHED" &&
    new Date() >= contest.registrationOpenAt &&
    new Date() <= contest.registrationCloseAt;

  return (
    <article className="mx-auto max-w-5xl px-5 py-10">
      <nav className="mb-4 text-sm text-stone-500">
        <Link href="/" className="hover:text-clay-700">
          Accueil
        </Link>{" "}
        /{" "}
        <Link href="/concours" className="hover:text-clay-700">
          Concours
        </Link>{" "}
        / <span className="text-stone-700">{contest.domain.name}</span>
      </nav>

      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
          <DomainIcon name={contest.domain.icon} className="size-6" />
        </span>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{contest.title}</h1>
        <p className="max-w-3xl text-stone-600">{contest.description}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge label="Frais d'inscription" value={formatFcfa(contest.registrationFee)} />
          <Badge label="Prix par vote" value={formatFcfa(contest.voteUnitPrice)} />
          <Badge label="Candidats inscrits" value={String(contest._count.candidates)} />
        </div>
        {isRegistrationOpen ? (
          <Link
            href={`/concours/${contest.slug}/inscription`}
            className="w-fit rounded-xl bg-clay-600 px-5 py-3 text-sm font-semibold text-white hover:bg-clay-700"
          >
            S&apos;inscrire à ce concours
          </Link>
        ) : (
          <p className="w-fit rounded-xl bg-stone-100 px-5 py-3 text-sm font-medium text-stone-600">
            Les inscriptions ne sont pas ouvertes actuellement.
          </p>
        )}
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-900">
            <CalendarDays className="size-5 text-clay-700" /> Calendrier
          </h2>
          <ol className="flex flex-col gap-3">
            <Timeline label="Ouverture des inscriptions" date={contest.registrationOpenAt} />
            <Timeline label="Clôture des inscriptions" date={contest.registrationCloseAt} />
            <Timeline label="Ouverture des votes" date={contest.votingOpenAt} />
            <Timeline label="Clôture des votes" date={contest.votingCloseAt} />
            <Timeline label="Publication des résultats" date={contest.resultsAt} />
          </ol>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-900">
            <FileText className="size-5 text-clay-700" /> Règlement
          </h2>
          <div className="whitespace-pre-line text-sm leading-relaxed text-stone-600">
            {contest.rules}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-900">
          <Users className="size-5 text-clay-700" /> Candidats en lice
        </h2>
        {contest.candidates.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contest.candidates.map((candidate) => (
              <Link
                key={candidate.id}
                href={`/candidats/${candidate.slug}`}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 hover:shadow-sm"
              >
                <span className="font-medium text-stone-800">{candidate.displayName}</span>
                <span className="text-sm font-semibold text-clay-700">
                  {candidate.votesCount} voix
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
            Aucun candidat validé pour le moment. Soyez le premier à vous inscrire !
          </p>
        )}
      </section>
    </article>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex flex-col rounded-xl bg-stone-50 px-4 py-2">
      <span className="text-xs uppercase tracking-wide text-stone-500">{label}</span>
      <span className="font-semibold text-stone-900">{value}</span>
    </span>
  );
}

function Timeline({ label, date }: { label: string; date: Date | null }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-stone-100 pb-3 last:border-0">
      <span className="text-sm text-stone-600">{label}</span>
      <time className="text-sm font-medium text-stone-900">{formatDateTime(date)}</time>
    </li>
  );
}
