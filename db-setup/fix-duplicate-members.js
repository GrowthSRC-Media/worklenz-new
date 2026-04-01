const { Client } = require("pg");

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
    console.log("Connected.");

    // Find all duplicate team memberships
    const dupes = await client.query(`
      SELECT user_id, team_id, COUNT(*) as cnt, 
             ARRAY_AGG(id ORDER BY created_at ASC) as member_ids
      FROM team_members
      GROUP BY user_id, team_id
      HAVING COUNT(*) > 1
    `);

    if (dupes.rows.length === 0) {
      console.log("No duplicate team memberships found.");
    } else {
      console.log(`Found ${dupes.rows.length} duplicate membership(s):`);
      for (const row of dupes.rows) {
        console.log(`  user=${row.user_id} team=${row.team_id} count=${row.cnt} ids=${row.member_ids}`);
        // Keep the first (oldest), delete the rest
        const idsToDelete = row.member_ids.slice(1);
        for (const id of idsToDelete) {
          console.log(`    Deleting duplicate team_member: ${id}`);
          await client.query(`DELETE FROM team_members WHERE id = $1`, [id]);
        }
      }
      console.log("Duplicates cleaned up.");
    }

    // Also add LIMIT 1 safety to the team_member_id subquery in the function
    const { readFileSync } = require("fs");
    const { join } = require("path");
    const sql = readFileSync(
      join(__dirname, "..", "worklenz-backend", "database", "sql", "4_functions.sql"),
      "utf8"
    );
    const match = sql.match(
      /CREATE OR REPLACE FUNCTION get_task_form_view_model\([\s\S]*?\n\$\$;/
    );
    if (match) {
      console.log("\nReapplying get_task_form_view_model function...");
      await client.query(match[0]);
      console.log("Function updated.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
