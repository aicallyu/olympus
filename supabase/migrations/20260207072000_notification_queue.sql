-- Create notification_queue table for War Room notifications
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES war_room_messages(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES war_rooms(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message_preview TEXT,
    sender_name TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    error_message TEXT
);

-- Index for fast polling queries
CREATE INDEX IF NOT EXISTS idx_notification_queue_unsent 
    ON notification_queue(sent_at) 
    WHERE sent_at IS NULL;

-- Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Allow public access (for Edge Functions/Triggers)
CREATE POLICY "allow_all_notification_queue" ON notification_queue
    FOR ALL USING (true) WITH CHECK (true);

-- Function to queue notifications for human participants
CREATE OR REPLACE FUNCTION queue_war_room_notifications()
RETURNS TRIGGER AS $$
DECLARE
    participant RECORD;
    phone_number TEXT;
BEGIN
    -- For each human participant in the room (except the sender)
    FOR participant IN 
        SELECT 
            wrp.participant_name,
            wrp.participant_config->>'phone' as phone
        FROM war_room_participants wrp
        WHERE wrp.room_id = NEW.room_id
          AND wrp.participant_type = 'human'
          AND wrp.participant_name != NEW.sender_name
    LOOP
        -- Get phone from participant_config or map from name
        phone_number := COALESCE(
            participant.phone,
            CASE participant.participant_name
                WHEN 'Juan' THEN '+593991656682'
                WHEN 'Nathanael' THEN '+4917684846266'
                ELSE NULL
            END
        );
        
        IF phone_number IS NOT NULL THEN
            INSERT INTO notification_queue (
                message_id,
                room_id,
                recipient_phone,
                recipient_name,
                message_preview,
                sender_name
            ) VALUES (
                NEW.id,
                NEW.room_id,
                phone_number,
                participant.participant_name,
                LEFT(NEW.content, 100),
                NEW.sender_name
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on war_room_messages INSERT
DROP TRIGGER IF EXISTS trg_queue_notifications ON war_room_messages;
CREATE TRIGGER trg_queue_notifications
    AFTER INSERT ON war_room_messages
    FOR EACH ROW
    WHEN (NEW.sender_type != 'system')
    EXECUTE FUNCTION queue_war_room_notifications();
