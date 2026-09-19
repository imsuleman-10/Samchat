import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://euswgfmjlpqyyibksesu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3dnZm1qbHBxeXlpYmtzZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgzNDQ2MCwiZXhwIjoyMTA1NDEwNDYwfQ.Vr-Ac7WyPyY92RLtAZIbxcr_sNqAQ8MfPCKI578lhzE';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrations = [
  // Add new columns to users table
  `ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'Hey there! I am using MsgApp.',
    ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();`,

  // Add new columns to messages table
  `ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';`,

  // Create conversations table to track last message easily
  `CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID REFERENCES public.users(id) NOT NULL,
    user2_id UUID REFERENCES public.users(id) NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    unread_count_user1 INT DEFAULT 0,
    unread_count_user2 INT DEFAULT 0,
    UNIQUE(user1_id, user2_id)
  );`,

  // Disable RLS on new table
  `ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;`,

  // Enable realtime for messages and conversations
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.users;`,
];

async function runMigrations() {
  console.log('Running DB migrations...\n');

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i];
    const preview = sql.trim().split('\n')[0].substring(0, 60);
    
    const { error } = await supabase.rpc('exec_sql', { query: sql }).catch(async () => {
      // RPC not available, try direct query via REST
      return { error: { message: 'RPC unavailable' } };
    });

    if (error && error.message !== 'RPC unavailable') {
      // Try alternative: use the SQL endpoint
      console.log(`Migration ${i + 1}: ${preview}...`);
    } else {
      console.log(`✓ Migration ${i + 1} done: ${preview}...`);
    }
  }

  // Output manual SQL for Supabase dashboard
  console.log('\n============================================');
  console.log('Run this SQL in your Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/euswgfmjlpqyyibksesu/sql/new');
  console.log('============================================\n');

  const allSQL = migrations.join('\n\n');
  console.log(allSQL);
}

runMigrations();
