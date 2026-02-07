-- OLY-019: Add voice_id to agents for ElevenLabs TTS
-- Also ensures audio_url column exists on war_room_messages
-- and creates the storage bucket for voice audio files.

-- 1. Add voice_id column to agents (nullable — only agents with a voice_id get TTS)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_id TEXT;

-- 2. Ensure audio_url column exists on war_room_messages
ALTER TABLE war_room_messages ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 3. Set default ElevenLabs voice IDs for each agent
-- These are ElevenLabs pre-made voice IDs (can be updated in dashboard)
UPDATE agents SET voice_id = 'pNInz6obpgDQGcFmaJgB' WHERE name = 'ARGOS';     -- Adam (deep, authoritative)
UPDATE agents SET voice_id = 'ErXwobaYiN019PkySvjV' WHERE name = 'ATLAS';     -- Antoni (warm, clear)
UPDATE agents SET voice_id = 'EXAVITQu4vr4xnSDxMaL' WHERE name = 'ATHENA';   -- Bella (female, analytical)
UPDATE agents SET voice_id = 'VR6AewLTigWG4xSOukaG' WHERE name = 'HERCULOS'; -- Arnold (strong, direct)
UPDATE agents SET voice_id = 'TxGEqnHWrfWFTfGW9XjX' WHERE name = 'PROMETHEUS'; -- Josh (energetic)
UPDATE agents SET voice_id = 'yoZ06aMxZJJ28mfd3POQ' WHERE name = 'APOLLO';   -- Sam (creative, smooth)
UPDATE agents SET voice_id = 'onwK4e9ZLuTAKqWW03F9' WHERE name = 'HERMES';   -- Daniel (British, articulate)
UPDATE agents SET voice_id = 'pqHfZKP75CvOlQylNhV4' WHERE name = 'Claude';   -- Bill (calm, thoughtful)

-- 4. Create storage bucket for war room audio (TTS output)
-- Run via Supabase Dashboard > Storage or CLI:
-- supabase storage create war-room-audio --public
-- (SQL cannot create buckets directly — this is a reminder)

-- 5. Insert bucket via storage schema if available
INSERT INTO storage.buckets (id, name, public)
VALUES ('war-room-audio', 'war-room-audio', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Allow public read access to the audio bucket
CREATE POLICY IF NOT EXISTS "Public read access for war-room-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'war-room-audio');

-- 7. Allow service role to upload to the audio bucket
CREATE POLICY IF NOT EXISTS "Service role upload for war-room-audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'war-room-audio');
