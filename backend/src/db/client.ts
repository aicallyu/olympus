import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Test connection
supabase.from('agents').select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      console.error('Make sure to run the schema.sql in Supabase SQL Editor first!');
    } else {
      console.log('✅ Supabase connected successfully');
    }
  });

// Database types (generated from schema)
export type Agent = {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'active' | 'blocked';
  current_task_id?: string;
  session_key: string;
  model_primary: string;
  model_escalation?: string;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'normal' | 'high' | 'critical';
  assignee_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
};

export type Message = {
  id: string;
  task_id: string;
  from_agent_id?: string;
  content: string;
  attachments: any[];
  created_at: string;
};

export type Activity = {
  id: string;
  type: string;
  agent_id?: string;
  task_id?: string;
  message: string;
  metadata: any;
  created_at: string;
};

export type Notification = {
  id: string;
  mentioned_agent_id: string;
  task_id?: string;
  message_id?: string;
  content: string;
  delivered: boolean;
  created_at: string;
};

// New tables for OLY-012
export type AgentActivity = {
  id: string;
  agent_id: string;
  action: string;
  type: 'task' | 'heartbeat' | 'success' | 'blocked' | 'review' | 'error';
  task_id?: string;
  metadata: any;
  created_at: string;
};

export type AgentMetric = {
  agent_id: string;
  tasks_completed: number;
  tasks_failed: number;
  avg_completion_time?: string; // ISO 8601 interval
  total_cost?: number;
  last_updated: string;
};
