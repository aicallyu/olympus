-- Add type column to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'ai';

-- Set existing agents to type 'ai'
UPDATE agents SET type = 'ai' WHERE type IS NULL;

-- Add triggered_by column to war_room_messages
ALTER TABLE war_room_messages ADD COLUMN IF NOT EXISTS triggered_by UUID REFERENCES war_room_messages(id);
