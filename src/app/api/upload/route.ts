import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_REQUEST_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { enforceRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { saveUpload, UploadError } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadKind = "candidate-media" | "guardian-consent" | "payment-proof";

type ClientPayload = {
  kind: UploadKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

const PATHNAME_PATTERN = /^uploads\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

function parseClientPayload(raw: string | null): ClientPayload {
  if (!raw) throw new Error("Métadonnées d'envoi manquantes.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Métadonnées d'envoi invalides.");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("Métadonnées d'envoi invalides.");
  const value = parsed as Record<string, unknown>;
  const kind = value.kind;
  if (kind !== "candidate-media" && kind !== "guardian-consent" && kind !== "payment-proof") {
    throw new Error("Type d'envoi invalide.");
  }

  const originalName = typeof value.originalName === "string" ? value.originalName.slice(0, 255) : "";
  const mimeType = typeof value.mimeType === "string" ? value.mimeType : "";
  const sizeBytes = typeof value.sizeBytes === "number" ? value.sizeBytes : 0;

  return { kind, originalName, mimeType, sizeBytes };
}

function uploadRules(payload: ClientPayload) {
  const isPrivateDocument = payload.kind !== "candidate-media";
  const isVideo = (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(payload.mimeType);
  const allowedContentTypes = isPrivateDocument
    ? [...ACCEPTED_DOCUMENT_TYPES]
    : [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];
  const maximumSizeInBytes = isPrivateDocument
    ? MAX_DOCUMENT_BYTES
    : isVideo
      ? MAX_VIDEO_BYTES
      : MAX_IMAGE_BYTES;

  if (!(allowedContentTypes as readonly string[]).includes(payload.mimeType)) {
    throw new Error("Format non accepté pour ce type de fichier.");
  }
  if (payload.sizeBytes <= 0 || payload.sizeBytes > maximumSizeInBytes) {
    throw new Error("Fichier trop volumineux.");
  }

  const type = isPrivateDocument ? "DOCUMENT" : isVideo ? "VIDEO" : "IMAGE";
  const label =
    payload.kind === "guardian-consent"
      ? "Autorisation parentale"
      : payload.kind === "payment-proof"
        ? "Preuve de paiement"
        : null;

  return { isPrivateDocument, allowedContentTypes, maximumSizeInBytes, type, label } as const;
}

async function handleBlobUpload(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Stockage Blob non configuré." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Authentification requise.");

        const rateLimit = await enforceRateLimit(`upload:${session.user.id}`, 30, 60 * 60);
        if (!rateLimit.ok) {
          throw new Error(rateLimitMessage(rateLimit.retryAfterSeconds));
        }

        if (!PATHNAME_PATTERN.test(pathname)) throw new Error("Chemin de fichier invalide.");

        const payload = parseClientPayload(clientPayload);
        const rules = uploadRules(payload);

        const media = await prisma.media.create({
          data: {
            uploaderId: session.user.id,
            type: rules.type,
            status: "PENDING",
            storageKey: pathname,
            originalName: payload.originalName || null,
            label: rules.label,
            isPublic: !rules.isPrivateDocument,
            mimeType: payload.mimeType,
            sizeBytes: payload.sizeBytes,
          },
          select: { id: true },
        });

        return {
          allowedContentTypes: rules.allowedContentTypes,
          maximumSizeInBytes: rules.maximumSizeInBytes,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ mediaId: media.id }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l'envoi du fichier.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function handleLocalUpload(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(`upload:${user.id}`, 30, 60 * 60);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: rateLimitMessage(rateLimit.retryAfterSeconds) },
      { status: 429 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_REQUEST_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux." }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }

  if (kind !== "candidate-media" && kind !== "guardian-consent" && kind !== "payment-proof") {
    return NextResponse.json({ error: "Type d'envoi invalide." }, { status: 400 });
  }

  try {
    const stored = await saveUpload(file, kind);
    const media = await prisma.media.create({
      data: {
        uploaderId: user.id,
        type: stored.type,
        status: "VALIDATED",
        storageKey: stored.storageKey,
        url: `/api/media/${stored.storageKey}`,
        originalName: stored.originalName,
        label:
          kind === "guardian-consent"
            ? "Autorisation parentale"
            : kind === "payment-proof"
              ? "Preuve de paiement"
              : null,
        isPublic: stored.isPublic,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        checksum: stored.checksum,
      },
      select: { id: true, url: true, type: true, mimeType: true, isPublic: true },
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("upload", error);
    return NextResponse.json({ error: "Échec de l'envoi du fichier." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return handleBlobUpload(request);
  }
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_UPLOAD_MODE === "blob"
  ) {
    return NextResponse.json(
      { error: "Le stockage local des fichiers n'est pas disponible dans cet environnement." },
      { status: 503 },
    );
  }
  return handleLocalUpload(request);
}
