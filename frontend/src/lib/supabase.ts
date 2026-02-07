import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mfpyyriilflviojnqhuv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcHl5cmlpbGZsdmlvam5xaHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTk0ODcsImV4cCI6MjA4NTc5NTQ4N30.UPJuzVC5GFa3jImcF7FvML0-Pu_FFSFjbxR4zrvuBRk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
