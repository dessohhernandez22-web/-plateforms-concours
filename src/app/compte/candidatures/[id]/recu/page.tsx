import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate, formatFcfa } from "@/lib/utils";

export const metadata: Metadata = { title: "Reçu de paiement" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const candidate = await prisma.candidate.findFirst({
    where: { id, ownerId: user.id },
    include: {
      contest: { include: { domain: true } },
      registrationPayment: {
        include: { receipt: true },
      },
    },
  });

  if (!candidate || !candidate.registrationPayment || candidate.registrationPayment.status !== "SUCCESS") {
    notFound();
  }

  const receipt = candidate.registrationPayment.receipt;

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-800">Reçu officiel</p>
        <h1 className="mt-3 text-2xl font-bold text-stone-900">Paiement validé</h1>

        <div className="mt-6 space-y-4 rounded-xl border border-green-200 bg-white p-5 text-sm text-stone-700">
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500">Numéro du reçu</span>
            <strong className="font-semibold text-stone-900">{receipt?.number ?? "—"}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500">Candidature</span>
            <strong className="font-semibold text-stone-900">{candidate.displayName}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500">Concours</span>
            <strong className="font-semibold text-stone-900">{candidate.contest.title}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500">Référence</span>
            <strong className="font-semibold text-stone-900">{candidate.registrationPayment.reference}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500">Montant</span>
            <strong className="font-semibold text-stone-900">
              {formatFcfa(candidate.registrationPayment.amount)}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-500">Date</span>
            <strong className="font-semibold text-stone-900">
              {formatDate(receipt?.issuedAt ?? candidate.registrationPayment.paidAt ?? candidate.registrationPayment.updatedAt)}
            </strong>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <PrintButton />
          <Link
            href="/compte/candidatures"
            className="inline-block rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            Retour à mes candidatures
          </Link>
          <Link
            href={`/compte/candidatures/${candidate.id}/paiement`}
            className="inline-block rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
          >
            Voir le paiement
          </Link>
        </div>
      </div>
    </main>
  );
}
