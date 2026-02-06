-- OLYMP War Room Database Schema
-- Execute this in Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS war_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  routing_mode TEXT DEFAULT 'moderated' CHECK (routing_mode IN ('moderated', 'all', 'mentioned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS war_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES war_rooms(id) ON DELETE CASCADE,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('human', 'agent')),
  participant_name TEXT NOT NULL,
  participant_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, participant_name)
);

CREATE TABLE IF NOT EXISTS war_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES war_rooms(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('human', 'agent', 'system')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'voice', 'image', 'file')),
  audio_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wrm_room_created ON war_room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wrp_room ON war_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_wr_active ON war_rooms(is_active);

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE war_room_messages;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE war_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_room_messages ENABLE ROW LEVEL SECURITY;

-- Users can see rooms they participate in
CREATE POLICY "read_war_rooms" ON war_rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM war_room_participants
      WHERE participant_name = coalesce(current_setting('request.jwt.claims', true)::json->>'name', 'anonymous')
    )
  );

-- Service role can do everything
CREATE POLICY "service_war_rooms" ON war_rooms
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "read_participants" ON war_room_participants
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM war_room_participants
      WHERE participant_name = coalesce(current_setting('request.jwt.claims', true)::json->>'name', 'anonymous')
    )
  );

CREATE POLICY "service_participants" ON war_room_participants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "read_messages" ON war_room_messages
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM war_room_participants
      WHERE participant_name = coalesce(current_setting('request.jwt.claims', true)::json->>'name', 'anonymous')
    )
  );

CREATE POLICY "insert_messages" ON war_room_messages
  FOR INSERT WITH CHECK (
    sender_type = 'human' AND
    room_id IN (
      SELECT room_id FROM war_room_participants
      WHERE participant_name = coalesce(current_setting('request.jwt.claims', true)::json->>'name', 'anonymous')
    )
  );

CREATE POLICY "service_messages" ON war_room_messages
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DEFAULT WAR ROOM (OLYM HQ)
-- ============================================

INSERT INTO war_rooms (name, description, routing_mode)
VALUES ('OLYM HQ', 'Main War Room for OLYMP coordination', 'moderated')
ON CONFLICT DO NOTHING;

-- Add default participants (will be linked to actual user IDs later)
INSERT INTO war_room_participants (room_id, participant_type, participant_name, participant_config)
SELECT 
  id,
  'human',
  'Juan',
  '{"role": "CEO", "avatar_url": "/avatars/juan.png"}'::jsonb
FROM war_rooms WHERE name = 'OLYM HQ'
ON CONFLICT DO NOTHING;

INSERT INTO war_room_participants (room_id, participant_type, participant_name, participant_config)
SELECT 
  id,
  'agent',
  'ARGOS',
  '{"model": "moonshot/kimi-k2.5", "endpoint": "kimi", "expertise": ["infrastructure", "devops", "local_tools"], "voice_enabled": false, "system_prompt": "You are ARGOS, the infrastructure and operations lead."}'::jsonb
FROM war_rooms WHERE name = 'OLYM HQ'
ON CONFLICT DO NOTHING;

INSERT INTO war_room_participants (room_id, participant_type, participant_name, participant_config)
SELECT 
  id,
  'agent',
  'Claude',
  '{"model": "claude-sonnet-4-5", "endpoint": "anthropic", "expertise": ["architecture", "strategy", "code_review"], "voice_enabled": false, "system_prompt": "You are Claude, the architecture and strategy advisor."}'::jsonb
FROM war_rooms WHERE name = 'OLYM HQ'
ON CONFLICT DO NOTHING;

-- ============================================
-- ENABLE PG_NET (for DB triggers to call Edge Functions)
-- ============================================
-- NOTE: Enable in Supabase Dashboard → Database → Extensions → pg_net
