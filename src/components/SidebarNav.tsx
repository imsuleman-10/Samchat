"use client";

import { Compass, MessageSquare, User as UserIcon, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

type View = 'discover' | 'inbox' | 'profile';

export function SidebarNav({ currentView, setView, currentUser, unreadTotal = 0, onToggle, isOpen = true, isMobile = false }: { currentView: View, setView: (v: View) => void, currentUser: any, unreadTotal?: number, onToggle?: () => void, isOpen?: boolean, isMobile?: boolean }) {

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
          flexDirection: (isOpen && !isMobile) ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: (isOpen && !isMobile) ? 'flex-start' : 'center',
          gap: (isOpen && !isMobile) ? '1rem' : '0.35rem',
          padding: isMobile ? '0.4rem 0' : (isOpen ? '0.85rem 1rem' : '0.7rem 0.5rem'),
          width: isMobile ? '100%' : '100%',
          flex: isMobile ? 1 : 'none',
          border: isMobile ? 'none' : `1px solid ${isActive ? 'rgba(91,142,240,0.2)' : 'transparent'}`,
          borderRadius: isMobile ? '0' : '14px',
          color: isActive ? 'var(--primary)' : 'var(--text-muted)',
          background: isMobile ? 'transparent' : (isActive ? 'var(--primary-light)' : 'transparent'),
          position: 'relative',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s',
          cursor: 'pointer',
          fontFamily: 'inherit',
          overflow: 'hidden',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => { if (!isActive && !isMobile) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { if (!isActive && !isMobile) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        onMouseDown={e => { if (isMobile) (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)'; }}
        onMouseUp={e => { if (isMobile) (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        onTouchStart={e => { if (isMobile) (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)'; }}
        onTouchEnd={e => { if (isMobile) (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      >
        <div style={{ transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transform: (isActive && isMobile) ? 'translateY(-2px)' : 'none', flexShrink: 0, ...(isActive && { filter: 'drop-shadow(0 0 8px rgba(91,142,240,0.5))' }) }}>
          {icon}
        </div>
        {(!isMobile) && (
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
        )}
        {badge > 0 && (
          <span className="badge" style={{
            position: 'absolute',
            top: (isOpen && !isMobile) ? '50%' : '4px',
            right: (isOpen && !isMobile) ? '1rem' : '50%',
            transform: (isOpen && !isMobile) ? 'translateY(-50%)' : 'translateX(14px)',
            border: isMobile ? 'none' : '2px solid var(--bg-secondary)',
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
      background: isMobile ? 'transparent' : 'var(--bg-secondary)',
      borderRight: isMobile ? 'none' : '1px solid var(--surface-border)',
      display: 'flex',
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-around' : 'flex-start',
      padding: isMobile ? '0 0.5rem' : (isOpen ? '1.25rem 1rem' : '1.25rem 0.5rem'),
      gap: isMobile ? '0.25rem' : '0.5rem',
      zIndex: 20,
      transition: 'padding 0.3s ease',
    }}>

      {/* Logo Area — click entire area to toggle sidebar */}
      {!isMobile && (
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
      )}

      {/* Nav Items */}
      <div style={{ flex: isMobile ? 1 : 1, display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: isMobile ? '0' : '0.3rem', width: '100%', justifyContent: isMobile ? 'space-around' : 'flex-start' }}>
        <NavItem id="discover" icon={<Compass size={26} strokeWidth={currentView==='discover' ? 2.5 : 2} />} label="Discover" />
        <NavItem id="inbox"    icon={<MessageSquare size={26} strokeWidth={currentView==='inbox' ? 2.5 : 2} />} label="Inbox" badge={unreadTotal} />
        <NavItem id="profile"  icon={<UserIcon size={26} strokeWidth={currentView==='profile' ? 2.5 : 2} />} label="Profile" />
      </div>

      {/* Separator */}
      {!isMobile && <div style={{ width: isOpen ? '100%' : '40px', height: '1px', background: 'var(--surface-border)', margin: '0.5rem 0', transition: 'width 0.3s ease' }} />}

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        title="Sign Out"
        style={{
          display: 'flex',
          flexDirection: (isOpen && !isMobile) ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: (isOpen && !isMobile) ? 'flex-start' : 'center',
          gap: (isOpen && !isMobile) ? '1rem' : '0.35rem',
          padding: isMobile ? '0.4rem 0' : (isOpen ? '0.85rem 1rem' : '0.7rem 0.5rem'),
          width: isMobile ? '100%' : '100%',
          flex: isMobile ? 1 : 'none',
          border: '1px solid transparent',
          borderRadius: isMobile ? '0' : '14px',
          color: 'var(--text-muted)',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s',
          overflow: 'hidden',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => { if (!isMobile) { (e.currentTarget as HTMLElement).style.color = 'var(--error)'; (e.currentTarget as HTMLElement).style.background = 'var(--error-light)'; } }}
        onMouseLeave={e => { if (!isMobile) { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
        onMouseDown={e => { if (isMobile) (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)'; }}
        onMouseUp={e => { if (isMobile) (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        onTouchStart={e => { if (isMobile) (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)'; }}
        onTouchEnd={e => { if (isMobile) (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      >
        <LogOut size={26} strokeWidth={2} style={{ flexShrink: 0 }} />
        {(!isMobile) && (
          <span style={{ 
            fontSize: isOpen ? '0.9rem' : '0.68rem', 
            fontWeight: isOpen ? 600 : 500, 
            letterSpacing: isOpen ? 'normal' : '0.02em', 
            textTransform: isOpen ? 'none' : 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            Logout
          </span>
        )}
      </button>
    </div>
  );
}
