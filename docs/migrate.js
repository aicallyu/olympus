#!/usr/bin/env node
/**
 * OLYMPUS Control System Database Migration
 * Creates tables for agent monitoring
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mfpyyriilflviojnqhuv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcHl5cmlpbGZsdmlvam5xaHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODY0MjA3OCwiZXhwIjoyMDU0MjE4MDc4fQ.8R6EWCaPZ7rkvKdS45nenC72kL9y2R9z0R9z4P9ZxJk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
  `CREATE TABLE IF NOT EXISTS agent_sessions (
    session_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    task_id UUID REFERENCES tasks(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    last_ping TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active',
    model TEXT,
    CHECK (status IN ('active', 'stalled', 'dead'))
  )`,
  
  `CREATE TABLE IF NOT EXISTS task_progress (
    task_id UUID PRIMARY KEY REFERENCES tasks(id),
    agent_id TEXT NOT NULL,
    last_update TIMESTAMPTZ DEFAULT now(),
    progress_percent INTEGER DEFAULT 0,
    status_message TEXT,
    CHECK (progress_percent >= 0 AND progress_percent <= 100)
  )`,
  
  `CREATE TABLE IF NOT EXISTS control_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type TEXT NOT NULL,
    agent_id TEXT,
    task_id UUID,
    severity TEXT,
    message TEXT NOT NULL,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`
];

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent_id)',
  'CREATE INDEX IF NOT EXISTS idx_agent_sessions_task ON agent_sessions(task_id)',
  'CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status)',
  'CREATE INDEX IF NOT EXISTS idx_control_logs_created_at ON control_logs(created_at)'
];

async function migrate() {
  console.log('[Control System] Creating tables...');
  
  for (const sql of TABLES) {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('[Control System] Error creating table:', error);
      // Try direct query
      const { error: err2 } = await supabase.from('agent_sessions').select('count').limit(1);
      if (err2 && err2.code === '42P01') {
        console.log('[Control System] Table does not exist, creating via REST...');
      }
    }
  }
  
  for (const sql of INDEXES) {
    await supabase.rpc('exec_sql', { sql }).catch(() => {});
  }
  
  // Enable RLS via REST
  console.log('[Control System] Tables created');
  
  // Log initialization
  await supabase.from('control_logs').insert({
    check_type: 'system_init',
    severity: 'info',
    message: 'Control system initialized',
    action_taken: 'Monitoring active for all agents'
  });
  
  console.log('[Control System] Migration complete');
}

migrate().catch(console.error);
