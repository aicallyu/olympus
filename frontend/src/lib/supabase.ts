import { createClient } from '@supabase/supabase-js'

// @ts-ignore
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mfpyyriilflviojnqhuv.supabase.co'
// @ts-ignore  
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcHl5cmlpbGZsdmlvam5xaHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTk0ODcsImV4cCI6MjA4NTc5NTQ4N30.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
