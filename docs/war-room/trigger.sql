-- Database Trigger for War Room
-- This enables automatic AI responses when humans send messages

-- Enable pg_net extension (do this in Supabase Dashboard → Database → Extensions)
-- CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for human messages (not agent responses, to avoid loops)
  IF NEW.sender_type = 'human' THEN
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
        'content', NEW.content,
        'content_type', NEW.content_type,
        'audio_url', NEW.audio_url
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_human_message ON war_room_messages;

-- Create trigger
CREATE TRIGGER on_human_message
  AFTER INSERT ON war_room_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

SELECT 'Trigger created successfully' as status;
