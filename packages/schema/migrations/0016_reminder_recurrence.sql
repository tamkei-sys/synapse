-- Reminder recurrence (PBI-85). 既存行は 'none'。
ALTER TABLE "reminder" ADD COLUMN IF NOT EXISTS "recurrence" text DEFAULT 'none' NOT NULL;
