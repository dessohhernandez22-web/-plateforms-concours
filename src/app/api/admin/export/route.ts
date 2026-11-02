import type { NextRequest } from "next/server";

import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ExportType = "candidatures" | "paiements" | "resultats";

const EXPORT_TYPES: ExportType[] = ["candidatures", "paiements", "resultats"];

function isExportType(value: string): value is ExportType {
  return EXPORT_TYPES.includes(value as ExportType);
}

function iso(date: Date | null | undefined): string {
  return date ? date.toISOString() : "";
}

async function buildCandidaturesCsv(): Promise<string> {
  const candidates = await prisma.candidate.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      contest: { select: { title: true, domain: { select: { name: true } } } },
      owner: { select: { name: true, email: true } },
    },
  });

  const headers = [
    "Nom",
    "Type",
    "Statut",
    "Domaine",
    "Concours",
    "Votes",
    "Compte",
    "E-mail",
    "Mineur",
    "Déposée le",
    "Validée le",
  ];

  const rows = candidates.map((candidate) => [
    candidate.displayName,
    candidate.type === "TEAM" ? "Équipe" : "Individuel",
    candidate.status,
    candidate.contest.domain.name,
    candidate.contest.title,
    candidate.votesCount,
    candidate.owner?.name ?? "",
    candidate.owner?.email ?? "",
    candidate.isMinor ? "Oui" : "Non",
    iso(candidate.submittedAt ?? candidate.createdAt),
    iso(candidate.approvedAt),
  ]);

  return toCsv(headers, rows);
}

async function buildPaiementsCsv(): Promise<string> {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      candidate: {
        select: {
          displayName: true,
          contest: { select: { title: true, domain: { select: { name: true } } } },
        },
      },
      receipt: { select: { number: true } },
    },
  });

  const headers = [
    "Référence",
    "Objet",
    "Fournisseur",
    "Statut",
    "Montant",
    "Devise",
    "Payeur",
    "Téléphone",
    "E-mail",
    "Candidat",
    "Domaine",
    "Concours",
    "Reçu",
    "Créé le",
    "Payé le",
    "Motif d'échec",
  ];

  const rows = payments.map((payment) => [
    payment.reference,
    payment.purpose,
    payment.provider,
    payment.status,
    payment.amount,
    payment.currency,
    payment.payerName,
    payment.payerPhone,
    payment.payerEmail ?? "",
    payment.candidate?.displayName ?? "",
    payment.candidate?.contest.domain.name ?? "",
    payment.candidate?.contest.title ?? "",
    payment.receipt?.number ?? "",
    iso(payment.createdAt),
    iso(payment.paidAt),
    payment.failureReason ?? "",
  ]);

  return toCsv(headers, rows);
}

async function buildResultatsCsv(): Promise<string> {
  const results = await prisma.contestResult.findMany({
    orderBy: [{ contest: { title: "asc" } }, { rank: "asc" }],
    include: {
      candidate: { select: { displayName: true } },
      contest: {
        select: {
          title: true,
          publishedAt: true,
          domain: { select: { name: true } },
        },
      },
    },
  });

  const headers = [
    "Concours",
    "Domaine",
    "Rang",
    "Candidat",
    "Votes",
    "Publié le",
  ];

  const rows = results.map((result) => [
    result.contest.title,
    result.contest.domain.name,
    result.rank,
    result.candidate.displayName,
    result.votes,
    iso(result.contest.publishedAt),
  ]);

  return toCsv(headers, rows);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("Non autorisé.", { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "";
  if (!isExportType(type)) {
    return new Response("Type d'export inconnu.", { status: 400 });
  }

  const csv =
    type === "candidatures"
      ? await buildCandidaturesCsv()
      : type === "paiements"
        ? await buildPaiementsCsv()
        : await buildResultatsCsv();

  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
