import React, { useEffect, useState } from 'react';
import { Smartphone, RotateCw, Sparkles, Maximize2 } from 'lucide-react';

export const LandscapeOrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Enforce landscape whenever height exceeds width on mobile/tablet screens
      setIsPortrait(h > w && w < 1024);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRequestLandscapeFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (mode: string) => Promise<void>;
      };
      if (orientation && orientation.lock) {
        await orientation.lock('landscape');
      }
    } catch {
      // Browser requires manual physical rotation (e.g. iOS Safari)
    }
  };

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 select-none touch-none text-center">
      {/* Night sky subtle starfield backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-sm w-full rounded-3xl bg-slate-900/95 border border-slate-800 p-7 shadow-2xl flex flex-col items-center">
        {/* Animated Rotating Phone Illustration */}
        <div className="relative w-24 h-24 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mb-5">
          <Smartphone className="w-11 h-11 text-amber-300 -rotate-90 transition-transform duration-700" />
          <RotateCw className="w-5 h-5 text-amber-400 absolute -top-1 -right-1" />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Landscape Mode Required</span>
        </div>

        <h2 className="text-2xl font-serif font-bold text-amber-100 mb-2.5">
          Rotate Your Phone Sideways
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
          To walk through the starry night mountains and explore Sanchary's birthday farmhouse with the 360° joystick, please hold your device horizontally in <strong>Landscape Mode</strong>.
        </p>

        <button
          onClick={handleRequestLandscapeFullscreen}
          className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Auto-Lock Landscape Fullscreen</span>
        </button>

        <p className="mt-3 text-[11px] text-slate-400">
          Make sure Portrait Orientation Lock is turned off on your phone.
        </p>
      </div>
    </div>
  );
};
