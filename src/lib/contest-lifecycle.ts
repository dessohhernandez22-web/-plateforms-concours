import { prisma } from "@/lib/db";

export async function syncContestLifecycle(contestId?: string, now = new Date()) {
  const scope = contestId ? { id: contestId } : {};
  const votingClosed = await prisma.contest.updateMany({
    where: {
      ...scope,
      status: { in: ["PUBLISHED", "REGISTRATION_CLOSED"] },
      votingCloseAt: { lte: now },
    },
    data: { status: "VOTING_CLOSED" },
  });
  const registrationClosed = await prisma.contest.updateMany({
    where: {
      ...scope,
      status: "PUBLISHED",
      registrationCloseAt: { lte: now },
      votingCloseAt: { gt: now },
    },
    data: { status: "REGISTRATION_CLOSED" },
  });

  return { registrationClosed: registrationClosed.count, votingClosed: votingClosed.count };
}