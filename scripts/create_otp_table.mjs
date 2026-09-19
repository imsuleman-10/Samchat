import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { error } = await supabaseAdmin.rpc('exec_sql', { sql: `
    CREATE TABLE IF NOT EXISTS otp_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `});
  
  if (error) {
    console.error('RPC failed, trying raw query via REST or falling back to simple API...', error);
  } else {
    console.log('otp_codes table created via RPC');
  }
}
run();
