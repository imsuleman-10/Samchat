import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://euswgfmjlpqyyibksesu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3dnZm1qbHBxeXlpYmtzZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgzNDQ2MCwiZXhwIjoyMTA1NDEwNDYwfQ.Vr-Ac7WyPyY92RLtAZIbxcr_sNqAQ8MfPCKI578lhzE';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ADMIN_EMAIL = 'samstacktechs@gmail.com';

async function run() {
  console.log(`Checking admin user: ${ADMIN_EMAIL}`);

  // Find admin in auth.users
  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) { console.error('Error listing users:', listErr.message); return; }

  const adminUser = users.find(u => u.email === ADMIN_EMAIL);
  if (!adminUser) {
    console.error('Admin not found in auth.users! Please check the email.');
    return;
  }

  console.log(`Found admin in auth.users with id: ${adminUser.id}`);

  // Upsert admin profile in public.users
  const { error: upsertErr } = await supabaseAdmin.from('users').upsert({
    id: adminUser.id,
    email: ADMIN_EMAIL,
    name: 'Sam Admin',
    username: 'samadmin',
    bio: 'Sam Chat Administrator',
    is_online: false,
    last_seen: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (upsertErr) {
    console.error('Error creating admin profile:', upsertErr.message);
  } else {
    console.log('✅ Admin profile created/updated in public.users!');
  }
}

run().catch(console.error);
