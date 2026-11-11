import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Compass,
  Sparkles,
  CloudSnow,
  Wind,
  Music,
  Cake,
  Footprints,
  Eye,
  HelpCircle,
  Tv
} from 'lucide-react';
import { SnowPreset } from '../scene/SnowfallSystem';
import { GameQuestState } from '../types/game';

interface HUDControlsProps {
  questState: GameQuestState;
  snowPreset: SnowPreset;
  onSetSnowPreset: (preset: SnowPreset) => void;
  windIntensity: number;
  onSetWindIntensity: (val: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onPlayBirthdayMelody: () => void;
  onWalkButtonDown: () => void;
  onWalkButtonUp: () => void;
  onTeleportPreset: (preset: 'trail' | 'porch' | 'cake' | 'tv' | 'gallery') => void;
  interactivePrompt: string | null;
  onTriggerInteract: () => void;
  onOpenVercelGuide: () => void;
}

export const HUDControls: React.FC<HUDControlsProps> = ({
  questState,
  snowPreset,
  onSetSnowPreset,
  windIntensity,
  onSetWindIntensity,
  isMuted,
  onToggleMute,
  onPlayBirthdayMelody,
  onWalkButtonDown,
  onWalkButtonUp,
  onTeleportPreset,
  interactivePrompt,
  onTriggerInteract,
  onOpenVercelGuide,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'walk' | 'weather' | 'quest'>('walk');

  return (
    <>
      {/* Minimal Top Header Badge */}
      <div className="fixed top-4 left-4 z-40 flex items-center gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/85 border border-slate-700/80 shadow-xl backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="font-serif font-bold text-amber-100 text-sm tracking-wide">
            Sanchary's Alpine Birthday
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            | {questState.chestsFound}/3 Chests
          </span>
        </div>
      </div>

      {/* Top-Right Quick Audio & Help Buttons */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={onPlayBirthdayMelody}
          title="Play Happy Birthday Chime"
          className="p-2.5 rounded-xl bg-slate-900/85 border border-slate-700/80 hover:border-amber-500/80 text-amber-300 hover:text-amber-200 shadow-lg backdrop-blur-md transition cursor-pointer"
        >
          <Music className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="p-2.5 rounded-xl bg-slate-900/85 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white shadow-lg backdrop-blur-md transition cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
        <button
          onClick={onOpenVercelGuide}
          title="How to Deploy to Vercel"
          className="px-3 py-2 rounded-xl bg-indigo-950/80 border border-indigo-700/80 hover:border-indigo-500 text-indigo-200 hover:text-white text-xs font-semibold shadow-lg backdrop-blur-md transition cursor-pointer flex items-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Deploy to Vercel</span>
        </button>
      </div>

      {/* Center Interactive Action Prompt Banner */}
      {interactivePrompt && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={onTriggerInteract}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold text-sm shadow-2xl shadow-rose-950/60 border border-amber-200/40 hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>{interactivePrompt}</span>
          </button>
        </div>
      )}

      {/* Unified Bottom Control Dock (Zero Viewport Occlusion) */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-3 transition-transform duration-300 ease-out ${
          isCollapsed ? 'translate-y-[calc(100%-2rem)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse Toggle Handle */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-4 py-1 rounded-t-xl bg-slate-900/95 border-t border-x border-slate-700/80 text-xs text-slate-300 hover:text-white shadow-lg backdrop-blur-md cursor-pointer transition hover:bg-slate-800"
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Show Controls & Navigation</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Zen / Cinema View</span>
              </>
            )}
          </button>
        </div>

        {/* Main Dock Surface */}
        <div className="rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl p-3 sm:p-4 text-slate-200">
          {/* Navigation / Mode Tab Switcher */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setActiveTab('walk')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'walk'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Walk & Navigate</span>
              </button>
              <button
                onClick={() => setActiveTab('weather')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'weather'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <CloudSnow className="w-3.5 h-3.5" />
                <span>Snow & Wind</span>
              </button>
              <button
                onClick={() => setActiveTab('quest')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'quest'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Birthday Quests ({questState.chestsFound}/3)</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:block font-mono">
              [W/A/S/D] or Arrow keys to walk
            </div>
          </div>

          {/* TAB 1: Walk & Controller */}
          {activeTab === 'walk' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Hold to Walk Main Physical Button */}
                <div className="flex items-center gap-2">
                  <button
                    onMouseDown={onWalkButtonDown}
                    onMouseUp={onWalkButtonUp}
                    onTouchStart={onWalkButtonDown}
                    onTouchEnd={onWalkButtonUp}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-slate-950 font-bold text-sm shadow-md transition select-none cursor-pointer flex items-center gap-2"
                  >
                    <Footprints className="w-4 h-4 text-slate-950" />
                    <span>Hold to Walk Forward</span>
                  </button>
                </div>

                {/* Quick Camera & Scene Waypoints */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider mr-1">Views:</span>
                  <button
                    onClick={() => onTeleportPreset('trail')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer"
                  >
                    🏔️ Trail
                  </button>
                  <button
                    onClick={() => onTeleportPreset('porch')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer"
                  >
                    🏡 Porch & Door
                  </button>
                  <button
                    onClick={() => onTeleportPreset('cake')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 transition cursor-pointer"
                  >
                    🎂 Birthday Table
                  </button>
                  <button
                    onClick={() => onTeleportPreset('tv')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer"
                  >
                    📺 TV Screen
                  </button>
                  <button
                    onClick={() => onTeleportPreset('gallery')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer"
                  >
                    📸 Photo Wall
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Dynamic Snow & Wind Atmosphere */}
          {activeTab === 'weather' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Snowfall density */}
              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-2">
                  <CloudSnow className="w-3.5 h-3.5 text-sky-400" />
                  Snowfall Density & Speed:
                </label>
                <div className="flex items-center gap-2">
                  {(['gentle', 'cozy', 'blizzard'] as SnowPreset[]).map(p => (
                    <button
                      key={p}
                      onClick={() => onSetSnowPreset(p)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                        snowPreset === p
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wind Intensity Slider */}
              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-teal-400" />
                    Mountain Wind Intensity:
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {Math.round(windIntensity * 100)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={windIntensity}
                  onChange={e => onSetWindIntensity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Quest Tracker */}
          {activeTab === 'quest' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex flex-col gap-1">
                <span className="text-slate-400">Hidden Chests</span>
                <span className="font-semibold text-amber-300">
                  {questState.chestsFound} of 3 Found
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex flex-col gap-1">
                <span className="text-slate-400">Farmhouse Door</span>
                <span className={`font-semibold ${questState.enteredHouse ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {questState.enteredHouse ? 'Unlocked & Entered' : 'Walk to Porch'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex flex-col gap-1">
                <span className="text-slate-400">Candles</span>
                <span className={`font-semibold ${questState.candlesBlown ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {questState.candlesBlown ? 'Blown Out! ✨' : 'Lit & Ready'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex flex-col gap-1">
                <span className="text-slate-400">Birthday Cake</span>
                <span className={`font-semibold ${questState.cakeCut ? 'text-rose-400' : 'text-slate-300'}`}>
                  {questState.cakeCut ? 'Celebratory Slice Cut!' : 'Ready to Cut'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
