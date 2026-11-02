import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? "587");
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const defaultFrom = process.env.SMTP_FROM ?? process.env.MAIL_FROM ?? "noreply@localhost";

const transporter =
  smtpHost && smtpUser && smtpPassword
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: (process.env.SMTP_SECURE ?? "false") === "true",
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      })
    : null;

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  if (!transporter) {
    console.warn("[email] SMTP is not configured; email delivery skipped.");
    return { ok: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to,
      subject,
      text: text ?? "",
      html: html ?? text ?? "",
    });

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    console.error("[email] delivery failed", message);
    return { ok: false, reason: "SMTP_DELIVERY_FAILED", message };
  }
}
