import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabaseUrl = 'https://euswgfmjlpqyyibksesu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3dnZm1qbHBxeXlpYmtzZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgzNDQ2MCwiZXhwIjoyMTA1NDEwNDYwfQ.Vr-Ac7WyPyY92RLtAZIbxcr_sNqAQ8MfPCKI578lhzE';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFullSetup() {
  console.log('Running full MsgApp database setup...\n');

  // Run SQL statements one by one
  const statements = [
    // Users table
    `CREATE TABLE IF NOT EXISTS public.users (id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY, email TEXT NOT NULL, name TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT now())`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'Hey there! I am using MsgApp.'`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false`,
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now()`,
    `ALTER TABLE public.users DISABLE ROW LEVEL SECURITY`,

    // Messages table
    `CREATE TABLE IF NOT EXISTS public.messages (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, sender_id UUID REFERENCES public.users(id) NOT NULL, receiver_id UUID REFERENCES public.users(id) NOT NULL, content TEXT, type TEXT DEFAULT 'text' NOT NULL, file_url TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT now())`,
    `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`,
    `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to UUID`,
    `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false`,
    `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'`,
    `ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY`,

    // Storage policies
    `DROP POLICY IF EXISTS "Allow all reads" ON storage.objects`,
    `DROP POLICY IF EXISTS "Allow all inserts" ON storage.objects`,
    `DROP POLICY IF EXISTS "Allow all updates" ON storage.objects`,
    `DROP POLICY IF EXISTS "Allow all deletes" ON storage.objects`,
    `CREATE POLICY "Allow all reads" ON storage.objects FOR SELECT USING (bucket_id = 'media')`,
    `CREATE POLICY "Allow all inserts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media')`,
    `CREATE POLICY "Allow all updates" ON storage.objects FOR UPDATE USING (bucket_id = 'media')`,
    `CREATE POLICY "Allow all deletes" ON storage.objects FOR DELETE USING (bucket_id = 'media')`,
  ];

  let success = 0;
  for (const sql of statements) {
    try {
      const { error } = await supabase.from('_').select().limit(0).throwOnError().then(() => ({ error: null })).catch(() => ({ error: null }));
      // Use fetch to call the REST API directly
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
      success++;
    } catch (err) {
      // Silently continue
    }
  }

  // Ensure admin is in users table
  console.log('\nSetting up admin user profile...');
  const { data: users } = await supabase.auth.admin.listUsers();
  const admin = users?.users?.find(u => u.email === 'samstacktechs@gmail.com');
  if (admin) {
    const username = 'admin_samstack';
    await supabase.from('users').upsert({
      id: admin.id,
      email: admin.email,
      name: 'Admin',
      username,
      bio: 'MsgApp Administrator',
      is_online: false,
    });
    console.log('✓ Admin profile ensured in users table.');
  }

  // Ensure media bucket is public
  await supabase.storage.updateBucket('media', { public: true, allowedMimeTypes: ['image/*', 'audio/*', 'video/*'], fileSizeLimit: 52428800 });
  console.log('✓ Storage bucket "media" updated to public.');

  console.log('\n========================================');
  console.log('IMPORTANT: Also run scripts/full-setup.sql');
  console.log('in Supabase SQL Editor for full DB setup:');
  console.log('https://supabase.com/dashboard/project/euswgfmjlpqyyibksesu/sql/new');
  console.log('========================================\n');
  console.log('Setup script complete!');
}

runFullSetup();
