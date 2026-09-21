import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Mail, Lock, User, ArrowRight, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Signup OTP state
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string>('');
  const [pendingUsername, setPendingUsername] = useState<string>('');

  // Forgot Password state
  const [forgotPasswordStep, setForgotPasswordStep] = useState<0 | 1 | 2 | 3>(0);
  // 0: Off, 1: Enter Email, 2: Enter OTP, 3: Enter New Password

  useEffect(() => {
    // Focus first OTP input when it appears
    if ((isVerifyingOtp || forgotPasswordStep === 2) && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [isVerifyingOtp, forgotPasswordStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Send custom OTP via our backend
        const res = await fetch('/api/auth/sendOtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to send OTP email.');
        }

        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') + Math.floor(Math.random() * 1000);
        setPendingUsername(username);
        setIsVerifyingOtp(true);
        setSuccess(`A 6-digit verification code was sent to ${email}`);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address first.'); return; }
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/sendResetOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to send reset code');
      
      setSuccess(`A password reset code was sent to ${email}`);
      setForgotPasswordStep(2);
      setOtpValues(["", "", "", "", "", ""]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpValues.join('');
    if (token.length < 6) { setError('Please enter the complete 6-digit code.'); return; }
    if (!password) { setError('Please enter a new password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/resetPasswordCustom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: token, newPassword: password })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Password reset failed.');
      }

      setSuccess('Password reset successfully! Logging you in...');
      
      // Log them in with new password
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = digit;
    setOtpValues(newOtp);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = pasted.split('');
      while (newOtp.length < 6) newOtp.push('');
      setOtpValues(newOtp);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpValues.join('');
    if (token.length < 6) { setError('Please enter the complete 6-digit code.'); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verifyOtpCustom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: token, password, name, username: pendingUsername })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Verification failed. Check the code and try again.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      
    } catch (err: any) {
      setError(err.message || 'Verification failed. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use sendResetOtp if in forgot password flow, otherwise sendOtp
      const url = forgotPasswordStep >= 2 ? '/api/auth/sendResetOtp' : '/api/auth/sendOtp';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to resend code');
      
      setSuccess('A new code has been sent to your email!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setError(null);
    setSuccess(null);
    setIsVerifyingOtp(false);
    setForgotPasswordStep(0);
    setOtpValues(["", "", "", "", "", ""]);
  };

  // Render OTP UI for either Signup or Forgot Password
  if (isVerifyingOtp || forgotPasswordStep >= 2) {
    const isForgotFlow = forgotPasswordStep >= 2;
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '2.5rem',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={32} color="var(--primary)" />
            </div>
          </div>
          
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            Verify Your Email
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {isForgotFlow ? "Enter the reset code sent to your email" : "Enter the verification code sent to your email"}
          </p>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#86efac', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
              {success}
            </div>
          )}

          <form onSubmit={isForgotFlow ? handleForgotPasswordVerifyAndReset : handleVerifySignupOtp} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }} onPaste={handleOtpPaste}>
              {otpValues.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { otpRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  style={{
                    width: '3rem', height: '3.5rem', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center',
                    background: 'var(--bg-primary)', border: '2px solid var(--surface-border)', borderRadius: '12px',
                    color: 'var(--text-primary)', transition: 'all 0.2s', outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = digit ? 'var(--primary-light)' : 'var(--surface-border)'}
                />
              ))}
            </div>

            {isForgotFlow && forgotPasswordStep === 2 && (
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'var(--bg-primary)', border: '1px solid var(--surface-border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', padding: '0.25rem', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'var(--transition-fast)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying...' : (isForgotFlow ? 'Verify & Reset Password' : 'Verify & Create Account')}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button onClick={() => switchTab(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              &larr; Back
            </button>
            <button onClick={handleResendOtp} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Resend Code
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Forgot Password Step 1 (Enter Email)
  if (forgotPasswordStep === 1) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Reset Password</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>Enter your email to receive a reset code</p>
          
          {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleForgotPasswordSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'var(--bg-primary)', border: '1px solid var(--surface-border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button onClick={() => setForgotPasswordStep(0)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer' }}>&larr; Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main Login / Signup — Split-Screen Layout ----
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>
      {/* ---- LEFT HERO PANEL ---- */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #0d1f27 0%, #0b141a 40%, #0d2418 100%)',
        borderRight: '1px solid var(--surface-border)',
        padding: '3rem 2rem', position: 'relative', overflow: 'hidden',
      }} className="hide-on-mobile">
        {/* Background glow orbs */}
        <div style={{ position: 'absolute', top: '15%', left: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,168,132,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,168,132,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 90, height: 90, borderRadius: '26px', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,168,132,0.4)', animation: 'heroFloat 4s ease-in-out infinite' }}>
            <img src="/logo.png" alt="Sam Chat" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>Sam Chat</h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
            Connect instantly with people around the world
          </p>
        </div>

        {/* Animated floating message bubbles */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 340, marginTop: '1rem' }}>
          {/* Bubble 1 — received */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem', animation: 'slideInLeft 0.5s 0.1s ease both' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'hsl(160, 55%, 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#fff', flexShrink: 0 }}>S</div>
            <div style={{ background: 'var(--received-bubble)', borderRadius: '8px 8px 8px 2px', padding: '0.6rem 0.9rem', maxWidth: '70%', border: '1px solid var(--surface-border)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Hey! Just tried Sam Chat — it&apos;s amazing! 🚀</p>
              <p style={{ fontSize: '0.65rem', opacity: 0.5, textAlign: 'right', marginTop: '3px' }}>10:24 AM</p>
            </div>
          </div>
          {/* Bubble 2 — sent */}
          <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem', paddingRight: '8px', animation: 'slideInRight 0.5s 0.3s ease both' }}>
            <div style={{ background: 'var(--sent-bubble)', borderRadius: '8px 8px 2px 8px', padding: '0.6rem 0.9rem', maxWidth: '70%' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-on-sent)' }}>I know, right? The design is incredible ✨</p>
              <p style={{ fontSize: '0.65rem', opacity: 0.5, textAlign: 'right', marginTop: '3px' }}>10:25 AM ✓✓</p>
            </div>
          </div>
          {/* Bubble 3 — received */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', animation: 'slideInLeft 0.5s 0.5s ease both' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'hsl(200, 55%, 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#fff', flexShrink: 0 }}>A</div>
            <div style={{ background: 'var(--received-bubble)', borderRadius: '8px 8px 8px 2px', padding: '0.6rem 0.9rem', maxWidth: '70%', border: '1px solid var(--surface-border)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Voice notes too? 🎙️ Love it!</p>
              <p style={{ fontSize: '0.65rem', opacity: 0.5, textAlign: 'right', marginTop: '3px' }}>10:26 AM</p>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2.5rem' }}>
          {['🔒 Private', '⚡ Real-time', '🎙️ Voice', '📸 Images', '😊 Reactions'].map(f => (
            <span key={f} style={{ background: 'rgba(0,168,132,0.1)', border: '1px solid rgba(0,168,132,0.2)', color: 'var(--primary-text)', fontSize: '0.78rem', padding: '0.3rem 0.75rem', borderRadius: '99px', fontWeight: 500 }}>{f}</span>
          ))}
        </div>
      </div>

      {/* ---- RIGHT FORM PANEL ---- */}
      <div style={{
        width: '100%', maxWidth: '480px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', background: 'var(--bg-secondary)',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo (only on mobile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', justifyContent: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,168,132,0.35)', flexShrink: 0 }}>
              <img src="/logo.png" alt="Sam Chat" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Sam Chat</span>
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            {isLogin ? 'Welcome back 👋' : 'Create account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
            {isLogin ? 'Sign in to continue to Sam Chat' : 'Join Sam Chat and start connecting'}
          </p>

          {/* Error / Success */}
          {error && (
            <div style={{ background: 'var(--error-light)', border: '1px solid rgba(240,79,79,0.2)', color: '#fca5a5', padding: '0.875rem 1rem', borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'var(--success-light)', border: '1px solid rgba(37,211,102,0.2)', color: '#86efac', padding: '0.875rem 1rem', borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <User size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }} />
                <input
                  type="text" placeholder="Full Name"
                  value={name} onChange={e => setName(e.target.value)} required
                  style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'var(--bg-tertiary)', border: '1.5px solid var(--surface-border-strong)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--surface-border-strong)'}
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }} />
              <input
                type="email" placeholder="Email Address"
                value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'var(--bg-tertiary)', border: '1.5px solid var(--surface-border-strong)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--surface-border-strong)'}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'} placeholder="Password"
                value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', padding: '0.875rem 3rem 0.875rem 2.75rem', background: 'var(--bg-tertiary)', border: '1.5px solid var(--surface-border-strong)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--surface-border-strong)'}
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem' }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {isLogin && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.25rem' }}>
                <button
                  type="button" onClick={() => setForgotPasswordStep(1)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '0.95rem',
                background: loading ? 'var(--primary-hover)' : 'var(--primary)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '0.975rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'var(--transition-fast)', marginTop: '0.5rem',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(0,168,132,0.35)',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => switchTab(!isLogin)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', marginLeft: '0.4rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
