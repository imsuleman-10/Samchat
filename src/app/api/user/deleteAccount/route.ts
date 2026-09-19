import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify the caller is the owner of the account or is an admin
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (!user || (user.id !== userId && user.email !== 'samstacktechs@gmail.com')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Step 1: Manually clean up related data to avoid FK constraint errors
    // Delete messages sent by this user
    await supabaseAdmin.from('messages').delete().eq('sender_id', userId);

    // Delete all conversations this user was part of
    await supabaseAdmin.from('conversations').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // Step 2: Delete user profile from public.users
    await supabaseAdmin.from('users').delete().eq('id', userId);

    // Step 3: Delete from Supabase Auth (auth.users)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) throw authDeleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[deleteAccount] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
