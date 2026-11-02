"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  contestFormSchema,
  eventFormSchema,
  type ContestFormInput,
  type EventFormInput,
} from "@/lib/validations/contest";
import type { ContestActionState } from "@/lib/validations/contest-state";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function uniqueEventSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "evenement";
  let candidate = root;
  let suffix = 2;
  while (
    await prisma.event.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    candidate = `${root}-${suffix++}`;
  }
  return candidate;
}

async function uniqueContestSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "concours";
  let candidate = root;
  let suffix = 2;
  while (
    await prisma.contest.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    candidate = `${root}-${suffix++}`;
  }
  return candidate;
}

function parseEventForm(formData: FormData) {
  return eventFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    status: formData.get("status"),
    organizerId: formData.get("organizerId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    coverUrl: formData.get("coverUrl"),
  });
}

function parseContestForm(formData: FormData) {
  return contestFormSchema.safeParse({
    eventId: formData.get("eventId"),
    domainId: formData.get("domainId"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    rules: formData.get("rules"),
    status: formData.get("status"),
    registrationFee: formData.get("registrationFee"),
    voteUnitPrice: formData.get("voteUnitPrice"),
    registrationOpenAt: formData.get("registrationOpenAt"),
    registrationCloseAt: formData.get("registrationCloseAt"),
    votingOpenAt: formData.get("votingOpenAt"),
    votingCloseAt: formData.get("votingCloseAt"),
    resultsAt: formData.get("resultsAt"),
    maxCandidates: formData.get("maxCandidates"),
    coverUrl: formData.get("coverUrl"),
  });
}

async function resolveOrganizerId(organizerId: string, fallbackId: string): Promise<string> {
  if (!organizerId) return fallbackId;
  const organizer = await prisma.user.findFirst({
    where: { id: organizerId, role: { in: ["ORGANIZER", "ADMIN"] } },
    select: { id: true },
  });
  return organizer?.id ?? fallbackId;
}

async function validateReferences(data: ContestFormInput): Promise<string | null> {
  const [event, domain] = await Promise.all([
    prisma.event.findUnique({ where: { id: data.eventId }, select: { id: true } }),
    prisma.domain.findUnique({ where: { id: data.domainId }, select: { id: true } }),
  ]);
  if (!event) return "Événement introuvable.";
  if (!domain) return "Domaine introuvable.";
  return null;
}

function buildContestData(data: ContestFormInput, slug: string) {
  return {
    eventId: data.eventId,
    domainId: data.domainId,
    slug,
    title: data.title,
    description: data.description,
    rules: data.rules,
    status: data.status,
    registrationFee: data.registrationFee,
    voteUnitPrice: data.voteUnitPrice,
    registrationOpenAt: data.registrationOpenAt,
    registrationCloseAt: data.registrationCloseAt,
    votingOpenAt: data.votingOpenAt,
    votingCloseAt: data.votingCloseAt,
    resultsAt: data.resultsAt,
    maxCandidates: data.maxCandidates,
    coverUrl: data.coverUrl || null,
  };
}

function buildEventData(data: EventFormInput, slug: string, organizerId: string) {
  return {
    title: data.title,
    slug,
    description: data.description,
    status: data.status,
    organizerId,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    coverUrl: data.coverUrl || null,
  };
}

function invalidState(error: { flatten: () => { fieldErrors: Record<string, string[]> } }): ContestActionState {
  return {
    ok: false,
    message: "Veuillez corriger les erreurs ci-dessous.",
    errors: error.flatten().fieldErrors,
  };
}

export async function createEventAction(
  _prev: ContestActionState,
  formData: FormData,
): Promise<ContestActionState> {
  const admin = await requireAdmin();
  const parsed = parseEventForm(formData);
  if (!parsed.success) return invalidState(parsed.error);

  const data = parsed.data;
  const organizerId = await resolveOrganizerId(data.organizerId, admin.id);
  const slug = await uniqueEventSlug(slugify(data.slug || data.title));

  await prisma.event.create({ data: buildEventData(data, slug, organizerId) });

  revalidatePath("/admin/concours");
  revalidatePath("/evenements");
  redirect("/admin/concours?event=created");
}

export async function updateEventAction(
  _prev: ContestActionState,
  formData: FormData,
): Promise<ContestActionState> {
  const admin = await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { ok: false, message: "Événement introuvable." };

  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) return { ok: false, message: "Événement introuvable." };

  const parsed = parseEventForm(formData);
  if (!parsed.success) return invalidState(parsed.error);

  const data = parsed.data;
  const organizerId = await resolveOrganizerId(data.organizerId, admin.id);
  const slug = await uniqueEventSlug(slugify(data.slug || data.title), eventId);

  await prisma.event.update({
    where: { id: eventId },
    data: buildEventData(data, slug, organizerId),
  });

  revalidatePath("/admin/concours");
  revalidatePath("/evenements");
  redirect("/admin/concours?event=updated");
}

export async function createContestAction(
  _prev: ContestActionState,
  formData: FormData,
): Promise<ContestActionState> {
  await requireAdmin();
  const parsed = parseContestForm(formData);
  if (!parsed.success) return invalidState(parsed.error);

  const data = parsed.data;
  const referenceError = await validateReferences(data);
  if (referenceError) return { ok: false, message: referenceError };

  const slug = await uniqueContestSlug(slugify(data.slug || data.title));
  const publishedAt = data.status === "PUBLISHED" ? new Date() : null;

  await prisma.contest.create({
    data: { ...buildContestData(data, slug), publishedAt },
  });

  revalidatePath("/admin/concours");
  revalidatePath("/concours");
  redirect("/admin/concours?contest=created");
}

export async function updateContestAction(
  _prev: ContestActionState,
  formData: FormData,
): Promise<ContestActionState> {
  await requireAdmin();
  const contestId = String(formData.get("contestId") ?? "");
  if (!contestId) return { ok: false, message: "Concours introuvable." };

  const existing = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!existing) return { ok: false, message: "Concours introuvable." };

  const parsed = parseContestForm(formData);
  if (!parsed.success) return invalidState(parsed.error);

  const data = parsed.data;
  const referenceError = await validateReferences(data);
  if (referenceError) return { ok: false, message: referenceError };

  const slug = await uniqueContestSlug(slugify(data.slug || data.title), contestId);
  const publishedAt =
    existing.publishedAt ?? (data.status === "PUBLISHED" ? new Date() : null);

  await prisma.contest.update({
    where: { id: contestId },
    data: { ...buildContestData(data, slug), publishedAt },
  });

  revalidatePath("/admin/concours");
  revalidatePath("/concours");
  revalidatePath(`/concours/${slug}`);
  redirect("/admin/concours?contest=updated");
}
