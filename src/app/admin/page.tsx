import Link from "next/link";
import type { Metadata } from "next";
import { Clock, FileText, Users, Vote } from "lucide-react";

import { prisma } from "@/lib/db";
import { formatFcfa } from "@/lib/utils";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [
    pendingCandidates,
    approvedCandidates,
    totalVotes,
    pendingPayments,
    contests,
    collected,
  ] = await Promise.all([
    prisma.candidate.count({ where: { status: "PENDING" } }),
    prisma.candidate.count({ where: { status: "APPROVED" } }),
    prisma.vote.aggregate({ _sum: { quantity: true } }),
    prisma.payment.count({ where: { status: { in: ["PENDING", "AWAITING_CONFIRMATION"] } } }),
    prisma.contest.count(),
    prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
  ]);

  return (
    <main>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Tableau de bord</h1>
        <p className="text-sm text-stone-600">
          Suivi des inscriptions, paiements et votes de la plateforme.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          icon={<Clock className="size-5" />}
          label="Candidatures en attente"
          value={String(pendingCandidates)}
          href="/admin/candidatures"
        />
        <Stat
          icon={<Users className="size-5" />}
          label="Candidats validés"
          value={String(approvedCandidates)}
        />
        <Stat
          icon={<Vote className="size-5" />}
          label="Votes comptabilisés"
          value={String(totalVotes._sum.quantity ?? 0)}
        />
        <Stat
          icon={<FileText className="size-5" />}
          label="Paiements à vérifier"
          value={String(pendingPayments)}
          href="/admin/paiements"
        />
      </div>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Concours</h2>
        <p className="mb-4 text-sm text-stone-600">
          {contests} concours configurés. Les inscriptions se font sur les fiches publiques.
        </p>
        <Link
          href="/admin/candidatures"
          className="inline-block rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-700"
        >
          Valider les candidatures
        </Link>
      </section>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-stone-900">Paiements</h2>
        <p className="mb-4 text-sm text-stone-600">
          Paiements Saspay et Mobile Money vérifiés par l&apos;administration. Total encaissé :{" "}
          <span className="font-semibold text-stone-900">
            {formatFcfa(collected._sum.amount ?? 0)}
          </span>
          .
        </p>
        <Link
          href="/admin/paiements"
          className="inline-block rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Gérer les paiements
        </Link>
      </section>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-5">
      <span className="text-clay-700">{icon}</span>
      <span className="text-2xl font-bold text-stone-900">{value}</span>
      <span className="text-xs font-medium text-stone-500">{label}</span>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
