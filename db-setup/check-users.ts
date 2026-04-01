import { Client } from "pg";
const client = new Client({
  host: "aws-1-ap-south-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.lmnhfljfheqffjokytkg",
  password: "attitude-bulge-ebay-unlit-transport-botch",
  database: "worklenz_db",
});
async function run() {
  await client.connect();
  const res = await client.query(`SELECT id, name, email, LENGTH(password::text) as pwd_len, google_id FROM users`);
  console.log("Users in new DB:");
  for (const row of res.rows) {
    console.log(`  ${row.email} | name: ${row.name} | pwd_len: ${row.pwd_len} | google: ${row.google_id || 'none'}`);
  }
  // Check pg_sessions
  const sessions = await client.query(`SELECT COUNT(*) as cnt FROM pg_sessions`);
  console.log(`\npg_sessions: ${sessions.rows[0].cnt} rows`);
  await client.end();
}
run();
