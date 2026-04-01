import { Client } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const SQL_DIR = join(__dirname, "..", "worklenz-backend", "database", "sql");

const SCHEMA_FILES = [
  "0_extensions.sql",
  "1_tables.sql",
  "indexes.sql",
  "4_functions.sql",
  "triggers.sql",
  "3_views.sql",
  "2_dml.sql",
  "5_database_user.sql",
  "fix_missing_columns.sql",
];

// Old DB (source) — use direct connection, not pooler
const OLD_DB = {
  host: process.env.OLD_DB_HOST || "aws-1-ap-northeast-1.pooler.supabase.com",
  port: Number(process.env.OLD_DB_PORT || 5432),
  user: process.env.OLD_DB_USER || "postgres.ipyxjvdbliujebzslngo",
  password: process.env.OLD_DB_PASSWORD || "",
  database: process.env.OLD_DB_NAME || "worklenz_db",
};

// New DB (target)
const NEW_DB = {
  host: process.env.DB_HOST || "",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "worklenz_db",
};

async function getTableNames(client: Client): Promise<string[]> {
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return res.rows.map((r: any) => r.table_name);
}

async function getTableColumns(client: Client, table: string): Promise<string[]> {
  const res = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [table]);
  return res.rows.map((r: any) => r.column_name);
}

async function getRowCount(client: Client, table: string): Promise<number> {
  const res = await client.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
  return parseInt(res.rows[0].cnt);
}

async function setupNewDb(client: Client) {
  console.log("Setting up schema on new database...\n");
  for (const file of SCHEMA_FILES) {
    const path = join(SQL_DIR, file);
    try {
      let sql = readFileSync(path, "utf-8");
      if (file === "indexes.sql") sql = sql.replace(/CONCURRENTLY /gi, "");
      console.log(`  Running ${file}...`);
      await client.query(sql);
      console.log(`  Done`);
    } catch (err: any) {
      const msg = err.message.split("\n")[0];
      // Skip "already exists" errors
      if (msg.includes("already exists")) {
        console.log(`  Skipped (already exists)`);
      } else {
        console.error(`  WARN: ${msg}`);
      }
    }
  }
  console.log("");
}

async function migrateTable(
  oldClient: Client,
  newClient: Client,
  table: string,
  oldColumns: string[],
  newColumns: string[]
): Promise<number> {
  // Use only columns that exist in both DBs
  const commonColumns = oldColumns.filter(c => newColumns.includes(c));
  if (commonColumns.length === 0) return 0;

  const colList = commonColumns.map(c => `"${c}"`).join(", ");

  // Fetch all rows from old DB
  const res = await oldClient.query(`SELECT ${colList} FROM "${table}"`);
  if (res.rows.length === 0) return 0;

  // Disable triggers for faster insert
  try {
    await newClient.query(`ALTER TABLE "${table}" DISABLE TRIGGER ALL`);
  } catch (e) {
    // ignore if not superuser
  }

  // Clear existing data in new table
  try {
    await newClient.query(`DELETE FROM "${table}"`);
  } catch (e) {
    // ignore FK errors, we'll handle order
  }

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < res.rows.length; i += batchSize) {
    const batch = res.rows.slice(i, i + batchSize);
    const placeholders: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const row of batch) {
      const rowPlaceholders: string[] = [];
      for (const col of commonColumns) {
        rowPlaceholders.push(`$${paramIdx++}`);
        values.push(row[col]);
      }
      placeholders.push(`(${rowPlaceholders.join(", ")})`);
    }

    try {
      await newClient.query(
        `INSERT INTO "${table}" (${colList}) VALUES ${placeholders.join(", ")} ON CONFLICT DO NOTHING`,
        values
      );
      inserted += batch.length;
    } catch (err: any) {
      console.error(`    Batch insert error: ${err.message.split("\n")[0]}`);
    }
  }

  // Re-enable triggers
  try {
    await newClient.query(`ALTER TABLE "${table}" ENABLE TRIGGER ALL`);
  } catch (e) {
    // ignore
  }

  return inserted;
}

// Tables that should be migrated in order (parents first, children after)
const TABLE_ORDER = [
  // Core/reference tables first
  "sys_project_statuses",
  "sys_task_status_categories",
  "task_priorities",
  "project_access_levels",
  "countries",
  "permissions",
  "licensing_pricing_plans",
  "timezones",
  // User/team tables
  "users",
  "teams",
  "team_members",
  "licensing_user_subscriptions",
  "roles",
  "role_permissions",
  // Project tables
  "projects",
  "project_members",
  "project_categories",
  "project_folders",
  "project_phases",
  "project_subscribers",
  "project_comments",
  "project_comment_mentions",
  "project_logs",
  "project_task_list_cols",
  "archived_projects",
  "favorite_projects",
  "project_member_allocations",
  // Task tables
  "task_statuses",
  "tasks",
  "tasks_assignees",
  "task_comments",
  "task_comment_contents",
  "task_comment_attachments",
  "task_comment_mentions",
  "task_attachments",
  "task_labels",
  "task_subscribers",
  "task_dependencies",
  "task_work_log",
  "task_timers",
  "task_phase",
  "task_updates",
  // Other tables
  "team_labels",
  "job_titles",
  "clients",
  "email_invitations",
  "notification_settings",
  "notifications",
  "personal_todo_list",
  "custom_project_templates",
  "cpt_phases",
  "cpt_tasks",
  "cpt_task_phases",
  "cpt_task_statuses",
  "cc_columns",
  "cc_column_values",
  "pg_sessions",
  "bounced_emails",
  "spam_emails",
  "schedule_dates",
  "schedule_member_allocations",
  "schema_migrations",
];

