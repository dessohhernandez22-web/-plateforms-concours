import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MediaType } from "@prisma/client";

import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/constants";

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".data", "uploads");

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};

export type UploadKind = "candidate-media" | "guardian-consent" | "payment-proof";

export type StoredUpload = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  type: MediaType;
  isPublic: boolean;
  checksum: string;
};

export function getBlobReadWriteToken(isPublic: boolean): string | undefined {
  return isPublic
    ? process.env.BLOB_PUBLIC_READ_WRITE_TOKEN
    : process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
}

export function hasMagicBytes(buffer: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/webp":
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "video/mp4":
    case "video/quicktime":
      return buffer.subarray(4, 8).toString("ascii") === "ftyp";
    case "video/webm":
      return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    case "application/pdf":
      return buffer.subarray(0, 4).toString("ascii") === "%PDF";
    default:
      return false;
  }
}

export class UploadError extends Error {}

export async function saveUpload(file: File, kind: UploadKind): Promise<StoredUpload> {
  if (!file.size) throw new UploadError("Le fichier est vide.");

  const mimeType = file.type || "application/octet-stream";
  const isPrivateDocument = kind !== "candidate-media";

  let maxBytes: number;
  let allowed: readonly string[];

  if (isPrivateDocument) {
    maxBytes = MAX_DOCUMENT_BYTES;
    allowed = ACCEPTED_DOCUMENT_TYPES;
  } else if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    maxBytes = MAX_IMAGE_BYTES;
    allowed = ACCEPTED_IMAGE_TYPES;
  } else if ((ACCEPTED_VIDEO_TYPES as readonly string[]).includes(mimeType)) {
    maxBytes = MAX_VIDEO_BYTES;
    allowed = ACCEPTED_VIDEO_TYPES;
  } else {
    throw new UploadError("Format non accepté. Photos : JPG, PNG, WebP. Vidéos : MP4, WebM.");
  }

  if (!allowed.includes(mimeType)) {
    throw new UploadError("Format non accepté pour ce type de fichier.");
  }

  if (file.size > maxBytes) {
    throw new UploadError(
      `Fichier trop volumineux (maximum ${Math.round(maxBytes / 1024 / 1024)} Mo).`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasMagicBytes(buffer, mimeType)) {
    throw new UploadError("Le contenu du fichier ne correspond pas au format annoncé.");
  }

  const extension = EXTENSIONS[mimeType] ?? "bin";
  const storageKey = `${randomUUID()}.${extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, storageKey), buffer);

  const type: MediaType = isPrivateDocument
    ? "DOCUMENT"
    : (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(mimeType)
      ? "VIDEO"
      : "IMAGE";

  return {
    storageKey,
    originalName: file.name,
    mimeType,
    sizeBytes: file.size,
    type,
    isPublic: !isPrivateDocument,
    checksum: createHash("sha256").update(buffer).digest("hex"),
  };
}

export async function readUpload(storageKey: string): Promise<Buffer> {
  const safeKey = path.basename(storageKey);
  return readFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, safeKey));
}
