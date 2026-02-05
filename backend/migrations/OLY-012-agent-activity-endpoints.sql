-- Migration: OLY-012 Backend Agent Activity Endpoints
-- Created: 2026-02-04
-- Description: Add agent_activities and agent_metrics tables for activity tracking

-- ============================================
-- AGENT ACTIVITIES (Detailed log of agent actions)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'heartbeat', 'success', 'blocked', 'review', 'error')),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_activities_agent ON agent_activities(agent_id);
CREATE INDEX idx_agent_activities_task ON agent_activities(task_id);
CREATE INDEX idx_agent_activities_type ON agent_activities(type);
CREATE INDEX idx_agent_activities_created ON agent_activities(created_at);

-- ============================================
-- AGENT METRICS (Aggregated performance stats)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_metrics (
  agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  avg_completion_time INTERVAL,
  total_cost DECIMAL(10,4) DEFAULT 0.0000,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_metrics_updated ON agent_metrics(last_updated);

-- ============================================
-- TRIGGER: Auto-update agent_metrics last_updated
-- ============================================
CREATE OR REPLACE FUNCTION update_agent_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agent_metrics_timestamp ON agent_metrics;
CREATE TRIGGER update_agent_metrics_timestamp
  BEFORE UPDATE ON agent_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_metrics_timestamp();

-- ============================================
-- TRIGGER: Log agent activity on task changes
-- ============================================
CREATE OR REPLACE FUNCTION log_agent_activity()
RETURNS TRIGGER AS $$
DECLARE
  action_text TEXT;
  activity_type TEXT;
BEGIN
  -- Determine action and type based on operation and status change
  IF TG_OP = 'INSERT' THEN
    action_text := 'Created task: ' || NEW.title;
    activity_type := 'task';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      action_text := 'Changed task status from ' || OLD.status || ' to ' || NEW.status;
      
      -- Map status to activity type
      activity_type := CASE NEW.status
        WHEN 'done' THEN 'success'
        WHEN 'blocked' THEN 'blocked'
        WHEN 'review' THEN 'review'
        ELSE 'task'
      END;
    ELSE
      action_text := 'Updated task: ' || NEW.title;
      activity_type := 'task';
    END IF;
  END IF;
  
  -- Insert into agent_activities if assignee exists
  IF NEW.assignee_id IS NOT NULL THEN
    INSERT INTO agent_activities (agent_id, action, type, task_id, metadata)
    VALUES (
      NEW.assignee_id,
      action_text,
      activity_type,
      NEW.id,
      jsonb_build_object(
        'task_title', NEW.title,
        'status', NEW.status,
        'priority', NEW.priority
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger on tasks table (if not exists)
DROP TRIGGER IF EXISTS agent_activity_task_trigger ON tasks;
CREATE TRIGGER agent_activity_task_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_agent_activity();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE agent_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;

-- Read policies (all agents can read)
CREATE POLICY agent_activities_read_all ON agent_activities FOR SELECT USING (true);
CREATE POLICY agent_metrics_read_all ON agent_metrics FOR SELECT USING (true);

-- ============================================
-- INITIALIZE METRICS FOR EXISTING AGENTS
-- ============================================
INSERT INTO agent_metrics (agent_id, tasks_completed, tasks_failed)
SELECT 
  a.id,
  COUNT(t.id) FILTER (WHERE t.status = 'done')::INTEGER,
  COUNT(t.id) FILTER (WHERE t.status = 'blocked')::INTEGER
FROM agents a
LEFT JOIN tasks t ON t.assignee_id = a.id
GROUP BY a.id
ON CONFLICT (agent_id) DO UPDATE SET
  tasks_completed = EXCLUDED.tasks_completed,
  tasks_failed = EXCLUDED.tasks_failed,
  last_updated = NOW();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- Add some sample activities for existing tasks
INSERT INTO agent_activities (agent_id, action, type, task_id, metadata)
SELECT 
  t.assignee_id,
  'Started working on: ' || t.title,
  'task',
  t.id,
  jsonb_build_object('task_title', t.title, 'priority', t.priority)
FROM tasks t
WHERE t.assignee_id IS NOT NULL
  AND t.status IN ('in_progress', 'assigned', 'review')
  AND NOT EXISTS (
    SELECT 1 FROM agent_activities aa 
    WHERE aa.task_id = t.id AND aa.agent_id = t.assignee_id
  )
LIMIT 10;

-- Add heartbeat activities for active agents
INSERT INTO agent_activities (agent_id, action, type, metadata)
SELECT 
  a.id,
  'Agent heartbeat',
  'heartbeat',
  jsonb_build_object('status', a.status, 'model', a.model_primary)
FROM agents a
WHERE a.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM agent_activities aa 
    WHERE aa.agent_id = a.id AND aa.type = 'heartbeat'
  );
