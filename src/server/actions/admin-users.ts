"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const updateRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(["CANDIDATE", "ORGANIZER", "ADMIN"]),
});

export async function updateUserRoleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const parsed = updateRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return;

  const { userId, role } = parsed.data;
  if (userId === admin.id) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target || target.role === role) return;

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return;
  }

  if (role === "CANDIDATE" && target.role !== "CANDIDATE") {
    const ownedEvents = await prisma.event.count({ where: { organizerId: target.id } });
    if (ownedEvents > 0) return;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { role } }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "USER_ROLE_CHANGED",
        entityType: "User",
        entityId: target.id,
        metadata: { previousRole: target.role, nextRole: role },
      },
    }),
  ]);

  revalidatePath("/admin/utilisateurs");
}
