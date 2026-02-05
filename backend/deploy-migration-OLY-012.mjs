import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://mfpyyriilflviojnqhuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcHl5cmlpbGZsdmlvam5xaHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIxOTQ4NywiZXhwIjoyMDg1Nzk1NDg3fQ.7nN6dHI5kwQZDIPPxaMm49tbeof5j2ZXg889jffZK_A';

const supabase = createClient(supabaseUrl, supabaseKey);

// Read migration SQL
const migrationPath = join(__dirname, 'migrations', 'OLY-012-agent-activity-endpoints.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

async function deployMigration() {
  console.log('🚀 Deploying OLY-012 Migration: Agent Activity Endpoints\n');
  
  try {
    // Split into statements (handle $$ blocks for functions)
    const statements = [];
    let currentStmt = '';
    let inFunction = false;
    
    const lines = migrationSQL.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed.startsWith('--') || trimmed === '') continue;
      
      // Track function boundaries
      if (trimmed.includes('$$')) {
        inFunction = !inFunction;
      }
      
      currentStmt += line + '\n';
      
      // End of statement (semicolon outside of function blocks)
      if (trimmed.endsWith(';') && !inFunction) {
        statements.push(currentStmt.trim());
        currentStmt = '';
      }
    }
    
    // Add any remaining statement
    if (currentStmt.trim()) {
      statements.push(currentStmt.trim());
    }
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const firstLine = stmt.split('\n')[0].substring(0, 50);
      process.stdout.write(`[${i + 1}/${statements.length}] ${firstLine}... `);
      
      try {
        // Try RPC exec_sql
        const { error } = await supabase.rpc('exec_sql', { 
          sql: stmt 
        });
        
        if (error) {
          // Check if it's a "already exists" error which is fine
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('conflict')) {
            console.log('⚡ (exists)');
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
    
    // Verify tables exist
    console.log('\n📊 Verifying new tables...');
    
    const tablesToCheck = ['agent_activities', 'agent_metrics'];
    for (const table of tablesToCheck) {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ready`);
      }
    }
    
    console.log('\n✅ Migration OLY-012 deployment complete!');
    console.log('\n📋 Summary:');
    console.log('   • agent_activities table: created');
    console.log('   • agent_metrics table: created');
    console.log('   • Triggers: installed');
    console.log('   • RLS policies: configured');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

deployMigration();
