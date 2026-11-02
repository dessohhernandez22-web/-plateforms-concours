import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { isSaspayConfigured } from "@/lib/saspay";
import { requireUser } from "@/lib/session";
import { formatDate, formatFcfa } from "@/lib/utils";
import { PaymentForm } from "./payment-form";

export const metadata: Metadata = { title: "Paiement des frais d'inscription" };
export const dynamic = "force-dynamic";

export default async function CandidatePaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { submitted } = await searchParams;

  const candidate = await prisma.candidate.findFirst({
    where: { id, ownerId: user.id },
    include: {
      contest: { include: { domain: true } },
      registrationPayment: true,
    },
  });

  if (!candidate) notFound();

  const previousPayment = candidate.registrationPayment;
  const previousPaymentIsTerminal =
    previousPayment !== null &&
    ["FAILED", "CANCELLED", "REFUNDED"].includes(previousPayment.status);
  const retryablePayment = previousPaymentIsTerminal ? null : previousPayment;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold text-clay-700">Mon espace</p>
        <h1 className="text-2xl font-bold text-stone-900">Paiement des frais d&apos;inscription</h1>
        <p className="mt-1 text-sm text-stone-600">
          {candidate.displayName} · {candidate.contest.domain.name} ·{" "}
          {formatFcfa(candidate.contest.registrationFee)}
        </p>
      </header>

      {submitted && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Preuve de paiement envoyée. Elle sera vérifiée par l&apos;organisation dans les plus brefs délais.
        </p>
      )}

      {candidate.registrationPayment?.status === "SUCCESS" ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-900">Paiement validé</h2>
          <p className="mt-1 text-sm text-green-800">
            Référence : {candidate.registrationPayment.reference} · Montant :{" "}
            {formatFcfa(candidate.registrationPayment.amount)}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/compte/candidatures/${candidate.id}/recu`}
              className="inline-block rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
            >
              Voir le reçu
            </Link>
            <Link
              href="/compte/candidatures"
              className="inline-block rounded-xl border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
            >
              Retour à mes candidatures
            </Link>
          </div>
        </section>
      ) : candidate.registrationPayment?.status === "AWAITING_CONFIRMATION" ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">En attente de vérification</h2>
          <p className="mt-1 text-sm text-amber-800">
            Référence : {candidate.registrationPayment.reference} · Preuve envoyée le{" "}
            {formatDate(candidate.registrationPayment.submittedAt ?? candidate.registrationPayment.updatedAt)}.
          </p>
          <Link
            href="/compte/candidatures"
            className="mt-4 inline-block rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            Retour à mes candidatures
          </Link>
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          {previousPaymentIsTerminal && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Votre précédent paiement n&apos;a pas été validé
              {previousPayment?.failureReason ? ` : ${previousPayment.failureReason}` : "."} Vous
              pouvez effectuer un nouveau paiement.
            </p>
          )}
          <PaymentForm
            candidateId={candidate.id}
            amount={candidate.contest.registrationFee}
            saspayEnabled={isSaspayConfigured()}
            existingPayment={
              retryablePayment
                ? {
                    ...retryablePayment,
                    checkoutUrl:
                      retryablePayment.metadata &&
                            typeof retryablePayment.metadata === "object" &&
                            !Array.isArray(retryablePayment.metadata) &&
                            typeof retryablePayment.metadata.checkoutUrl === "string"
                          ? retryablePayment.metadata.checkoutUrl
                          : null,
                  }
                : null
            }
          />
        </div>
      )}
    </main>
  );
}
