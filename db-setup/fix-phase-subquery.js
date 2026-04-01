const { Client } = require("pg");
const { readFileSync } = require("fs");
const { join } = require("path");

async function run() {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || "worklenz_db";

  if (!host || !password) {
    console.error("Missing required env vars: DB_HOST, DB_PASSWORD");
    console.error(
      "Usage: DB_HOST=x DB_PASSWORD=x DB_USER=x DB_NAME=x node fix-phase-subquery.js"
    );
    process.exit(1);
  }

  const client = new Client({ host, port, user, password, database, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log(`Connected to ${host}:${port}/${database}`);

    // Read the full 4_functions.sql and extract get_task_form_view_model
    const sql = readFileSync(
      join(__dirname, "..", "worklenz-backend", "database", "sql", "4_functions.sql"),
      "utf8"
    );

    // Extract the function definition
    const match = sql.match(
      /CREATE OR REPLACE FUNCTION get_task_form_view_model\([\s\S]*?\n\$\$;/
    );

    if (!match) {
      console.error("Could not find get_task_form_view_model function in 4_functions.sql");
      process.exit(1);
    }

    const functionSql = match[0];
    console.log("Applying fix: LIMIT 1 on phase_id subquery in get_task_form_view_model...");

    await client.query(functionSql);
    console.log("Function updated successfully!");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
