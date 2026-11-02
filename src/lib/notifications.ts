import type { NotificationChannel, NotificationStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const templates: Record<
  string,
  {
    subject: string;
    text: (context?: { name?: string | null; amount?: number; link?: string }) => string;
  }
> = {
  candidate_approved: {
    subject: "Votre candidature a été validée",
    text: ({ name } = {}) =>
      `Bonjour ${name ?? ""},\n\nVotre candidature a été validée. Vous pouvez désormais suivre l'avancement du concours.`,
  },
  candidate_rejected: {
    subject: "Votre candidature a été revue",
    text: ({ name } = {}) =>
      `Bonjour ${name ?? ""},\n\nVotre candidature n'a pas été retenue pour le moment. Veuillez vérifier les informations envoyées et recommencer si nécessaire.`,
  },
  payment_validated: {
    subject: "Paiement confirmé",
    text: ({ name } = {}) =>
      `Bonjour ${name ?? ""},\n\nVotre paiement a bien été validé. Un reçu a été généré pour votre dossier.`,
  },
  vote_confirmed: {
    subject: "Vote confirmé",
    text: ({ name } = {}) =>
      `Bonjour ${name ?? ""},\n\nVotre vote a bien été enregistré et pris en compte. Merci pour votre soutien.`,
  },
  admin_payment_received: {
    subject: "Paiement validé par le prestataire",
    text: ({ name, amount } = {}) =>
      `Bonjour ${name ?? ""},\n\nUn paiement${
        amount ? ` de ${amount} FCFA` : ""
      } vient d'être confirmé par le prestataire. Consultez le tableau de bord pour vérifier le dossier et le reçu associé.`,
  },
  admin_payment_proof_received: {
    subject: "Nouvelle preuve de paiement à vérifier",
    text: ({ name, amount } = {}) =>
      `Bonjour ${name ?? ""},\n\nUne preuve de paiement${
        amount ? ` de ${amount} FCFA` : ""
      } a été soumise et attend votre vérification dans l'espace d'administration.`,
  },
  password_reset: {
    subject: "Réinitialisation de votre mot de passe",
    text: ({ name, link } = {}) =>
      `Bonjour ${name ?? ""},\n\nUtilisez ce lien pour choisir un nouveau mot de passe : ${
        link ?? ""
      }\n\nCe lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
  },
};

export async function createNotificationLog({
  userId,
  paymentId,
  channel,
  recipient,
  template,
  status = "PENDING",
  providerRef,
  error,
}: {
  userId?: string | null;
  paymentId?: string | null;
  channel: NotificationChannel;
  recipient: string;
  template: string;
  status?: NotificationStatus;
  providerRef?: string | null;
  error?: string | null;
}) {
  return prisma.notificationLog.create({
    data: {
      userId: userId ?? null,
      paymentId: paymentId ?? null,
      channel,
      recipient,
      template,
      status,
      providerRef: providerRef ?? null,
      error: error ?? null,
    },
  });
}

export async function markNotificationSent(id: string, providerRef?: string) {
  return prisma.notificationLog.update({
    where: { id },
    data: {
      status: "SENT",
      providerRef: providerRef ?? undefined,
      sentAt: new Date(),
      error: null,
    },
  });
}

export async function markNotificationFailed(id: string, error: string) {
  return prisma.notificationLog.update({
    where: { id },
    data: { status: "FAILED", error, sentAt: new Date() },
  });
}

export async function notifyUserByEmail({
  userId,
  email,
  name,
  template,
  paymentId,
  link,
}: {
  userId?: string | null;
  email: string;
  name?: string | null;
  template: string;
  paymentId?: string | null;
  link?: string;
}) {
  const templateDef = templates[template] ?? {
    subject: "Notification",
    text: ({ name } = {}) => `Bonjour ${name ?? ""},\n\nUne notification vous concerne.`,
  };

  try {
    const log = await createNotificationLog({
      userId,
      paymentId,
      channel: "EMAIL",
      recipient: email,
      template,
      status: "PENDING",
    });

    const result = await sendEmail({
      to: email,
      subject: templateDef.subject,
      text: templateDef.text({ name, link }),
    });

    if (result.ok && result.messageId) {
      return await markNotificationSent(log.id, result.messageId);
    }

    return await markNotificationFailed(log.id, result.message ?? "SMTP delivery failed");
  } catch (error) {
    console.error("Échec de la notification e-mail", error);
    return null;
  }
}
