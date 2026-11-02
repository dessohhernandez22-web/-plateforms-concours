import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const getSession = cache(async () => auth());

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
});

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export const requireAdmin = () => requireRole("ADMIN");
export const requireOrganizer = () => requireRole("ORGANIZER", "ADMIN");
