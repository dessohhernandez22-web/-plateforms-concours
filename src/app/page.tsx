import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, ShieldCheck, Smartphone, Vote } from "lucide-react";

import { DomainIcon } from "@/components/domain-icon";
import { SITE, VOTE_UNIT_PRICE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDate, formatFcfa } from "@/lib/utils";

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [event, domains] = await Promise.all([
    prisma.event.findFirst({
      where: { slug: "spp-talent-showdown" },
      include: {
        contests: {
          orderBy: { domain: { sortOrder: "asc" } },
          include: { domain: true, _count: { select: { candidates: true } } },
        },
      },
    }),
    prisma.domain.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const contests = event?.contests ?? [];
  const visibleDomains = domains.length ? domains : [];

  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-clay-700 via-clay-600 to-ocre text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 sm:py-24">
          <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            100 % Bénin · Paiement Mobile Money
          </span>
          <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
            {SITE.name}
          </h1>
          <p className="max-w-2xl text-base text-white/90 sm:text-lg">
            {SITE.tagline}. Inscrivez-vous, présentez votre talent, et mobilisez
            vos supporters grâce au vote payant dès {formatFcfa(VOTE_UNIT_PRICE)}.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="#domaines"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-clay-700 hover:bg-clay-50"
            >
              Découvrir les concours <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/inscription"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/40 px-6 font-semibold text-white hover:bg-white/10"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-8 sm:grid-cols-4">
          <Stat icon={<Smartphone className="size-5" />} label="MTN & Moov Money" value="Paiement mobile" />
          <Stat icon={<ShieldCheck className="size-5" />} label="Anti-fraude" value="Votes sécurisés" />
          <Stat icon={<Vote className="size-5" />} label="Vote de soutien" value={`dès ${formatFcfa(VOTE_UNIT_PRICE)}`} />
          <Stat icon={<BadgeCheck className="size-5" />} label="Reçus automatiques" value="PDF + SMS" />
        </div>
      </section>

      <section id="domaines" className="mx-auto max-w-6xl px-5 py-14">
        <header className="mb-8 flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
            Les domaines du concours
          </h2>
          <p className="text-sm text-stone-600">
            {contests.length || visibleDomains.length} catégories pour révéler les
            talents béninois.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(contests.length ? contests : []).map((contest) => (
            <Link
              key={contest.id}
              href={`/concours/${contest.slug}`}
              className="group flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                <DomainIcon name={contest.domain.icon} className="size-6" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-stone-900">
                  {contest.domain.name}
                </h3>
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
                <div>
                  <dt className="inline">Candidats : </dt>
                  <dd className="inline font-medium text-stone-700">
                    {contest._count.candidates}
                  </dd>
                </div>
              </dl>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-clay-700 group-hover:gap-2">
                Voir le concours <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}

          {!contests.length &&
            visibleDomains.map((domain) => (
              <div
                key={domain.id}
                className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                  <DomainIcon name={domain.icon} className="size-6" />
                </span>
                <h3 className="text-lg font-semibold text-stone-900">{domain.name}</h3>
                <p className="text-sm text-stone-600">{domain.description}</p>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-clay-700">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {label}
        </span>
      </span>
      <span className="text-sm font-semibold text-stone-900">{value}</span>
    </div>
  );
}
