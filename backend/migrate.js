const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const LOCK_ID = 4815162342; // arbitrary advisory lock id

const config = {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || "db",
  port: Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432),
  user: process.env.DB_USER || process.env.POSTGRES_USER || "postgres",
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.DB_NAME || process.env.POSTGRES_DB || "homenetwork",
};

const log = (...args) => console.log("[MIGRATION]", ...args);
const error = (...args) => console.error("[MIGRATION ERROR]", ...args);

async function withClient(fn) {
  const client = new Client(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      run_on TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function acquireLock(client) {
  const res = await client.query("SELECT pg_try_advisory_lock($1) AS locked", [LOCK_ID]);
  if (!res.rows[0].locked) {
    throw new Error("Could not acquire advisory lock. Another migration may be running.");
  }
}

async function releaseLock(client) {
  await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]);
}

function loadMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({
      name: file,
      path: path.join(MIGRATIONS_DIR, file),
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"),
    }));
}

async function getAppliedMigrations(client) {
  const res = await client.query("SELECT name FROM schema_migrations ORDER BY name ASC");
  return new Set(res.rows.map((r) => r.name));
}

async function runMigration(client, migration) {
  log("Running", migration.name);
  await client.query("BEGIN");
  try {
    await client.query(migration.sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [migration.name]);
    await client.query("COMMIT");
    log("Applied", migration.name);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function migrateUp() {
  return withClient(async (client) => {
    await ensureMigrationsTable(client);
    await acquireLock(client);

    try {
      const migrations = loadMigrations();
      const applied = await getAppliedMigrations(client);
      const pending = migrations.filter((m) => !applied.has(m.name));

      if (pending.length === 0) {
        log("No pending migrations.");
        return;
      }

      for (const migration of pending) {
        await runMigration(client, migration);
      }
    } finally {
      await releaseLock(client);
    }
  });
}

async function showStatus() {
  return withClient(async (client) => {
    await ensureMigrationsTable(client);
    const migrations = loadMigrations();
    const applied = await getAppliedMigrations(client);

    log("Applied:");
    applied.size === 0 && log("  (none)");
    migrations
      .filter((m) => applied.has(m.name))
      .forEach((m) => log(`  ${m.name}`));

    log("Pending:");
    const pending = migrations.filter((m) => !applied.has(m.name));
    pending.length === 0 && log("  (none)");
    pending.forEach((m) => log(`  ${m.name}`));
  });
}

async function main() {
  const command = (process.argv[2] || "up").toLowerCase();

  try {
    if (command === "status") {
      await showStatus();
    } else if (command === "up" || command === "migrate") {
      await migrateUp();
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
  } catch (err) {
    error(err.message);
    process.exitCode = 1;
  }
}

main();
