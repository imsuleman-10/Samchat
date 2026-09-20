import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export function AudioPlayer({ src, isMine }: { src: string, isMine: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => { setIsPlaying(false); setProgress(0); };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Bug 6 fixed: async play with race-condition guard
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        // Playback was interrupted or denied — ignore
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Bug 5 fixed: use higher opacity for received-bubble play button
  const playBtnBg = isMine ? 'rgba(255,255,255,0.25)' : 'rgba(91,142,240,0.28)';
  const iconColor = isMine ? 'rgba(255,255,255,0.95)' : 'var(--primary)';
  const trackBg   = isMine ? 'rgba(255,255,255,0.25)' : 'rgba(91,142,240,0.25)';
  const thumbColor = isMine ? '#ffffff' : '#5b8ef0';
  const timeColor  = isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '220px' }}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        style={{
          width: '36px', height: '36px', borderRadius: '50%', border: 'none',
          background: playBtnBg,
          color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
          transition: 'transform 0.15s, background 0.15s',
        }}
        onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)'; }}
        onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Bug 9 fixed: use WebkitAppearance/MozAppearance for TS compatibility */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={progress}
          onChange={handleSeek}
          style={{
            width: '100%', height: '4px', borderRadius: '2px',
            WebkitAppearance: 'none',
            background: `linear-gradient(to right, ${thumbColor} 0%, ${thumbColor} ${duration ? (progress / duration) * 100 : 0}%, ${trackBg} ${duration ? (progress / duration) * 100 : 0}%, ${trackBg} 100%)`,
            outline: 'none', cursor: 'pointer', border: 'none',
          }}
          className="audio-slider"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: timeColor }}>
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
