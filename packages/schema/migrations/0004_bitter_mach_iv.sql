CREATE TABLE IF NOT EXISTS "entity_sequence" (
	"workspace_id" text NOT NULL,
	"kind" text NOT NULL,
	"next_id" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_sequence_workspace_id_kind_pk" PRIMARY KEY("workspace_id","kind")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "block_dependency" (
	"block_id" text NOT NULL,
	"depends_on_id" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_dependency_block_id_depends_on_id_pk" PRIMARY KEY("block_id","depends_on_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entity_sequence" ADD CONSTRAINT "entity_sequence_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "block_dependency" ADD CONSTRAINT "block_dependency_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "block_dependency" ADD CONSTRAINT "block_dependency_depends_on_id_block_id_fk" FOREIGN KEY ("depends_on_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "block_dependency_reverse_idx" ON "block_dependency" USING btree ("depends_on_id");