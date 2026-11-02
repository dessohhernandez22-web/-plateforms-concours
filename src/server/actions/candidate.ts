"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { canCandidateBeApproved, hasContestCapacity } from "@/lib/candidate-approval";
import { encryptPii } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { notifyUserByEmail } from "@/lib/notifications";
import { enforceRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { requireRole, requireUser } from "@/lib/session";
import { ageFrom, slugify } from "@/lib/utils";
import {
  candidateFormSchema,
  teamMemberInputSchema,
} from "@/lib/validations/candidate";
import type { CandidateActionState } from "@/lib/validations/candidate-state";

function parseJsonArray(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function uniqueCandidateSlug(displayName: string): Promise<string> {
  const base = slugify(displayName) || "candidat";
  let slug = base;
  let suffix = 1;
  while (await prisma.candidate.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
    if (suffix > 50) {
      slug = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }
  return slug;
}

export async function createCandidateAction(
  _prev: CandidateActionState,
  formData: FormData,
): Promise<CandidateActionState> {
  const user = await requireUser();

  if (user.role !== "CANDIDATE" && user.role !== "ADMIN") {
    return { ok: false, message: "Seuls les candidats peuvent déposer une inscription." };
  }

  const rateLimit = await enforceRateLimit(`candidate:create:${user.id}`, 5, 60 * 60);
  if (!rateLimit.ok) {
    return { ok: false, message: rateLimitMessage(rateLimit.retryAfterSeconds) };
  }

  const parsed = candidateFormSchema.safeParse({
    contestId: formData.get("contestId"),
    type: formData.get("type"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? undefined,
    birthDate: formData.get("birthDate"),
    guardianName: formData.get("guardianName") ?? undefined,
    guardianPhone: formData.get("guardianPhone") ?? undefined,
    guardianEmail: formData.get("guardianEmail") ?? undefined,
    guardianConsentMediaId: formData.get("guardianConsentMediaId") ?? undefined,
    mediaIds: parseJsonArray(formData.get("mediaIds")),
    teamMembers: parseJsonArray(formData.get("teamMembers")),
    acceptRules: formData.get("acceptRules") === "on",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Veuillez corriger les erreurs du formulaire.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const contest = await prisma.contest.findUnique({
    where: { id: data.contestId },
    select: {
      id: true,
      status: true,
      registrationOpenAt: true,
      registrationCloseAt: true,
      registrationFee: true,
      maxCandidates: true,
    },
  });

  if (!contest || contest.status !== "PUBLISHED") {
    return { ok: false, message: "Ce concours n'est pas ouvert aux inscriptions." };
  }

  const now = new Date();
  if (now < contest.registrationOpenAt || now > contest.registrationCloseAt) {
    return { ok: false, message: "La période d'inscription est fermée." };
  }

  const existingCandidate = await prisma.candidate.findFirst({
    where: {
      contestId: contest.id,
      ownerId: user.id,
      status: { notIn: ["REJECTED", "DISQUALIFIED"] },
    },
    select: { id: true },
  });
  if (existingCandidate) {
    return {
      ok: false,
      message: "Vous avez déjà une candidature en cours pour ce concours.",
    };
  }

  const birthDate = new Date(`${data.birthDate}T00:00:00.000Z`);
  const age = ageFrom(birthDate);
  if (Number.isNaN(birthDate.getTime()) || age < 5 || age > 100) {
    return { ok: false, message: "Date de naissance invalide." };
  }
  const isMinor = age < 18;

  if (isMinor) {
    if (!data.guardianName || !data.guardianPhone) {
      return {
        ok: false,
        message: "Les informations du parent ou tuteur sont obligatoires pour un mineur.",
      };
    }
    if (!data.guardianConsentMediaId) {
      return {
        ok: false,
        message: "L'autorisation parentale signée est obligatoire pour un mineur.",
      };
    }

    const consent = await prisma.media.findFirst({
      where: {
        id: data.guardianConsentMediaId,
        uploaderId: user.id,
        type: "DOCUMENT",
        isPublic: false,
      },
      select: { id: true },
    });
    if (!consent) {
      return { ok: false, message: "Autorisation parentale invalide ou introuvable." };
    }
  }

  if (data.type === "TEAM" && data.teamMembers.length === 0) {
    return { ok: false, message: "Ajoutez au moins un membre à votre équipe." };
  }

  const currentCandidates = await prisma.candidate.count({
    where: { contestId: contest.id, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (!hasContestCapacity(contest.maxCandidates, currentCandidates)) {
    return {
      ok: false,
      message: "Le nombre maximum de candidatures pour ce concours est atteint.",
    };
  }

  for (const rawMember of data.teamMembers) {
    const member = teamMemberInputSchema.safeParse(rawMember);
    if (!member.success) {
      return { ok: false, message: "Les informations d'un membre d'équipe sont invalides." };
    }
    if (member.data.birthDate) {
      const memberAge = ageFrom(new Date(`${member.data.birthDate}T00:00:00.000Z`));
      if (memberAge < 18 && (!member.data.guardianName || !member.data.guardianPhone)) {
        return {
          ok: false,
          message: `Le membre ${member.data.fullName} est mineur : son responsable légal est obligatoire.`,
        };
      }
    }
  }

  const mediaIds = [...new Set(data.mediaIds)];
  const medias = await prisma.media.findMany({
    where: {
      id: { in: mediaIds },
      uploaderId: user.id,
      type: { in: ["IMAGE", "VIDEO"] },
      candidateId: null,
    },
    select: { id: true },
  });

  if (medias.length !== mediaIds.length) {
    return { ok: false, message: "Un ou plusieurs médias sont invalides. Réessayez l'envoi." };
  }

  const slug = await uniqueCandidateSlug(data.displayName);

  const candidate = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`contest-candidates:${contest.id}`}))`;

    const acceptedCount = await tx.candidate.count({
      where: { contestId: contest.id, status: { in: ["PENDING", "APPROVED"] } },
    });
    if (!hasContestCapacity(contest.maxCandidates, acceptedCount)) {
      return null;
    }

    const created = await tx.candidate.create({
      data: {
        contestId: contest.id,
        ownerId: user.id,
        type: data.type,
        displayName: data.displayName,
        slug,
        bio: data.bio || null,
        birthDate,
        isMinor,
        guardianName: isMinor ? data.guardianName : null,
        guardianPhoneEncrypted: isMinor ? encryptPii(data.guardianPhone) : null,
        guardianEmailEncrypted:
          isMinor && data.guardianEmail ? encryptPii(data.guardianEmail) : null,
        guardianConsentMediaId: isMinor ? data.guardianConsentMediaId : null,
        status: "PENDING",
        submittedAt: new Date(),
        teamMembers: {
          create: data.teamMembers.map((member) => {
            const memberBirthDate = member.birthDate
              ? new Date(`${member.birthDate}T00:00:00.000Z`)
              : null;
            return {
              fullName: member.fullName,
              role: member.role || null,
              birthDate: memberBirthDate,
              isMinor: memberBirthDate ? ageFrom(memberBirthDate) < 18 : false,
              guardianName: member.guardianName || null,
              guardianPhoneEncrypted: member.guardianPhone
                ? encryptPii(member.guardianPhone)
                : null,
            };
          }),
        },
      },
    });

    if (mediaIds.length) {
      await tx.media.updateMany({
        where: { id: { in: mediaIds } },
        data: { candidateId: created.id, contestId: contest.id },
      });
    }

    if (isMinor) {
      await tx.media.update({
        where: { id: data.guardianConsentMediaId },
        data: { candidateId: created.id, contestId: contest.id },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "CANDIDATE_SUBMITTED",
        entityType: "Candidate",
        entityId: created.id,
        metadata: {
          contestId: contest.id,
          type: data.type,
          isMinor,
        },
      },
    });

    return created;
  });

  if (!candidate) {
    return {
      ok: false,
      message: "Le nombre maximum de candidatures pour ce concours est atteint.",
    };
  }

  const redirectPath =
    contest.registrationFee > 0
      ? `/compte/candidatures/${candidate.id}/paiement`
      : `/compte/candidatures?nouveau=${encodeURIComponent(candidate.slug)}`;

  redirect(redirectPath);
}

export async function approveCandidateAction(formData: FormData) {
  const approver = await requireRole("ADMIN", "ORGANIZER");
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) return;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      contest: { select: { registrationFee: true, event: { select: { organizerId: true } } } },
      owner: {
        select: { id: true, email: true, name: true },
      },
      registrationPayment: true,
    },
  });

  if (approver.role === "ORGANIZER" && candidate?.contest.event.organizerId !== approver.id) return;
  if (
    !candidate ||
    !canCandidateBeApproved({
      ...candidate,
      registrationFee: candidate.contest.registrationFee,
    })
  ) {
    revalidatePath("/admin/candidatures");
    return;
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById: approver.id,
      rejectionReason: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: approver.id,
      action: "CANDIDATE_APPROVED",
      entityType: "Candidate",
      entityId: candidateId,
    },
  });

  if (candidate.owner?.email) {
    await notifyUserByEmail({
      userId: candidate.owner.id,
      email: candidate.owner.email,
      name: candidate.owner.name,
      template: "candidate_approved",
    });
  }

  revalidatePath("/admin/candidatures");
}

export async function rejectCandidateAction(formData: FormData) {
  const reviewer = await requireRole("ADMIN", "ORGANIZER");
  const candidateId = String(formData.get("candidateId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!candidateId) return;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      owner: {
        select: { id: true, email: true, name: true },
      },
      contest: { select: { event: { select: { organizerId: true } } } },
    },
  });

  if (!candidate) return;
  if (reviewer.role === "ORGANIZER" && candidate.contest.event.organizerId !== reviewer.id) return;

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: "REJECTED",
      rejectionReason: reason || "Dossier non conforme.",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: reviewer.id,
      action: "CANDIDATE_REJECTED",
      entityType: "Candidate",
      entityId: candidateId,
      metadata: { reason },
    },
  });

  if (candidate.owner?.email) {
    await notifyUserByEmail({
      userId: candidate.owner.id,
      email: candidate.owner.email,
      name: candidate.owner.name,
      template: "candidate_rejected",
    });
  }

  revalidatePath("/admin/candidatures");
}
