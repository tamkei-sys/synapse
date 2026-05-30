-- Reminder (PBI-68).
CREATE TABLE IF NOT EXISTS "reminder" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "block_id" text NOT NULL,
  "user_id" text NOT NULL,
  "remind_at" timestamp with time zone NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reminder_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade,
  CONSTRAINT "reminder_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE cascade,
  CONSTRAINT "reminder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_due_idx" ON "reminder" USING btree ("status","remind_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_user_idx" ON "reminder" USING btree ("user_id","workspace_id");
