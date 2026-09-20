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

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const color = isMine ? 'rgba(255,255,255,0.9)' : 'var(--primary)';
  const trackColor = isMine ? 'rgba(255,255,255,0.3)' : 'rgba(91,142,240,0.3)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '220px' }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button 
        onClick={togglePlay} 
        style={{ 
          width: '36px', height: '36px', borderRadius: '50%', border: 'none', 
          background: isMine ? 'rgba(255,255,255,0.2)' : 'var(--primary-light)', 
          color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', 
          cursor: 'pointer', flexShrink: 0
        }}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <input 
          type="range" 
          min={0} 
          max={duration || 100} 
          value={progress} 
          onChange={handleSeek}
          style={{
            width: '100%', height: '4px', borderRadius: '2px', appearance: 'none',
            background: trackColor, outline: 'none', cursor: 'pointer'
          }}
          className={`custom-slider ${isMine ? 'mine' : 'theirs'}`}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <style>{`
        .custom-slider::-webkit-slider-thumb {
          appearance: none;
          width: 10px; height: 10px; border-radius: 50%;
          background: ${color}; cursor: pointer;
        }
        .custom-slider::-moz-range-thumb {
          width: 10px; height: 10px; border-radius: 50%; border: none;
          background: ${color}; cursor: pointer;
        }
      `}</style>
    </div>
  );
}
