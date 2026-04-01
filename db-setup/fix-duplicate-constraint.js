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

    // First clean up any remaining duplicates (keep oldest)
    const cleanup = await client.query(`
      DELETE FROM team_members
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, team_id ORDER BY created_at ASC) as rn
          FROM team_members
          WHERE user_id IS NOT NULL
        ) t WHERE t.rn > 1
      )
    `);
    console.log(`Cleaned up ${cleanup.rowCount} duplicate team memberships.`);

    // Add unique constraint (only for non-null user_id)
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_user_team_unique 
        ON team_members (user_id, team_id) 
        WHERE user_id IS NOT NULL
      `);
      console.log("Unique index created on team_members(user_id, team_id).");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("Unique index already exists.");
      } else {
        throw err;
      }
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
