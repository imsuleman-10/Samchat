"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, MessageCircle, Info, X } from "lucide-react";

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
        .order('created_at', { ascending: false });
      
      if (data) setUsers(data);
      setLoading(false);
    };
    
    fetchUsers();
  }, [currentUser.id]);

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflowY: 'auto', position: 'relative' }}>
      
      {/* Header & Search */}
      <div className="mobile-p-4" style={{ padding: '2rem 2rem 1rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>Discover People</h1>
        <div className="mobile-w-full" style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name or username..." 
            className="input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', borderRadius: '99px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--surface-border)' }}
          />
        </div>
      </div>

      {/* User Grid */}
      <div className="mobile-p-4" style={{ padding: '1rem 2rem 3rem', maxWidth: '1000px', margin: '0 auto', width: '100%', flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Search size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            No users found matching your search.
          </div>
        ) : (
          <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {filteredUsers.map(user => (
              <div 
                key={user.id} 
                onClick={() => setSelectedUser(user)}
                className="glass"
                style={{ 
                  borderRadius: 'var(--radius-xl)', 
                  padding: '1.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  textAlign: 'center'
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
              >
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `hsl(${(user.name || 'U').charCodeAt(0) * 15 % 360}, 60%, 35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 600 }}>
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {user.is_online && <div className="online-dot" style={{ width: '14px', height: '14px', bottom: '4px', right: '4px', border: '3px solid var(--surface)' }} />}
                </div>
                
                <h3 style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</h3>
                {user.username && <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>@{user.username}</p>}
                
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4rem' }}>
                  {user.bio || 'No bio'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '2.5rem' }}>
            <button onClick={() => setSelectedUser(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt={selectedUser.name} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-border)' }} />
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `hsl(${(selectedUser.name || 'U').charCodeAt(0) * 15 % 360}, 60%, 35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700, border: '4px solid var(--surface-border)' }}>
                  {(selectedUser.name || selectedUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {selectedUser.is_online && <div className="online-dot" style={{ width: '18px', height: '18px', bottom: '8px', right: '8px', border: '4px solid var(--bg-secondary)' }} />}
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{selectedUser.name}</h2>
            {selectedUser.username && <p style={{ color: 'var(--primary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>@{selectedUser.username}</p>}
            
            <p style={{ color: selectedUser.is_online ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {selectedUser.is_online ? 'Online now' : 'Offline'}
            </p>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', textAlign: 'left', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                <Info size={16} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>About</span>
              </div>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{selectedUser.bio || 'Hey there! I am using Sam Chat.'}</p>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
              onClick={() => {
                onMessageUser(selectedUser);
                setSelectedUser(null);
              }}
            >
              <MessageCircle size={20} /> Message {selectedUser.name?.split(' ')[0]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
