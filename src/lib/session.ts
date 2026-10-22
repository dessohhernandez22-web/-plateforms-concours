import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";

export const getSession = cache(async () => auth());

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  return session.user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export const requireAdmin = () => requireRole("ADMIN");
export const requireOrganizer = () => requireRole("ORGANIZER", "ADMIN");
