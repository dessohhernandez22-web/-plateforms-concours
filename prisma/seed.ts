import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DOMAINS = [
  { slug: "musique", name: "Musique", icon: "Music", description: "Chant, slam, poésie et instruments", sortOrder: 1 },
  { slug: "danse", name: "Danse", icon: "Sparkles", description: "Danse traditionnelle et moderne", sortOrder: 2 },
  { slug: "arts-culinaires", name: "Arts culinaires", icon: "UtensilsCrossed", description: "Cuisine et pâtisserie", sortOrder: 3 },
  { slug: "arts-visuels", name: "Arts visuels", icon: "Palette", description: "Peinture, sculpture et design", sortOrder: 4 },
  { slug: "arts-cinematographiques", name: "Arts cinématographiques", icon: "Clapperboard", description: "Cinéma, théâtre et comédie", sortOrder: 5 },
  { slug: "mode", name: "Mode", icon: "Shirt", description: "Stylisme et création de mode", sortOrder: 6 },
  { slug: "technologie", name: "Technologie", icon: "Cpu", description: "Innovation numérique et robotique", sortOrder: 7 },
  { slug: "football", name: "Football", icon: "Trophy", description: "Tournoi de football jeunes talents", sortOrder: 8 },
  { slug: "genie-en-herbe", name: "Génie en herbe", icon: "Brain", description: "Culture générale et éloquence", sortOrder: 9 },
];

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@spp.bj" },
    update: {},
    create: {
      name: "Administrateur SPP",
      email: "admin@spp.bj",
      passwordHash: "$argon2id$placeholder$change-me",
      role: "ADMIN",
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: "organisateur@spp.bj" },
    update: {},
    create: {
      name: "Organisateur SPP",
      email: "organisateur@spp.bj",
      passwordHash: "$argon2id$placeholder$change-me",
      role: "ORGANIZER",
    },
  });

  for (const domain of DOMAINS) {
    await prisma.domain.upsert({
      where: { slug: domain.slug },
      update: domain,
      create: domain,
    });
  }

  const event = await prisma.event.upsert({
    where: { slug: "spp-talent-showdown" },
    update: {},
    create: {
      slug: "spp-talent-showdown",
      title: "SPP TALENT SHOWDOWN",
      description:
        "L'événement qui révèle les talents béninois dans neuf domaines : musique, danse, arts culinaires, arts visuels, arts cinématographiques, mode, technologie, football et génie en herbe.",
      status: "PUBLISHED",
      organizerId: organizer.id,
      startsAt: daysFromNow(0),
      endsAt: daysFromNow(90),
    },
  });

  const domains = await prisma.domain.findMany();

  for (const domain of domains) {
    const slug = `spp-showdown-${domain.slug}`;
    await prisma.contest.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        eventId: event.id,
        domainId: domain.id,
        title: `${domain.name} — ${event.title}`,
        description: `Concours ${domain.name.toLowerCase()} du ${event.title}. ${domain.description ?? ""}`.trim(),
        rules:
          "1. Inscription ouverte aux candidats résidant au Bénin.\n" +
          "2. Un candidat ou une équipe par domaine.\n" +
          "3. Les mineurs doivent fournir une autorisation parentale.\n" +
          "4. Les votes sont payants : 1 vote = 100 FCFA.\n" +
          "5. Tout vote abusif entraîne la disqualification.\n" +
          "6. Le classement final est publié par l'organisation.",
        status: "PUBLISHED",
        registrationFee: 5000,
        voteUnitPrice: 100,
        registrationOpenAt: daysFromNow(-7),
        registrationCloseAt: daysFromNow(21),
        votingOpenAt: daysFromNow(22),
        votingCloseAt: daysFromNow(45),
        resultsAt: daysFromNow(50),
        publishedAt: new Date(),
      },
    });
  }

  console.log(`Seed terminé : ${DOMAINS.length} domaines, ${domains.length} concours.`);
  console.log(`Admin : ${admin.email} · Organisateur : ${organizer.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
