-- Roles belong to the whole server, which test and development databases may share
DO $$ BEGIN
	IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'keydesk_app') THEN
		CREATE ROLE "keydesk_app";
	END IF;
END $$;--> statement-breakpoint
CREATE TABLE "organization" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"address" varchar(255) DEFAULT '' NOT NULL,
	"country" varchar(100) DEFAULT '' NOT NULL,
	"city" varchar(100) DEFAULT '' NOT NULL,
	"zip_code" varchar(20) DEFAULT '' NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" varchar(100) DEFAULT 'Europe/Amsterdam' NOT NULL,
	"next_ticket_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "category" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "image" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "priority" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "requester" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "status" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_tag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_attachment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_message" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_tag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "config" DROP CONSTRAINT "config_key_unique";--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_uid_unique";--> statement-breakpoint
ALTER TABLE "ticket" DROP CONSTRAINT "ticket_ticket_number_unique";--> statement-breakpoint
ALTER TABLE "ticket" ALTER COLUMN "ticket_number" SET DATA TYPE integer;--> statement-breakpoint
-- Ticket numbers now come from organization.next_ticket_number, not a global sequence
ALTER TABLE "ticket" ALTER COLUMN "ticket_number" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "ticket_ticket_number_seq";--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "config" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "email" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "image" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "priority" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "requester" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "status" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tag" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "task_tag" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_attachment" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_tag" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification" ADD COLUMN "organization_id" integer DEFAULT current_setting('app.organization_id', true)::integer NOT NULL;--> statement-breakpoint
-- The same-organization foreign keys below need these unique keys to exist first
ALTER TABLE "category" ADD CONSTRAINT "category_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_organization_id_name_unique" UNIQUE("organization_id","name");--> statement-breakpoint
ALTER TABLE "config" ADD CONSTRAINT "config_organization_id_key_unique" UNIQUE("organization_id","key");--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_organization_id_uid_unique" UNIQUE("organization_id","uid");--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "image_organization_id_unique" UNIQUE("organization_id");--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "priority" ADD CONSTRAINT "priority_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "priority" ADD CONSTRAINT "priority_organization_id_name_unique" UNIQUE("organization_id","name");--> statement-breakpoint
ALTER TABLE "requester" ADD CONSTRAINT "requester_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "requester" ADD CONSTRAINT "requester_organization_id_email_unique" UNIQUE("organization_id","email");--> statement-breakpoint
ALTER TABLE "status" ADD CONSTRAINT "status_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "status" ADD CONSTRAINT "status_organization_id_name_unique" UNIQUE("organization_id","name");--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_organization_id_name_unique" UNIQUE("organization_id","name");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_organization_id_ticket_number_unique" UNIQUE("organization_id","ticket_number");--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_id_unique" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config" ADD CONSTRAINT "config_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_ticket_same_org_fk" FOREIGN KEY ("organization_id","ticket_id") REFERENCES "public"."ticket"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_requester_same_org_fk" FOREIGN KEY ("organization_id","requester_id") REFERENCES "public"."requester"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_ticket_message_same_org_fk" FOREIGN KEY ("organization_id","ticket_message_id") REFERENCES "public"."ticket_message"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "image_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_created_by_same_org_fk" FOREIGN KEY ("organization_id","created_by_id") REFERENCES "public"."user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority" ADD CONSTRAINT "priority_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requester" ADD CONSTRAINT "requester_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status" ADD CONSTRAINT "status_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_ticket_same_org_fk" FOREIGN KEY ("organization_id","ticket_id") REFERENCES "public"."ticket"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_parent_task_same_org_fk" FOREIGN KEY ("organization_id","parent_task_id") REFERENCES "public"."task"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_same_org_fk" FOREIGN KEY ("organization_id","created_by_id") REFERENCES "public"."user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_same_org_fk" FOREIGN KEY ("organization_id","assignee_id") REFERENCES "public"."user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_status_same_org_fk" FOREIGN KEY ("organization_id","status_id") REFERENCES "public"."status"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_priority_same_org_fk" FOREIGN KEY ("organization_id","priority_id") REFERENCES "public"."priority"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tag" ADD CONSTRAINT "task_tag_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tag" ADD CONSTRAINT "task_tag_task_same_org_fk" FOREIGN KEY ("organization_id","task_id") REFERENCES "public"."task"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tag" ADD CONSTRAINT "task_tag_tag_same_org_fk" FOREIGN KEY ("organization_id","tag_id") REFERENCES "public"."tag"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_requester_same_org_fk" FOREIGN KEY ("organization_id","requester_id") REFERENCES "public"."requester"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_assignee_same_org_fk" FOREIGN KEY ("organization_id","assigned_user_id") REFERENCES "public"."user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_status_same_org_fk" FOREIGN KEY ("organization_id","status_id") REFERENCES "public"."status"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_priority_same_org_fk" FOREIGN KEY ("organization_id","priority_id") REFERENCES "public"."priority"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_category_same_org_fk" FOREIGN KEY ("organization_id","category_id") REFERENCES "public"."category"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachment" ADD CONSTRAINT "ticket_attachment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachment" ADD CONSTRAINT "ticket_attachment_ticket_same_org_fk" FOREIGN KEY ("organization_id","ticket_id") REFERENCES "public"."ticket"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachment" ADD CONSTRAINT "ticket_attachment_message_same_org_fk" FOREIGN KEY ("organization_id","message_id") REFERENCES "public"."ticket_message"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_ticket_same_org_fk" FOREIGN KEY ("organization_id","ticket_id") REFERENCES "public"."ticket"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_requester_same_org_fk" FOREIGN KEY ("organization_id","requester_id") REFERENCES "public"."requester"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_user_same_org_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_tag" ADD CONSTRAINT "ticket_tag_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_tag" ADD CONSTRAINT "ticket_tag_ticket_same_org_fk" FOREIGN KEY ("organization_id","ticket_id") REFERENCES "public"."ticket"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_tag" ADD CONSTRAINT "ticket_tag_tag_same_org_fk" FOREIGN KEY ("organization_id","tag_id") REFERENCES "public"."tag"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_notification_same_org_fk" FOREIGN KEY ("organization_id","notification_id") REFERENCES "public"."notification"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_user_same_org_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "category" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("category"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("category"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "config" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("config"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("config"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "email" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("email"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("email"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "image" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("image"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("image"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "notification" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("notification"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("notification"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "priority" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("priority"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("priority"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "requester" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("requester"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("requester"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "status" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("status"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("status"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "tag" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("tag"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("tag"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "task" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("task"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("task"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "task_tag" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("task_tag"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("task_tag"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "ticket" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("ticket"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("ticket"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "ticket_attachment" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("ticket_attachment"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("ticket_attachment"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "ticket_message" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("ticket_message"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("ticket_message"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "ticket_tag" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("ticket_tag"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("ticket_tag"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "user" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("user"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("user"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "user_notification" AS PERMISSIVE FOR ALL TO "keydesk_app" USING ("user_notification"."organization_id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("user_notification"."organization_id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_read" ON "organization" AS PERMISSIVE FOR SELECT TO "keydesk_app" USING ("organization"."id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
CREATE POLICY "tenant_update" ON "organization" AS PERMISSIVE FOR UPDATE TO "keydesk_app" USING ("organization"."id" = current_setting('app.organization_id', true)::integer) WITH CHECK ("organization"."id" = current_setting('app.organization_id', true)::integer);--> statement-breakpoint
-- Tenant transactions switch to keydesk_app (SET LOCAL ROLE); it reads and writes the application
-- tables, limited by the policies above, and has no access to better-auth's own tables
GRANT USAGE ON SCHEMA public TO keydesk_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO keydesk_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO keydesk_app;--> statement-breakpoint
REVOKE ALL ON "session", "account", "verification", "__drizzle_migrations__" FROM keydesk_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO keydesk_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO keydesk_app;--> statement-breakpoint
GRANT keydesk_app TO CURRENT_USER;
