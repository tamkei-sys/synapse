-- Page version history (PBI-54).
CREATE TABLE IF NOT EXISTS "page_version" (
  "id" text PRIMARY KEY NOT NULL,
  "block_id" text NOT NULL,
  "workspace_id" text NOT NULL,
  "doc" jsonb NOT NULL,
  "kind" text NOT NULL,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "page_version_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE cascade,
  CONSTRAINT "page_version_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade,
  CONSTRAINT "page_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_version_block_created_idx" ON "page_version" USING btree ("block_id","created_at");
