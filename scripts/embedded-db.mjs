import EmbeddedPostgres from "embedded-postgres";
import net from "node:net";
import path from "node:path";
import { existsSync } from "node:fs";

const DATABASE_DIR = path.join(process.cwd(), ".data", "postgres");
const PORT = Number(process.env.EMBEDDED_PG_PORT ?? 5432);
const USER = process.env.EMBEDDED_PG_USER ?? "plateforme";
const PASSWORD = process.env.EMBEDDED_PG_PASSWORD ?? "plateforme";
const DATABASE = process.env.EMBEDDED_PG_DATABASE ?? "plateforme";

export function connectionString() {
  return `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}?schema=public`;
}

export function isPortOpen(port = PORT) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(800);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

export async function startEmbeddedDb() {
  if (await isPortOpen(PORT)) {
    return null;
  }

  const pg = new EmbeddedPostgres({
    databaseDir: DATABASE_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
  });

  if (!existsSync(path.join(DATABASE_DIR, "PG_VERSION"))) {
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase(DATABASE);
  } catch {
    // La base existe déjà.
  }

  return pg;
}
