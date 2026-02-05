-- OLYMPUS Control System Database Schema
-- Run this to enable agent monitoring

-- Agent session tracking
CREATE TABLE IF NOT EXISTS agent_sessions (
  session_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  last_ping TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active', -- active, stalled, dead
  model TEXT,
  CHECK (status IN ('active', 'stalled', 'dead'))
);

-- Task progress tracking  
CREATE TABLE IF NOT EXISTS task_progress (
  task_id UUID PRIMARY KEY REFERENCES tasks(id),
  agent_id TEXT NOT NULL,
  last_update TIMESTAMPTZ DEFAULT now(),
  progress_percent INTEGER DEFAULT 0,
  status_message TEXT,
  CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

-- Control system logs
CREATE TABLE IF NOT EXISTS control_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL, -- 'session_health', 'task_timeout', 'heartbeat'
  agent_id TEXT,
  task_id UUID,
  severity TEXT, -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all" ON agent_sessions FOR ALL USING (true);
CREATE POLICY "Allow all" ON task_progress FOR ALL USING (true);
CREATE POLICY "Allow all" ON control_logs FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_task ON agent_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_control_logs_check_type ON control_logs(check_type);
CREATE INDEX IF NOT EXISTS idx_control_logs_created_at ON control_logs(created_at);

-- Insert initial session for ATLAS (current reskin task)
INSERT INTO agent_sessions (session_id, agent_id, task_id, status, model)
VALUES ('bcd45725-021f-43a9-9c0e-9af281f9d7f6', 'b00ebb33-08f3-49e6-8340-7998c404413f', 
        (SELECT id FROM tasks WHERE title LIKE '%Reskin%' LIMIT 1), 
        'active', 'gpt-5.2-codex')
ON CONFLICT (session_id) DO UPDATE SET 
  last_ping = now(),
  status = 'active';

-- Log the control system initialization
INSERT INTO control_logs (check_type, severity, message, action_taken)
VALUES ('system_init', 'info', 'Control system initialized', 'Monitoring active for all agents');
