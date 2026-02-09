-- Enable Storage and set bucket to public
-- Make war-room-audio bucket public and add RLS policies

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'war-room-audio',
  'war-room-audio',
  true,
  false,
  52428800, -- 50MB limit
  ARRAY['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/mp3']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to war-room-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads from war-room-audio" ON storage.objects;

-- Create policy: Allow anyone to read from war-room-audio bucket
CREATE POLICY "Allow all reads from war-room-audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'war-room-audio');

-- Create policy: Allow authenticated users to upload to war-room-audio
CREATE POLICY "Allow authenticated uploads to war-room-audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'war-room-audio');

-- Create policy: Allow anonymous users to upload to war-room-audio (for Edge Functions)
CREATE POLICY "Allow anonymous uploads to war-room-audio"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'war-room-audio');

-- Create policy: Allow service role to do everything
CREATE POLICY "Allow service role full access to war-room-audio"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'war-room-audio')
WITH CHECK (bucket_id = 'war-room-audio');
