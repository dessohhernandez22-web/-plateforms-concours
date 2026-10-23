import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const ADMIN_PASSWORD = "Admin@2026";
const ORGANIZER_PASSWORD = "Organisateur@2026";
const CANDIDATE_PASSWORD = "Candidat@2026";

function hash(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

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
  const adminPassword = await hash(ADMIN_PASSWORD);
  const organizerPassword = await hash(ORGANIZER_PASSWORD);
  const candidatePassword = await hash(CANDIDATE_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: "admin@spp.bj" },
    update: { passwordHash: adminPassword },
    create: {
      name: "Administrateur SPP",
      email: "admin@spp.bj",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: "organisateur@spp.bj" },
    update: { passwordHash: organizerPassword },
    create: {
      name: "Organisateur SPP",
      email: "organisateur@spp.bj",
      passwordHash: organizerPassword,
      role: "ORGANIZER",
    },
  });

  const candidateUser = await prisma.user.upsert({
    where: { email: "candidat@spp.bj" },
    update: { passwordHash: candidatePassword },
    create: {
      name: "Candidat Démo",
      email: "candidat@spp.bj",
      phone: "0197000000",
      passwordHash: candidatePassword,
      role: "CANDIDATE",
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

  const demoCandidates = [
    {
      slug: "aicha-dossou",
      displayName: "Aïcha Dossou",
      contestSlug: "spp-showdown-musique",
      type: "INDIVIDUAL" as const,
      bio: "Chanteuse et slameuse, Aïcha mêle les rythmes traditionnels béninois à la poésie urbaine.",
      birthDate: "2003-05-14",
      votesCount: 245,
    },
    {
      slug: "equipe-kora",
      displayName: "Équipe Kora",
      contestSlug: "spp-showdown-danse",
      type: "TEAM" as const,
      bio: "Collectif de danse contemporaine et traditionnelle basé à Cotonou.",
      birthDate: "2001-02-08",
      votesCount: 198,
    },
    {
      slug: "chef-ayaba",
      displayName: "Chef Ayaba",
      contestSlug: "spp-showdown-arts-culinaires",
      type: "INDIVIDUAL" as const,
      bio: "Cuisinière passionnée, spécialiste des saveurs du terroir béninois.",
      birthDate: "1996-11-23",
      votesCount: 173,
    },
    {
      slug: "koffi-zinsou",
      displayName: "Koffi Zinsou",
      contestSlug: "spp-showdown-arts-visuels",
      type: "INDIVIDUAL" as const,
      bio: "Artiste plasticien, sculpteur sur bois et métal recyclé.",
      birthDate: "1999-07-30",
      votesCount: 154,
    },
    {
      slug: "troupe-mekpon",
      displayName: "Troupe Mékpon",
      contestSlug: "spp-showdown-arts-cinematographiques",
      type: "TEAM" as const,
      bio: "Compagnie de théâtre et de comédie née à Porto-Novo.",
      birthDate: "2000-03-17",
      votesCount: 132,
    },
    {
      slug: "rosine-adjo",
      displayName: "Rosine Adjo",
      contestSlug: "spp-showdown-mode",
      type: "INDIVIDUAL" as const,
      bio: "Styliste engagée, elle réinvente le wax avec des coupes contemporaines.",
      birthDate: "2002-09-05",
      votesCount: 121,
    },
    {
      slug: "lea-houngbedji",
      displayName: "Léa Houngbédji",
      contestSlug: "spp-showdown-technologie",
      type: "INDIVIDUAL" as const,
      bio: "Développeuse et roboticienne, elle conçoit des solutions pour l'agriculture.",
      birthDate: "2004-01-12",
      votesCount: 109,
    },
    {
      slug: "espoir-de-cotonou",
      displayName: "Espoir de Cotonou",
      contestSlug: "spp-showdown-football",
      type: "TEAM" as const,
      bio: "Équipe de football des jeunes talents du quartier Akpakpa.",
      birthDate: "2005-06-21",
      votesCount: 98,
    },
    {
      slug: "wilfried-sossou",
      displayName: "Wilfried Sossou",
      contestSlug: "spp-showdown-genie-en-herbe",
      type: "INDIVIDUAL" as const,
      bio: "Passionné de culture générale, d'histoire et d'éloquence.",
      birthDate: "2007-04-02",
      votesCount: 87,
    },
  ];

  for (const demo of demoCandidates) {
    const contest = await prisma.contest.findUnique({
      where: { slug: demo.contestSlug },
      select: { id: true },
    });
    if (!contest) continue;

    const candidate = await prisma.candidate.upsert({
      where: { slug: demo.slug },
      update: {
        displayName: demo.displayName,
        bio: demo.bio,
        votesCount: demo.votesCount,
        status: "APPROVED",
      },
      create: {
        slug: demo.slug,
        displayName: demo.displayName,
        contestId: contest.id,
        ownerId: candidateUser.id,
        type: demo.type,
        bio: demo.bio,
        birthDate: new Date(demo.birthDate),
        status: "APPROVED",
        votesCount: demo.votesCount,
        submittedAt: daysFromNow(-5),
        approvedAt: daysFromNow(-4),
        approvedById: admin.id,
      },
    });

    if (demo.type === "TEAM") {
      await prisma.teamMember.deleteMany({ where: { candidateId: candidate.id } });
      await prisma.teamMember.createMany({
        data: [
          { candidateId: candidate.id, fullName: "Membre 1", role: "Capitaine" },
          { candidateId: candidate.id, fullName: "Membre 2", role: "Membre" },
          { candidateId: candidate.id, fullName: "Membre 3", role: "Membre" },
        ],
      });
    }
  }

  console.log(`Seed terminé : ${DOMAINS.length} domaines, ${domains.length} concours.`);
  console.log(`Admin : ${admin.email} / ${ADMIN_PASSWORD}`);
  console.log(`Organisateur : ${organizer.email} / ${ORGANIZER_PASSWORD}`);
  console.log(`Candidat : ${candidateUser.email} / ${CANDIDATE_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
