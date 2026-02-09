-- Create tasks table for agent task tracking
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT REFERENCES agents(name),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  progress INTEGER CHECK (progress >= 0 AND progress <= 100) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_duration INTEGER,
  room_id UUID REFERENCES war_rooms(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS last_completed_task_id UUID REFERENCES tasks(id),
ADD COLUMN IF NOT EXISTS last_task_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL TO public USING (true) WITH CHECK (true);
