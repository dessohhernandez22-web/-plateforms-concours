import { z } from "zod";

const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function parsePortoNovoDate(value: string): Date {
  return new Date(`${value}:00+01:00`);
}

const requiredDateTime = z
  .string()
  .trim()
  .regex(dateTimePattern, "Date et heure invalides")
  .transform(parsePortoNovoDate)
  .refine((value) => !Number.isNaN(value.getTime()), "Date et heure invalides");

const optionalDateTime = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value === "" || dateTimePattern.test(value), "Date et heure invalides")
  .transform((value) => (value === "" ? null : parsePortoNovoDate(value)))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), "Date et heure invalides");

const slugField = z
  .string()
  .trim()
  .max(120)
  .optional()
  .default("")
  .transform((value) => value.toLowerCase());

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .default("")
  .refine((value) => value === "" || z.url().safeParse(value).success, "URL invalide");

export const eventStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const contestStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "REGISTRATION_CLOSED",
  "VOTING_CLOSED",
  "RESULTS_PUBLISHED",
  "ARCHIVED",
]);

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(3, "Titre trop court").max(140),
    slug: slugField,
    description: z.string().trim().min(10, "Description trop courte").max(5000),
    status: eventStatusSchema.default("DRAFT"),
    organizerId: z.string().trim().optional().default(""),
    startsAt: optionalDateTime,
    endsAt: optionalDateTime,
    coverUrl: optionalUrl,
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.startsAt <= data.endsAt, {
    path: ["endsAt"],
    message: "La date de fin doit être postérieure à la date de début.",
  });

export const contestFormSchema = z
  .object({
    eventId: z.string().trim().min(1, "Événement requis"),
    domainId: z.string().trim().min(1, "Domaine requis"),
    title: z.string().trim().min(3, "Titre trop court").max(140),
    slug: slugField,
    description: z.string().trim().min(10, "Description trop courte").max(5000),
    rules: z.string().trim().min(20, "Règlement trop court").max(10000),
    status: contestStatusSchema.default("DRAFT"),
    registrationFee: z.coerce.number().int().min(0).max(10_000_000),
    voteUnitPrice: z.coerce.number().int().min(1).max(1_000_000),
    registrationOpenAt: requiredDateTime,
    registrationCloseAt: requiredDateTime,
    votingOpenAt: requiredDateTime,
    votingCloseAt: requiredDateTime,
    resultsAt: optionalDateTime,
    maxCandidates: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine(
        (value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0),
        "Nombre de candidats invalide",
      )
      .transform((value) => (value === "" ? null : Number(value))),
    coverUrl: optionalUrl,
  })
  .refine((data) => data.registrationOpenAt <= data.registrationCloseAt, {
    path: ["registrationCloseAt"],
    message: "La clôture des inscriptions doit suivre l'ouverture.",
  })
  .refine((data) => data.registrationCloseAt <= data.votingOpenAt, {
    path: ["votingOpenAt"],
    message: "L'ouverture des votes doit suivre la clôture des inscriptions.",
  })
  .refine((data) => data.votingOpenAt <= data.votingCloseAt, {
    path: ["votingCloseAt"],
    message: "La clôture des votes doit suivre leur ouverture.",
  })
  .refine((data) => !data.resultsAt || data.resultsAt >= data.votingCloseAt, {
    path: ["resultsAt"],
    message: "La publication des résultats doit suivre la clôture des votes.",
  });

export type EventFormInput = z.infer<typeof eventFormSchema>;
export type ContestFormInput = z.infer<typeof contestFormSchema>;
