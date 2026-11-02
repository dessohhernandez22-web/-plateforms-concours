import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EVENT_SLUGS = ["spp-talent-showdown"];
const DEMO_CANDIDATE_SLUGS = [
  "aicha-dossou",
  "equipe-kora",
  "chef-ayaba",
  "koffi-zinsou",
  "troupe-mekpon",
  "rosine-adjo",
  "lea-houngbedji",
  "espoir-de-cotonou",
  "wilfried-sossou",
];
const DEMO_USER_EMAILS = ["organisateur@spp.bj", "candidat@spp.bj"];

async function main() {
  const events = await prisma.event.deleteMany({ where: { slug: { in: DEMO_EVENT_SLUGS } } });
  const candidates = await prisma.candidate.deleteMany({
    where: { slug: { in: DEMO_CANDIDATE_SLUGS } },
  });
  const users = await prisma.user.deleteMany({
    where: { email: { in: DEMO_USER_EMAILS }, role: { in: ["ORGANIZER", "CANDIDATE"] } },
  });

  console.log(
    `Nettoyage terminé : ${events.count} événement(s), ${candidates.count} candidature(s), ${users.count} compte(s) de démonstration supprimé(s).`,
  );
  console.log("Le compte administrateur existant est conservé.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
