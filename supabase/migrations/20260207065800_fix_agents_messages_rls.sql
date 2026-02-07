-- Fix RLS for agents and war_room_messages tables

-- Ensure agents table has RLS enabled with public access
ALTER TABLE IF EXISTS agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'agents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON agents', pol.policyname);
    END LOOP;
END $$;

-- Create simple policies for agents
CREATE POLICY "agents_allow_all_select" ON agents FOR SELECT USING (true);
CREATE POLICY "agents_allow_all_insert" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "agents_allow_all_update" ON agents FOR UPDATE USING (true);
CREATE POLICY "agents_allow_all_delete" ON agents FOR DELETE USING (true);

-- Ensure war_room_messages table has RLS enabled with public access
ALTER TABLE IF EXISTS war_room_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for war_room_messages
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'war_room_messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON war_room_messages', pol.policyname);
    END LOOP;
END $$;

-- Create simple policies for war_room_messages
CREATE POLICY "messages_allow_all_select" ON war_room_messages FOR SELECT USING (true);
CREATE POLICY "messages_allow_all_insert" ON war_room_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_allow_all_update" ON war_room_messages FOR UPDATE USING (true);
CREATE POLICY "messages_allow_all_delete" ON war_room_messages FOR DELETE USING (true);
