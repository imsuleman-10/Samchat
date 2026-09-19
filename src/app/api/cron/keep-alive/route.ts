import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { status: 'error', message: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // A simple query to keep the database active.
    // Hitting the REST API is sufficient to prevent the Supabase free tier from pausing.
    const { error } = await supabase.auth.getSession();

    if (error) {
      console.error('Supabase ping error (auth):', error);
    }
    
    // We also make a lightweight DB query. If the table doesn't exist, the request 
    // itself still counts as valid activity towards the inactivity timer.
    await supabase.from('_dummy_ping_table').select('*').limit(1);

    return NextResponse.json({ 
      status: 'success', 
      message: 'Supabase project pinged successfully to prevent pausing.',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Keep-alive cron failed:', err);
    return NextResponse.json(
      { status: 'error', message: 'Failed to ping Supabase', details: err.message },
      { status: 500 }
    );
  }
}
