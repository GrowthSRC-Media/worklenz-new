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

    const result = await client.query(`
      SELECT u.id, u.name, u.email, u.is_deleted,
             tm.id as team_member_id, tm.active as tm_active,
             tm.team_id,
             t.name as team_name,
             r.name as role_name, r.admin_role,
             t.user_id as team_owner_id,
             (t.user_id = u.id) as is_owner
      FROM users u
      LEFT JOIN team_members tm ON tm.user_id = u.id
      LEFT JOIN teams t ON t.id = tm.team_id
      LEFT JOIN roles r ON r.id = tm.role_id
      WHERE LOWER(u.email) = LOWER($1)
    `, [process.env.USER_EMAIL]);

    if (result.rows.length === 0) {
      console.log("No user found");
    } else {
      result.rows.forEach(row => {
        console.log(JSON.stringify(row, null, 2));
      });
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
