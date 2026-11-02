import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate, formatFcfa } from "@/lib/utils";

export const metadata: Metadata = { title: "Mes candidatures" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  DRAFT: {
    label: "Brouillon",
    className: "bg-stone-100 text-stone-700",
    icon: <Clock className="size-4" />,
  },
  PENDING: {
    label: "En attente de validation",
    className: "bg-amber-100 text-amber-800",
    icon: <Clock className="size-4" />,
  },
  APPROVED: {
    label: "Validée",
    className: "bg-green-100 text-green-800",
    icon: <CheckCircle2 className="size-4" />,
  },
  REJECTED: {
    label: "Rejetée",
    className: "bg-red-100 text-red-800",
    icon: <XCircle className="size-4" />,
  },
  DISQUALIFIED: {
    label: "Disqualifiée",
    className: "bg-red-100 text-red-800",
    icon: <XCircle className="size-4" />,
  },
};

export default async function MyCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const user = await requireUser();
  const { nouveau } = await searchParams;

  const candidates = await prisma.candidate.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      contest: { include: { domain: true } },
      registrationPayment: { include: { receipt: true } },
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-clay-700">Mon espace</p>
          <h1 className="text-2xl font-bold text-stone-900">Mes candidatures</h1>
        </div>
        <Link
          href="/concours"
          className="rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-700"
        >
          Nouvelle candidature
        </Link>
      </header>

      {nouveau && (
        <p className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Votre dossier a bien été envoyé. Il est en attente de validation par
          l&apos;organisation.
        </p>
      )}

      {candidates.length ? (
        <ul className="flex flex-col gap-4">
          {candidates.map((candidate) => {
            const status = STATUS[candidate.status] ?? STATUS.DRAFT;
            return (
              <li
                key={candidate.id}
                className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-stone-900">{candidate.displayName}</h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600">
                    {candidate.contest.domain.name} · {candidate.type === "TEAM" ? "Équipe" : "Individuel"}
                  </p>
                  <p className="text-xs text-stone-500">
                    Déposée le {formatDate(candidate.submittedAt ?? candidate.createdAt)} ·{" "}
                    {candidate.votesCount} voix · Frais{" "}
                    {formatFcfa(candidate.contest.registrationFee)}
                  </p>
                  {candidate.status === "REJECTED" && candidate.rejectionReason && (
                    <p className="text-xs text-red-600">Motif : {candidate.rejectionReason}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {candidate.contest.registrationFee > 0 &&
                    !["APPROVED", "REJECTED", "DISQUALIFIED"].includes(candidate.status) &&
                    candidate.registrationPayment?.status !== "SUCCESS" && (
                    <Link
                      href={`/compte/candidatures/${candidate.id}/paiement`}
                      className="rounded-lg bg-clay-600 px-3 py-2 text-sm font-semibold text-white hover:bg-clay-700"
                    >
                      <span className="flex items-center gap-1"><CreditCard className="size-4" /> Payer les frais</span>
                    </Link>
                  )}
                  <Link
                    href={`/concours/${candidate.contest.slug}`}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Voir le concours
                  </Link>
                  {candidate.status === "APPROVED" && (
                    <Link
                      href={`/candidats/${candidate.slug}`}
                      className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
                    >
                      Ma fiche publique
                    </Link>
                  )}
                  {candidate.registrationPayment?.status === "SUCCESS" && candidate.registrationPayment.receipt && (
                    <Link
                      href={`/compte/candidatures/${candidate.id}/recu`}
                      className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
                    >
                      Reçu
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="text-sm text-stone-600">
            Vous n&apos;avez pas encore déposé de candidature.
          </p>
          <Link
            href="/concours"
            className="mt-4 inline-block rounded-xl bg-clay-600 px-5 py-3 text-sm font-semibold text-white hover:bg-clay-700"
          >
            Découvrir les concours
          </Link>
        </div>
      )}
    </main>
  );
}
