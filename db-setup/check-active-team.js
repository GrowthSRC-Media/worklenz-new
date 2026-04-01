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

    // Check active team
    const userResult = await client.query(`
      SELECT id, name, email, active_team FROM users WHERE LOWER(email) = LOWER($1)
    `, ["prasanna@botpresso.com"]);
    console.log("Active team:", userResult.rows[0]?.active_team);

    // Check project counts per team
    const projectsResult = await client.query(`
      SELECT t.id as team_id, t.name as team_name, COUNT(p.id) as project_count
      FROM teams t
      LEFT JOIN projects p ON p.team_id = t.id
      WHERE t.id IN ('f57e812c-444b-4520-9198-135f2c2a3bd9', '2a99e699-b75f-4cea-bf77-b506f14defd4', 'ce2065aa-e897-4e00-a1ee-67a8a866bc70')
      GROUP BY t.id, t.name
    `);
    console.log("\nProjects per team:");
    projectsResult.rows.forEach(r => console.log(`  ${r.team_name} (${r.team_id}): ${r.project_count} projects`));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
