-- ============================================================
-- OLY-016: Agent Seed Data & RLS Policies
-- Ensures all 7 Onioko agents exist in the agents table
-- and adds permissive RLS policies for the anon key.
-- ============================================================

-- ============================================================
-- 1. Seed the 7 Onioko agents (upsert by session_key)
-- ============================================================
INSERT INTO agents (name, role, session_key, model_primary, model_escalation) VALUES
  ('ARGOS',      'Orchestrator',              'agent:main:main',      'kimi/kimi-k2.5',            'anthropic/claude-opus-4-5'),
  ('ATLAS',      'Frontend Engineer',         'agent:frontend:main',  'kimi/kimi-k2.5',            'openai/gpt-5.2-codex'),
  ('ATHENA',     'QA & Strategy',             'agent:qa:main',        'kimi/kimi-k2.5',            'kimi/kimi-k2.5'),
  ('HERCULOS',   'Backend Engineer',          'agent:backend:main',   'kimi/kimi-k2.5',            'openai/gpt-5.2-codex'),
  ('PROMETHEUS', 'DevOps & Automation',       'agent:devops:main',    'kimi/kimi-k2.5',            'deepseek/deepseek-v3'),
  ('APOLLO',     'Design & Visual Arts',      'agent:design:main',    'anthropic/claude-opus-4-5',  'anthropic/claude-opus-4-5'),
  ('HERMES',     'Documentation',             'agent:docs:main',      'kimi/kimi-k2.5',            'kimi/kimi-k2.5'),
  ('Claude',     'Architecture & Strategy',   'agent:claude:main',    'anthropic/claude-sonnet-4-5','anthropic/claude-opus-4-5'),
  ('Juan',       'System Architect',          'human:juan',           'human',                      'human'),
  ('Nathanael',  'Frontend Developer',        'human:nathanael',      'human',                      'human')
ON CONFLICT (session_key) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  model_primary = EXCLUDED.model_primary,
  model_escalation = EXCLUDED.model_escalation;

-- ============================================================
-- 2. RLS: agents table — SELECT for everyone
-- ============================================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agents' AND policyname='agents_select_all') THEN
    EXECUTE 'CREATE POLICY agents_select_all ON agents FOR SELECT USING (true)';
  END IF;
END $$;

-- ============================================================
-- 3. RLS: tasks table — SELECT for everyone, INSERT/UPDATE for all
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
-- 4. RLS: war_rooms — SELECT + INSERT for anon
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
-- 5. RLS: war_room_participants — SELECT + INSERT for anon
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
-- 6. RLS: war_room_messages — SELECT + INSERT for anon
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
