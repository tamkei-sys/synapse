-- Page favorites (PBI-53).
CREATE TABLE IF NOT EXISTS "page_favorite" (
  "user_id" text NOT NULL,
  "page_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "page_favorite_user_id_page_id_pk" PRIMARY KEY ("user_id", "page_id"),
  CONSTRAINT "page_favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade,
  CONSTRAINT "page_favorite_page_id_block_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."block"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_favorite_user_idx" ON "page_favorite" USING btree ("user_id");
