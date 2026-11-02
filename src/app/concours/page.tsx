import Link from "next/link";
import type { Metadata } from "next";

import { ArrowRight } from "lucide-react";

import { DomainIcon } from "@/components/domain-icon";
import { prisma } from "@/lib/db";
import { formatDate, formatFcfa } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Concours",
  description:
    "Découvrez les concours ouverts, les frais d'inscription et les dates de clôture.",
};
export const dynamic = "force-dynamic";

export default async function ContestsPage() {
  const contests = await prisma.contest.findMany({
    where: { status: { in: ["PUBLISHED", "REGISTRATION_CLOSED", "VOTING_CLOSED", "RESULTS_PUBLISHED"] } },
    orderBy: { domain: { sortOrder: "asc" } },
    include: { domain: true, _count: { select: { candidates: true } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-10 flex flex-col gap-2 border-b border-stone-200 pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">La compétition commence ici</p>
        <h1 className="font-editorial text-3xl font-semibold text-stone-900 sm:text-4xl">Tous les concours</h1>
        <p className="text-sm text-stone-600">
          Choisissez un domaine et inscrivez-vous avant la clôture.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contests.map((contest) => (
          <Link
            key={contest.id}
            href={`/concours/${contest.slug}`}
            className="group flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-emerald-800/30 hover:shadow-[0_20px_40px_-30px_rgba(19,47,38,0.45)]"
          >
            <span className="flex size-12 items-center justify-center rounded-lg bg-emerald-50 text-forest">
              <DomainIcon name={contest.domain.icon} className="size-6" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-stone-900">{contest.domain.name}</h2>
              <p className="text-sm text-stone-600">{contest.domain.description}</p>
            </div>
            <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-500">
              <div>
                <dt className="inline">Inscription : </dt>
                <dd className="inline font-medium text-stone-700">
                  {formatDate(contest.registrationCloseAt)}
                </dd>
              </div>
              <div>
                <dt className="inline">Frais : </dt>
                <dd className="inline font-medium text-stone-700">
                  {formatFcfa(contest.registrationFee)}
                </dd>
              </div>
            </dl>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-forest">
              Découvrir <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>

      {!contests.length && (
        <p className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
          Aucun concours publié pour le moment.
        </p>
      )}
    </main>
  );
}
