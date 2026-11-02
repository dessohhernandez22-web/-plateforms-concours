import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { syncContestLifecycle } from "@/lib/contest-lifecycle";
import { prisma } from "@/lib/db";
import { cleanupRateLimits } from "@/lib/rate-limit";

function safeEqual(value: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(authorization, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const updated = await syncContestLifecycle();
  const now = new Date();
  const usedTokenCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staleMediaCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staleMedia = await prisma.media.findMany({
    where: { status: "PENDING", createdAt: { lt: staleMediaCutoff } },
    select: { id: true },
  });
  await Promise.all([
    cleanupRateLimits(),
    prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { lt: usedTokenCutoff } }] },
    }),
    staleMedia.length
      ? prisma.media.deleteMany({ where: { id: { in: staleMedia.map((media) => media.id) } } })
      : Promise.resolve(),
  ]);
  return NextResponse.json({ ok: true, ...updated, staleMediaRemoved: staleMedia.length });
}