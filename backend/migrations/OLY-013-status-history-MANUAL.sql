-- ============================================
-- MIGRATION: status_history table
-- Run this in Supabase SQL Editor
-- ============================================

-- Create status_history table
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_by UUID REFERENCES agents(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_status_history_task ON status_history(task_id);
CREATE INDEX IF NOT EXISTS idx_status_history_timestamp ON status_history(timestamp);

-- Enable RLS
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY status_history_read_all ON status_history FOR SELECT USING (true);
CREATE POLICY status_history_insert_all ON status_history FOR INSERT WITH CHECK (true);

-- Create trigger function to auto-log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS NULL OR OLD.status != NEW.status THEN
    INSERT INTO status_history (task_id, status, timestamp, notes)
    VALUES (
      NEW.id,
      NEW.status,
      NOW(),
      CASE 
        WHEN OLD.status IS NULL THEN 'Task created with status: ' || NEW.status
        ELSE 'Status changed from ' || OLD.status || ' to ' || NEW.status
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger (if not exists)
DROP TRIGGER IF EXISTS task_status_history_trigger ON tasks;
CREATE TRIGGER task_status_history_trigger
  AFTER INSERT OR UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- ============================================
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to SQL Editor (left sidebar)
-- 4. Click "New query"
-- 5. Paste this entire SQL
-- 6. Click "Run"
-- 7. The backend will automatically detect the table exists
-- ============================================
