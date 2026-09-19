import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, isOnline } = await request.json();
    if (!userId) return NextResponse.json({ error: 'No userId' }, { status: 400 });

    await supabaseAdmin.from('users').update({
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    }).eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
