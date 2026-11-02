import type { Metadata } from "next";

import { canCandidateBeApproved } from "@/lib/candidate-approval";
import { decryptPii } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { approveCandidateAction, rejectCandidateAction } from "@/server/actions/candidate";

export const metadata: Metadata = { title: "Candidatures — Organisateur" };
export const dynamic = "force-dynamic";

export default async function OrganizerCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await requireOrganizer();
  const { eventId } = await searchParams;
  const candidates = await prisma.candidate.findMany({
    where: {
      status: "PENDING",
      contest: {
        ...(eventId ? { eventId } : {}),
        ...(user.role === "ADMIN" ? {} : { event: { organizerId: user.id } }),
      },
    },
    orderBy: { submittedAt: "asc" },
    include: {
      contest: { include: { event: true, domain: true } },
      owner: { select: { name: true, email: true, phone: true } },
      registrationPayment: true,
      guardianConsentMedia: true,
      media: { where: { type: { in: ["IMAGE", "VIDEO"] } } },
      teamMembers: true,
    },
  });

  return (
    <main>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Candidatures à examiner</h1>
        <p className="text-sm text-stone-600">Les dossiers affichés appartiennent à vos événements.</p>
      </header>
      {candidates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
          Aucune candidature en attente.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {candidates.map((candidate) => {
            const eligible = canCandidateBeApproved({
              registrationFee: candidate.contest.registrationFee,
              registrationPaymentId: candidate.registrationPaymentId,
              registrationPayment: candidate.registrationPayment,
            });
            const guardianPhone = candidate.guardianPhoneEncrypted
              ? decryptPii(candidate.guardianPhoneEncrypted)
              : null;
            return (
              <li key={candidate.id} className="rounded-xl border border-stone-200 bg-white p-5">
                <h2 className="font-semibold text-stone-900">{candidate.displayName}</h2>
                <p className="text-sm text-stone-600">
                  {candidate.contest.event.title} · {candidate.contest.domain.name} · {candidate.owner?.name ?? "Candidat"}
                </p>
                <p className="text-xs text-stone-500">
                  Déposée le {formatDate(candidate.submittedAt ?? candidate.createdAt)} ·{" "}
                  {candidate.type === "TEAM" ? "Équipe" : "Individuel"}
                  {candidate.isMinor ? " · Mineur" : ""}
                  {candidate.owner?.phone ? ` · ${candidate.owner.phone}` : ""}
                </p>
                {candidate.bio && <p className="mt-2 text-sm text-stone-600">{candidate.bio}</p>}
                {candidate.isMinor && (
                  <p className="mt-2 text-sm text-amber-800">
                    Responsable légal : {candidate.guardianName ?? "—"}
                    {guardianPhone ? ` · ${guardianPhone}` : ""} ·{" "}
                    {candidate.guardianConsentMedia ? (
                      <a
                        href={`/api/media/${candidate.guardianConsentMedia.storageKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline"
                      >
                        Voir l&apos;autorisation parentale
                      </a>
                    ) : (
                      "Autorisation parentale manquante"
                    )}
                  </p>
                )}
                {candidate.teamMembers.length > 0 && (
                  <p className="mt-2 text-sm text-stone-600">
                    Équipe : {candidate.teamMembers.map((member) => member.fullName).join(", ")}
                  </p>
                )}
                {candidate.media.length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-3 text-sm">
                    {candidate.media.map((media) => (
                      <a
                        key={media.id}
                        href={`/api/media/${media.storageKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-clay-700 underline"
                      >
                        {media.type === "VIDEO" ? "Voir la vidéo" : "Voir la photo"}
                      </a>
                    ))}
                  </p>
                )}
                {!eligible && (
                  <p className="mt-3 text-sm text-amber-800">Le paiement des frais doit être confirmé avant validation.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <form action={approveCandidateAction}>
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <button disabled={!eligible} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:bg-stone-300">
                      Valider
                    </button>
                  </form>
                  <form action={rejectCandidateAction} className="flex gap-2">
                    <input type="hidden" name="candidateId" value={candidate.id} />
                    <input name="reason" aria-label="Motif du rejet" placeholder="Motif du rejet" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                    <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Rejeter</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}