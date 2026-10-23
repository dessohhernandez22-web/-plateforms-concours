import { spawn } from "node:child_process";

import { startEmbeddedDb, isPortOpen } from "./embedded-db.mjs";

let pg = null;
if (!(await isPortOpen(5432))) {
  console.log("Démarrage de PostgreSQL embarqué…");
  pg = await startEmbeddedDb();
  console.log("PostgreSQL prêt sur localhost:5432");
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
