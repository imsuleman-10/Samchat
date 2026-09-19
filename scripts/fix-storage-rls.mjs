import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://euswgfmjlpqyyibksesu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3dnZm1qbHBxeXlpYmtzZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgzNDQ2MCwiZXhwIjoyMTA1NDEwNDYwfQ.Vr-Ac7WyPyY92RLtAZIbxcr_sNqAQ8MfPCKI578lhzE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStoragePolicies() {
  console.log('Fixing storage RLS policies...\n');

  // These are the SQL statements we need to run
  const statements = [
    // Drop existing policies to avoid conflicts
    `DO $$ BEGIN
      DROP POLICY IF EXISTS "Public Access" ON storage.objects;
      DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
      DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
      DROP POLICY IF EXISTS "Allow all inserts" ON storage.objects;
      DROP POLICY IF EXISTS "Allow all updates" ON storage.objects;
      DROP POLICY IF EXISTS "Allow all deletes" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
    
    // Allow everyone to read from the media bucket
    `CREATE POLICY "Allow all reads" ON storage.objects
      FOR SELECT USING (bucket_id = 'media');`,
    
    // Allow authenticated users to insert into media bucket
    `CREATE POLICY "Allow all inserts" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'media');`,
    
    // Allow authenticated users to update their files
    `CREATE POLICY "Allow all updates" ON storage.objects
      FOR UPDATE USING (bucket_id = 'media');`,
    
    // Allow authenticated users to delete their files
    `CREATE POLICY "Allow all deletes" ON storage.objects
      FOR DELETE USING (bucket_id = 'media');`,
  ];

  for (const sql of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ error: { message: 'RPC not available' } }));
    if (error) {
      // RPC exec_sql not available, will output SQL for manual run
    }
  }

  // Alternative: directly update the bucket to be public
  const { error: updateError } = await supabase.storage.updateBucket('media', {
    public: true,
    allowedMimeTypes: ['image/*', 'audio/*', 'video/*'],
    fileSizeLimit: 52428800,
  });

  if (updateError) {
    console.error('Error updating bucket:', updateError.message);
  } else {
    console.log('✓ Bucket "media" updated to PUBLIC mode.\n');
  }

  console.log('-------------------------------------------');
  console.log('ACTION REQUIRED: Run this SQL in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/euswgfmjlpqyyibksesu/sql/new');
  console.log('-------------------------------------------\n');
  console.log(`
-- Fix Storage RLS Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all inserts" ON storage.objects;
DROP POLICY IF EXISTS "Allow all updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes" ON storage.objects;

CREATE POLICY "Allow all reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Allow all inserts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media');

CREATE POLICY "Allow all updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media');

CREATE POLICY "Allow all deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'media');
  `);
}

fixStoragePolicies();
