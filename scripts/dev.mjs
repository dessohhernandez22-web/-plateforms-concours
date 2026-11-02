import { spawn, spawnSync } from "node:child_process";

import { startEmbeddedDb, isPortOpen } from "./embedded-db.mjs";

let pg = null;
if (!(await isPortOpen(5432))) {
  console.log("Démarrage de PostgreSQL embarqué…");
  pg = await startEmbeddedDb();
  console.log("PostgreSQL prêt sur localhost:5432");
}

console.log("Initialisation de la base locale…");
const dbPush = spawnSync("npx", ["prisma", "db", "push"], {
  stdio: "inherit",
  env: process.env,
});

if (dbPush.status !== 0) {
  console.error("Échec de l'initialisation Prisma.");
  process.exit(dbPush.status ?? 1);
}

const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  env: process.env,
});

if (seed.status !== 0) {
  console.error("Échec de l'initialisation des données de référence.");
  process.exit(seed.status ?? 1);
}

const child = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  env: process.env,
});

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  child.kill("SIGTERM");
  if (pg) await pg.stop();
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
child.on("exit", (code) => shutdown(code ?? 0));
