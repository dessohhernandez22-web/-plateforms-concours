import { z } from "zod";

export const createVoteSchema = z.object({
  candidateSlug: z.string().trim().min(1, "Candidat requis"),
  quantity: z.coerce
    .number()
    .int("La quantité doit être un entier")
    .min(1, "Minimum 1 vote")
    .max(100, "Maximum 100 votes"),
  provider: z.enum(["SASPAY", "MANUAL"]).default("SASPAY"),
});

export type CreateVoteInput = z.infer<typeof createVoteSchema>;
