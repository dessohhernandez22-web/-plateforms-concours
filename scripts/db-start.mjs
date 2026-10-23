import { startEmbeddedDb } from "./embedded-db.mjs";

const pg = await startEmbeddedDb();
if (!pg) {
  console.log("Un serveur écoute déjà sur le port 5432.");
  process.exit(0);
}
console.log("PostgreSQL embarqué démarré sur localhost:5432. Ctrl+C pour arrêter.");

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
