ALTER TABLE "email" DROP CONSTRAINT "email_ticket_id_ticket_id_fk";
--> statement-breakpoint
ALTER TABLE "email" DROP CONSTRAINT "email_ticket_message_id_ticket_message_id_fk";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "task_ticket_id_ticket_id_fk";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "task_parent_task_id_task_id_fk";
--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_ticket_message_id_ticket_message_id_fk" FOREIGN KEY ("ticket_message_id") REFERENCES "public"."ticket_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_parent_task_id_task_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;