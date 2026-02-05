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

const schemaPath = join(__dirname, '../schema.sql');

async function deploy() {
  console.log('🚀 Connecting to Supabase via Pooler...\n');
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Read and execute schema
    const schema = readFileSync(schemaPath, 'utf8');
    
    console.log('📦 Deploying schema...\n');
    await client.query(schema);
    
    console.log('✅ Schema deployed successfully!\n');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Tables in database:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Check agents
    const agentsResult = await client.query('SELECT name FROM agents ORDER BY name');
    console.log(`\n👥 Agents (${agentsResult.rows.length}):`);
    agentsResult.rows.forEach(a => console.log(`  • ${a.name}`));
    
    await client.end();
    console.log('\n🎉 Mission Control database ready!');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

deploy();
