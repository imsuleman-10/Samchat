import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables if running locally
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
      }
    });
  }
} catch (e) {
  // Ignore missing .env.local file
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function keepAlive() {
  console.log('🔄 Pinging Supabase to prevent project pause...');
  try {
    // 1. Fetching auth session acts as an API request
    await supabase.auth.getSession();
    
    // 2. A simple dummy query to the database
    // Even if this table doesn't exist, the request hits the REST API and resets the pause timer
    await supabase.from('_dummy_ping_table').select('*').limit(1).catch(() => {});
    
    console.log('✅ Supabase ping successful! Project will remain active.');
  } catch (err) {
    console.error('❌ Failed to ping Supabase:', err.message);
  }
}

keepAlive();
