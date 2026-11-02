import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShieldCheck, Vote } from "lucide-react";

import { prisma } from "@/lib/db";
import { formatFcfa } from "@/lib/utils";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    select: { displayName: true, bio: true, contest: { select: { title: true } } },
  });
  if (!candidate) return { title: "Candidat introuvable" };
  return {
    title: candidate.displayName,
    description:
      candidate.bio?.slice(0, 160) ??
      `Découvrez la candidature de ${candidate.displayName} au concours ${candidate.contest.title}.`,
  };
}

export default async function CandidatePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    include: {
      contest: { include: { domain: true } },
      media: { where: { status: "VALIDATED" }, orderBy: { createdAt: "asc" } },
      teamMembers: true,
    },
  });

  if (!candidate || candidate.status !== "APPROVED") notFound();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <nav className="mb-4 text-sm text-stone-500">
        <Link href="/concours" className="hover:text-clay-700">
          Concours
        </Link>{" "}
        /{" "}
        <Link href={`/concours/${candidate.contest.slug}`} className="hover:text-clay-700">
          {candidate.contest.domain.name}
        </Link>
      </nav>

      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
              {candidate.displayName}
            </h1>
            <p className="text-sm text-stone-600">
              {candidate.contest.title} ·{" "}
              {candidate.type === "TEAM" ? "Équipe" : "Candidat individuel"}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-2 text-3xl font-black text-clay-700">
              <Vote className="size-6" />
              {candidate.votesCount}
            </span>
            <span className="text-xs uppercase tracking-wide text-stone-500">
              votes comptabilisés
            </span>
          </div>
        </div>

        {candidate.bio && (
          <p className="max-w-3xl whitespace-pre-line text-stone-600">{candidate.bio}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/candidats/${candidate.slug}/voter`}
            className="rounded-xl bg-clay-600 px-5 py-3 text-sm font-semibold text-white hover:bg-clay-700"
          >
            Voter pour {formatFcfa(candidate.contest.voteUnitPrice)} / vote
          </Link>
          <span className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-3 text-xs font-medium text-stone-600">
            <ShieldCheck className="size-4 text-forest" /> Votes protégés et vérifiés
          </span>
        </div>
      </header>

      {candidate.media.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">Galerie</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {candidate.media.map((item) => (
              <div
                key={item.id}
                className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-xs text-stone-500"
              >
                {item.url ? (
                  item.type === "VIDEO" ? (
                    <video src={item.url} controls className="size-full object-cover" />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.url} alt={candidate.displayName} className="size-full object-cover" />
                  )
                ) : (
                  "Média en attente"
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {candidate.type === "TEAM" && candidate.teamMembers.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">Membres de l&apos;équipe</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {candidate.teamMembers.map((member) => (
              <li
                key={member.id}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <p className="font-medium text-stone-800">{member.fullName}</p>
                {member.role && <p className="text-sm text-stone-500">{member.role}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
