-- Migration: Add status_history table for task status tracking
-- Created: 2026-02-05
-- Description: Track all status changes for tasks (required for OLYMP frontend)

-- ============================================
-- STATUS HISTORY (Audit trail of task status changes)
-- ============================================
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  changed_by UUID REFERENCES agents(id) ON DELETE SET NULL
);

CREATE INDEX idx_status_history_task ON status_history(task_id);
CREATE INDEX idx_status_history_timestamp ON status_history(timestamp);
CREATE INDEX idx_status_history_status ON status_history(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Read policies (all agents can read)
CREATE POLICY status_history_read_all ON status_history FOR SELECT USING (true);

-- Allow inserts from authenticated requests
CREATE POLICY status_history_insert_all ON status_history FOR INSERT WITH CHECK (true);

-- ============================================
-- TRIGGER: Auto-log status changes on task update
-- ============================================
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS NULL OR OLD.status != NEW.status THEN
    INSERT INTO status_history (task_id, status, notes, changed_by)
    VALUES (
      NEW.id,
      NEW.status,
      'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status,
      NEW.assignee_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS task_status_change_trigger ON tasks;
CREATE TRIGGER task_status_change_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_status_change();

-- Also log on insert (initial status)
CREATE OR REPLACE FUNCTION log_initial_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO status_history (task_id, status, notes, changed_by)
  VALUES (
    NEW.id,
    NEW.status,
    'Initial status: ' || NEW.status,
    NEW.assignee_id
  );
  
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS task_initial_status_trigger ON tasks;
CREATE TRIGGER task_initial_status_trigger
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_initial_status();

-- ============================================
-- BACKFILL: Create history entries for existing tasks
-- ============================================
INSERT INTO status_history (task_id, status, timestamp, notes)
SELECT 
  id as task_id,
  status,
  updated_at as timestamp,
  'Historical status (backfilled)'
FROM tasks
WHERE NOT EXISTS (
  SELECT 1 FROM status_history sh WHERE sh.task_id = tasks.id
);
