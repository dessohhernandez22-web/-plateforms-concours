import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatFcfa } from "@/lib/utils";
import { PaymentActions } from "./payment-actions";

export const metadata: Metadata = { title: "Paiements à vérifier" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAdmin();

  const payments = await prisma.payment.findMany({
    where: {
      purpose: { in: ["REGISTRATION", "VOTE"] },
      status: { in: ["PENDING", "AWAITING_CONFIRMATION"] },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      candidate: { include: { contest: { include: { domain: true } }, owner: true } },
      voteOrder: true,
      proofMedia: true,
    },
  });

  return (
    <main>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Paiements à vérifier</h1>
          <p className="text-sm text-stone-600">Vérifier les preuves de paiement et valider ou rejeter les demandes.</p>
        </div>
        <a
          href="/api/admin/export?type=paiements"
          className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Exporter en CSV
        </a>
      </header>

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="text-sm text-stone-600">Aucun paiement en attente de vérification.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {payments.map((payment) => {
            const proof = payment.proofMedia;
            return (
              <li key={payment.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-stone-900">
                        {payment.candidate?.displayName ?? "Candidature"}
                        {payment.purpose === "VOTE" && " · Vote"}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          payment.status === "AWAITING_CONFIRMATION"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {payment.status === "AWAITING_CONFIRMATION" ? "Preuve envoyée" : "En attente"}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600">
                      {payment.candidate?.contest.domain.name} · Réf. {payment.reference} ·{" "}
                      {formatFcfa(payment.amount)}
                      {payment.voteOrder ? ` · ${payment.voteOrder.quantity} vote(s)` : ""}
                    </p>
                    <p className="text-xs text-stone-500">
                      Payeur : {payment.payerName} · {payment.payerPhone} · Créé le{" "}
                      {formatDate(payment.createdAt)}
                      {payment.submittedAt ? ` · Envoyé le ${formatDate(payment.submittedAt)}` : ""}
                    </p>
                    {payment.declaredTransactionId && (
                      <p className="text-xs text-stone-500">
                        N° transaction déclaré : {payment.declaredTransactionId}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {payment.candidate && (
                      <Link
                        href={`/candidats/${payment.candidate.slug}`}
                        className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Voir la fiche
                      </Link>
                    )}
                    {proof?.url && (
                      <a
                        href={proof.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Voir la preuve
                      </a>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <PaymentActions
                    paymentId={payment.id}
                    purpose={payment.purpose}
                    canApprove={
                      payment.status === "AWAITING_CONFIRMATION" || Boolean(payment.proofMediaId)
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
