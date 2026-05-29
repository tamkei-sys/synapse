-- Page link / backlink index (PBI-73).
CREATE TABLE IF NOT EXISTS "page_link" (
  "source_id" text NOT NULL,
  "target_id" text NOT NULL,
  "workspace_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "page_link_source_id_target_id_pk" PRIMARY KEY ("source_id", "target_id"),
  CONSTRAINT "page_link_source_id_block_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."block"("id") ON DELETE cascade,
  CONSTRAINT "page_link_target_id_block_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."block"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_link_target_idx" ON "page_link" USING btree ("target_id");
