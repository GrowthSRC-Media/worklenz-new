const { Client } = require("pg");
const { readFileSync } = require("fs");
const { join } = require("path");

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "worklenz_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected. Applying all functions from 4_functions.sql...");

    const sql = readFileSync(
      join(__dirname, "..", "worklenz-backend", "database", "sql", "4_functions.sql"),
      "utf8"
    );

    // Extract all CREATE OR REPLACE FUNCTION blocks
    const funcRegex = /CREATE OR REPLACE FUNCTION\s+[\s\S]*?\n\$\$;/g;
    const matches = sql.match(funcRegex);

    if (!matches) {
      console.error("No functions found");
      process.exit(1);
    }

    console.log(`Found ${matches.length} functions. Applying...`);
    let applied = 0;
    let failed = 0;

    for (const func of matches) {
      const nameMatch = func.match(/FUNCTION\s+([\w.]+)\(/);
      const name = nameMatch ? nameMatch[1] : "unknown";
      try {
        await client.query(func);
        applied++;
      } catch (err) {
        console.error(`  FAILED: ${name} - ${err.message.split("\n")[0]}`);
        failed++;
      }
    }

    console.log(`Done. Applied: ${applied}, Failed: ${failed}`);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
