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

const PUBLIC_CONTEST_STATUSES = [
  "PUBLISHED",
  "REGISTRATION_CLOSED",
  "VOTING_CLOSED",
  "RESULTS_PUBLISHED",
] as const;

export default async function HomePage() {
  const [event, domains] = await Promise.all([
    prisma.event.findFirst({
      where: {
        status: "PUBLISHED",
        contests: { some: { status: { in: [...PUBLIC_CONTEST_STATUSES] } } },
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      include: {
        contests: {
          where: { status: { in: [...PUBLIC_CONTEST_STATUSES] } },
          orderBy: { domain: { sortOrder: "asc" } },
          include: {
            domain: true,
            _count: { select: { candidates: { where: { status: "APPROVED" } } } },
          },
        },
      },
    }),
    prisma.domain.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const contests = event?.contests ?? [];
  const visibleDomains = domains.length ? domains : [];
  const approvedCandidateCount = contests.reduce(
    (total, contest) => total + contest._count.candidates,
    0,
  );

  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#102d26] via-[#1f4439] to-[#8d4a27] text-white">
        <div className="hero-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <span className="w-fit border-l-2 border-[#e7b66b] pl-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
              Talents du Bénin · Inscriptions et votes en ligne
            </span>
            <h1 className="font-editorial max-w-xl text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              {SITE.name}
            </h1>
            <p className="max-w-2xl text-base text-white/90 sm:text-lg">
              {SITE.tagline}. Inscrivez-vous, présentez votre talent, et mobilisez vos supporters grâce au vote payant dès {formatFcfa(VOTE_UNIT_PRICE)}.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#domaines"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 font-semibold text-[#17372e] transition hover:bg-emerald-50"
              >
                Découvrir les concours <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/inscription"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/35 bg-white/5 px-6 font-semibold text-white transition hover:bg-white/10"
              >
                S&apos;inscrire
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md border-t border-white/30 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f1c77f]">
              {event?.title ?? "La plateforme des talents"}
            </p>
            <p className="font-editorial mt-4 text-3xl leading-tight sm:text-4xl">
              La scène est à vous.
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">
              Découvrez les concours, inscrivez votre candidature et invitez votre communauté à vous soutenir.
            </p>
            <dl className="mt-8 grid grid-cols-2 border-y border-white/20 py-5">
              <div className="pr-4">
                <dd className="font-editorial text-4xl">
                  {contests.length || visibleDomains.length}
                </dd>
                <dt className="mt-1 text-xs uppercase tracking-[0.15em] text-white/65">
                  {contests.length ? "Concours" : "Domaines"}
                </dt>
              </div>
              <div className="border-l border-white/20 pl-5">
                <dd className="font-editorial text-4xl">{approvedCandidateCount}</dd>
                <dt className="mt-1 text-xs uppercase tracking-[0.15em] text-white/65">Candidats validés</dt>
              </div>
            </dl>
            <p className="mt-5 text-sm text-white/80">
              Vote de soutien dès <span className="font-semibold text-white">{formatFcfa(VOTE_UNIT_PRICE)}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 px-5 py-6 sm:grid-cols-4">
          <Stat icon={<Smartphone className="size-5" />} label="Paiement" value="Mobile Money & Saspay" />
          <Stat icon={<ShieldCheck className="size-5" />} label="Anti-fraude" value="Votes sécurisés" />
          <Stat icon={<Vote className="size-5" />} label="Vote de soutien" value={`dès ${formatFcfa(VOTE_UNIT_PRICE)}`} />
          <Stat icon={<BadgeCheck className="size-5" />} label="Reçus" value="Disponibles en ligne" />
        </div>
      </section>

      <section id="domaines" className="mx-auto max-w-6xl px-5 py-14">
        <header className="mb-8 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Nos catégories</p>
          <h2 className="font-editorial text-3xl font-semibold text-stone-900 sm:text-4xl">
            Les domaines du concours
          </h2>
          <p className="text-sm text-stone-600">
            {contests.length || visibleDomains.length} catégories pour révéler les talents béninois.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(contests.length ? contests : []).map((contest) => (
            <Link
              key={contest.id}
              href={`/concours/${contest.slug}`}
              className="group flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-800/30 hover:shadow-[0_20px_40px_-30px_rgba(19,47,38,0.45)]"
            >
              <span className="flex size-12 items-center justify-center rounded-lg bg-emerald-50 text-forest">
                <DomainIcon name={contest.domain.icon} className="size-6" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-stone-900">{contest.domain.name}</h3>
                <p className="text-sm text-stone-600">{contest.domain.description}</p>
              </div>
              <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-500">
                <div>
                  <dt className="inline">Inscription : </dt>
                  <dd className="inline font-medium text-stone-700">{formatDate(contest.registrationCloseAt)}</dd>
                </div>
                <div>
                  <dt className="inline">Frais : </dt>
                  <dd className="inline font-medium text-stone-700">{formatFcfa(contest.registrationFee)}</dd>
                </div>
                <div>
                  <dt className="inline">Candidats : </dt>
                  <dd className="inline font-medium text-stone-700">{contest._count.candidates}</dd>
                </div>
              </dl>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-clay-700 group-hover:gap-2">
                Voir le concours <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}

          {!contests.length &&
            visibleDomains.map((domain) => (
              <Link
                key={domain.id}
                href="/concours"
                className="group flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-800/30 hover:shadow-[0_20px_40px_-30px_rgba(19,47,38,0.45)]"
              >
                <span className="flex size-12 items-center justify-center rounded-lg bg-emerald-50 text-forest">
                  <DomainIcon name={domain.icon} className="size-6" />
                </span>
                <h3 className="text-lg font-semibold text-stone-900">{domain.name}</h3>
                <p className="text-sm text-stone-600">{domain.description}</p>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-clay-700 group-hover:gap-2">
                  Voir les concours <ArrowRight className="size-4" />
                </span>
              </Link>
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
    <div className="premium-card flex flex-col gap-2 p-4">
      <span className="flex items-center gap-2 text-clay-700">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">{label}</span>
      </span>
      <span className="text-sm font-semibold text-stone-900">{value}</span>
    </div>
  );
}
