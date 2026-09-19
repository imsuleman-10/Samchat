import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, code, password, name, username } = await request.json();

    if (!email || !code || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check OTP in database
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'Verification code not found or expired. Please request a new one.' }, { status: 400 });
    }

    if (otpData.code !== code) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    if (new Date() > new Date(otpData.expires_at)) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // 2. Create the user in Supabase Auth (bypassing confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    let userId = authData?.user?.id;

    if (authError) {
      // Auto-heal logic: If user exists in auth.users but not in public.users, they are stuck.
      // We know they are not in public.users because sendOtp already checks that.
      if (authError.message.toLowerCase().includes('already') || authError.status === 422) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const stuckUser = users.find(u => u.email === email);
        if (stuckUser) {
          // Confirm them and update password to what they just entered
          await supabaseAdmin.auth.admin.updateUserById(stuckUser.id, { password, email_confirm: true });
          userId = stuckUser.id;
        } else {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Failed to create or recover user identity' }, { status: 500 });
    }

    // 3. Create public user profile
    const { error: profileError } = await supabaseAdmin.from('users').upsert({
      id: userId,
      email: email,
      name,
      username,
      bio: 'Hey there! I am using Sam Chat.',
      is_online: true,
      last_seen: new Date().toISOString(),
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // 4. Delete the used OTP code
    await supabaseAdmin.from('otp_codes').delete().eq('email', email);

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error('Error verifying custom OTP:', err);
    return NextResponse.json({ error: err.message || 'Verification failed.' }, { status: 500 });
  }
}
