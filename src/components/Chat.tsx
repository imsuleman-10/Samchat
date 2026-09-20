"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  LogOut, Send, Paperclip, Mic, MicOff, Download, X, Search,
  Check, CheckCheck, Reply, Trash2, Smile, Image as ImageIcon,
  Music, MoreVertical, Phone, Video, Info, ChevronLeft,
  MessageSquare, Users, Settings
} from "lucide-react";
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import { AudioPlayer } from './AudioPlayer';

const ADMIN_EMAIL = 'samstacktechs@gmail.com';
const EMOJIS = ['😀','😂','❤️','👍','👎','😮','😢','😡','🎉','🔥','👏','🙏','😍','🤔','💪','✅'];

// ---- Helpers ----
function Avatar({ user, size = 'md', showOnline = false }: { user: any; size?: 'sm' | 'md' | 'lg' | 'xl'; showOnline?: boolean }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {user?.avatar_url ? (
        <img src={user.avatar_url} alt={user.name} className={`avatar avatar-${size}`} />
      ) : (
        <div className={`avatar avatar-${size}`} style={{ background: `hsl(${(user?.name || 'U').charCodeAt(0) * 15 % 360}, 60%, 35%)` }}>
          {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
        </div>
      )}
      {showOnline && user?.is_online && <div className="online-dot" />}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 14px', background: 'var(--surface)', borderRadius: '14px', borderBottomLeftRadius: '4px', width: 'fit-content', border: '1px solid var(--surface-border)' }}>
      {[0,1,2].map(i => <span key={i} className="typing-dot" style={{ animationDelay: `${i * -0.16}s` }} />)}
    </div>
  );
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatLastSeen(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `today at ${formatTime(ts)}`;
  return d.toLocaleDateString();
}

export function Chat({ session, onChatActiveChange }: { session: any, onChatActiveChange?: (active: boolean) => void }) {
  const currentUser = session.user;
  const isAdmin = currentUser.email === ADMIN_EMAIL;

  // ---- State ----
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);

  // Media
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // UI state
  const [replyTo, setReplyTo] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: any } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    if (onChatActiveChange) {
      onChatActiveChange(isMobile && mobileShowChat);
    }
  }, [isMobile, mobileShowChat, onChatActiveChange]);

  // Crop State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const typingChannel = useRef<any>(null);
  const msgChannel = useRef<any>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 80);
  }, []);

  // ---- Fetch my profile ----
  useEffect(() => {
    const fetchMyProfile = async () => {
      const { data } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
      if (data) { setMyProfile(data); }
      else {
        const username = (currentUser.email || '').split('@')[0] + Math.floor(Math.random() * 999);
        const newProfile = { id: currentUser.id, email: currentUser.email, name: currentUser.user_metadata?.full_name || 'User', username, bio: 'Hey there! I am using Sam Chat.', is_online: true, last_seen: new Date().toISOString() };
        await supabase.from('users').upsert(newProfile);
        setMyProfile(newProfile);
      }
      // Mark online
      await supabase.from('users').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', currentUser.id);
    };
    fetchMyProfile();

    // Mark offline on unload
    const handleUnload = () => {
      navigator.sendBeacon('/api/presence', JSON.stringify({ userId: currentUser.id, isOnline: false }));
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentUser]);

  // ---- Fetch users ----
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('*').neq('id', currentUser.id).neq('email', ADMIN_EMAIL).order('is_online', { ascending: false });
      if (data) { setUsers(data); setFilteredUsers(data); }
      setLoadingUsers(false);
    };
    fetchUsers();

    // Subscribe to user presence updates
    const channel = supabase.channel('users_presence')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
        setFilteredUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
        setSelectedUser((sel: any) => sel?.id === payload.new.id ? { ...sel, ...payload.new } : sel);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id]);

  // ---- Search ----
  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredUsers(users); return; }
    const q = searchQuery.toLowerCase();
    setFilteredUsers(users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    ));
  }, [searchQuery, users]);

  // ---- Fetch messages ----
  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]);

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .eq('deleted_for_everyone', false)
        .order('created_at', { ascending: true });
      if (data) { setMessages(data); scrollToBottom(); }

      // Mark messages as read
      await supabase.from('messages').update({ is_read: true })
        .eq('sender_id', selectedUser.id).eq('receiver_id', currentUser.id).eq('is_read', false);
    };
    fetchMessages();

    // Cleanup old channels
    if (msgChannel.current) supabase.removeChannel(msgChannel.current);
    if (typingChannel.current) supabase.removeChannel(typingChannel.current);

    // Subscribe to new messages
    msgChannel.current = supabase.channel(`msgs_${currentUser.id}_${selectedUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        if (
          (msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id) ||
          (msg.sender_id === selectedUser.id && msg.receiver_id === currentUser.id)
        ) {
          setMessages(prev => {
            // Avoid duplicate (optimistic update already added it)
            if (prev.some(m => m.id === msg.id)) return prev;
            // Remove optimistic placeholder
            const filtered = prev.filter(m => !m._optimistic);
            return [...filtered, msg];
          });
          scrollToBottom();
          // Mark as read if from other
          if (msg.sender_id === selectedUser.id) {
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m).filter(m => !m.deleted_for_everyone));
      })
      .subscribe();

    // Typing indicator channel
    typingChannel.current = supabase.channel(`typing_${[currentUser.id, selectedUser.id].sort().join('_')}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedUser.id) {
          setOtherTyping(payload.isTyping);
        }
      }).subscribe();

    return () => {
      if (msgChannel.current) supabase.removeChannel(msgChannel.current);
      if (typingChannel.current) supabase.removeChannel(typingChannel.current);
    };
  }, [selectedUser, currentUser.id, scrollToBottom]);

  // ---- Typing broadcast ----
  const handleTyping = (val: string) => {
    setNewMessage(val);
    if (!typingChannel.current || !selectedUser) return;
    typingChannel.current.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: true } });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      typingChannel.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: false } });
    }, 1500);
  };

  // ---- Send message ----
  const sendMessage = async (content: string, type: 'text' | 'image' | 'audio' | 'file' = 'text', fileUrl?: string) => {
    if ((!content.trim() && !fileUrl) || !selectedUser) return;

    const optimisticMsg = {
      id: `opt_${Date.now()}`,
      _optimistic: true,
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: content.trim(),
      type,
      file_url: fileUrl || null,
      is_read: false,
      reply_to: replyTo?.id || null,
      deleted_for_everyone: false,
      reactions: {},
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setReplyTo(null);
    setShowEmojiPicker(false);
    scrollToBottom();

    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: content.trim(),
      type,
      file_url: fileUrl || null,
      reply_to: replyTo?.id || null,
      is_read: false,
      deleted_for_everyone: false,
      reactions: {},
    });

    // Broadcast stop typing
    typingChannel.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: false } });
  };

  // ---- Server-side upload ----
  const uploadViaServer = async (file: File | Blob, fileType: 'image' | 'audio' | 'file', fileName: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file instanceof File ? file : new File([file], fileName, { type: 'audio/webm' }));
    formData.append('fileType', fileType);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Upload failed');
    return data.url;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    e.target.value = '';

    const MAX_MB = 25;
    if (file.size > MAX_MB * 1024 * 1024) {
      setMicError(`File too large! Max allowed size is ${MAX_MB} MB. Your file is ${(file.size / (1024*1024)).toFixed(1)} MB.`);
      return;
    }
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
      return;
    }

    setUploading(true);
    setMicError(null);
    try {
      const isAudio = file.type.startsWith('audio/');
      const url = await uploadViaServer(file, isAudio ? 'audio' : 'file', file.name);
      await sendMessage(isAudio ? '🎵 Audio file' : `📎 ${file.name}`, isAudio ? 'audio' : 'file', url);
    } catch (err: any) {
      setMicError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels || !selectedUser) return;
    try {
      setUploading(true);
      setMicError(null);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error('Could not crop image');

      const url = await uploadViaServer(croppedImageBlob, 'image', `image-${Date.now()}.jpg`);
      await sendMessage('🖼️ Image', 'image', url);
      setImageSrc(null);
    } catch (err: any) {
      setMicError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setMicError('Browser does not support audio recording.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      mediaRecorder.current = media;
      audioChunks.current = [];
      media.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      media.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setUploading(true);
        try {
          const url = await uploadViaServer(blob, 'audio', `voice-${Date.now()}.webm`);
          await sendMessage('🎙️ Voice message', 'audio', url);
        } catch (err: any) {
          setMicError('Failed to send voice message: ' + err.message);
        } finally {
          setUploading(false);
        }
      };
      media.start();
      setRecording(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setMicError('Mic blocked! Allow microphone in browser address bar settings.');
      else if (err.name === 'NotFoundError') setMicError('No microphone detected.');
      else setMicError('Could not start recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      setRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { window.open(url, '_blank'); }
  };

  // ---- Message actions ----
  const deleteForEveryone = async (msgId: string) => {
    await supabase.from('messages').update({ deleted_for_everyone: true, content: 'This message was deleted.' }).eq('id', msgId);
    setContextMenu(null);
  };

  const addReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    if (reactions[emoji]?.includes(currentUser.id)) {
      reactions[emoji] = reactions[emoji].filter((id: string) => id !== currentUser.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...(reactions[emoji] || []), currentUser.id];
    }
    await supabase.from('messages').update({ reactions }).eq('id', msgId);
    setContextMenu(null);
  };

  // ---- Context menu ----
  const handleRightClick = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ---- Get reply message ----
  const getReplyMsg = (replyId: string) => messages.find(m => m.id === replyId);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>

      {/* =============== SIDEBAR =============== */}
      <div className={isMobile && mobileShowChat ? 'hide-on-mobile' : ''} style={{
        width: isMobile ? '100%' : 'var(--sidebar-width)',
        minWidth: isMobile ? '100%' : 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: isMobile ? 'none' : '1px solid var(--surface-border)',
        background: 'var(--bg-secondary)',
        position: 'relative',
        zIndex: 10,
        overflow: 'hidden',
      }}>
        {/* Sidebar Header */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Avatar user={myProfile} size="sm" />
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.2 }}>{myProfile?.name || 'You'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--success)' }}>● Online</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search users by name, email..." className="input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: '2.25rem', fontSize: '0.875rem', borderRadius: '99px' }} />
          </div>
        </div>

        {/* Users List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loadingUsers ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={36} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
              <p>{searchQuery ? 'No users found.' : 'No other users yet.'}</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.5rem 0.75rem 0.25rem' }}>
                {searchQuery ? `Results for "${searchQuery}"` : 'All Users'}
              </p>
              {filteredUsers.map(user => (
                <div key={user.id} onClick={() => { setSelectedUser(user); setMobileShowChat(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', transition: 'var(--transition-fast)', background: selectedUser?.id === user.id ? 'var(--primary-light)' : 'transparent', marginBottom: '2px' }}
                  onMouseEnter={e => { if (selectedUser?.id !== user.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (selectedUser?.id !== user.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Avatar user={user} size="md" showOnline />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: user.is_online ? 'var(--success)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.is_online ? '● Online' : `Last seen ${formatLastSeen(user.last_seen)}`}
                    </p>
                    {user.username && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{user.username}</p>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* =============== CHAT AREA =============== */}
      <div className={isMobile && !mobileShowChat ? 'hide-on-mobile' : ''} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Image Crop Modal */}
        {imageSrc && (
          <div className="modal-overlay" style={{ zIndex: 100 }}>
            <div className="modal" style={{ width: '90%', maxWidth: '600px', padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '80vh', maxHeight: '700px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Adjust Image</h3>
                <button onClick={() => setImageSrc(null)} className="btn btn-icon btn-ghost"><X size={20} /></button>
              </div>
              
              <div style={{ position: 'relative', flex: 1, background: '#111', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={4 / 3}
                  showGrid={true}
                  onCropChange={setCrop}
                  onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                  onZoomChange={setZoom}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleUploadCroppedImage} 
                  disabled={uploading}
                  style={{ minWidth: '120px' }}
                >
                  {uploading ? 'Sending...' : 'Send Image'}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '0.875rem 1.5rem',
              borderBottom: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: isMobile ? 'rgba(17, 24, 39, 0.85)' : 'var(--bg-secondary)',
              backdropFilter: isMobile ? 'blur(12px)' : 'none',
              WebkitBackdropFilter: isMobile ? 'blur(12px)' : 'none',
              flexShrink: 0,
              zIndex: 10,
              position: 'relative'
            }}>
              <button onClick={() => { setMobileShowChat(false); setSelectedUser(null); }} className="btn btn-icon btn-ghost" style={{ display: isMobile ? 'flex' : 'none' }}><ChevronLeft size={20} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, cursor: 'pointer' }} onClick={() => setShowProfile(v => !v)}>
                <Avatar user={selectedUser} size="md" showOnline />
                <div>
                  <p style={{ fontWeight: 600 }}>{selectedUser.name}</p>
                  <p style={{ fontSize: '0.8rem', color: selectedUser.is_online ? 'var(--success)' : 'var(--text-muted)' }}>
                    {otherTyping ? <span style={{ color: 'var(--success)' }}>typing...</span> : selectedUser.is_online ? '● Online' : `Last seen ${formatLastSeen(selectedUser.last_seen)}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="btn btn-icon btn-ghost" title="Info" onClick={() => setShowProfile(v => !v)}><Info size={20} /></button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--bg-primary)' }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <MessageSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>No messages yet</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Say hello to {selectedUser.name}! 👋</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isMine = msg.sender_id === currentUser.id;
                    const replyMsg = msg.reply_to ? getReplyMsg(msg.reply_to) : null;
                    const prevMsg = messages[i - 1];
                    const showAvatar = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
                    const isDeleted = msg.deleted_for_everyone;

                    return (
                      <div key={msg.id} className="animate-fade" style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', maxWidth: '70%' }}>
                          {!isMine && (
                            <div style={{ width: '32px', flexShrink: 0 }}>
                              {showAvatar && <Avatar user={selectedUser} size="sm" />}
                            </div>
                          )}
                          <div
                            onContextMenu={e => !isDeleted && handleRightClick(e, msg)}
                            className={isMine ? 'msg-bubble-sent' : 'msg-bubble-received'}
                            style={{
                              padding: '0.6rem 0.875rem',
                              cursor: 'context-menu',
                              position: 'relative',
                              maxWidth: '100%',
                              color: isDeleted ? (isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)') : (isMine ? '#fff' : 'var(--text-primary)'),
                              fontStyle: isDeleted ? 'italic' : 'normal',
                              wordBreak: 'break-word',
                              borderBottomRightRadius: isMine ? '4px' : '20px',
                              borderBottomLeftRadius: !isMine ? '4px' : '20px',
                            }}
                          >
                            {/* Reply quote */}
                            {replyMsg && !isDeleted && (
                              <div style={{ borderLeft: '3px solid rgba(255,255,255,0.4)', paddingLeft: '0.5rem', marginBottom: '0.4rem', opacity: 0.7, fontSize: '0.8rem' }}>
                                <p style={{ fontWeight: 600 }}>{replyMsg.sender_id === currentUser.id ? 'You' : selectedUser.name}</p>
                                <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{replyMsg.content}</p>
                              </div>
                            )}

                            {/* Content */}
                            {isDeleted ? (
                              <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.875rem' }}>🚫 This message was deleted</p>
                            ) : msg.type === 'text' ? (
                              <p style={{ wordBreak: 'break-word', lineHeight: 1.55, fontSize: '0.9rem' }}>{msg.content}</p>
                            ) : msg.type === 'image' && msg.file_url ? (
                              <div>
                                <img src={msg.file_url} alt="Image" onClick={() => setLightboxImage(msg.file_url)} style={{ maxWidth: '260px', maxHeight: '220px', borderRadius: '8px', cursor: 'zoom-in', display: 'block' }} />
                                <button onClick={() => handleDownload(msg.file_url, `image-${Date.now()}.jpg`)} className="btn btn-ghost" style={{ marginTop: '0.35rem', padding: '0.25rem 0.5rem', fontSize: '0.78rem', gap: '4px', color: 'rgba(255,255,255,0.7)' }}>
                                  <Download size={14} /> Download
                                </button>
                              </div>
                            ) : msg.type === 'audio' && msg.file_url ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <AudioPlayer src={msg.file_url} isMine={isMine} />
                                <button onClick={() => handleDownload(msg.file_url, `audio-${Date.now()}.webm`)} className="btn btn-ghost btn-icon" style={{ padding: '0.25rem', color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }} title="Download">
                                  <Download size={16} />
                                </button>
                              </div>
                            ) : null}

                            {/* Reactions */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && !isDeleted && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px' }}>
                                {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) =>
                                  users.length > 0 && (
                                    <button key={emoji} onClick={() => addReaction(msg.id, emoji)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '99px', padding: '1px 7px', cursor: 'pointer', fontSize: '0.8rem', color: 'white' }}>
                                      {emoji} {users.length}
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timestamp + read status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: isMine ? 0 : '2.5rem', paddingRight: isMine ? 0 : 0 }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatTime(msg.created_at)}</span>
                          {isMine && !isDeleted && (
                            msg.is_read
                              ? <CheckCheck size={14} className="tick-read" />
                              : <Check size={14} className="tick-sent" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {otherTyping && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <Avatar user={selectedUser} size="sm" />
                      <TypingIndicator />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Mic error banner */}
            {micError && (
              <div style={{ padding: '0.65rem 1.5rem', background: 'var(--error-light)', borderTop: '1px solid rgba(239,68,68,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#fca5a5' }}>🎙️ {micError}</span>
                <button onClick={() => setMicError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}><X size={16} /></button>
              </div>
            )}

            {/* Reply preview */}
            {replyTo && (
              <div style={{ padding: '0.65rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>Replying to {replyTo.sender_id === currentUser.id ? 'yourself' : selectedUser.name}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{replyTo.content}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="btn btn-icon btn-ghost"><X size={16} /></button>
              </div>
            )}

            {/* Input Bar */}
            <div style={{
              paddingTop: isMobile ? '0.5rem' : '0.875rem',
              paddingLeft: isMobile ? '0.5rem' : '1.25rem',
              paddingRight: isMobile ? '0.5rem' : '1.25rem',
              paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' : '0.875rem',
              borderTop: '1px solid var(--surface-border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              position: 'relative',
              flexShrink: 0,
            }}>

              {/* Attachments Menu Popover */}
              {showAttachments && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '0.5rem',
                  marginBottom: '0.5rem',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--surface-border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  animation: 'scaleIn 0.1s ease',
                }}>
                  <label className="btn btn-ghost" title="Send Image" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { handleFileUpload(e); setShowAttachments(false); }} disabled={uploading || recording} />
                    <ImageIcon size={18} /> <span style={{ fontSize: '0.85rem' }}>Image</span>
                  </label>
                  <label className="btn btn-ghost" title="Send Audio File" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                    <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => { handleFileUpload(e); setShowAttachments(false); }} disabled={uploading || recording} />
                    <Music size={18} /> <span style={{ fontSize: '0.85rem' }}>Audio</span>
                  </label>
                </div>
              )}

              {/* Plus Button */}
              <button 
                className="btn btn-icon btn-ghost" 
                onClick={() => { setShowAttachments(v => !v); setShowEmojiPicker(false); }} 
                title="Attachments"
                style={{ background: showAttachments ? 'var(--bg-active)' : 'transparent', flexShrink: 0 }}
              >
                <Paperclip size={20} style={{ transform: showAttachments ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Text input area wrapper */}
              <form onSubmit={e => { e.preventDefault(); sendMessage(newMessage); }} style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1.5px solid var(--surface-border-strong)', borderRadius: '24px', padding: '0.2rem 0.5rem', minWidth: 0, gap: '0.25rem' }}>
                
                {/* Emoji button inside input */}
                <div style={{ position: 'relative' }}>
                  <button type="button" className="btn btn-icon btn-ghost" onClick={() => { setShowEmojiPicker(v => !v); setShowAttachments(false); }} title="Emoji" style={{ width: '32px', height: '32px', padding: '0' }}>
                    <Smile size={20} color={showEmojiPicker ? 'var(--primary)' : 'var(--text-muted)'} />
                  </button>
                  {/* Emoji picker */}
                  {showEmojiPicker && (
                    <div className="emoji-picker" style={{ bottom: '100%', left: '0', marginBottom: '1rem' }}>
                      {EMOJIS.map(e => (
                        <button type="button" key={e} className="emoji-btn" onClick={() => { setNewMessage(m => m + e); setShowEmojiPicker(false); }}>{e}</button>
                      ))}
                    </div>
                  )}
                </div>

                <input type="text" value={newMessage} onChange={e => handleTyping(e.target.value)}
                  placeholder={uploading ? 'Uploading...' : recording ? '🔴 Recording...' : 'Message...'}
                  disabled={uploading || recording}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: isMobile ? '0.95rem' : '0.9rem', padding: '0.4rem 0.2rem', minWidth: 0 }}
                />

                {/* Right side inside input: Send OR Mic */}
                {newMessage.trim() ? (
                  <button type="submit" className="btn btn-primary btn-icon" disabled={uploading || recording} style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, padding: 0 }}>
                    <Send size={16} style={{ marginLeft: '2px' }} />
                  </button>
                ) : (
                  <button type="button" className="btn btn-icon" onClick={recording ? stopRecording : startRecording} disabled={uploading}
                    style={{ background: recording ? 'var(--error)' : 'transparent', color: recording ? 'white' : 'var(--text-secondary)', animation: recording ? 'pulse 1s infinite' : 'none', flexShrink: 0, width: '34px', height: '34px', padding: 0 }}
                    title={recording ? 'Stop Recording' : 'Record Voice Message'}>
                    {recording ? <MicOff size={18} /> : <Mic size={20} color={recording ? 'white' : 'var(--text-muted)'} />}
                  </button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)' }}>
              <MessageSquare size={40} color="var(--primary)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Welcome to Sam Chat</h2>
              <p>Search for a user or select one from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* =============== USER PROFILE PANEL =============== */}
      {showProfile && selectedUser && (
        <div style={{ width: '280px', borderLeft: '1px solid var(--surface-border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideInRight 0.2s ease' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Profile</h3>
            <button className="btn btn-icon btn-ghost" onClick={() => setShowProfile(false)}><X size={18} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
            <Avatar user={selectedUser} size="xl" showOnline />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedUser.name}</h2>
              {selectedUser.username && <p style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>@{selectedUser.username}</p>}
              <p style={{ color: selectedUser.is_online ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {selectedUser.is_online ? '● Online' : `Last seen ${formatLastSeen(selectedUser.last_seen)}`}
              </p>
            </div>
            <div style={{ width: '100%', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>About</p>
              <p style={{ fontSize: '0.875rem' }}>{selectedUser.bio || 'No bio yet.'}</p>
            </div>
            <div style={{ width: '100%', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'left' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Email</p>
              <p style={{ fontSize: '0.875rem' }}>{selectedUser.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* =============== CONTEXT MENU =============== */}
      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button className="context-menu-item" onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }}>
            <Reply size={15} /> Reply
          </button>
          <div style={{ padding: '0.4rem 0.5rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>React</p>
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
              {EMOJIS.slice(0, 8).map(e => (
                <button key={e} className="emoji-btn" style={{ fontSize: '1.1rem' }} onClick={() => addReaction(contextMenu.msg.id, e)}>{e}</button>
              ))}
            </div>
          </div>
          {contextMenu.msg.sender_id === currentUser.id && (
            <button className="context-menu-item danger" onClick={() => deleteForEveryone(contextMenu.msg.id)}>
              <Trash2 size={15} /> Delete for Everyone
            </button>
          )}
        </div>
      )}

      {/* =============== IMAGE LIGHTBOX =============== */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="Full size" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }} />
          <button onClick={() => setLightboxImage(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
          <button onClick={() => handleDownload(lightboxImage, `image-${Date.now()}.jpg`)} style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '99px', padding: '0.6rem 1.25rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Download
          </button>
        </div>
      )}
    </div>
  );
}
