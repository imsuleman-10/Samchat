-- ============================================
-- MsgApp - Full Database Setup & Migration
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/euswgfmjlpqyyibksesu/sql/new
-- ============================================

-- 1. USERS TABLE (create or update)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add new columns if they don't exist
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'Hey there! I am using MsgApp.',
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Disable RLS on users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. MESSAGES TABLE (create or update)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  receiver_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'text' NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add new columns if they don't exist
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reply_to UUID,
  ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Disable RLS on messages
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- 3. ENABLE REALTIME
DO $$
BEGIN
  -- Enable realtime (ignore error if already added)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 4. STORAGE POLICIES (fix RLS on storage)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all inserts" ON storage.objects;
DROP POLICY IF EXISTS "Allow all updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes" ON storage.objects;

CREATE POLICY "Allow all reads" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Allow all inserts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Allow all updates" ON storage.objects FOR UPDATE USING (bucket_id = 'media');
CREATE POLICY "Allow all deletes" ON storage.objects FOR DELETE USING (bucket_id = 'media');

-- Done!
SELECT 'MsgApp database setup complete!' as status;
