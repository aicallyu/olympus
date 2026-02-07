-- ============================================================
-- OLY-016: Agent Seed Data & RLS Policies
-- Ensures all 7 Onioko agents exist in the agents table
-- and adds permissive RLS SELECT policies for all core tables.
-- ============================================================

-- ============================================================
-- 1. Seed the 7 Onioko agents (upsert by session_key)
-- ============================================================
INSERT INTO agents (name, role, session_key, model_primary, model_escalation) VALUES
  ('ARGOS',      'Orchestrator',         'agent:main:main',     'kimi/kimi-k2.5',           'anthropic/claude-opus-4-5'),
  ('ATLAS',      'Frontend Engineer',    'agent:frontend:main', 'kimi/kimi-k2.5',           'openai/gpt-5.2-codex'),
  ('ATHENA',     'QA & Strategy',        'agent:qa:main',       'kimi/kimi-k2.5',           'kimi/kimi-k2.5'),
  ('HERCULOS',   'Backend Engineer',     'agent:backend:main',  'kimi/kimi-k2.5',           'openai/gpt-5.2-codex'),
  ('PROMETHEUS', 'DevOps & Automation',  'agent:devops:main',   'kimi/kimi-k2.5',           'deepseek/deepseek-v3'),
  ('APOLLO',     'Design & Visual Arts', 'agent:design:main',   'anthropic/claude-opus-4-5', 'anthropic/claude-opus-4-5'),
  ('HERMES',     'Documentation',        'agent:docs:main',     'kimi/kimi-k2.5',           'kimi/kimi-k2.5')
ON CONFLICT (session_key) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  model_primary = EXCLUDED.model_primary,
  model_escalation = EXCLUDED.model_escalation;

-- ============================================================
-- 2. RLS policies for agents table
--    Enable RLS and add permissive SELECT for all roles
-- ============================================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read agents (service_role bypasses anyway)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agents' AND policyname = 'agents_read_all'
  ) THEN
    EXECUTE 'CREATE POLICY agents_read_all ON agents FOR SELECT USING (true)';
  END IF;
END $$;

-- Allow service role to insert/update agents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agents' AND policyname = 'agents_write_service'
  ) THEN
    EXECUTE 'CREATE POLICY agents_write_service ON agents FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================
-- 3. RLS policies for tasks table
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_read_all'
  ) THEN
    EXECUTE 'CREATE POLICY tasks_read_all ON tasks FOR SELECT USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_write_service'
  ) THEN
    EXECUTE 'CREATE POLICY tasks_write_service ON tasks FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================
-- 4. RLS policies for activities table
-- ============================================================
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'activities_read_all'
  ) THEN
    EXECUTE 'CREATE POLICY activities_read_all ON activities FOR SELECT USING (true)';
  END IF;
END $$;

-- ============================================================
-- 5. RLS policies for messages table
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_read_all'
  ) THEN
    EXECUTE 'CREATE POLICY messages_read_all ON messages FOR SELECT USING (true)';
  END IF;
END $$;

-- ============================================================
-- 6. RLS policies for war_rooms and related tables
-- ============================================================
DO $$
BEGIN
  -- war_rooms
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'war_rooms') THEN
    ALTER TABLE war_rooms ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'war_rooms' AND policyname = 'war_rooms_read_all') THEN
      EXECUTE 'CREATE POLICY war_rooms_read_all ON war_rooms FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'war_rooms' AND policyname = 'war_rooms_write_all') THEN
      EXECUTE 'CREATE POLICY war_rooms_write_all ON war_rooms FOR ALL USING (true) WITH CHECK (true)';
    END IF;
  END IF;

  -- war_room_participants
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'war_room_participants') THEN
    ALTER TABLE war_room_participants ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'war_room_participants' AND policyname = 'wrp_read_all') THEN
      EXECUTE 'CREATE POLICY wrp_read_all ON war_room_participants FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'war_room_participants' AND policyname = 'wrp_write_all') THEN
      EXECUTE 'CREATE POLICY wrp_write_all ON war_room_participants FOR ALL USING (true) WITH CHECK (true)';
    END IF;
  END IF;

  -- war_room_messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'war_room_messages') THEN
    ALTER TABLE war_room_messages ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'war_room_messages' AND policyname = 'wrm_read_all') THEN
      EXECUTE 'CREATE POLICY wrm_read_all ON war_room_messages FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'war_room_messages' AND policyname = 'wrm_write_all') THEN
      EXECUTE 'CREATE POLICY wrm_write_all ON war_room_messages FOR ALL USING (true) WITH CHECK (true)';
    END IF;
  END IF;
END $$;
