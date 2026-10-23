import { spawn } from "node:child_process";

import { startEmbeddedDb, isPortOpen } from "./embedded-db.mjs";

const command = process.argv.slice(2).join(" ");
if (!command) {
  console.error("Usage : node scripts/with-db.mjs \"<commande>\"");
  process.exit(1);
}

let pg = null;
if (!(await isPortOpen(5432))) {
  console.log("Démarrage de PostgreSQL embarqué…");
  pg = await startEmbeddedDb();
}

const child = spawn(command, { shell: true, stdio: "inherit" });

child.on("exit", async (code) => {
  if (pg) await pg.stop();
  process.exit(code ?? 0);
});
