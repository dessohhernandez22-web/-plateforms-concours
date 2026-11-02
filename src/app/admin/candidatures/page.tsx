import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, FileText, ShieldAlert, XCircle } from "lucide-react";

import { canCandidateBeApproved } from "@/lib/candidate-approval";
import { decryptPii } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import {
  approveCandidateAction,
  rejectCandidateAction,
} from "@/server/actions/candidate";

export const metadata: Metadata = { title: "Candidatures — Administration" };
export const dynamic = "force-dynamic";

export default async function AdminCandidatesPage() {
  const candidates = await prisma.candidate.findMany({
    where: { status: "PENDING" },
    orderBy: { submittedAt: "asc" },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      contest: { include: { domain: true } },
      guardianConsentMedia: true,
      media: { where: { type: { in: ["IMAGE", "VIDEO"] } } },
      teamMembers: true,
      registrationPayment: true,
    },
  });

  return (
    <main>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Candidatures en attente</h1>
          <p className="text-sm text-stone-600">Vérifiez les informations, l&apos;autorisation parentale des mineurs, puis
          validez ou rejetez le dossier.</p>
        </div>
        <a
          href="/api/admin/export?type=candidatures"
          className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Exporter en CSV
        </a>
      </header>

      {candidates.length === 0 && (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
          Aucune candidature en attente.
        </p>
      )}

      <div className="flex flex-col gap-5">
        {candidates.map((candidate) => {
          const guardianPhone = candidate.guardianPhoneEncrypted
            ? decryptPii(candidate.guardianPhoneEncrypted)
            : null;
          const canApprove = canCandidateBeApproved({
            ...candidate,
            registrationFee: candidate.contest.registrationFee,
          });

          return (
            <article
              key={candidate.id}
              className="rounded-2xl border border-stone-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    {candidate.displayName}
                  </h2>
                  <p className="text-sm text-stone-600">
                    {candidate.contest.domain.name} ·{" "}
                    {candidate.type === "TEAM" ? "Équipe" : "Individuel"} · Déposé le{" "}
                    {formatDate(candidate.submittedAt ?? candidate.createdAt)}
                  </p>
                  <p className="text-xs text-stone-500">
                    Compte : {candidate.owner?.name} · {candidate.owner?.email}
                    {candidate.owner?.phone ? ` · ${candidate.owner.phone}` : ""}
                  </p>
                </div>
                {candidate.isMinor && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    <ShieldAlert className="size-4" /> Mineur
                  </span>
                )}
              </div>

              {candidate.bio && (
                <p className="mt-3 text-sm text-stone-600">{candidate.bio}</p>
              )}

              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-stone-500">Date de naissance</dt>
                  <dd className="font-medium text-stone-800">
                    {formatDate(candidate.birthDate)}
                  </dd>
                </div>
                {candidate.isMinor && (
                  <>
                    <div>
                      <dt className="text-xs uppercase text-stone-500">Responsable légal</dt>
                      <dd className="font-medium text-stone-800">
                        {candidate.guardianName ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-stone-500">Téléphone</dt>
                      <dd className="font-medium text-stone-800">{guardianPhone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-stone-500">
                        Autorisation parentale
                      </dt>
                      <dd>
                        {candidate.guardianConsentMedia ? (
                          <Link
                            href={`/api/media/${candidate.guardianConsentMedia.storageKey}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 font-semibold text-clay-700 underline"
                          >
                            <FileText className="size-4" /> Ouvrir le document
                          </Link>
                        ) : (
                          <span className="font-medium text-red-600">Manquante</span>
                        )}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              {candidate.teamMembers.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs uppercase text-stone-500">Membres</p>
                  <ul className="mt-1 flex flex-wrap gap-2 text-sm">
                    {candidate.teamMembers.map((member) => (
                      <li
                        key={member.id}
                        className="rounded-lg bg-stone-100 px-2.5 py-1 text-stone-700"
                      >
                        {member.fullName}
                        {member.isMinor ? " (mineur)" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {candidate.media.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {candidate.media.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/api/media/${item.storageKey}`}
                        target="_blank"
                        className="block size-20 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                      >
                        {item.type === "VIDEO" ? (
                          <span className="flex size-full items-center justify-center text-xs text-stone-500">
                            Vidéo
                          </span>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={`/api/media/${item.storageKey}`}
                            alt=""
                            className="size-full object-cover"
                          />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {!canApprove && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Paiement d&apos;inscription requis avant validation de la candidature.
                </p>
              )}

              <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-start">
                <form action={approveCandidateAction}>
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <button
                    type="submit"
                    disabled={!canApprove}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    <CheckCircle2 className="size-4" />
                    {canApprove ? "Valider la candidature" : "Validation bloquée"}
                  </button>
                </form>

                <form
                  action={rejectCandidateAction}
                  className="flex flex-1 flex-col gap-2 sm:flex-row"
                >
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <input
                    name="reason"
                    placeholder="Motif du rejet"
                    className="h-10 flex-1 rounded-xl border border-stone-300 px-3 text-sm focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <XCircle className="size-4" /> Rejeter
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
