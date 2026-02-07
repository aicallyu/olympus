-- Update phone number mappings for War Room notifications

-- Update the trigger function with correct phone numbers
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
                WHEN 'Juan' THEN '+4917684846266'
                WHEN 'Nathanael' THEN '+2348145851290'
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
