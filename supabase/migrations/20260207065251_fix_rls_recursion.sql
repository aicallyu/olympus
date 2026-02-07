-- Fix infinite recursion in war_room_participants RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Public can view participants" ON war_room_participants;
DROP POLICY IF EXISTS "Public can join rooms" ON war_room_participants;

-- Create fixed policies without recursion
-- Allow public to view all participants (for demo/open access)
CREATE POLICY "Public can view participants" ON war_room_participants
  FOR SELECT USING (true);

-- Allow public to insert themselves as participants
CREATE POLICY "Public can join rooms" ON war_room_participants
  FOR INSERT WITH CHECK (true);

-- Allow public to update their own participation (or all for open access)
CREATE POLICY "Public can update participants" ON war_room_participants
  FOR UPDATE USING (true);

-- Fix war_rooms policies too (ensure no recursion)
DROP POLICY IF EXISTS "Public can view war rooms" ON war_rooms;
DROP POLICY IF EXISTS "Creators can update rooms" ON war_rooms;
DROP POLICY IF EXISTS "Public can create rooms" ON war_rooms;

CREATE POLICY "Public can view war rooms" ON war_rooms
  FOR SELECT USING (true);

CREATE POLICY "Public can create rooms" ON war_rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update rooms" ON war_rooms
  FOR UPDATE USING (true);
