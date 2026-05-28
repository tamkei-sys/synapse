CREATE TABLE IF NOT EXISTS "cc_session" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"pbi_id" text NOT NULL,
	"created_by" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"pr_url" text,
	"last_message" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cc_session" ADD CONSTRAINT "cc_session_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cc_session" ADD CONSTRAINT "cc_session_pbi_id_block_id_fk" FOREIGN KEY ("pbi_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cc_session" ADD CONSTRAINT "cc_session_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cc_session_pbi_idx" ON "cc_session" USING btree ("pbi_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cc_session_workspace_idx" ON "cc_session" USING btree ("workspace_id","created_at");