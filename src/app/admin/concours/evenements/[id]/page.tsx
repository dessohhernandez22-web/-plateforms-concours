import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { toDateTimeLocal } from "@/lib/utils";
import { EventForm } from "../../forms";

export const metadata: Metadata = { title: "Modifier un événement" };
export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [event, organizers] = await Promise.all([
    prisma.event.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { role: "ORGANIZER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!event) notFound();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Modifier l&apos;événement</h1>
          <p className="text-sm text-stone-600">{event.title}</p>
        </div>
        <Link
          href="/admin/concours"
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Retour
        </Link>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <EventForm
          organizers={organizers}
          values={{
            id: event.id,
            title: event.title,
            slug: event.slug,
            description: event.description,
            status: event.status,
            organizerId: event.organizerId,
            startsAt: toDateTimeLocal(event.startsAt),
            endsAt: toDateTimeLocal(event.endsAt),
            coverUrl: event.coverUrl ?? "",
          }}
        />
      </section>
    </main>
  );
}
