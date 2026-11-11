import React from 'react';
import { X, Heart, Sparkles, Star } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface FamilyGreetingModalProps {
  onClose: () => void;
}

export const FamilyGreetingModal: React.FC<FamilyGreetingModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative max-w-lg w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-950/40 mb-4">
          <Heart className="w-6 h-6 text-white fill-white" />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mom & Dad's Heartfelt Blessing for Sanchary</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-amber-100 mb-4">
          Happy Birthday, Dearest Sanchary!
        </h2>

        {/* Mom & Dad Avatars / Badges */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-center">
            <span className="text-2xl">👩‍🦰</span>
            <div className="text-xs font-bold text-purple-200 mt-1">Mom</div>
            <div className="text-[11px] text-purple-300/80 italic mt-0.5">"Sanchary beta, you bring endless sunshine into our hearts."</div>
          </div>
          <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-800/40 text-center">
            <span className="text-2xl">👨‍🦳</span>
            <div className="text-xs font-bold text-blue-200 mt-1">Dad</div>
            <div className="text-[11px] text-blue-300/80 italic mt-0.5">"Always so proud of our wonderful, brilliant Sanchary."</div>
          </div>
        </div>

        {/* Warm Message */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-sm text-slate-200 leading-relaxed font-sans mb-6">
          "On this joyful day, Sanchary, we want you to know how deeply you are loved. Seeing you grow, laugh, and touch so many lives with your boundless kindness is the greatest gift in our lives. May your future be filled with limitless success, good health, and abundant happiness."
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              soundEngine.playCheerAndFanfare();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Star className="w-4 h-4 text-amber-400" />
            <span>Cheer with Mom & Dad!</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow transition cursor-pointer"
          >
            Thank You, Mom & Dad! ♥
          </button>
        </div>
      </div>
    </div>
  );
};
