import React, { useState } from 'react';
import { Volume2, Sparkles, Compass, Heart, Mountain } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface PrologueLoadingProps {
  onStart: () => void;
}

export const PrologueLoading: React.FC<PrologueLoadingProps> = ({ onStart }) => {
  const [isFading, setIsFading] = useState(false);

  const handleStart = async () => {
    soundEngine.init();
    soundEngine.setEnvironment(false);
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (mode: string) => Promise<void>;
      };
      if (orientation && orientation.lock) {
        await orientation.lock('landscape');
      }
    } catch {
      // ignore if browser does not allow orientation lock without fullscreen
    }
    setIsFading(true);
    onStart();
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        handleStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 transition-opacity duration-500 ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient snowflakes styling */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-10 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-xl w-full max-h-[92dvh] overflow-y-auto mx-2 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl text-center">
        {/* Mountain Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-amber-300 text-[11px] font-semibold tracking-wider uppercase mb-2.5 sm:mb-4">
          <Mountain className="w-3.5 h-3.5" />
          Starry Night Alpine Birthday Experience
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-amber-100 tracking-tight leading-tight mb-2.5">
          Happy Birthday, Sanchary!
        </h1>

        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-5 font-sans">
          A starry mountain trail awaits you, Sanchary. Walk through the moonlit winter pines, discover hidden treasure chests with heartfelt notes, and step into the warm farmhouse where a magical celebration and Mom & Dad are waiting!
        </p>

        {/* Features preview pills */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left text-xs text-slate-300">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Compass className="w-4 h-4 text-sky-400 shrink-0" />
            <span>360° Joystick & Landscape Exploration</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Hidden Chests & Memory Gallery</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Living Room TV & Cozy Hearth Audio</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Heart className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Guided Cake Slicing & Mom & Dad</span>
          </div>
        </div>

        {/* Start Button */}
        <button
          data-start="true"
          onClick={handleStart}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:from-amber-400 hover:to-rose-400 text-white font-semibold text-sm sm:text-base shadow-lg shadow-rose-950/40 hover:shadow-rose-900/60 transform hover:-translate-y-0.5 active:translate-y-0 transition duration-200 cursor-pointer flex items-center justify-center gap-2.5"
        >
          <Sparkles className="w-5 h-5 text-amber-200" />
          <span>Step Into Sanchary's Mountain Farmhouse</span>
        </button>

        <p className="mt-3 text-xs text-slate-400">
          Best experienced in Landscape Mode with sound enabled.
        </p>
      </div>
    </div>
  );
};
