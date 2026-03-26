import { Client } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const SQL_DIR = join(__dirname, "..", "worklenz-backend", "database", "sql");

const FILES = [
  "0_extensions.sql",
  "1_tables.sql",
  "indexes.sql",
  "4_functions.sql",
  "triggers.sql",
  "3_views.sql",
  "2_dml.sql",
  "5_database_user.sql",
  "fix_missing_columns.sql",
];

async function run() {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || "worklenz_db";

  if (!host || !password) {
    console.error("Missing required env vars: DB_HOST, DB_PASSWORD");
    console.error("Usage: DB_HOST=x DB_PASSWORD=x DB_USER=x DB_NAME=x bun run setup.ts");
    process.exit(1);
  }

  const client = new Client({ host, port, user, password, database });

  try {
    await client.connect();
    console.log(`Connected to ${host}:${port}/${database}\n`);

    for (const file of FILES) {
      const path = join(SQL_DIR, file);
      try {
        const sql = readFileSync(path, "utf-8");
        console.log(`Running ${file}...`);
        await client.query(sql);
        console.log(`  Done\n`);
      } catch (err: any) {
        console.error(`  FAILED: ${err.message}\n`);
      }
    }

    console.log("Database setup complete.");
  } catch (err: any) {
    console.error(`Connection failed: ${err.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