async function run() {
  if (!OLD_DB.password || !NEW_DB.password || !NEW_DB.host) {
    console.error("Missing DB credentials. Set env vars:");
    console.error("  OLD_DB_HOST, OLD_DB_PORT, OLD_DB_USER, OLD_DB_PASSWORD, OLD_DB_NAME");
    console.error("  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME");
    process.exit(1);
  }

  console.log(`Source: ${OLD_DB.host}:${OLD_DB.port}/${OLD_DB.database}`);
  console.log(`Target: ${NEW_DB.host}:${NEW_DB.port}/${NEW_DB.database}\n`);

  const oldClient = new Client(OLD_DB);
  const newClient = new Client(NEW_DB);

  try {
    console.log("Connecting to source DB...");
    await oldClient.connect();
    console.log("Connecting to target DB...");
    await newClient.connect();
    console.log("Both connected.\n");

    // Step 1: Setup schema on new DB
    await setupNewDb(newClient);

    // Step 1.5: Disable FK checks on new DB
    console.log("Disabling foreign key checks...");
    try {
      await newClient.query(`SET session_replication_role = 'replica'`);
      console.log("  Done (session_replication_role = replica)\n");
    } catch (e: any) {
      console.warn(`  WARN: ${e.message.split("\n")[0]} — will try per-table disable\n`);
    }

    // Step 2: Get tables from old DB
    const oldTables = await getTableNames(oldClient);
    console.log(`Found ${oldTables.length} tables in source DB.\n`);

    // Step 3: Migrate data table by table
    console.log("Migrating data...\n");

    // First migrate tables in our defined order
    const migrated = new Set<string>();

    for (const table of TABLE_ORDER) {
      if (!oldTables.includes(table)) continue;

      const count = await getRowCount(oldClient, table);
      if (count === 0) {
        migrated.add(table);
        continue;
      }

      const oldCols = await getTableColumns(oldClient, table);
      const newCols = await getTableColumns(newClient, table).catch(() => [] as string[]);
      if (newCols.length === 0) {
        console.log(`  SKIP: ${table} (not in target DB)`);
        migrated.add(table);
        continue;
      }

      process.stdout.write(`  ${table} (${count} rows)... `);
      const inserted = await migrateTable(oldClient, newClient, table, oldCols, newCols);
      console.log(`${inserted} migrated`);
      migrated.add(table);
    }

    // Then migrate any remaining tables not in our order list
    for (const table of oldTables) {
      if (migrated.has(table)) continue;

      const count = await getRowCount(oldClient, table);
      if (count === 0) continue;

      const oldCols = await getTableColumns(oldClient, table);
      const newCols = await getTableColumns(newClient, table).catch(() => [] as string[]);
      if (newCols.length === 0) {
        console.log(`  SKIP: ${table} (not in target DB)`);
        continue;
      }

      process.stdout.write(`  ${table} (${count} rows)... `);
      const inserted = await migrateTable(oldClient, newClient, table, oldCols, newCols);
      console.log(`${inserted} migrated`);
    }

    // Step 4: Re-enable FK checks
    console.log("\nRe-enabling foreign key checks...");
    try {
      await newClient.query(`SET session_replication_role = 'origin'`);
      console.log("  Done");
    } catch (e) {
      // ignore
    }

    // Step 5: Reset sequences
    console.log("\nResetting sequences...");
    try {
      await newClient.query(`
        DO $$
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (
            SELECT c.table_name, c.column_name, pg_get_serial_sequence(c.table_name, c.column_name) as seq
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            AND c.column_default LIKE 'nextval%'
          ) LOOP
            IF r.seq IS NOT NULL THEN
              EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))', r.seq, r.column_name, r.table_name);
            END IF;
          END LOOP;
        END $$;
      `);
      console.log("  Done");
    } catch (err: any) {
      console.error(`  WARN: ${err.message.split("\n")[0]}`);
    }

    console.log("\nMigration complete!");
  } catch (err: any) {
    console.error(`\nFATAL: ${err.message}`);
    process.exit(1);
  } finally {
    await oldClient.end().catch(() => {});
    await newClient.end().catch(() => {});
  }
}

run();
