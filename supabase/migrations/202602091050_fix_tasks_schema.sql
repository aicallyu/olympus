-- Add missing columns to existing tasks table for office integration
-- Skip if columns already exist
DO $$
BEGIN
  -- Add progress column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'progress') THEN
    ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0;
  END IF;

  -- Add started_at column  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'started_at') THEN
    ALTER TABLE tasks ADD COLUMN started_at TIMESTAMPTZ;
  END IF;

  -- Add estimated_duration column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'estimated_duration') THEN
    ALTER TABLE tasks ADD COLUMN estimated_duration INTEGER;
  END IF;

  -- Add assigned_to column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'assigned_to') THEN
    ALTER TABLE tasks ADD COLUMN assigned_to TEXT;
  END IF;
END $$;

-- Create function to sync assigned_to from assignee_id via agents table
CREATE OR REPLACE FUNCTION sync_task_assigned_to()
RETURNS TRIGGER AS $$
BEGIN
  SELECT name INTO NEW.assigned_to
  FROM agents
  WHERE id = NEW.assignee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate assigned_to
DROP TRIGGER IF EXISTS sync_task_assignee ON tasks;
CREATE TRIGGER sync_task_assignee
  BEFORE INSERT OR UPDATE OF assignee_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_assigned_to();

-- Update existing tasks
UPDATE tasks t
SET assigned_to = a.name
FROM agents a
WHERE t.assignee_id = a.id AND t.assigned_to IS NULL;

-- Add columns to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS last_completed_task_id UUID REFERENCES tasks(id),
ADD COLUMN IF NOT EXISTS last_task_completed_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
