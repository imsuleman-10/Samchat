import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server misconfiguration: No service role key' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user from auth (this will cascade to public.users if references are set up with ON DELETE CASCADE, 
    // but we didn't specify cascade in the SQL. We should manually delete from public.users first)
    const { error: dbError } = await supabaseAdmin.from('users').delete().eq('id', userId);
    
    if (dbError) {
       console.error("Error deleting from public.users:", dbError);
       // continue anyway, maybe they aren't in public.users
    }

    // Delete user from auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      throw authError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
