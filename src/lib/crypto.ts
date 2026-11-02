import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const secret =
  process.env.PII_ENCRYPTION_KEY ??
  process.env.AUTH_SECRET ??
  "dev-only-change-me";

const key = createHash("sha256").update(secret).digest();

function assertPiiKeyConfigured(): void {
  if (process.env.NODE_ENV !== "production") return;

  const configured = process.env.PII_ENCRYPTION_KEY;
  if (!configured || configured.length < 32) {
    throw new Error(
      "PII_ENCRYPTION_KEY doit être défini avec au moins 32 caractères en production.",
    );
  }
}

export function encryptPii(value: string): string {
  assertPiiKeyConfigured();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptPii(payload: string): string | null {
  assertPiiKeyConfigured();
  try {
    const [version, iv, tag, encrypted] = payload.split(".");
    if (version !== "v1" || !iv || !tag || !encrypted) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
