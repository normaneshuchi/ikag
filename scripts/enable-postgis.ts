import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

async function enablePostGIS() {
  const connectionString = process.env.DB_POSTGRES_URL;
  
  if (!connectionString) {
    console.error("DB_POSTGRES_URL environment variable is not set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  // Log connection (without password)
  const urlForLog = connectionString.replace(/:([^@]+)@/, ':***@');
  console.log("Database URL:", urlForLog);

  const pool = new Pool({
    connectionString,
  });

  const db = drizzle(pool);

  try {
    console.log("Enabling PostGIS extension...");
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);
    
    // Verify PostGIS is installed
    const result = await db.execute(sql`SELECT PostGIS_Version() as version`);
    console.log("PostGIS version:", result.rows[0]);
    
    // Check if geography type exists
    const typeCheck = await db.execute(sql`
      SELECT typname FROM pg_type WHERE typname = 'geography'
    `);
    console.log("Geography type exists:", typeCheck.rows.length > 0);
    
    // Create necessary enum types if they don't exist
    console.log("Creating enum types if needed...");
    
    try {
      await db.execute(sql`CREATE TYPE "agency_status" AS ENUM ('pending', 'verified', 'suspended')`);
      console.log("Created agency_status enum");
    } catch {
      console.log("agency_status enum already exists");
    }
    
    try {
      await db.execute(sql`CREATE TYPE "agency_member_role" AS ENUM ('owner', 'manager', 'provider')`);
      console.log("Created agency_member_role enum");
    } catch {
      console.log("agency_member_role enum already exists");
    }
    
    try {
      await db.execute(sql`CREATE TYPE "booking_status" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled')`);
      console.log("Created booking_status enum");
    } catch {
      console.log("booking_status enum already exists");
    }
    
    console.log("PostGIS extension enabled successfully!");
  } catch (error) {
    console.error("Failed to enable PostGIS:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

enablePostGIS()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
