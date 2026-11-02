import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

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

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrateur";

  if (!email || !password) {
    console.warn(
      "ADMIN_EMAIL et ADMIN_PASSWORD ne sont pas définis : aucun administrateur n'a été créé.",
    );
    return null;
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD doit contenir au moins 12 caractères.");
  }

  const passwordHash = await hash(password);
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: "ADMIN" },
    create: { name, email, passwordHash, role: "ADMIN" },
  });
}

async function main() {
  for (const domain of DOMAINS) {
    await prisma.domain.upsert({
      where: { slug: domain.slug },
      update: domain,
      create: domain,
    });
  }

  const admin = await bootstrapAdmin();

  console.log(`Initialisation terminée : ${DOMAINS.length} domaines de concours.`);
  if (admin) {
    console.log(`Administrateur prêt : ${admin.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
