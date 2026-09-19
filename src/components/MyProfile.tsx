"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Camera, Save, User as UserIcon, X, Check } from "lucide-react";
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';

export function MyProfile({ user, onProfileUpdated }: { user: any, onProfileUpdated: (updatedUser: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(user || {});
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Crop State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setProfile(user);
      setName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const updates = {
        id: user.id,
        email: user.email,
        name,
        username,
        bio,
        avatar_url: avatarUrl,
      };

      const { error } = await supabase.from('users').upsert(updates);
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      onProfileUpdated({ ...user, ...updates });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error updating profile' });
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUploadCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setUploading(true);
      setMessage(null);
      
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error('Could not crop image');

      const formData = new FormData();
      formData.append('file', croppedImageBlob, 'avatar.jpg');
      formData.append('fileType', 'image');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (!res.ok || data.error) throw new Error(data.error || 'Upload failed');
      
      setAvatarUrl(data.url);
      setImageSrc(null); // Close modal
      
      // Auto-save the avatar url to the profile immediately
      await supabase.from('users').update({ avatar_url: data.url }).eq('id', user.id);
      onProfileUpdated({ ...user, avatar_url: data.url });
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) return;

    try {
      setMessage({ type: 'error', text: 'Deleting account...' });
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error('Not authenticated. Please log in again.');

      const res = await fetch('/api/user/deleteAccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to delete account');

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Delete failed: ' + error.message });
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflowY: 'auto' }}>
      
      {/* CROP MODAL */}
      {imageSrc && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal" style={{ width: '90%', maxWidth: '500px', padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '80vh', maxHeight: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Adjust Picture</h3>
              <button onClick={() => setImageSrc(null)} className="btn btn-icon btn-ghost"><X size={20} /></button>
            </div>
            
            <div style={{ position: 'relative', flex: 1, background: '#111', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1} // 1:1 Aspect Ratio for Avatar
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
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
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleUploadCroppedImage} 
                disabled={uploading}
                style={{ minWidth: '120px' }}
              >
                {uploading ? 'Saving...' : <><Check size={18} /> Apply</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>My Profile</h1>
        
        {message && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            backgroundColor: message.type === 'success' ? 'var(--success-light)' : 'var(--error-light)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {message.text}
          </div>
        )}

        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '1rem' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-border)' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface-border)' }}>
                  <UserIcon size={40} color="var(--text-muted)" />
                </div>
              )}
              
              <label style={{ 
                position: 'absolute', 
                bottom: '0', 
                right: '0', 
                backgroundColor: 'var(--primary)', 
                color: 'white', 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                transition: 'var(--transition)'
              }} className="hover:scale-110">
                <Camera size={16} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={onFileChange} 
                  disabled={uploading} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
            {uploading && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Uploading...</p>}
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Full Name</label>
              <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>@</span>
                <input type="text" className="input" style={{ paddingLeft: '2rem' }} value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Bio</label>
              <textarea 
                className="input" 
                rows={3} 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                placeholder="Tell us a little about yourself..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem', padding: '0.875rem' }}>
              <Save size={18} /> {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--error)', borderRadius: 'var(--radius-xl)', background: 'var(--error-light)' }}>
          <h3 style={{ color: 'var(--error)', fontWeight: 700, marginBottom: '0.5rem' }}>Danger Zone</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--error)', opacity: 0.8, marginBottom: '1rem' }}>
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button 
            type="button" 
            onClick={handleDeleteAccount}
            className="btn btn-danger" 
            style={{ width: '100%', padding: '0.875rem', background: 'var(--error)', color: 'white' }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
