CREATE TYPE "public"."mailbox_provider" AS ENUM('imap', 'microsoft', 'google');--> statement-breakpoint
CREATE TABLE "mailbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255) NOT NULL,
	"provider" "mailbox_provider" NOT NULL,
	"credentials" text NOT NULL,
	"cursor" jsonb,
	"poll_interval_seconds" integer DEFAULT 120 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp,
	"next_sync_at" timestamp,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mailbox_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "mailbox_organization_id_address_unique" UNIQUE("organization_id","address"),
	CONSTRAINT "mailbox_poll_interval_seconds_range" CHECK ("mailbox"."poll_interval_seconds" between 60 and 300)
);
--> statement-breakpoint
ALTER TABLE "mailbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_organization_id_uid_unique";--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "mailbox_id" integer;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "provider_message_id" varchar(255);--> statement-breakpoint
-- Email archived before mailboxes came from the one inbox in the old settings: keep it, keyed by its UID
UPDATE "email" SET "provider_message_id" = 'legacy:' || "uid";--> statement-breakpoint
ALTER TABLE "email" ALTER COLUMN "provider_message_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "message_id" text;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "mailbox_id" integer;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD COLUMN "email_message_id" text;--> statement-breakpoint
ALTER TABLE "mailbox" ADD CONSTRAINT "mailbox_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_mailbox_id_mailbox_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailbox"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_mailbox_same_org_fk" FOREIGN KEY ("organization_id","mailbox_id") REFERENCES "public"."mailbox"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_mailbox_id_mailbox_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailbox"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_mailbox_same_org_fk" FOREIGN KEY ("organization_id","mailbox_id") REFERENCES "public"."mailbox"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_message_email_message_id_idx" ON "ticket_message" USING btree ("organization_id","email_message_id");--> statement-breakpoint
ALTER TABLE "email" DROP COLUMN "uid";--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_mailbox_id_provider_message_id_unique" UNIQUE("mailbox_id","provider_message_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "mailbox" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("mailbox"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("mailbox"."organization_id" = current_setting('app.organization_id', true)::integer);