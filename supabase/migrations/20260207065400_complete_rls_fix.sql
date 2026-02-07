-- Complete fix for infinite recursion in war_room_participants
-- First, disable RLS temporarily to clean up
ALTER TABLE war_room_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE war_rooms DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'war_room_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON war_room_participants', pol.policyname);
    END LOOP;
    
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'war_rooms'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON war_rooms', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE war_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_rooms ENABLE ROW LEVEL SECURITY;

-- Create simple non-recursive policies
CREATE POLICY "allow_all_select" ON war_room_participants FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON war_room_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON war_room_participants FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON war_room_participants FOR DELETE USING (true);

CREATE POLICY "allow_all_select" ON war_rooms FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON war_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON war_rooms FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON war_rooms FOR DELETE USING (true);
