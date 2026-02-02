-- DCAnalyticsV2: Access Logs Schema Migration
-- Run this against your Neon PostgreSQL database
-- Migration is idempotent (safe to run multiple times)

-- Add new columns to access_logs table for enhanced activity tracking
ALTER TABLE access_logs 
  ADD COLUMN IF NOT EXISTS actor_roll VARCHAR(50),
  ADD COLUMN IF NOT EXISTS target_roll VARCHAR(50),
  ADD COLUMN IF NOT EXISTS action_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metadata TEXT,
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(20); -- 'mobile', 'tablet', 'desktop'

-- Make legacy columns nullable if they aren't already
ALTER TABLE access_logs 
  ALTER COLUMN roll DROP NOT NULL,
  ALTER COLUMN action DROP NOT NULL;

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_access_logs_action_type ON access_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_actor_roll ON access_logs(actor_roll);
CREATE INDEX IF NOT EXISTS idx_access_logs_target_roll ON access_logs(target_roll);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp DESC);

-- Composite index for paginated admin log queries
CREATE INDEX IF NOT EXISTS idx_access_logs_admin_query 
  ON access_logs(timestamp DESC, action_type);

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'New columns: actor_roll, target_roll, action_type, metadata';
END $$;
