import { Client } from "pg";

const OLD_DB = {
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 5432, user: "postgres.ipyxjvdbliujebzslngo",
  password: "attitude-bulge-ebay-unlit-transport-botch",
  database: "worklenz_db",
};
const NEW_DB = {
  host: "aws-1-ap-south-1.pooler.supabase.com",
  port: 5432, user: "postgres.lmnhfljfheqffjokytkg",
  password: "attitude-bulge-ebay-unlit-transport-botch",
  database: "worklenz_db",
};

async function run() {
  const old = new Client(OLD_DB);
  const nw = new Client(NEW_DB);
  await old.connect();
  await nw.connect();

  await nw.query(`SET session_replication_role = 'replica'`);

  const res = await old.query(`SELECT * FROM tasks`);
  console.log(`Found ${res.rows.length} tasks`);

  for (const row of res.rows) {
    const cols = Object.keys(row);
    const colList = cols.map(c => `"${c}"`).join(", ");
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const values = cols.map(c => row[c]);
    try {
      await nw.query(`INSERT INTO tasks (${colList}) VALUES (${placeholders})`, values);
      console.log(`  Inserted task: ${row.name || row.id}`);
    } catch (err: any) {
      console.error(`  Failed: ${err.message.split("\n")[0]}`);
    }
  }

  await nw.query(`SET session_replication_role = 'origin'`);
  await old.end();
  await nw.end();
  console.log("Done.");
}
run();
