import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'samalidev982@gmail.com',
    pass: 'vrpm bihp zmxz mqas' // User's provided App Password
  }
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user is already fully registered in public.users
    const { data: existingProfile } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    
    if (existingProfile) {
      // They exist in public.users. Check if they are confirmed in auth.
      const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers.find(u => u.email === email);
      
      if (authUser && authUser.email_confirmed_at) {
        // Fully confirmed registered user - block signup
        return NextResponse.json({ error: 'A user with this email address has already been registered' }, { status: 400 });
      } else {
        // Stuck user: in public.users but not confirmed in auth. Auto-cleanup.
        await supabaseAdmin.from('users').delete().eq('email', email);
        if (authUser) {
          await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        }
        await supabaseAdmin.from('otp_codes').delete().eq('email', email);
        // Fall through to send OTP
      }
    }

    // Generate a 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save to database
    const { error: dbError } = await supabaseAdmin.from('otp_codes').upsert({
      email,
      code,
      expires_at: expiresAt.toISOString()
    });

    if (dbError) throw dbError;

    // Send email
    await transporter.sendMail({
      from: '"Sam Chat" <samalidev982@gmail.com>',
      to: email,
      subject: 'Your Sam Chat Verification Code',
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 40px 20px; background-color: #f4f4f5; border-radius: 10px;">
          <h1 style="color: #3b82f6;">Sam Chat</h1>
          <h2>Your Verification Code</h2>
          <p style="color: #555;">Please enter the following 6-digit code to verify your email address. This code will expire in 10 minutes.</p>
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 30px auto; max-width: 300px; font-size: 32px; font-weight: bold; letter-spacing: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            ${code}
          </div>
          <p style="color: #888; font-size: 12px;">If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error sending custom OTP:', err);
    return NextResponse.json({ error: 'Failed to send verification code. Please try again later.' }, { status: 500 });
  }
}
