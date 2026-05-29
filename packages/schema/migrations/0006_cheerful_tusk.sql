CREATE TABLE IF NOT EXISTS "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"kind" text NOT NULL,
	"block_id" text,
	"comment_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_inbox_idx" ON "notification" USING btree ("recipient_id","workspace_id","created_at");