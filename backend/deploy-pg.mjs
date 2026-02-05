import pg from 'pg';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Connection string - force IPv4
const connectionString = 'postgresql://postgres:Olympus1.000.000@db.mfpyyriilflviojnqhuv.supabase.co:5432/postgres';

const client = new pg.Client({ 
  connectionString,
  // Force IPv4
  family: 4
});

const schemaPath = join(__dirname, '../schema.sql');

async function deploy() {
  console.log('🚀 Connecting to Supabase PostgreSQL (IPv4)...\n');
  
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
    
    // Check if agents were inserted
    const agentsResult = await client.query('SELECT COUNT(*) FROM agents');
    console.log(`\n👥 Agents inserted: ${agentsResult.rows[0].count}`);
    
    await client.end();
    console.log('\n🎉 Mission Control database ready!');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

deploy();
