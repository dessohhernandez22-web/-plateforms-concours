import type { Metadata } from "next";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications — Administration" };
export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  await requireAdmin();

  const notifications = await prisma.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
    take: 80,
  });

  return (
    <main>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Notifications</h1>
        <p className="text-sm text-stone-600">
          Historique des e-mails envoyés par la plateforme.
        </p>
      </header>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
          Aucune notification n&apos;a encore été enregistrée.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Canal</th>
                <th className="px-4 py-3 font-medium">Destinataire</th>
                <th className="px-4 py-3 font-medium">Modèle</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Erreur</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((item) => (
                <tr key={item.id} className="border-t border-stone-200 align-top">
                  <td className="px-4 py-3 text-stone-700">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-stone-700">{item.channel}</td>
                  <td className="px-4 py-3 text-stone-700">
                    <div>{item.recipient}</div>
                    {item.user ? (
                      <div className="text-xs text-stone-500">{item.user.name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{item.template}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {item.error ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
