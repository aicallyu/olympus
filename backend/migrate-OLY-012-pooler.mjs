import pg from 'pg';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Connection string with pooler
const connectionString = 'postgresql://postgres.mfpyyriilflviojnqhuv:Olympus1.000.000@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const client = new pg.Client({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrationPath = join(__dirname, 'migrations', 'OLY-012-agent-activity-endpoints.sql');

async function deployMigration() {
  console.log('🚀 OLY-012: Deploying Agent Activity Endpoints Migration\n');
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Read migration SQL
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📦 Executing migration...\n');
    await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('agent_activities', 'agent_metrics')
      ORDER BY table_name
    `);
    
    console.log('📊 New tables created:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Check agent_metrics data
    const metricsResult = await client.query('SELECT agent_id, tasks_completed, tasks_failed FROM agent_metrics');
    console.log(`\n📈 Agent Metrics (${metricsResult.rows.length} records):`);
    metricsResult.rows.forEach(m => {
      console.log(`  • ${m.agent_id.substring(0, 8)}...: ${m.tasks_completed} completed, ${m.tasks_failed} failed`);
    });
    
    // Check agent_activities data
    const activitiesResult = await client.query('SELECT COUNT(*) as count FROM agent_activities');
    console.log(`\n📝 Agent Activities: ${activitiesResult.rows[0].count} records`);
    
    await client.end();
    console.log('\n🎉 OLY-012 Migration complete!');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

deployMigration();
