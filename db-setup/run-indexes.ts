import { Client } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "worklenz_db",
  });

  await client.connect();
  console.log("Connected. Running indexes...\n");

  let sql = readFileSync(join(__dirname, "..", "worklenz-backend", "database", "sql", "indexes.sql"), "utf-8");
  sql = sql.replace(/CONCURRENTLY /gi, "");

  const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0);

  for (const stmt of statements) {
    const name = stmt.match(/IF NOT EXISTS (\S+)/)?.[1] || "unknown";
    try {
      await client.query(stmt);
      console.log(`  OK: ${name}`);
    } catch (err: any) {
      console.error(`  SKIP: ${name} - ${err.message.split("\n")[0]}`);
    }
  }

  await client.end();
  console.log("\nDone.");
}

run();
