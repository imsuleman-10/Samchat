import { createClient } from '@supabase/supabase-js';

// Load env directly since this is a standalone script
const SUPABASE_URL = 'https://euswgfmjlpqyyibksesu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3dnZm1qbHBxeXlpYmtzZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgzNDQ2MCwiZXhwIjoyMTA1NDEwNDYwfQ.Vr-Ac7WyPyY92RLtAZIbxcr_sNqAQ8MfPCKI578lhzE';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TARGET_EMAIL = 'saqibjaved56033@gmail.com';

async function run() {
  console.log(`Cleaning up stuck user: ${TARGET_EMAIL}`);

  // Step 1: Delete from public.users
  const { error: profileErr } = await supabaseAdmin.from('users').delete().eq('email', TARGET_EMAIL);
  if (profileErr) {
    console.log('public.users delete error (may not exist):', profileErr.message);
  } else {
    console.log('✅ Deleted from public.users');
  }

  // Step 2: Find and delete from auth.users
  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    console.error('Error listing users:', listErr.message);
    return;
  }
  
  const stuckUser = users.find(u => u.email === TARGET_EMAIL);
  if (stuckUser) {
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(stuckUser.id);
    if (authErr) {
      console.error('auth.users delete error:', authErr.message);
    } else {
      console.log('✅ Deleted from auth.users');
    }
  } else {
    console.log('User not found in auth.users (already clean)');
  }

  // Step 3: Clean otp_codes
  await supabaseAdmin.from('otp_codes').delete().eq('email', TARGET_EMAIL);
  console.log('✅ Cleaned otp_codes');

  console.log('\n🎉 Done! User can now sign up fresh.');
}

run().catch(console.error);
