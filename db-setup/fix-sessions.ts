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
  // Clear stale sessions from old DB
  const res = await client.query(`DELETE FROM pg_sessions`);
  console.log(`Deleted ${res.rowCount} stale sessions`);
  
  // Verify the session table structure
  const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pg_sessions' ORDER BY ordinal_position`);
  console.log("\npg_sessions columns:");
  for (const row of cols.rows) {
    console.log(`  ${row.column_name}: ${row.data_type}`);
  }
  
  await client.end();
  console.log("\nDone. Sessions cleared — users can now login fresh.");
}
run();
