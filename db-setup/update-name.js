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
    const result = await client.query(
      `UPDATE users SET name = 'Prasanna' WHERE LOWER(email) = 'prasanna@botpresso.com' RETURNING id, name, email`
    );
    console.log("Updated:", result.rows[0]);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
