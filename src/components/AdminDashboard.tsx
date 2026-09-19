"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users, MessageSquare, Trash2, LogOut, BarChart2, Send, RefreshCw
} from "lucide-react";

const ADMIN_EMAIL = 'samstacktechs@gmail.com';

export function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalMessages: 0, onlineUsers: 0 });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'stats'>('stats');

  const fetchData = async () => {
    setLoading(true);
    const { data: usersData } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });

    if (usersData) {
      const nonAdmins = usersData.filter(u => u.email !== ADMIN_EMAIL);
      setUsers(nonAdmins);
      setStats({
        totalUsers: nonAdmins.length,
        totalMessages: msgCount || 0,
        onlineUsers: nonAdmins.filter(u => u.is_online).length,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure? This will permanently delete this user.')) return;
    setDeleting(userId);
    try {
      const res = await fetch('/api/admin/deleteUser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
      const data = await res.json();
      if (data.success) setUsers(users.filter(u => u.id !== userId));
      else alert('Delete failed: ' + data.error);
    } finally { setDeleting(null); }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.trim()) return;
    setBroadcasting(true);
    try {
      // Get admin user ID
      const { data: adminUser } = await supabase.from('users').select('id').eq('email', ADMIN_EMAIL).single();
      if (!adminUser) { alert('Admin profile not found.'); return; }

      let successCount = 0;
      let errorCount = 0;

      for (const u of users) {
        const { error } = await supabase.from('messages').insert({
          sender_id: adminUser.id,
          receiver_id: u.id,
          content: `📢 Admin Broadcast: ${broadcast}`,
          type: 'text',
          is_read: false,
          deleted_for_everyone: false,
          reactions: {},
        });
        if (error) { console.error('Broadcast error for user', u.email, error.message); errorCount++; }
        else successCount++;
      }

      if (errorCount === 0) {
        alert(`✅ Broadcast sent to ${successCount} users!`);
      } else {
        alert(`⚠️ Sent to ${successCount} users. Failed for ${errorCount} users. Check console.`);
      }
      setBroadcast('');
    } catch (err: any) {
      alert('Broadcast failed: ' + err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  const handleDeleteAdmin = async () => {
    if (!confirm('WARNING: You are about to delete the Admin account. This is irreversible. Continue?')) return;
    try {
      const { data: adminUser } = await supabase.from('users').select('id').eq('email', ADMIN_EMAIL).single();
      if (!adminUser) return;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const res = await fetch('/api/user/deleteAccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: adminUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        await supabase.auth.signOut();
        window.location.reload();
      } else alert('Failed to delete admin: ' + data.error);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const StatCard = ({ label, value, icon, color }: any) => (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</p>
        <p style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div style={{ width: '220px', borderRight: '1px solid var(--surface-border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', padding: '1.5rem 0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem', marginBottom: '2rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
            <img src="/logo.png" alt="Sam Chat" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem' }}>Sam Chat</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>Admin Panel</p>
          </div>
        </div>

        {[
          { id: 'stats', icon: <BarChart2 size={18} />, label: 'Dashboard' },
          { id: 'users', icon: <Users size={18} />, label: 'Users' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', border: 'none', background: activeTab === item.id ? 'var(--primary-light)' : 'transparent', color: activeTab === item.id ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, fontSize: '0.9rem', marginBottom: '4px', width: '100%', textAlign: 'left', transition: 'var(--transition-fast)' }}>
            {item.icon} {item.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <button onClick={handleDeleteAdmin} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, fontSize: '0.9rem', width: '100%' }}>
          <Trash2 size={18} /> Delete Account
        </button>
        <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, fontSize: '0.9rem', width: '100%' }}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        {activeTab === 'stats' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
              <button onClick={fetchData} className="btn btn-ghost" style={{ gap: '0.5rem', border: '1px solid var(--surface-border)' }}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard label="Total Users" value={stats.totalUsers} icon={<Users size={24} />} color="var(--primary)" />
              <StatCard label="Online Now" value={stats.onlineUsers} icon={<MessageSquare size={24} />} color="var(--success)" />
              <StatCard label="Total Messages" value={stats.totalMessages} icon={<BarChart2 size={24} />} color="var(--warning)" />
            </div>

            {/* Broadcast */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>📢 Broadcast Message</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Send a message to all users at once.</p>
              <form onSubmit={handleBroadcast} style={{ display: 'flex', gap: '0.75rem' }}>
                <input type="text" className="input" value={broadcast} onChange={e => setBroadcast(e.target.value)} placeholder="Type your broadcast message..." />
                <button type="submit" className="btn btn-primary" disabled={broadcasting || !broadcast.trim()}>
                  <Send size={16} /> {broadcasting ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Manage Users</h1>
              <button onClick={fetchData} className="btn btn-ghost" style={{ gap: '0.5rem', border: '1px solid var(--surface-border)' }}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading users...</p>
            ) : (
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      {['User', 'Username', 'Status', 'Joined', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `hsl(${(user.name || '').charCodeAt(0) * 15 % 360}, 60%, 35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                              {(user.name || user.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{user.name || 'N/A'}</p>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {user.username ? `@${user.username}` : '—'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '99px', fontSize: '0.78rem', background: user.is_online ? 'var(--success-light)' : 'var(--bg-tertiary)', color: user.is_online ? 'var(--success)' : 'var(--text-muted)' }}>
                            ● {user.is_online ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <button onClick={() => handleDeleteUser(user.id)} disabled={deleting === user.id} className="btn btn-danger" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                            <Trash2 size={14} /> {deleting === user.id ? '...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
