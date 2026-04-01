const { Client } = require("pg");

async function run() {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || "worklenz_db";
  const email = process.env.USER_EMAIL;

  if (!host || !password || !email) {
    console.error("Missing required env vars: DB_HOST, DB_PASSWORD, USER_EMAIL");
    process.exit(1);
  }

  const client = new Client({ host, port, user, password, database, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log(`Connected to ${host}:${port}/${database}`);

    const result = await client.query(
      `UPDATE users SET is_deleted = false, deleted_at = NULL WHERE email = $1 RETURNING id, email, name`,
      [email]
    );

    if (result.rows.length === 0) {
      console.error(`No user found with email: ${email}`);
    } else {
      console.log(`Account reactivated: ${result.rows[0].name} (${result.rows[0].email})`);
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
