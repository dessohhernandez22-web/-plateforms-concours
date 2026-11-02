import { z } from "zod";

const phoneRegex = /^(?:\+229[0-9]{8}|[0-9]{10})$/;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nom trop court").max(80),
    email: z.string().trim().toLowerCase().email("E-mail invalide"),
    phone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s.-]/g, ""))
      .refine((value) => phoneRegex.test(value), "Numéro béninois invalide (ex. 0197000000)"),
    password: z.string().min(8, "Au moins 8 caractères").max(128),
    confirmPassword: z.string(),
    role: z.literal("CANDIDATE").default("CANDIDATE"),
    acceptTerms: z.literal(true, {
      message: "Vous devez accepter les conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail invalide"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(32, "Lien invalide").max(200),
    password: z.string().min(8, "Au moins 8 caractères").max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
