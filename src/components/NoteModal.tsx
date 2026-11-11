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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative max-w-lg w-full rounded-3xl bg-[#fdfbf7] text-stone-900 shadow-2xl border-4 border-[#e6d5b8] p-6 sm:p-8 overflow-hidden transform transition-all">
        {/* Parchment aesthetic header */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 hover:text-stone-900 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Location Tag */}
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 mb-2">
          <MapPin className="w-3.5 h-3.5" />
          <span>{chest.tag}</span>
        </div>

        {/* Note Title */}
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mb-1">
          {chest.noteTitle}
        </h2>
        <p className="text-xs text-stone-500 italic mb-6">
          Discovered in the {chest.name}
        </p>

        {/* Heartfelt Note Body */}
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 mb-6 font-serif text-base sm:text-lg text-stone-800 leading-relaxed whitespace-pre-line shadow-inner">
          {chest.noteBody}
        </div>

        {/* Wax Seal & Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-800 text-amber-100 flex items-center justify-center text-xs font-bold shadow-md">
              ♥
            </div>
            <span className="text-xs text-stone-600 font-medium">With all my love</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-100 text-xs font-semibold tracking-wide uppercase shadow transition cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Continue Journey</span>
          </button>
        </div>
      </div>
    </div>
  );
};
