import { del, get, head } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { hasMagicBytes } from "@/lib/storage";

export const runtime = "nodejs";

async function hasValidSignature(
  pathname: string,
  contentType: string,
  token: string,
  access: "public" | "private",
): Promise<boolean> {
  const result = await get(pathname, { access, token });
  if (!result || result.statusCode !== 200) return false;

  const reader = result.stream.getReader();
  try {
    const { value } = await reader.read();
    if (!value) return false;
    return hasMagicBytes(Buffer.from(value.subarray(0, 16)), contentType);
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Stockage Blob non configuré." }, { status: 503 });
  }

  let pathname: string | undefined;
  try {
    const body = (await request.json()) as { pathname?: unknown };
    if (typeof body.pathname === "string") pathname = body.pathname;
  } catch {
    // handled below
  }

  if (!pathname) {
    return NextResponse.json({ error: "Chemin de fichier manquant." }, { status: 400 });
  }

  const media = await prisma.media.findUnique({ where: { storageKey: pathname } });
  if (!media || media.uploaderId !== session.user.id) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  if (media.status === "VALIDATED" && media.url) {
    return NextResponse.json({
      id: media.id,
      url: media.url,
      type: media.type,
      mimeType: media.mimeType,
      isPublic: media.isPublic,
    });
  }

  if (media.status === "REJECTED") {
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }

  let blob;
  try {
    blob = await head(pathname, { token });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const contentType = blob.contentType;
  const isImage = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(contentType);
  const isVideo = (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(contentType);
  const isDocument = (ACCEPTED_DOCUMENT_TYPES as readonly string[]).includes(contentType);

  const valid = media.isPublic ? isImage || isVideo : isDocument;
  const maximumSizeInBytes = media.isPublic
    ? isVideo
      ? MAX_VIDEO_BYTES
      : MAX_IMAGE_BYTES
    : MAX_DOCUMENT_BYTES;

  const signatureOk = valid
    ? await hasValidSignature(
        pathname,
        contentType,
        token,
        media.isPublic ? "public" : "private",
      ).catch(() => false)
    : false;

  if (!valid || !signatureOk || blob.size <= 0 || blob.size > maximumSizeInBytes) {
    await prisma.media.update({ where: { id: media.id }, data: { status: "REJECTED" } });
    await del(pathname, { token }).catch(() => undefined);
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }

  const type = media.isPublic ? (isVideo ? "VIDEO" : "IMAGE") : "DOCUMENT";
  const url = media.isPublic ? blob.url : `/api/media/${media.storageKey}`;

  const updated = await prisma.media.update({
    where: { id: media.id },
    data: {
      status: "VALIDATED",
      url,
      type,
      mimeType: contentType,
      sizeBytes: blob.size,
      checksum: blob.etag,
    },
    select: { id: true, url: true, type: true, mimeType: true, isPublic: true },
  });

  if (!updated.url) {
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }

  return NextResponse.json(updated);
}
