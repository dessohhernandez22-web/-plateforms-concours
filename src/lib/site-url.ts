const FALLBACK_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? FALLBACK_URL;

  try {
    return new URL(raw).origin;
  } catch {
    return FALLBACK_URL;
  }
}
