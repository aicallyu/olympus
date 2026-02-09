-- Fix RLS for war-room-audio bucket - simplified permissive policies

-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('war-room-audio', 'war-room-audio', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Allow all uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to war-room-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads from war-room-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to war-room-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role full access to war-room-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;

-- Create permissive upload policy for both anon and authenticated
CREATE POLICY "Allow all uploads" 
ON storage.objects FOR INSERT 
TO anon, authenticated 
WITH CHECK (bucket_id = 'war-room-audio');

-- Create permissive read policy for both anon and authenticated  
CREATE POLICY "Allow all reads" 
ON storage.objects FOR SELECT 
TO anon, authenticated 
USING (bucket_id = 'war-room-audio');
