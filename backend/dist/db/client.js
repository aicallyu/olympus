import { createClient } from '@supabase/supabase-js';
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
export const supabase = createClient(supabaseUrl, supabaseKey);
// Test connection
supabase.from('agents').select('count', { count: 'exact', head: true })
    .then(({ error }) => {
    if (error) {
        console.error('❌ Supabase connection failed:', error.message);
        console.error('Make sure to run the schema.sql in Supabase SQL Editor first!');
    }
    else {
        console.log('✅ Supabase connected successfully');
    }
});
//# sourceMappingURL=client.js.map