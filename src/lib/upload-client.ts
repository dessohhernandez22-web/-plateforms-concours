import { upload } from "@vercel/blob/client";

export type UploadKind = "candidate-media" | "guardian-consent" | "payment-proof";

export type UploadedMedia = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  mimeType: string;
  isPublic: boolean;
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};

export const BLOB_UPLOAD_MODE = process.env.NEXT_PUBLIC_UPLOAD_MODE === "blob";

export async function uploadMediaFile(file: File, kind: UploadKind): Promise<UploadedMedia> {
  if (!BLOB_UPLOAD_MODE) {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);

    const response = await fetch("/api/upload", { method: "POST", body });
    const payload = (await response.json()) as UploadedMedia & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Échec de l'envoi.");
    return payload;
  }

  const extension = EXTENSIONS[file.type] ?? "bin";
  const pathname = `uploads/${crypto.randomUUID()}.${extension}`;

  const blob = await upload(pathname, file, {
    access: kind === "candidate-media" ? "public" : "private",
    handleUploadUrl: "/api/upload",
    clientPayload: JSON.stringify({
      kind,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }),
    contentType: file.type,
    multipart: file.size > 5 * 1024 * 1024,
  });

  const response = await fetch("/api/upload/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pathname: blob.pathname }),
  });
  const payload = (await response.json()) as UploadedMedia & { error?: string };
  if (!response.ok || !payload.id) {
    throw new Error(payload.error ?? "Échec de la validation du fichier.");
  }
  return payload;
}
