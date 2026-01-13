import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });
config({ path: ".env" });

async function check() {
  const pool = new Pool({ connectionString: process.env.DB_POSTGRES_URL });
  const db = drizzle(pool);

  try {
    // Check search path
    const searchPath = await db.execute(sql`SHOW search_path`);
    console.log("Search path:", searchPath.rows[0]);

    // Check geography type namespace
    const typeInfo = await db.execute(sql`
      SELECT n.nspname as schema, t.typname as type
      FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'geography'
    `);
    console.log("Geography type info:", typeInfo.rows);

    // Try creating table with geography
    try {
      await db.execute(
        sql`CREATE TABLE IF NOT EXISTS test_geo (id serial, loc geography(Point, 4326))`
      );
      console.log("Test table created successfully!");
      await db.execute(sql`DROP TABLE IF EXISTS test_geo`);
    } catch (e: unknown) {
      console.log("Test table creation failed:", (e as Error).message);
    }
  } finally {
    await pool.end();
  }
}

check();
