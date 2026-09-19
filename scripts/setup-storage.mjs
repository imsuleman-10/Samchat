import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://euswgfmjlpqyyibksesu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3dnZm1qbHBxeXlpYmtzZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgzNDQ2MCwiZXhwIjoyMTA1NDEwNDYwfQ.Vr-Ac7WyPyY92RLtAZIbxcr_sNqAQ8MfPCKI578lhzE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  console.log('Setting up Supabase storage...');

  // Check if bucket already exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.find(b => b.name === 'media');

  if (exists) {
    console.log('✓ Bucket "media" already exists.');
  } else {
    const { data, error } = await supabase.storage.createBucket('media', {
      public: true,
      allowedMimeTypes: ['image/*', 'audio/*'],
      fileSizeLimit: 52428800, // 50MB
    });

    if (error) {
      console.error('✗ Error creating bucket:', error.message);
    } else {
      console.log('✓ Bucket "media" created successfully!');
    }
  }

  // Create SQL tables via RPC
  console.log('\nChecking database tables...');
  
  // Try inserting a test to see if users table exists
  const { error: usersCheckError } = await supabase.from('users').select('id').limit(1);
  
  if (usersCheckError && usersCheckError.code === 'PGRST205') {
    console.log('✗ "users" table not found.');
    console.log('  → Please run the SQL in setup_instructions.md in your Supabase SQL Editor.');
  } else {
    console.log('✓ "users" table exists.');
  }

  const { error: msgsCheckError } = await supabase.from('messages').select('id').limit(1);
  if (msgsCheckError && msgsCheckError.code === 'PGRST205') {
    console.log('✗ "messages" table not found.');
    console.log('  → Please run the SQL in setup_instructions.md in your Supabase SQL Editor.');
  } else {
    console.log('✓ "messages" table exists.');
  }
  
  console.log('\nSetup check complete!');
}

setup();
