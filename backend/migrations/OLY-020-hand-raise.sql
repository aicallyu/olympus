-- OLY-020: Hand Raise System + Autonomous Discussion support
-- Adds hand_raised / hand_reason to war_room_participants for the hand-raise flow.

ALTER TABLE war_room_participants ADD COLUMN IF NOT EXISTS hand_raised BOOLEAN DEFAULT false;
ALTER TABLE war_room_participants ADD COLUMN IF NOT EXISTS hand_reason TEXT;

-- Enable realtime for war_room_participants so the frontend can
-- subscribe to hand-raise updates.
ALTER PUBLICATION supabase_realtime ADD TABLE war_room_participants;
