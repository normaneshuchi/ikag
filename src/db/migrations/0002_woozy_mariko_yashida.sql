ALTER TABLE "reviews" ADD COLUMN "provider_response" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "provider_responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;