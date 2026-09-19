import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
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

    // 2. Get the user ID
    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Update the user password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // 4. Delete the used OTP code
    await supabaseAdmin.from('otp_codes').delete().eq('email', email);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error resetting custom password:', err);
    return NextResponse.json({ error: err.message || 'Password reset failed.' }, { status: 500 });
  }
}
