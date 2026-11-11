import React from 'react';
import { X, Sparkles, MapPin } from 'lucide-react';
import { TreasureChest } from '../types/game';

interface NoteModalProps {
  chest: TreasureChest | null;
  onClose: () => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({ chest, onClose }) => {
  if (!chest) return null;

  return (
    <div
      role="dialog"
      aria-label={chest.noteTitle}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/85 select-none"
    >
      <div className="relative w-full max-w-2xl max-h-[90dvh] rounded-2xl sm:rounded-3xl bg-[#fdfbf7] text-stone-900 shadow-2xl border-4 border-[#e6d5b8] px-4 py-3.5 sm:px-7 sm:py-6 flex flex-col overflow-hidden">
        {/* Parchment aesthetic top gold bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700" />

        {/* Compact Landscape Header Row */}
        <div className="flex items-start justify-between gap-3 shrink-0 pt-1">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                <MapPin className="w-3 h-3" />
                {chest.tag}
              </span>
              <span className="text-[11px] text-stone-500 italic">
                · Discovered in the {chest.name}
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-serif font-bold text-stone-900 mt-1 leading-snug">
              {chest.noteTitle}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Surprise Note"
            className="p-1.5 sm:p-2 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 hover:text-stone-900 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Heartfelt Note Body (Always fits inside landscape viewports) */}
        <div className="flex-1 min-h-0 overflow-y-auto my-2 sm:my-3.5 px-3.5 py-2.5 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 font-serif text-xs sm:text-base text-stone-800 leading-relaxed shadow-inner select-text space-y-1.5 sm:space-y-2.5">
          {chest.noteBody
            .split(/\n\s*\n/)
            .map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
        </div>

        {/* Wax Seal & Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-800 text-amber-100 flex items-center justify-center text-xs font-bold shadow-md">
              ♥
            </div>
            <span className="text-xs text-stone-600 font-medium">
              With all my love, for Sanchary
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-100 text-xs font-semibold tracking-wide uppercase shadow transition cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Continue Journey</span>
          </button>
        </div>
      </div>
    </div>
  );
};
