import { z } from "zod";

function isValidPhone(value: string): boolean {
  if (value === "") return true;
  const normalized = value.replace(/[\s.-]/g, "");
  return /^(?:\+229)?(?:[0-9]{8}|[0-9]{10})$/.test(normalized);
}

export const createRegistrationPaymentSchema = z.object({
  candidateId: z.string().min(1),
  payerName: z.string().trim().min(2, "Nom trop court").max(80),
  payerPhone: z
    .string()
    .trim()
    .min(1, "Numéro requis")
    .refine(isValidPhone, "Numéro invalide"),
  provider: z.enum(["SASPAY", "MANUAL"]).default("SASPAY"),
});

export type CreateRegistrationPaymentInput = z.infer<typeof createRegistrationPaymentSchema>;

export const submitPaymentProofSchema = z.object({
  paymentId: z.string().min(1),
  declaredTransactionId: z.string().trim().max(80).optional().default(""),
  proofMediaId: z.string().trim().min(1, "Preuve de paiement requise"),
});

export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;

export const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(500).optional().default(""),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
