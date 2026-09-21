"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, MessageCircle, Info, X, Users } from "lucide-react";

export function Discover({ currentUser, onMessageUser }: { currentUser: any, onMessageUser: (user: any) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .neq('id', currentUser.id)
        .neq('email', 'samstacktechs@gmail.com')
        .order('is_online', { ascending: false });

      if (data) setUsers(data);
      setLoading(false);
    };

    fetchUsers();

    // Real-time online presence
    const channel = supabase.channel('discover_presence')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id]);

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineUsers = filteredUsers.filter(u => u.is_online);
  const offlineUsers = filteredUsers.filter(u => !u.is_online);

  function UserAvatar({ user, size = 70 }: { user: any; size?: number }) {
    const hue = (user.name || 'U').charCodeAt(0) * 15 % 360;
    if (user.avatar_url) {
      return <img src={user.avatar_url} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `hsl(${hue}, 55%, 30%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: size * 0.3, color: '#fff',
      }}>
        {(user.name || user.email || 'U').charAt(0).toUpperCase()}
      </div>
    );
  }

  function PeopleCard({ user }: { user: any }) {
    return (
      <div
        className="people-card"
        onClick={() => setSelectedUser(user)}
        style={{ minWidth: 160, maxWidth: 180 }}
      >
        <div style={{ position: 'relative' }}>
          <UserAvatar user={user} size={72} />
          {user.is_online && (
            <div style={{
              position: 'absolute', bottom: 3, right: 3,
              width: 14, height: 14, background: 'var(--success)',
              borderRadius: '50%', border: '2.5px solid var(--bg-secondary)',
            }} />
          )}
        </div>
        <div style={{ width: '100%' }}>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
            {user.name}
          </p>
          {user.username && (
            <p style={{ fontSize: '0.75rem', color: 'var(--primary)', textAlign: 'center' }}>@{user.username}</p>
          )}
          <p style={{ fontSize: '0.72rem', color: user.is_online ? 'var(--success)' : 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>
            {user.is_online ? '● Online' : 'Offline'}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={e => { e.stopPropagation(); onMessageUser(user); }}
          style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
        >
          <MessageCircle size={14} />
          Message
        </button>
      </div>
    );
  }

  function UserListItem({ user }: { user: any }) {
    const hue = (user.name || 'U').charCodeAt(0) * 15 % 360;
    return (
      <div
        onClick={() => setSelectedUser(user)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '0.75rem 1rem', cursor: 'pointer',
          borderRadius: 'var(--radius-md)',
          transition: 'background 0.13s ease',
          borderBottom: '1px solid var(--surface-border)',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <UserAvatar user={user} size={46} />
          {user.is_online && (
            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, background: 'var(--success)', borderRadius: '50%', border: '2.5px solid var(--bg-primary)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.bio || 'No bio yet'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {user.is_online && (
            <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>Online</span>
          )}
          <button
            className="btn btn-ghost"
            onClick={e => { e.stopPropagation(); onMessageUser(user); }}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--surface-border-strong)' }}
          >
            <MessageCircle size={14} />
            Message
          </button>
        </div>
      </div>
    );
  }

  // Skeleton card
  function SkeletonCard() {
    return (
      <div style={{ minWidth: 160, maxWidth: 180, background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <div className="skeleton" style={{ width: 72, height: 72, borderRadius: '50%' }} />
        <div className="skeleton" style={{ width: '70%', height: 13, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: '50%', height: 11, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: '100%', height: 32, borderRadius: 99 }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: '1.5rem 2rem 0.75rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.2 }}>Discover People</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {loading ? 'Loading...' : `${users.length} people available`}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', maxWidth: '440px' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by name or username..."
            className="input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', borderRadius: '99px', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 2rem 3rem', maxWidth: '1000px', margin: '0 auto', width: '100%', flex: 1 }}>

        {/* Online Now — horizontal scroll row */}
        {(loading || onlineUsers.length > 0) && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />
              <h2 style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Online Now {!loading && `(${onlineUsers.length})`}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.75rem', paddingLeft: '2px', paddingRight: '2px' }}>
              {loading ? (
                [1,2,3,4].map(i => <SkeletonCard key={i} />)
              ) : onlineUsers.length > 0 ? (
                onlineUsers.map(user => <PeopleCard key={user.id} user={user} />)
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem 0' }}>No one is online right now.</p>
              )}
            </div>
          </div>
        )}

        {/* All People — list view */}
        <div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {searchQuery ? `Results for "${searchQuery}"` : `All People ${!loading ? `(${filteredUsers.length})` : ''}`}
          </h2>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-border)' }}>
                  <div className="skeleton" style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div className="skeleton" style={{ width: `${40 + i * 8}%`, height: 13, borderRadius: 6 }} />
                    <div className="skeleton" style={{ width: `${25 + i * 5}%`, height: 11, borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <Search size={44} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>No users found</p>
              <p style={{ fontSize: '0.82rem' }}>Try a different search term</p>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              {/* Online first in list */}
              {offlineUsers.map(user => <UserListItem key={user.id} user={user} />)}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', maxWidth: 420 }}>

            {/* Modal top gradient */}
            <div style={{
              height: 120, background: `linear-gradient(135deg, hsl(${(selectedUser.name||'U').charCodeAt(0)*15%360}, 50%, 20%), hsl(${(selectedUser.name||'U').charCodeAt(0)*15%360+40}, 50%, 15%))`,
              position: 'relative', flexShrink: 0,
            }}>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
              >
                <X size={16} />
              </button>
              {/* Avatar overlapping */}
              <div style={{ position: 'absolute', bottom: -44, left: '50%', transform: 'translateX(-50%)' }}>
                <div style={{ position: 'relative' }}>
                  <UserAvatar user={selectedUser} size={88} />
                  {selectedUser.is_online && (
                    <div style={{ position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, background: 'var(--success)', borderRadius: '50%', border: '3px solid var(--bg-tertiary)' }} />
                  )}
                </div>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ padding: '3.5rem 2rem 2rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.2rem' }}>{selectedUser.name}</h2>
              {selectedUser.username && (
                <p style={{ color: 'var(--primary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>@{selectedUser.username}</p>
              )}
              <p style={{ fontSize: '0.8rem', color: selectedUser.is_online ? 'var(--success)' : 'var(--text-muted)', marginBottom: '1.5rem', fontWeight: selectedUser.is_online ? 600 : 400 }}>
                {selectedUser.is_online ? '● Online now' : 'Offline'}
              </p>

              {/* Bio */}
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>About</p>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>{selectedUser.bio || 'Hey there! I am using Sam Chat.'}</p>
              </div>

              {/* Email */}
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '1.75rem', border: '1px solid var(--surface-border)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Email</p>
                <p style={{ fontSize: '0.9rem' }}>{selectedUser.email}</p>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.875rem', fontSize: '0.95rem', borderRadius: 'var(--radius-full)', gap: '0.5rem' }}
                onClick={() => { onMessageUser(selectedUser); setSelectedUser(null); }}
              >
                <MessageCircle size={18} />
                Message {selectedUser.name?.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
