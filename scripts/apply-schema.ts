import { config } from "dotenv";
import { Pool } from "pg";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

async function applySchema() {
  const connectionString = process.env.DB_POSTGRES_URL;

  if (!connectionString) {
    console.error("DB_POSTGRES_URL environment variable is not set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const pool = new Pool({ connectionString });

  try {
    // Enable PostGIS
    console.log("Enabling PostGIS extension...");
    await pool.query("CREATE EXTENSION IF NOT EXISTS postgis");

    // Create enum types if they don't exist
    console.log("Creating enum types...");
    const enums = [
      `DO $$ BEGIN CREATE TYPE "request_status" AS ENUM ('pending', 'matched', 'accepted', 'in_progress', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE "agency_status" AS ENUM ('pending', 'verified', 'suspended'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE "agency_member_role" AS ENUM ('owner', 'manager', 'provider'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE "booking_status" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    ];

    for (const sql of enums) {
      await pool.query(sql);
    }

    // Create auth tables (from better-auth)
    console.log("Creating users table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" text NOT NULL UNIQUE,
        "email_verified" boolean DEFAULT false NOT NULL,
        "name" text NOT NULL,
        "image" text,
        "role" text DEFAULT 'user' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating accounts table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "access_token" text,
        "refresh_token" text,
        "access_token_expires_at" timestamp with time zone,
        "refresh_token_expires_at" timestamp with time zone,
        "scope" text,
        "password" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating sessions table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "token" text NOT NULL UNIQUE,
        "expires_at" timestamp with time zone NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating verifications table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "verifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating service_types table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "service_types" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL UNIQUE,
        "description" text,
        "icon" text,
        "default_estimated_duration" integer,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    // Create tables with geography type (unquoted)
    console.log("Creating provider_profiles table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "provider_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL UNIQUE,
        "bio" text,
        "years_of_experience" integer DEFAULT 0,
        "location" geography(Point,4326),
        "latitude" numeric(10, 7),
        "longitude" numeric(10, 7),
        "address" text,
        "service_radius" integer DEFAULT 10,
        "is_available" boolean DEFAULT false NOT NULL,
        "average_rating" numeric(3, 2) DEFAULT '0',
        "total_reviews" integer DEFAULT 0,
        "verified_at" timestamp with time zone,
        "verified_by" uuid,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating provider_services table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "provider_services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "provider_id" uuid NOT NULL,
        "service_type_id" uuid NOT NULL,
        "hourly_rate" numeric(10, 2),
        "description" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating service_requests table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "service_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "service_type_id" uuid NOT NULL,
        "provider_id" uuid,
        "agency_id" uuid,
        "agency_member_id" uuid,
        "is_self_service" boolean DEFAULT false NOT NULL,
        "status" "request_status" DEFAULT 'pending' NOT NULL,
        "description" text NOT NULL,
        "location" geography(Point,4326),
        "latitude" numeric(10, 7),
        "longitude" numeric(10, 7),
        "address" text,
        "scheduled_at" timestamp with time zone,
        "estimated_duration" integer,
        "estimated_end_time" timestamp with time zone,
        "completed_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating reviews table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "request_id" uuid NOT NULL UNIQUE,
        "user_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "rating" integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "comment" text,
        "provider_response" text,
        "provider_responded_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating agencies table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "agencies" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "logo" text,
        "email" text NOT NULL,
        "phone" text,
        "website" text,
        "location" geography(Point,4326),
        "latitude" numeric(10, 7),
        "longitude" numeric(10, 7),
        "address" text,
        "service_radius" integer DEFAULT 10,
        "status" "agency_status" DEFAULT 'pending' NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "owner_id" uuid NOT NULL,
        "verified_at" timestamp with time zone,
        "verified_by" uuid,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating agency_members table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "agency_members" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "agency_id" uuid NOT NULL,
        "user_id" uuid,
        "is_external" boolean DEFAULT false NOT NULL,
        "external_name" text,
        "external_email" text,
        "external_phone" text,
        "external_notes" text,
        "role" "agency_member_role" DEFAULT 'provider' NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating agency_member_services table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "agency_member_services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "agency_member_id" uuid NOT NULL,
        "service_type_id" uuid NOT NULL,
        "hourly_rate" numeric(10, 2),
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating agency_services table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "agency_services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "agency_id" uuid NOT NULL,
        "service_type_id" uuid NOT NULL,
        "hourly_rate" numeric(10, 2),
        "description" text,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log("Creating provider_bookings table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "provider_bookings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "agency_member_id" uuid NOT NULL,
        "request_id" uuid NOT NULL,
        "service_type_id" uuid NOT NULL,
        "start_time" timestamp with time zone NOT NULL,
        "end_time" timestamp with time zone NOT NULL,
        "estimated_duration" integer NOT NULL,
        "status" "booking_status" DEFAULT 'scheduled' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    // Add missing columns to existing tables (for migration from older schema versions)
    console.log("Adding missing columns to existing tables...");
    const columnAdditions = [
      // service_types columns
      `ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "default_estimated_duration" integer`,
      `ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "description" text`,
      `ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "icon" text`,
      `ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL`,
      
      // service_requests columns (agency-related)
      `ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "agency_id" uuid`,
      `ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "agency_member_id" uuid`,
      `ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "is_self_service" boolean DEFAULT false NOT NULL`,
      `ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "estimated_end_time" timestamp with time zone`,
      
      // provider_profiles columns
      `ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "latitude" numeric(10, 7)`,
      `ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "longitude" numeric(10, 7)`,
      `ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "address" text`,
      `ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "service_radius" integer DEFAULT 10`,
      
      // agencies columns
      `ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "latitude" numeric(10, 7)`,
      `ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "longitude" numeric(10, 7)`,
      `ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "address" text`,
      `ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "service_radius" integer DEFAULT 10`,
      `ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL`,
      
      // agency_members columns
      `ALTER TABLE "agency_members" ADD COLUMN IF NOT EXISTS "is_external" boolean DEFAULT false NOT NULL`,
      `ALTER TABLE "agency_members" ADD COLUMN IF NOT EXISTS "external_name" text`,
      `ALTER TABLE "agency_members" ADD COLUMN IF NOT EXISTS "external_email" text`,
      `ALTER TABLE "agency_members" ADD COLUMN IF NOT EXISTS "external_phone" text`,
      `ALTER TABLE "agency_members" ADD COLUMN IF NOT EXISTS "external_notes" text`,
    ];

    for (const sql of columnAdditions) {
      try {
        await pool.query(sql);
      } catch (e: unknown) {
        const err = e as Error & { code?: string };
        // 42701 = column already exists (shouldn't happen with IF NOT EXISTS but just in case)
        if (err.code !== "42701") {
          console.warn(`Warning adding column: ${err.message}`);
        }
      }
    }

    // Add foreign key constraints
    console.log("Adding foreign key constraints...");
    const constraints = [
      `ALTER TABLE "provider_profiles" DROP CONSTRAINT IF EXISTS "provider_profiles_user_id_users_id_fk"`,
      `ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "provider_profiles" DROP CONSTRAINT IF EXISTS "provider_profiles_verified_by_users_id_fk"`,
      `ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action`,
      
      `ALTER TABLE "provider_services" DROP CONSTRAINT IF EXISTS "provider_services_provider_id_provider_profiles_id_fk"`,
      `ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "provider_services" DROP CONSTRAINT IF EXISTS "provider_services_service_type_id_service_types_id_fk"`,
      `ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE cascade ON UPDATE no action`,
      
      `ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_user_id_users_id_fk"`,
      `ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_service_type_id_service_types_id_fk"`,
      `ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE no action ON UPDATE no action`,
      `ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_provider_id_provider_profiles_id_fk"`,
      `ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE no action ON UPDATE no action`,
      
      `ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_request_id_service_requests_id_fk"`,
      `ALTER TABLE "reviews" ADD CONSTRAINT "reviews_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_user_id_users_id_fk"`,
      `ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_provider_id_provider_profiles_id_fk"`,
      `ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE cascade ON UPDATE no action`,
      
      `ALTER TABLE "agencies" DROP CONSTRAINT IF EXISTS "agencies_owner_id_users_id_fk"`,
      `ALTER TABLE "agencies" ADD CONSTRAINT "agencies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "agencies" DROP CONSTRAINT IF EXISTS "agencies_verified_by_users_id_fk"`,
      `ALTER TABLE "agencies" ADD CONSTRAINT "agencies_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action`,
      
      `ALTER TABLE "agency_members" DROP CONSTRAINT IF EXISTS "agency_members_agency_id_agencies_id_fk"`,
      `ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "agency_members" DROP CONSTRAINT IF EXISTS "agency_members_user_id_users_id_fk"`,
      `ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action`,
      
      `ALTER TABLE "agency_member_services" DROP CONSTRAINT IF EXISTS "agency_member_services_agency_member_id_agency_members_id_fk"`,
      `ALTER TABLE "agency_member_services" ADD CONSTRAINT "agency_member_services_agency_member_id_agency_members_id_fk" FOREIGN KEY ("agency_member_id") REFERENCES "agency_members"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "agency_member_services" DROP CONSTRAINT IF EXISTS "agency_member_services_service_type_id_service_types_id_fk"`,
      `ALTER TABLE "agency_member_services" ADD CONSTRAINT "agency_member_services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE cascade ON UPDATE no action`,
      
      `ALTER TABLE "agency_services" DROP CONSTRAINT IF EXISTS "agency_services_agency_id_agencies_id_fk"`,
      `ALTER TABLE "agency_services" ADD CONSTRAINT "agency_services_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "agency_services" DROP CONSTRAINT IF EXISTS "agency_services_service_type_id_service_types_id_fk"`,
      `ALTER TABLE "agency_services" ADD CONSTRAINT "agency_services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE cascade ON UPDATE no action`,
      
      `ALTER TABLE "provider_bookings" DROP CONSTRAINT IF EXISTS "provider_bookings_agency_member_id_agency_members_id_fk"`,
      `ALTER TABLE "provider_bookings" ADD CONSTRAINT "provider_bookings_agency_member_id_agency_members_id_fk" FOREIGN KEY ("agency_member_id") REFERENCES "agency_members"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "provider_bookings" DROP CONSTRAINT IF EXISTS "provider_bookings_request_id_service_requests_id_fk"`,
      `ALTER TABLE "provider_bookings" ADD CONSTRAINT "provider_bookings_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE cascade ON UPDATE no action`,
      `ALTER TABLE "provider_bookings" DROP CONSTRAINT IF EXISTS "provider_bookings_service_type_id_service_types_id_fk"`,
      `ALTER TABLE "provider_bookings" ADD CONSTRAINT "provider_bookings_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE cascade ON UPDATE no action`,
    ];

    for (const sql of constraints) {
      try {
        await pool.query(sql);
      } catch (e: unknown) {
        // Ignore if constraint already exists or table doesn't exist
        const err = e as Error & { code?: string };
        if (err.code !== "42P07" && err.code !== "42P01") {
          console.warn(`Warning: ${err.message}`);
        }
      }
    }

    // Create indexes
    console.log("Creating indexes...");
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "provider_profiles_location_idx" ON "provider_profiles" USING gist ("location")`,
      `CREATE INDEX IF NOT EXISTS "provider_profiles_verified_idx" ON "provider_profiles" ("verified_at") WHERE verified_at IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS "provider_profiles_available_idx" ON "provider_profiles" ("is_available")`,
      `CREATE INDEX IF NOT EXISTS "service_requests_user_idx" ON "service_requests" ("user_id")`,
      `CREATE INDEX IF NOT EXISTS "service_requests_provider_idx" ON "service_requests" ("provider_id")`,
      `CREATE INDEX IF NOT EXISTS "service_requests_agency_idx" ON "service_requests" ("agency_id")`,
      `CREATE INDEX IF NOT EXISTS "service_requests_agency_member_idx" ON "service_requests" ("agency_member_id")`,
      `CREATE INDEX IF NOT EXISTS "service_requests_status_idx" ON "service_requests" ("status")`,
      `CREATE INDEX IF NOT EXISTS "service_requests_location_idx" ON "service_requests" USING gist ("location")`,
      `CREATE INDEX IF NOT EXISTS "service_requests_scheduled_idx" ON "service_requests" ("scheduled_at")`,
      `CREATE INDEX IF NOT EXISTS "reviews_provider_idx" ON "reviews" ("provider_id")`,
      `CREATE INDEX IF NOT EXISTS "reviews_user_idx" ON "reviews" ("user_id")`,
      `CREATE INDEX IF NOT EXISTS "agencies_owner_idx" ON "agencies" ("owner_id")`,
      `CREATE INDEX IF NOT EXISTS "agencies_status_idx" ON "agencies" ("status")`,
      `CREATE INDEX IF NOT EXISTS "agencies_location_idx" ON "agencies" USING gist ("location")`,
      `CREATE INDEX IF NOT EXISTS "agency_member_services_member_idx" ON "agency_member_services" ("agency_member_id")`,
      `CREATE INDEX IF NOT EXISTS "agency_member_services_service_idx" ON "agency_member_services" ("service_type_id")`,
      `CREATE INDEX IF NOT EXISTS "agency_members_agency_idx" ON "agency_members" ("agency_id")`,
      `CREATE INDEX IF NOT EXISTS "agency_members_user_idx" ON "agency_members" ("user_id")`,
      `CREATE INDEX IF NOT EXISTS "agency_members_active_idx" ON "agency_members" ("agency_id", "is_active")`,
      `CREATE INDEX IF NOT EXISTS "agency_services_agency_idx" ON "agency_services" ("agency_id")`,
      `CREATE INDEX IF NOT EXISTS "agency_services_service_idx" ON "agency_services" ("service_type_id")`,
      `CREATE INDEX IF NOT EXISTS "provider_bookings_member_idx" ON "provider_bookings" ("agency_member_id")`,
      `CREATE INDEX IF NOT EXISTS "provider_bookings_request_idx" ON "provider_bookings" ("request_id")`,
      `CREATE INDEX IF NOT EXISTS "provider_bookings_service_idx" ON "provider_bookings" ("service_type_id")`,
      `CREATE INDEX IF NOT EXISTS "provider_bookings_time_idx" ON "provider_bookings" ("agency_member_id", "start_time", "end_time")`,
      `CREATE INDEX IF NOT EXISTS "provider_bookings_status_idx" ON "provider_bookings" ("status")`,
    ];

    for (const sql of indexes) {
      try {
        await pool.query(sql);
      } catch (e: unknown) {
        const err = e as Error;
        console.warn(`Warning: ${err.message}`);
      }
    }

    console.log("Schema applied successfully!");
  } catch (error) {
    console.error("Failed to apply schema:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

applySchema()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
