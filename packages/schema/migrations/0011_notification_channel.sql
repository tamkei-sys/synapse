-- Workspace-level notification delivery channel (PBI-11).
CREATE TABLE IF NOT EXISTS "notification_channel" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "kind" text NOT NULL,
  "slack_webhook_url" text,
  "email_to" text,
  "kinds" text[] DEFAULT '{}'::text[] NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_channel_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_channel_ws_idx" ON "notification_channel" USING btree ("workspace_id");
