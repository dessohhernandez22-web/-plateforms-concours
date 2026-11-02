import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VoteForm } from "./vote-form";
import { prisma } from "@/lib/db";
import { isSaspayConfigured } from "@/lib/saspay";
import { formatFcfa } from "@/lib/utils";
import { calculateVoteSummary } from "@/lib/vote-utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    select: { displayName: true },
  });

  return { title: candidate ? `Voter pour ${candidate.displayName}` : "Vote introuvable" };
}

export default async function CandidateVotePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { slug } = await params;
  const { submitted } = await searchParams;

  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    include: {
      contest: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          voteUnitPrice: true,
          votingOpenAt: true,
          votingCloseAt: true,
        },
      },
    },
  });

  if (!candidate || candidate.status !== "APPROVED") notFound();

  const isVotingOpen =
    ["PUBLISHED", "REGISTRATION_CLOSED"].includes(candidate.contest.status) &&
    new Date() >= candidate.contest.votingOpenAt &&
    new Date() <= candidate.contest.votingCloseAt;

  const summary = calculateVoteSummary(1, candidate.contest.voteUnitPrice);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-700">Vote payant</p>
        <h1 className="mt-3 text-2xl font-bold text-stone-900">Voter pour {candidate.displayName}</h1>
        <p className="mt-2 text-sm text-stone-600">Concours : {candidate.contest.title}</p>

        {submitted && (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Preuve de paiement envoyée. Votre vote sera comptabilisé dès validation par
            l&apos;organisation.
          </p>
        )}

        <div className="mt-6 rounded-xl bg-stone-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Tarif</p>
          <p className="mt-2 text-2xl font-bold text-clay-700">
            {formatFcfa(summary.unitPrice)} par vote
          </p>
        </div>

        {!isVotingOpen ? (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            La période de vote n&apos;est pas ouverte pour ce concours.
          </p>
        ) : (
          <VoteForm
            candidateSlug={candidate.slug}
            unitPrice={candidate.contest.voteUnitPrice}
            candidateName={candidate.displayName}
            saspayEnabled={isSaspayConfigured()}
          />
        )}
      </div>
    </main>
  );
}
