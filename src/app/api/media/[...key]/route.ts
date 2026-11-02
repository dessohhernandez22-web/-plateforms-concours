import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getBlobReadWriteToken, readUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const storageKey = key.join("/");

  const media = await prisma.media.findUnique({
    where: { storageKey },
    include: {
      candidate: {
        select: {
          ownerId: true,
          contest: { select: { event: { select: { organizerId: true } } } },
        },
      },
      contest: { select: { event: { select: { organizerId: true } } } },
    },
  });

  if (!media || media.status === "REJECTED") {
    return new NextResponse("Média introuvable", { status: 404 });
  }

  if (!media.isPublic) {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Accès refusé", { status: 403 });
    }

    const organizerId =
      media.candidate?.contest.event.organizerId ?? media.contest?.event.organizerId ?? null;
    const isOwner = user.id === media.uploaderId;
    const isCandidateOwner = user.id === media.candidate?.ownerId;
    const isEventOrganizer = user.role === "ORGANIZER" && user.id === organizerId;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isCandidateOwner && !isEventOrganizer && !isAdmin) {
      return new NextResponse("Accès refusé", { status: 403 });
    }
  }

  const isBlobStorage = media.storageKey.startsWith("uploads/");

  if (isBlobStorage) {
    if (media.isPublic && media.url?.startsWith("http")) {
      return NextResponse.redirect(media.url, {
        status: 307,
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }

    const token = getBlobReadWriteToken(media.isPublic);
    if (!token) {
      return new NextResponse("Store Blob non configuré", { status: 503 });
    }

    const result = await get(media.storageKey, {
      access: media.isPublic ? "public" : "private",
      token,
    });
    if (!result || result.statusCode !== 200) {
      return new NextResponse("Fichier introuvable", { status: 404 });
    }

    const headers = new Headers({
      "Content-Type": media.mimeType,
      "Content-Length": String(result.blob.size),
      "Cache-Control": media.isPublic ? "public, max-age=86400" : "private, no-store",
    });

    return new NextResponse(result.stream, { status: 200, headers });
  }

  let buffer: Buffer;
  try {
    buffer = await readUpload(media.storageKey);
  } catch {
    return new NextResponse("Fichier introuvable", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": media.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": media.isPublic ? "public, max-age=86400" : "private, no-store",
  });

  const range = request.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : buffer.length - 1;
      if (start >= buffer.length) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${buffer.length}` },
        });
      }
      const safeEnd = Math.min(end, buffer.length - 1);
      const chunk = buffer.subarray(start, safeEnd + 1);
      headers.set("Content-Range", `bytes ${start}-${safeEnd}/${buffer.length}`);
      headers.set("Content-Length", String(chunk.length));
      return new NextResponse(new Uint8Array(chunk), { status: 206, headers });
    }
  }

  headers.set("Content-Length", String(buffer.length));
  return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
}
