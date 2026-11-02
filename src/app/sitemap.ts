import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const PUBLIC_CONTEST_STATUSES = [
  "PUBLISHED",
  "REGISTRATION_CLOSED",
  "VOTING_CLOSED",
  "RESULTS_PUBLISHED",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${baseUrl}/concours`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/resultats`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/inscription`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/connexion`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/conditions-utilisation`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const [contests, candidates] = await Promise.all([
      prisma.contest.findMany({
        where: { status: { in: [...PUBLIC_CONTEST_STATUSES] } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.candidate.findMany({
        where: { status: "APPROVED" },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...contests.map((contest) => ({
        url: `${baseUrl}/concours/${contest.slug}`,
        lastModified: contest.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...candidates.map((candidate) => ({
        url: `${baseUrl}/candidats/${candidate.slug}`,
        lastModified: candidate.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
