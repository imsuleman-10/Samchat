"use client";

import { Compass, MessageSquare, User as UserIcon, LogOut, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";

type View = 'discover' | 'inbox' | 'profile';

function Avatar({ user, size = 'sm' }: { user: any; size?: 'sm' | 'md' }) {
  const initials = (user?.name || user?.email || 'U').charAt(0).toUpperCase();
  const hue = (user?.name || 'U').charCodeAt(0) * 15 % 360;
  const sz = size === 'sm' ? 32 : 40;
  const fs = size === 'sm' ? '0.75rem' : '0.9rem';
  return user?.avatar_url ? (
    <img
      src={user.avatar_url}
      alt={user.name || 'Me'}
      style={{ width: sz, height: sz, minWidth: sz, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 0 2px var(--primary)' }}
    />
  ) : (
    <div style={{
      width: sz, height: sz, minWidth: sz, borderRadius: '50%',
      background: `hsl(${hue}, 55%, 30%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fs, fontWeight: 700, color: '#fff',
      boxShadow: '0 0 0 2px var(--primary)',
    }}>
      {initials}
    </div>
  );
}

export function SidebarNav({
  currentView,
  setView,
  currentUser,
  unreadTotal = 0,
  isMobile = false
}: {
  currentView: View;
  setView: (v: View) => void;
  currentUser: any;
  unreadTotal?: number;
  onToggle?: () => void;
  isOpen?: boolean;
  isMobile?: boolean;
}) {

  const handleSignOut = async () => {
    await supabase.from('users').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', currentUser?.id);
    await supabase.auth.signOut();
  };

  // ---- MOBILE: Bottom tab bar ----
  if (isMobile) {
    const tabs: { id: View; icon: React.ReactNode; label: string; badge?: number }[] = [
      { id: 'discover', icon: <Compass size={22} />, label: 'Discover' },
      { id: 'inbox',    icon: <MessageSquare size={22} />, label: 'Inbox', badge: unreadTotal },
      { id: 'profile',  icon: <UserIcon size={22} />, label: 'Profile' },
    ];

    return (
      <div style={{
        width: '100%', height: '100%',
        background: 'transparent',
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-around',
        padding: '0 0.5rem',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,168,132,0.4)' }}>
            <img src="/logo.png" alt="Sam Chat" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Sam Chat
          </span>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {tabs.map(tab => {
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '2px', padding: '0.4rem 0.6rem',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative', WebkitTapHighlightColor: 'transparent',
                  transition: 'color 0.15s ease',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ filter: isActive ? 'drop-shadow(0 0 6px rgba(0,168,132,0.5))' : 'none', transition: 'filter 0.2s' }}>
                  {tab.icon}
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {tab.label}
                </span>
                {(tab.badge ?? 0) > 0 && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '2px',
                    background: 'var(--error)', color: 'white',
                    fontSize: '0.58rem', fontWeight: 700,
                    borderRadius: '99px', minWidth: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                  }}>
                    {(tab.badge ?? 0) > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- DESKTOP: Narrow icon strip (WhatsApp Web style) ----
  const navItems: { id: View; icon: (active: boolean) => React.ReactNode; label: string; badge?: number }[] = [
    {
      id: 'discover',
      icon: (a) => <Compass size={24} strokeWidth={a ? 2.5 : 1.75} />,
      label: 'Discover'
    },
    {
      id: 'inbox',
      icon: (a) => <MessageSquare size={24} strokeWidth={a ? 2.5 : 1.75} />,
      label: 'Inbox',
      badge: unreadTotal,
    },
    {
      id: 'profile',
      icon: (a) => <UserIcon size={24} strokeWidth={a ? 2.5 : 1.75} />,
      label: 'My Profile'
    },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--surface-border)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '1rem 0',
      gap: '0.25rem',
      zIndex: 20,
    }}>

      {/* Logo */}
      <div style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
        <div style={{
          width: 42, height: 42, borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,168,132,0.35)',
        }}>
          <img src="/logo.png" alt="Sam Chat" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem', width: '100%', padding: '0 0.5rem' }}>
        {navItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <div key={item.id} className="tooltip-wrapper" style={{ position: 'relative', width: '100%' }}>
              <button
                onClick={() => setView(item.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '3px', padding: '0.65rem 0.5rem',
                  width: '100%',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {/* Active left bar */}
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: '3px', background: 'var(--primary)',
                    borderRadius: '0 3px 3px 0',
                  }} />
                )}
                <div style={{
                  filter: isActive ? 'drop-shadow(0 0 8px rgba(0,168,132,0.5))' : 'none',
                  transition: 'filter 0.2s',
                }}>
                  {item.icon(isActive)}
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {item.label}
                </span>
                {(item.badge ?? 0) > 0 && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '6px',
                    background: 'var(--error)', color: 'white',
                    fontSize: '0.6rem', fontWeight: 700,
                    borderRadius: '99px', minWidth: '17px', height: '17px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                    border: '2px solid var(--bg-secondary)',
                  }}>
                    {(item.badge ?? 0) > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
              <div className="tooltip">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Bottom section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', width: '100%', padding: '0 0.5rem' }}>

        {/* Separator */}
        <div style={{ width: '36px', height: '1px', background: 'var(--surface-border)', margin: '0.5rem auto' }} />

        {/* Settings placeholder */}
        <div className="tooltip-wrapper" style={{ position: 'relative', width: '100%' }}>
          <button
            title="Settings"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '3px', padding: '0.65rem 0.5rem', width: '100%',
              border: 'none', cursor: 'default', fontFamily: 'inherit',
              background: 'transparent', color: 'var(--text-muted)',
              borderRadius: 'var(--radius-md)', opacity: 0.5,
            }}
          >
            <Settings size={22} strokeWidth={1.75} />
            <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Settings
            </span>
          </button>
          <div className="tooltip">Settings (Coming soon)</div>
        </div>

        {/* Logout */}
        <div className="tooltip-wrapper" style={{ position: 'relative', width: '100%' }}>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '3px', padding: '0.65rem 0.5rem', width: '100%',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: 'transparent', color: 'var(--text-muted)',
              borderRadius: 'var(--radius-md)', transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--error-light)';
              (e.currentTarget as HTMLElement).style.color = 'var(--error)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
            }}
          >
            <LogOut size={22} strokeWidth={1.75} />
            <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Logout
            </span>
          </button>
          <div className="tooltip">Sign Out</div>
        </div>

        {/* User Avatar (bottom) */}
        <div className="tooltip-wrapper" style={{ marginTop: '0.5rem', cursor: 'pointer', position: 'relative' }}
          onClick={() => setView('profile')}>
          <Avatar user={currentUser} size="sm" />
          <div className="tooltip">My Profile</div>
        </div>

      </div>
    </div>
  );
}
