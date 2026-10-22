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

export const VOTE_PACKS = [1, 5, 10, 50, 100] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
