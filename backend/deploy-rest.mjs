import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfpyyriilflviojnqhuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcHl5cmlpbGZsdmlvam5xaHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIxOTQ4NywiZXhwIjoyMDg1Nzk1NDg3fQ.7nN6dHI5kwQZDIPPxaMm49tbeof5j2ZXg889jffZK_A';

const supabase = createClient(supabaseUrl, supabaseKey);

const statements = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
  
  `CREATE TABLE IF NOT EXISTS agents (
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
  )`,
  
  `INSERT INTO agents (name, role, session_key, model_primary, model_escalation) VALUES
    ('ARGOS', 'Orchestrator', 'agent:main:main', 'kimi/kimi-k2.5', 'anthropic/claude-opus-4-5'),
    ('ATLAS', 'Frontend Engineer', 'agent:frontend:main', 'kimi/kimi-k2.5', 'openai/gpt-5.2-codex'),
    ('ATHENA', 'QA & Strategy', 'agent:qa:main', 'kimi/kimi-k2.5', 'kimi/kimi-k2.5'),
    ('HERCULOS', 'Backend Engineer', 'agent:backend:main', 'kimi/kimi-k2.5', 'openai/gpt-5.2-codex'),
    ('PROMETHEUS', 'DevOps & Automation', 'agent:devops:main', 'kimi/kimi-k2.5', 'deepseek/deepseek-v3'),
    ('APOLLO', 'Design & Visual Arts', 'agent:design:main', 'anthropic/claude-opus-4-5', 'anthropic/claude-opus-4-5'),
    ('HERMES', 'Documentation', 'agent:docs:main', 'kimi/kimi-k2.5', 'kimi/kimi-k2.5')
  ON CONFLICT (session_key) DO NOTHING`,
  
  `CREATE TABLE IF NOT EXISTS tasks (
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
  )`,
  
  `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_agent_id UUID REFERENCES agents(id),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  `CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    agent_id UUID REFERENCES agents(id),
    task_id UUID REFERENCES tasks(id),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  `CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    type TEXT,
    task_id UUID REFERENCES tasks(id),
    created_by UUID REFERENCES agents(id),
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentioned_agent_id UUID NOT NULL REFERENCES agents(id),
    task_id UUID REFERENCES tasks(id),
    message_id UUID REFERENCES messages(id),
    content TEXT NOT NULL,
    delivered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
];

async function deploy() {
  console.log('🚀 Deploying Mission Control schema via Supabase REST...\n');
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const short = stmt.substring(0, 40).replace(/\\n/g, ' ');
    process.stdout.write(`[${i + 1}/${statements.length}] ${short}... `);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { 
        sql: stmt 
      });
      
      if (error) {
        // Try inserting directly for data
        if (stmt.includes('INSERT INTO')) {
          const { error: insertError } = await supabase.from('agents').upsert([
            { name: 'ARGOS', role: 'Orchestrator', session_key: 'agent:main:main', model_primary: 'kimi/kimi-k2.5', model_escalation: 'anthropic/claude-opus-4-5' },
            { name: 'ATLAS', role: 'Frontend Engineer', session_key: 'agent:frontend:main', model_primary: 'kimi/kimi-k2.5', model_escalation: 'openai/gpt-5.2-codex' },
            { name: 'ATHENA', role: 'QA & Strategy', session_key: 'agent:qa:main', model_primary: 'kimi/kimi-k2.5', model_escalation: 'kimi/kimi-k2.5' },
            { name: 'HERCULOS', role: 'Backend Engineer', session_key: 'agent:backend:main', model_primary: 'kimi/kimi-k2.5', model_escalation: 'openai/gpt-5.2-codex' },
            { name: 'PROMETHEUS', role: 'DevOps & Automation', session_key: 'agent:devops:main', model_primary: 'kimi/kimi-k2.5', model_escalation: 'deepseek/deepseek-v3' },
            { name: 'APOLLO', role: 'Design & Visual Arts', session_key: 'agent:design:main', model_primary: 'anthropic/claude-opus-4-5', model_escalation: 'anthropic/claude-opus-4-5' },
            { name: 'HERMES', role: 'Documentation', session_key: 'agent:docs:main', model_primary: 'kimi/kimi-k2.5', model_escalation: 'kimi/kimi-k2.5' }
          ], { onConflict: 'session_key' });
          
          if (insertError) {
            console.log(`⚠️  ${insertError.message}`);
          } else {
            console.log('✅');
          }
        } else {
          console.log(`⚠️  ${error.message.substring(0, 50)}`);
        }
      } else {
        console.log('✅');
      }
    } catch (err) {
      console.log(`⚠️  ${err.message.substring(0, 50)}`);
    }
  }
  
  console.log('\n📊 Verifying tables...');
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  if (error) {
    console.log('⚠️ Could not list tables:', error.message);
  } else {
    console.log(`✅ ${tables?.length || 0} tables found`);
    tables?.forEach(t => console.log(`   • ${t.table_name}`));
  }
  
  console.log('\n🎉 Schema deployment complete!');
}

deploy();
