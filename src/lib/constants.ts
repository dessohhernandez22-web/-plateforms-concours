export const SITE = {
  name: "SPP TALENT SHOWDOWN",
  shortName: "SPP Showdown",
  tagline: "Le grand rendez-vous des talents béninois",
  description:
    "Plateforme officielle d'inscription, de vote et de paiement des concours artisanaux et sportifs SPP TALENT SHOWDOWN.",
  currency: "FCFA",
  locale: "fr",
} as const;

export const VOTE_UNIT_PRICE = 100;

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@your-domain.example";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_REQUEST_BYTES = MAX_VIDEO_BYTES + 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
