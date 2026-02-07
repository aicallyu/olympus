-- ============================================================
-- OLY-017: Fix RLS Policies & Ensure Full Agent Seed
-- Ensures anon can INSERT into war_rooms, war_room_participants,
-- war_room_messages, and tasks tables. Seeds missing agents.
-- ============================================================

-- ============================================================
-- 1. Seed all agents including humans + Claude (upsert)
-- ============================================================
INSERT INTO agents (name, role, session_key, model_primary, model_escalation) VALUES
  ('ARGOS',      'Orchestrator',              'agent:main:main',       'kimi/kimi-k2.5',             'anthropic/claude-opus-4-5'),
  ('ATLAS',      'Frontend Engineer',         'agent:frontend:main',   'kimi/kimi-k2.5',             'openai/gpt-5.2-codex'),
  ('ATHENA',     'QA & Strategy',             'agent:qa:main',         'kimi/kimi-k2.5',             'kimi/kimi-k2.5'),
  ('HERCULOS',   'Backend Engineer',          'agent:backend:main',    'kimi/kimi-k2.5',             'openai/gpt-5.2-codex'),
  ('PROMETHEUS', 'DevOps & Automation',       'agent:devops:main',     'kimi/kimi-k2.5',             'deepseek/deepseek-v3'),
  ('APOLLO',     'Design & Visual Arts',      'agent:design:main',     'anthropic/claude-opus-4-5',  'anthropic/claude-opus-4-5'),
  ('HERMES',     'Documentation',             'agent:docs:main',       'kimi/kimi-k2.5',             'kimi/kimi-k2.5'),
  ('Claude',     'Architecture & Strategy',   'agent:claude:main',     'anthropic/claude-sonnet-4-5','anthropic/claude-opus-4-5'),
  ('Juan',       'System Architect',          'human:juan',            'human',                       'human'),
  ('Nathanael',  'Frontend Developer',        'human:nathanael',       'human',                       'human')
ON CONFLICT (session_key) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  model_primary = EXCLUDED.model_primary,
  model_escalation = EXCLUDED.model_escalation;

-- ============================================================
-- 2. Agents: allow INSERT/UPDATE for anon
-- ============================================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agents' AND policyname='agents_select_all') THEN
    EXECUTE 'CREATE POLICY agents_select_all ON agents FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agents' AND policyname='agents_write_all') THEN
    EXECUTE 'CREATE POLICY agents_write_all ON agents FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================
-- 3. Tasks: allow INSERT/UPDATE/SELECT for anon
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='tasks_select_all') THEN
    EXECUTE 'CREATE POLICY tasks_select_all ON tasks FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='tasks_write_all') THEN
    EXECUTE 'CREATE POLICY tasks_write_all ON tasks FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================
-- 4. War Rooms: permissive SELECT + INSERT + UPDATE for anon
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='war_rooms') THEN
    ALTER TABLE war_rooms ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='war_rooms' AND policyname='wr_select_all') THEN
      EXECUTE 'CREATE POLICY wr_select_all ON war_rooms FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='war_rooms' AND policyname='wr_insert_all') THEN
      EXECUTE 'CREATE POLICY wr_insert_all ON war_rooms FOR INSERT WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='war_rooms' AND policyname='wr_update_all') THEN
      EXECUTE 'CREATE POLICY wr_update_all ON war_rooms FOR UPDATE USING (true) WITH CHECK (true)';
    END IF;
  END IF;
END $$;

-- ============================================================
-- 5. War Room Participants: permissive SELECT + INSERT for anon
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='war_room_participants') THEN
    ALTER TABLE war_room_participants ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='war_room_participants' AND policyname='wrp_select_all') THEN
      EXECUTE 'CREATE POLICY wrp_select_all ON war_room_participants FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='war_room_participants' AND policyname='wrp_insert_all') THEN
      EXECUTE 'CREATE POLICY wrp_insert_all ON war_room_participants FOR INSERT WITH CHECK (true)';
    END IF;
  END IF;
END $$;

-- ============================================================
-- 6. War Room Messages: permissive SELECT + INSERT for anon
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='war_room_messages') THEN
    ALTER TABLE war_room_messages ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='war_room_messages' AND policyname='wrm_select_all') THEN
      EXECUTE 'CREATE POLICY wrm_select_all ON war_room_messages FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='war_room_messages' AND policyname='wrm_insert_all') THEN
      EXECUTE 'CREATE POLICY wrm_insert_all ON war_room_messages FOR INSERT WITH CHECK (true)';
    END IF;
  END IF;
END $$;

-- ============================================================
-- 7. Agent Metrics: allow INSERT/UPDATE for anon (for escalation)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='agent_metrics') THEN
    ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_metrics' AND policyname='agent_metrics_read_all') THEN
      EXECUTE 'CREATE POLICY agent_metrics_read_all ON agent_metrics FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_metrics' AND policyname='agent_metrics_write_all') THEN
      EXECUTE 'CREATE POLICY agent_metrics_write_all ON agent_metrics FOR ALL USING (true) WITH CHECK (true)';
    END IF;
  END IF;
END $$;

-- ============================================================
-- 8. Agent Activities: allow read for anon
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='agent_activities') THEN
    ALTER TABLE agent_activities ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_activities' AND policyname='agent_activities_read_all') THEN
      EXECUTE 'CREATE POLICY agent_activities_read_all ON agent_activities FOR SELECT USING (true)';
    END IF;
  END IF;
END $$;
