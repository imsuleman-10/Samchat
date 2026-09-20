"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Auth } from "@/components/Auth";
import { Chat } from "@/components/Chat";
import { AdminDashboard } from "@/components/AdminDashboard";
import { SidebarNav } from "@/components/SidebarNav";
import { Discover } from "@/components/Discover";
import { MyProfile } from "@/components/MyProfile";

type View = 'discover' | 'inbox' | 'profile';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('discover');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);

  // Detect mobile and respond to resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    if (window.innerWidth < 768) setSidebarOpen(false);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setCurrentView('discover'); // Reset view on logout
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch complete user profile for the logged in user
  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        if (data) {
          setCurrentUser(data);
        } else {
          // Profile missing — auto-create a minimal one so the user isn't logged out.
          // This handles admin accounts and any edge case where auth exists but profile doesn't.
          const fallbackUsername = (session.user.email?.split('@')[0] || 'user') + Math.floor(Math.random() * 1000);
          const { data: newProfile } = await supabase.from('users').upsert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            username: fallbackUsername,
            bio: 'Hey there! I am using Sam Chat.',
            is_online: true,
            last_seen: new Date().toISOString(),
          }).select().single();
          if (newProfile) setCurrentUser(newProfile);
        }
      };
      fetchProfile();

      // Subscribe to my own profile changes
      const channel = supabase.channel(`my_profile_${session.user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${session.user.id}` }, (payload) => {
          setCurrentUser((prev: any) => ({ ...prev, ...payload.new }));
        })
        .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    }
  }, [session?.user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            {/* Spinning ring */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: 'var(--primary)',
              borderRightColor: 'var(--primary)',
              animation: 'spin 1s linear infinite',
            }} />
            {/* Logo in center */}
            <div style={{ position: 'absolute', inset: '8px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="Sam Chat" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Loading Sam Chat...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const isAdmin = session.user.email === 'samstacktechs@gmail.com';

  if (isAdmin) {
    return <AdminDashboard />;
  }

  const [pendingChatUser, setPendingChatUser] = useState<any>(null);

  // --- Main Layout ---
  return (
    <main className="mobile-main-layout" style={{ height: '100%', display: 'flex', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* 1. Main Navigation Sidebar — on mobile it is a fixed top bar */}
      <div
        className={(isMobile && !isChatActive) ? 'mobile-top-nav' : ''}
        style={isMobile ? { display: isChatActive ? 'none' : 'flex' } : {
          width: sidebarOpen ? '240px' : '84px',
          minWidth: sidebarOpen ? '240px' : '84px',
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <SidebarNav
          currentView={currentView}
          setView={setCurrentView}
          currentUser={currentUser || session.user}
          unreadTotal={0}
          onToggle={() => setSidebarOpen(o => !o)}
          isOpen={sidebarOpen}
          isMobile={isMobile}
        />
      </div>

      {/* 2. Main Content Area — on mobile leaves room for the fixed top bar */}
      <div className={(isMobile && !isChatActive) ? "mobile-main-content" : ""} style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', width: '100%' }}>
        
        {/* Discover View */}
        {currentView === 'discover' && (
          <div className="animate-fade" style={{ width: '100%', height: '100%', display: 'flex' }}>
            <Discover 
              currentUser={session.user} 
              onMessageUser={(user) => { setPendingChatUser(user); setCurrentView('inbox'); }} 
            />
          </div>
        )}

        {/* Profile View */}
        {currentView === 'profile' && (
          <div className="animate-fade" style={{ width: '100%', height: '100%', display: 'flex' }}>
            <MyProfile 
              user={currentUser || session.user} 
              onProfileUpdated={updated => setCurrentUser(updated)} 
            />
          </div>
        )}

        {/* Inbox View (Chat Component) */}
        {/* Keep it always rendered but hidden if not active to preserve chat state (avoids re-fetching) */}
        <div 
          className={currentView === 'inbox' ? 'animate-fade' : ''} 
          style={{ 
            width: '100%', 
            height: '100%', 
            display: currentView === 'inbox' ? 'flex' : 'none' 
          }}
        >
          <Chat 
            session={session} 
            onChatActiveChange={setIsChatActive}
            initialSelectedUser={pendingChatUser}
            onInitialUserConsumed={() => setPendingChatUser(null)}
          />
        </div>

      </div>
    </main>
  );
}
