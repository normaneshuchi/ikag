-- Ensure PostGIS extension is available (may already exist from initial migration)
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "public"."agency_member_role" AS ENUM('owner', 'manager', 'provider');--> statement-breakpoint
CREATE TYPE "public"."agency_status" AS ENUM('pending', 'verified', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"email" text NOT NULL,
	"phone" text,
	"website" text,
	"location" "geography(Point, 4326)",
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
);
--> statement-breakpoint
CREATE TABLE "agency_member_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_member_id" uuid NOT NULL,
	"service_type_id" uuid NOT NULL,
	"hourly_rate" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_members" (
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
);
--> statement-breakpoint
CREATE TABLE "agency_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"service_type_id" uuid NOT NULL,
	"hourly_rate" numeric(10, 2),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_bookings" (
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
);
--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "default_estimated_duration" integer;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "agency_id" uuid;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "agency_member_id" uuid;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "is_self_service" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "estimated_duration" integer;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "estimated_end_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_member_services" ADD CONSTRAINT "agency_member_services_agency_member_id_agency_members_id_fk" FOREIGN KEY ("agency_member_id") REFERENCES "public"."agency_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_member_services" ADD CONSTRAINT "agency_member_services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_members" ADD CONSTRAINT "agency_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_services" ADD CONSTRAINT "agency_services_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_services" ADD CONSTRAINT "agency_services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_bookings" ADD CONSTRAINT "provider_bookings_agency_member_id_agency_members_id_fk" FOREIGN KEY ("agency_member_id") REFERENCES "public"."agency_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_bookings" ADD CONSTRAINT "provider_bookings_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_bookings" ADD CONSTRAINT "provider_bookings_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agencies_owner_idx" ON "agencies" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "agencies_status_idx" ON "agencies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agencies_location_idx" ON "agencies" USING gist ("location");--> statement-breakpoint
CREATE INDEX "agency_member_services_member_idx" ON "agency_member_services" USING btree ("agency_member_id");--> statement-breakpoint
CREATE INDEX "agency_member_services_service_idx" ON "agency_member_services" USING btree ("service_type_id");--> statement-breakpoint
CREATE INDEX "agency_members_agency_idx" ON "agency_members" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "agency_members_user_idx" ON "agency_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agency_members_active_idx" ON "agency_members" USING btree ("agency_id","is_active");--> statement-breakpoint
CREATE INDEX "agency_services_agency_idx" ON "agency_services" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "agency_services_service_idx" ON "agency_services" USING btree ("service_type_id");--> statement-breakpoint
CREATE INDEX "provider_bookings_member_idx" ON "provider_bookings" USING btree ("agency_member_id");--> statement-breakpoint
CREATE INDEX "provider_bookings_request_idx" ON "provider_bookings" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "provider_bookings_service_idx" ON "provider_bookings" USING btree ("service_type_id");--> statement-breakpoint
CREATE INDEX "provider_bookings_time_idx" ON "provider_bookings" USING btree ("agency_member_id","start_time","end_time");--> statement-breakpoint
CREATE INDEX "provider_bookings_status_idx" ON "provider_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_requests_agency_idx" ON "service_requests" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "service_requests_agency_member_idx" ON "service_requests" USING btree ("agency_member_id");--> statement-breakpoint
CREATE INDEX "service_requests_scheduled_idx" ON "service_requests" USING btree ("scheduled_at");