-- Add this to the Supabase SQL Editor and run it
CREATE TABLE IF NOT EXISTS otp_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Note: We disable RLS for this table because only the backend API (service_role) will access it.
ALTER TABLE otp_codes DISABLE ROW LEVEL SECURITY;
