-- War Room Dynamic Update
-- Enables adding participants mid-conversation and context sharing

-- Add context_sharing field to war_rooms
ALTER TABLE war_rooms ADD COLUMN IF NOT EXISTS context_mode TEXT DEFAULT 'full' 
  CHECK (context_mode IN ('full', 'mentions_only', 'none'));

-- Add context_history for new participants
-- This stores the conversation summary for late joiners
ALTER TABLE war_rooms ADD COLUMN IF NOT EXISTS context_summary TEXT;

-- Update participants table to track when they joined
ALTER TABLE war_room_participants ADD COLUMN IF NOT EXISTS joined_at_msg_id UUID REFERENCES war_room_messages(id);

-- Function to get messages visible to a participant
-- (all messages if joined from start, only after join_msg_id if added later)
CREATE OR REPLACE FUNCTION get_visible_messages(room_uuid UUID, participant_name TEXT)
RETURNS SETOF war_room_messages AS $$
DECLARE
  join_msg_time TIMESTAMPTZ;
BEGIN
  -- Get when this participant joined
  SELECT COALESCE(
    (SELECT created_at FROM war_room_messages WHERE id = joined_at_msg_id),
    '1970-01-01'::TIMESTAMPTZ
  ) INTO join_msg_time;
  
  -- Return all messages (full context for everyone)
  RETURN QUERY
  SELECT * FROM war_room_messages
  WHERE room_id = room_uuid
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to add participant mid-conversation
CREATE OR REPLACE FUNCTION add_participant_to_room(
  room_uuid UUID,
  participant_name TEXT,
  participant_type TEXT,
  participant_config JSONB
) RETURNS VOID AS $$
DECLARE
  latest_msg_id UUID;
BEGIN
  -- Get latest message ID for context
  SELECT id INTO latest_msg_id
  FROM war_room_messages
  WHERE room_id = room_uuid
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Insert participant with context marker
  INSERT INTO war_room_participants (
    room_id,
    participant_type,
    participant_name,
    participant_config,
    joined_at_msg_id
  ) VALUES (
    room_uuid,
    participant_type,
    participant_name,
    participant_config,
    latest_msg_id
  );
  
  -- Add system message about new participant
  INSERT INTO war_room_messages (
    room_id,
    sender_name,
    sender_type,
    content,
    content_type,
    metadata
  ) VALUES (
    room_uuid,
    'System',
    'system',
    participant_name || ' joined the conversation.',
    'text',
    jsonb_build_object('event', 'participant_joined', 'participant', participant_name)
  );
END;
$$ LANGUAGE plpgsql;

-- Update the Edge Function trigger to handle interventions
-- This allows agents to respond to other agents' messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  should_route BOOLEAN := false;
BEGIN
  -- Route human messages
  IF NEW.sender_type = 'human' THEN
    should_route := true;
  END IF;
  
  -- Route agent messages if they contain @mentions or correction patterns
  IF NEW.sender_type = 'agent' THEN
    -- Check if message mentions another agent or contains correction indicators
    IF NEW.content ~* '@(ARGOS|Claude|Nathanael)' 
       OR NEW.content ~* '(falsch|wrong|korrektur|korrekt|actually|rather|stattdessen)'
       OR NEW.metadata->>'requires_response' = 'true' THEN
      should_route := true;
    END IF;
  END IF;
  
  IF should_route THEN
    PERFORM net.http_post(
      url := 'https://mfpyyriilflviojnqhuv.supabase.co/functions/v1/route-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcHl5cmlpbGZsdmlvam5xaHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIxOTQ4NywiZXhwIjoyMDg1Nzk1NDg3fQ.7nN6dHI5kwQZDIPPxaMm49tbeof5j2ZXg889jffZK_A'
      ),
      body := jsonb_build_object(
        'message_id', NEW.id,
        'room_id', NEW.room_id,
        'sender_name', NEW.sender_name,
        'sender_type', NEW.sender_type,
        'content', NEW.content,
        'content_type', NEW.content_type,
        'audio_url', NEW.audio_url
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add default ElevenLabs voices for agents
UPDATE war_room_participants 
SET participant_config = participant_config || '{"voice_id": "XB0fDUnXU5powFXDhCwa", "voice_enabled": true}'::jsonb
WHERE participant_name = 'ARGOS' AND participant_type = 'agent';

UPDATE war_room_participants 
SET participant_config = participant_config || '{"voice_id": "Xb7hH8MSUJpSbSDYk0k2", "voice_enabled": true}'::jsonb
WHERE participant_name = 'Claude' AND participant_type = 'agent';

-- Create default room template
INSERT INTO war_rooms (name, description, routing_mode, context_mode)
VALUES ('Quick Chat', 'Dynamic conversation room', 'moderated', 'full')
ON CONFLICT DO NOTHING;
