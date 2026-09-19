"use client";

import { Compass, MessageSquare, User as UserIcon, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

type View = 'discover' | 'inbox' | 'profile';

export function SidebarNav({ currentView, setView, currentUser, unreadTotal = 0, onToggle, isOpen = true }: { currentView: View, setView: (v: View) => void, currentUser: any, unreadTotal?: number, onToggle?: () => void, isOpen?: boolean }) {

  const handleSignOut = async () => {
    await supabase.from('users').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', currentUser.id);
    await supabase.auth.signOut();
  };

  const NavItem = ({ id, icon, label, badge = 0 }: { id: View, icon: any, label: string, badge?: number }) => {
    const isActive = currentView === id;
    return (
      <button
        onClick={() => setView(id)}
        style={{
          display: 'flex',
          flexDirection: isOpen ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isOpen ? 'flex-start' : 'center',
          gap: isOpen ? '1rem' : '0.35rem',
          padding: isOpen ? '0.85rem 1rem' : '0.7rem 0.5rem',
          width: '100%',
          border: `1px solid ${isActive ? 'rgba(91,142,240,0.2)' : 'transparent'}`,
          borderRadius: '14px',
          color: isActive ? 'var(--primary)' : 'var(--text-muted)',
          background: isActive ? 'var(--primary-light)' : 'transparent',
          position: 'relative',
          transition: 'var(--transition)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          overflow: 'hidden',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <div style={{ transition: 'transform 0.2s', flexShrink: 0, ...(isActive && { filter: 'drop-shadow(0 0 6px var(--primary))' }) }}>
          {icon}
        </div>
        <span style={{
          fontSize: isOpen ? '0.9rem' : '0.68rem',
          fontWeight: isActive ? 700 : 500,
          letterSpacing: isOpen ? 'normal' : '0.02em',
          textTransform: isOpen ? 'none' : 'uppercase',
          whiteSpace: 'nowrap',
          opacity: 1,
          transition: 'opacity 0.2s ease',
        }}>
          {label}
        </span>
        {badge > 0 && (
          <span className="badge" style={{
            position: 'absolute',
            top: isOpen ? '50%' : '6px',
            right: isOpen ? '1rem' : '6px',
            transform: isOpen ? 'translateY(-50%)' : 'none',
            border: '2px solid var(--bg-secondary)',
            background: 'var(--error)',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '999px',
            minWidth: '18px',
            textAlign: 'center',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--surface-border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isOpen ? '1.25rem 1rem' : '1.25rem 0.5rem',
      gap: '0.5rem',
      zIndex: 20,
      transition: 'padding 0.3s ease',
    }}>

      {/* Logo Area — click entire area to toggle sidebar */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'flex-start' : 'center',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          cursor: onToggle ? 'pointer' : 'default',
          padding: isOpen ? '0.5rem' : '0.25rem',
          borderRadius: '16px',
          transition: 'all 0.2s',
          overflow: 'hidden',
        }}
      >
        <div style={{
          width: '44px',
          height: '44px',
          minWidth: '44px',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(91,142,240,0.35)',
          flexShrink: 0,
        }}>
          <img src="/logo.png" alt="Sam Chat" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        
        {isOpen && (
          <span style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.02em',
          }}>
            Sam Chat
          </span>
        )}
      </button>

      {/* Nav Items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%' }}>
        <NavItem id="discover" icon={<Compass size={24} strokeWidth={2} />} label="Discover" />
        <NavItem id="inbox"    icon={<MessageSquare size={24} strokeWidth={2} />} label="Inbox" badge={unreadTotal} />
        <NavItem id="profile"  icon={<UserIcon size={24} strokeWidth={2} />} label="Profile" />
      </div>

      {/* Separator */}
      <div style={{ width: isOpen ? '100%' : '40px', height: '1px', background: 'var(--surface-border)', margin: '0.5rem 0', transition: 'width 0.3s ease' }} />

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        title="Sign Out"
        style={{
          display: 'flex',
          flexDirection: isOpen ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isOpen ? 'flex-start' : 'center',
          gap: isOpen ? '1rem' : '0.35rem',
          padding: isOpen ? '0.85rem 1rem' : '0.7rem 0.5rem',
          width: '100%',
          border: '1px solid transparent',
          borderRadius: '14px',
          color: 'var(--text-muted)',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'var(--transition)',
          overflow: 'hidden',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--error)'; (e.currentTarget as HTMLElement).style.background = 'var(--error-light)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <LogOut size={22} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span style={{ 
          fontSize: isOpen ? '0.9rem' : '0.68rem', 
          fontWeight: isOpen ? 600 : 500, 
          letterSpacing: isOpen ? 'normal' : '0.02em', 
          textTransform: isOpen ? 'none' : 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Logout
        </span>
      </button>
    </div>
  );
}
