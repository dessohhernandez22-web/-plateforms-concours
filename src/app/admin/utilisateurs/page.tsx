import type { Metadata } from "next";

import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { requireAdmin } from "@/lib/session";
import { updateUserRoleAction } from "@/server/actions/admin-users";

export const metadata: Metadata = { title: "Utilisateurs — Administration" };
export const dynamic = "force-dynamic";

const ROLES = [
  { value: "CANDIDATE", label: "Candidat" },
  { value: "ORGANIZER", label: "Organisateur" },
  { value: "ADMIN", label: "Administrateur" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  CANDIDATE: "Candidat",
  ORGANIZER: "Organisateur",
  ADMIN: "Administrateur",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  const { q } = await searchParams;
  const search = (q ?? "").trim().slice(0, 100);

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { organizedEvents: true } },
    },
  });

  return (
    <main>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Utilisateurs</h1>
        <p className="text-sm text-stone-600">
          Attribuez le rôle organisateur aux personnes qui gèrent un événement. Les changements
          de rôle sont journalisés.
        </p>
      </header>

      <form className="mb-5 flex flex-wrap gap-2" action="/admin/utilisateurs">
        <input
          name="q"
          defaultValue={search}
          placeholder="Rechercher par nom, e-mail ou téléphone"
          className="h-11 min-w-64 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Rechercher
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-4 py-3 font-medium">Utilisateur</th>
              <th className="px-4 py-3 font-medium">Rôle actuel</th>
              <th className="px-4 py-3 font-medium">Inscription</th>
              <th className="px-4 py-3 font-medium">Attribuer un rôle</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = user.id === admin.id;
                const ownsEvents = user._count.organizedEvents > 0;
                return (
                  <tr key={user.id} className="border-t border-stone-200 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">
                        {user.name}
                        {isSelf ? " (vous)" : ""}
                      </div>
                      <div className="text-xs text-stone-500">{user.email}</div>
                      {user.phone ? <div className="text-xs text-stone-500">{user.phone}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="text-xs text-stone-500">
                          Vous ne pouvez pas modifier votre propre rôle.
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {ownsEvents && (
                            <span className="text-xs text-stone-500">
                              {user._count.organizedEvents} événement(s) rattaché(s)
                            </span>
                          )}
                          {ROLES.filter(
                            (role) =>
                              role.value !== user.role &&
                              !(ownsEvents && role.value === "CANDIDATE"),
                          ).map((role) => (
                            <form key={role.value} action={updateUserRoleAction}>
                              <input type="hidden" name="userId" value={user.id} />
                              <input type="hidden" name="role" value={role.value} />
                              <button
                                type="submit"
                                className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                              >
                                {role.label}
                              </button>
                            </form>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
