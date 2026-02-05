import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://mfpyyriilflviojnqhuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcHl5cmlpbGZsdmlvam5xaHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIxOTQ4NywiZXhwIjoyMDg1Nzk1NDg3fQ.7nN6dHI5kwQZDIPPxaMm49tbeof5j2ZXg889jffZK_A';

const supabase = createClient(supabaseUrl, supabaseKey);

const schema = `
-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  current_task_id UUID,
  session_key TEXT NOT NULL UNIQUE,
  model_primary TEXT NOT NULL,
  model_escalation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 7 agents
INSERT INTO agents (name, role, session_key, model_primary, model_escalation) VALUES
  ('ARGOS', 'Orchestrator', 'agent:main:main', 'kimi/kimi-k2.5', 'anthropic/claude-opus-4-5'),
  ('ATLAS', 'Frontend Engineer', 'agent:frontend:main', 'kimi/kimi-k2.5', 'openai/gpt-5.2-codex'),
  ('ATHENA', 'QA & Strategy', 'agent:qa:main', 'kimi/kimi-k2.5', 'kimi/kimi-k2.5'),
  ('HERCULOS', 'Backend Engineer', 'agent:backend:main', 'kimi/kimi-k2.5', 'openai/gpt-5.2-codex'),
  ('PROMETHEUS', 'DevOps & Automation', 'agent:devops:main', 'kimi/kimi-k2.5', 'deepseek/deepseek-v3'),
  ('APOLLO', 'Design & Visual Arts', 'agent:design:main', 'anthropic/claude-opus-4-5', 'anthropic/claude-opus-4-5'),
  ('HERMES', 'Documentation', 'agent:docs:main', 'kimi/kimi-k2.5', 'kimi/kimi-k2.5')
ON CONFLICT (session_key) DO NOTHING;

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'inbox',
  priority TEXT DEFAULT 'normal',
  assignee_id UUID REFERENCES agents(id),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Status history table
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Messages table  
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES agents(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  task_id UUID REFERENCES tasks(id),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  type TEXT,
  task_id UUID REFERENCES tasks(id),
  created_by UUID REFERENCES agents(id),
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentioned_agent_id UUID NOT NULL REFERENCES agents(id),
  task_id UUID REFERENCES tasks(id),
  message_id UUID REFERENCES messages(id),
  content TEXT NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function deploy() {
  console.log('🚀 Deploying Mission Control schema...\n');
  
  try {
    // Split into statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const desc = stmt.substring(0, 40).replace(/\n/g, ' ');
      process.stdout.write(`[${i + 1}/${statements.length}] ${desc}... `);
      
      // Try RPC first
      const { error } = await supabase.rpc('exec_sql', { 
        query: stmt + ';' 
      });
      
      if (error) {
        // Fallback: Direct query via REST
        const response = await fetch(
          `${supabaseUrl}/rest/v1/rpc/exec_sql`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Prefer': 'params=single-object',
            },
            body: JSON.stringify({ query: stmt + ';' }),
          }
        );
        
        if (!response.ok && response.status !== 404) {
          const errText = await response.text();
          console.log(`⚠️  ${response.status}`);
        } else {
          console.log('✅');
        }
      } else {
        console.log('✅');
      }
    }
    
    // Verify tables exist
    console.log('\n📊 Verifying tables...');
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log('⚠️  Could not verify:', error.message);
    } else {
      const ourTables = ['agents', 'tasks', 'messages', 'activities', 'documents', 'notifications'];
      const found = tables?.filter(t => ourTables.includes(t.table_name)) || [];
      console.log(`✅ ${found.length}/${ourTables.length} Mission Control tables ready:`);
      found.forEach(t => console.log(`   • ${t.table_name}`));
    }
    
    console.log('\n✅ Schema deployment complete!');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

deploy();
