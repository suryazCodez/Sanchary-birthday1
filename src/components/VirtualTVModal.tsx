import React from 'react';
import { X, Volume2, VolumeX, Tv, Sparkles } from 'lucide-react';

interface VirtualTVModalProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onClose: () => void;
}

export const VirtualTVModal: React.FC<VirtualTVModalProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  onClose,
}) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume));
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
  }, [volume, isMuted]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90">
      <div className="relative max-w-3xl w-full rounded-3xl bg-slate-900 border-4 border-[#4a2f18] shadow-[0_0_80px_rgba(245,158,11,0.22)] overflow-hidden flex flex-col">
        {/* Top Brass TV Bezel Accent */}
        <div className="h-1.5 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Tv className="w-4 h-4 text-amber-400" />
            <span className="font-serif font-bold text-amber-100 text-sm sm:text-base">
              Chalet Virtual Television · Sanchary's Golden Moments
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Virtual Television"
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aesthetic Frame TV Screen Viewport */}
        <div className="relative bg-[#130e0b] flex items-center justify-center py-4 px-4 min-h-[240px] sm:min-h-[360px] overflow-hidden">
          {/* Warm Ambilight Ambient Glow Behind Video */}
          <div className="absolute w-72 h-72 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          {/* Portrait Video Framed Inside the Virtual TV */}
          <div className="relative z-10 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-2xl bg-black max-h-[54vh]">
            <video
              ref={videoRef}
              src="/assets/aistudio/sanchary_tv_h264.mp4"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-auto h-full max-h-[52vh] object-contain"
            />
          </div>
        </div>

        {/* Bottom Soundbar & Low-Volume Control Strip */}
        <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Playing on the living room TV with soft, low acoustic guitar sound ({Math.round(volume * 100)}%)
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 transition cursor-pointer"
              title={isMuted ? 'Unmute TV Audio' : 'Mute TV Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <input
              type="range"
              min="0.02"
              max="0.5"
              step="0.02"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-28 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              title="TV Video Volume (kept low & cozy)"
            />
            <span className="text-xs font-mono tabular-nums text-amber-300 w-10 text-right">
              {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
