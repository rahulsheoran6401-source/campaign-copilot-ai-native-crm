-- Migration 2: Add user_id for User Data Isolation Mode

-- 1. Add user_id column to tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id UUID;

-- Note: Existing rows will have user_id = NULL. 
-- Since frontend queries will explicitly filter by `user_id = auth.uid()`, 
-- these rows will remain safely hidden from new users, achieving the empty state isolation.
