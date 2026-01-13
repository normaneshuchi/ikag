import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function main() {
  try {
    const result = await db.execute(sql`SELECT * FROM "__drizzle_migrations" ORDER BY id`);
    console.log("Current migrations in database:");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (e: unknown) {
    const error = e as { message: string; code?: string };
    if (error.code === "42P01" || error.message.includes("does not exist")) {
      console.log("No __drizzle_migrations table found - migrations have never been run");
    } else {
      console.error("Error:", error.message);
    }
  }
  await pool.end();
}

main();
