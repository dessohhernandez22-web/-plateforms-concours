import { z } from "zod";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
function isValidPhone(value: string): boolean {
  if (value === "") return true;
  const normalized = value.replace(/[\s.-]/g, "");
  return /^(?:\+229)?(?:[0-9]{8}|[0-9]{10})$/.test(normalized);
}

export const teamMemberInputSchema = z.object({
  fullName: z.string().trim().min(2, "Nom du membre trop court").max(80),
  role: z.string().trim().max(50).optional().default(""),
  birthDate: z
    .string()
    .trim()
    .refine((value) => value === "" || isoDate.test(value), "Date invalide")
    .optional()
    .default(""),
  guardianName: z.string().trim().max(80).optional().default(""),
  guardianPhone: z.string().trim().max(20).optional().default(""),
});

export const candidateFormSchema = z.object({
  contestId: z.string().min(1, "Concours introuvable"),
  type: z.enum(["INDIVIDUAL", "TEAM"]),
  displayName: z.string().trim().min(2, "Nom trop court").max(80),
  bio: z.string().trim().max(1500).optional().default(""),
  birthDate: z.string().trim().regex(isoDate, "Date de naissance invalide"),
  guardianName: z.string().trim().max(80).optional().default(""),
  guardianPhone: z
    .string()
    .trim()
    .refine(isValidPhone, "Numéro invalide")
    .optional()
    .default(""),
  guardianEmail: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "E-mail invalide")
    .optional()
    .default(""),
  guardianConsentMediaId: z.string().trim().optional().default(""),
  mediaIds: z.array(z.string().min(1)).max(6, "6 médias maximum").default([]),
  teamMembers: z.array(teamMemberInputSchema).max(20, "20 membres maximum").default([]),
  acceptRules: z.literal(true, {
    message: "Vous devez accepter le règlement du concours",
  }),
});

export type CandidateFormInput = z.infer<typeof candidateFormSchema>;
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;
