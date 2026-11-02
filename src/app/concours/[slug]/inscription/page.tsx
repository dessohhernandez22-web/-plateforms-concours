import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { DomainIcon } from "@/components/domain-icon";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatFcfa } from "@/lib/utils";

import { CandidateRegistrationForm } from "./registration-form";

type Params = { slug: string };

export const metadata: Metadata = { title: "Inscription au concours" };
export const dynamic = "force-dynamic";

export default async function ContestRegistrationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  const contest = await prisma.contest.findUnique({
    where: { slug },
    include: { domain: true },
  });
  if (!contest) notFound();

  const session = await auth();
  const nextPath = `/concours/${contest.slug}/inscription`;
  if (!session?.user) {
    redirect(`/connexion?next=${encodeURIComponent(nextPath)}`);
  }

  if (session.user.role === "ORGANIZER") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-14">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Un compte organisateur ne peut pas déposer une candidature. Utilisez un compte
          candidat.
        </p>
      </main>
    );
  }

  const now = new Date();
  const open =
    contest.status === "PUBLISHED" &&
    now >= contest.registrationOpenAt &&
    now <= contest.registrationCloseAt;

  if (!open) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-14">
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h1 className="text-xl font-bold text-stone-900">Inscriptions fermées</h1>
          <p className="mt-2 text-sm text-stone-600">
            La période d&apos;inscription pour ce concours est terminée. Clôture :
            {" "}
            {formatDate(contest.registrationCloseAt)}.
          </p>
          <Link
            href={`/concours/${contest.slug}`}
            className="mt-4 inline-block text-sm font-semibold text-clay-700 underline"
          >
            Retour à la fiche du concours
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <nav className="mb-4 text-sm text-stone-500">
        <Link href="/concours" className="hover:text-clay-700">
          Concours
        </Link>{" "}
        /{" "}
        <Link href={`/concours/${contest.slug}`} className="hover:text-clay-700">
          {contest.domain.name}
        </Link>{" "}
        / <span className="text-stone-700">Inscription</span>
      </nav>

      <header className="mb-8 flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
          <DomainIcon name={contest.domain.icon} className="size-6" />
        </span>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
          Inscription — {contest.domain.name}
        </h1>
        <p className="text-sm text-stone-600">
          Frais : {formatFcfa(contest.registrationFee)} · Vote :{" "}
          {formatFcfa(contest.voteUnitPrice)} / voix · Clôture :{" "}
          {formatDate(contest.registrationCloseAt)}
        </p>
      </header>

      <CandidateRegistrationForm
        contest={{
          id: contest.id,
          title: contest.title,
          domainName: contest.domain.name,
          registrationFee: contest.registrationFee,
          voteUnitPrice: contest.voteUnitPrice,
        }}
      />
    </main>
  );
}
