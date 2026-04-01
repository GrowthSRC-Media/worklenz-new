const { Client } = require("pg");
async function run() {
  const client = new Client({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres", password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "worklenz_db", ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    const r = await client.query(`
      SELECT u.name, u.email, ns.email_notifications_enabled, ns.team_id
      FROM users u
      LEFT JOIN notification_settings ns ON ns.user_id = u.id
      WHERE u.email IN ('prasanna@botpresso.com', 'akshat@botpresso.com', 'dev@botpresso.com')
    `);
    r.rows.forEach(row => console.log(JSON.stringify(row)));
  } catch (err) { console.error(err.message); }
  finally { await client.end(); }
}
run();
