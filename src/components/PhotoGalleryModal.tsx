import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, MapPin, Sparkles } from 'lucide-react';
import { MemoryPhoto, MEMORY_PHOTOS } from '../types/game';

interface PhotoGalleryModalProps {
  initialPhotoId?: string;
  onClose: () => void;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  initialPhotoId,
  onClose,
}) => {
  const initialIndex = initialPhotoId
    ? Math.max(0, MEMORY_PHOTOS.findIndex(p => p.id === initialPhotoId))
    : 0;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentPhoto = MEMORY_PHOTOS[currentIndex];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? MEMORY_PHOTOS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === MEMORY_PHOTOS.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-xl">
      <div className="relative max-w-4xl w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: High-Res Photo Display with Navigation Arrows */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] sm:min-h-[440px] overflow-hidden group">
          <img
            src={currentPhoto.url}
            alt={currentPhoto.title}
            className="w-full h-full object-contain max-h-[70vh] transition-transform duration-500"
          />

          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-3 p-3 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white transition backdrop-blur-md cursor-pointer group-hover:scale-105"
            title="Previous Memory"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 p-3 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white transition backdrop-blur-md cursor-pointer group-hover:scale-105"
            title="Next Memory"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Indicator Counter Badge */}
          <div className="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs text-white font-mono">
            {currentIndex + 1} / {MEMORY_PHOTOS.length}
          </div>
        </div>

        {/* Right: Caption, Details & Memory Card */}
        <div className="w-full md:w-80 p-6 flex flex-col justify-between bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 overflow-y-auto">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sanchary's Favorite Memory #{currentIndex + 1}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-amber-100 mb-3">
              {currentPhoto.title}
            </h3>

            <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-4 font-sans">
              <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {currentPhoto.date}
              </span>
              <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {currentPhoto.location}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans mb-6">
              {currentPhoto.caption}
            </p>
          </div>

          {/* Thumbnails list */}
          <div>
            <div className="text-xs text-slate-400 mb-2 font-medium">All Memories:</div>
            <div className="grid grid-cols-4 gap-2">
              {MEMORY_PHOTOS.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                    currentIndex === idx
                      ? 'border-amber-400 scale-105 shadow-md shadow-amber-400/20'
                      : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
