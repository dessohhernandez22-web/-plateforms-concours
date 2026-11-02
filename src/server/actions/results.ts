"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { syncContestLifecycle } from "@/lib/contest-lifecycle";
import { requireAdmin } from "@/lib/session";

export async function publishContestResultsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const contestId = String(formData.get("contestId") ?? "").trim();

  if (!contestId) {
    return;
  }

  await syncContestLifecycle(contestId);
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      candidates: {
        where: { status: "APPROVED" },
        orderBy: { votesCount: "desc" },
        select: { id: true, displayName: true, votesCount: true },
      },
    },
  });

  if (!contest) {
    return;
  }

  if (contest.status === "RESULTS_PUBLISHED") {
    return;
  }

  if (contest.status !== "VOTING_CLOSED") {
    return;
  }

  if (contest.candidates.length === 0) {
    return;
  }

  const ranked = [...contest.candidates].sort(
    (left, right) => right.votesCount - left.votesCount || left.displayName.localeCompare(right.displayName),
  );

  await prisma.$transaction(async (tx) => {
    for (const [index, candidate] of ranked.entries()) {
      await tx.contestResult.upsert({
        where: {
          contestId_candidateId: {
            contestId: contest.id,
            candidateId: candidate.id,
          },
        },
        update: {
          rank: index + 1,
          votes: candidate.votesCount,
          publishedAt: new Date(),
        },
        create: {
          contestId: contest.id,
          candidateId: candidate.id,
          rank: index + 1,
          votes: candidate.votesCount,
          publishedAt: new Date(),
        },
      });
    }

    await tx.contest.update({
      where: { id: contest.id },
      data: { status: "RESULTS_PUBLISHED" },
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: "RESULTS_PUBLISHED",
        entityType: "Contest",
        entityId: contest.id,
        metadata: {
          contestId: contest.id,
          candidateCount: ranked.length,
        },
      },
    });
  });

  revalidatePath("/admin/resultats");
  revalidatePath("/resultats");
  revalidatePath("/concours");
}
