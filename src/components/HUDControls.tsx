import React, { useState, useRef } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Compass,
  Sparkles,
  CloudSnow,
  Wind,
  Music,
  Footprints,
  HelpCircle,
  Move,
  Flame,
  BookOpen
} from 'lucide-react';
import { SnowPreset } from '../scene/SnowfallSystem';
import { GameQuestState, TreasureChest, INITIAL_CHESTS } from '../types/game';

interface HUDControlsProps {
  questState: GameQuestState;
  snowPreset: SnowPreset;
  onSetSnowPreset: (preset: SnowPreset) => void;
  windIntensity: number;
  onSetWindIntensity: (val: number) => void;
  isRoomDimmed: boolean;
  onToggleRoomDim: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onPlayBirthdayMelody: () => void;
  onWalkButtonDown: () => void;
  onWalkButtonUp: () => void;
  onJoystickMove: (x: number, y: number) => void;
  onTeleportPreset: (preset: 'trail' | 'porch' | 'cake' | 'hearth' | 'tv' | 'gallery') => void;
  onOpenSurpriseNote: (chest: TreasureChest) => void;
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
  isRoomDimmed,
  onToggleRoomDim,
  isMuted,
  onToggleMute,
  onPlayBirthdayMelody,
  onWalkButtonDown,
  onWalkButtonUp,
  onJoystickMove,
  onTeleportPreset,
  onOpenSurpriseNote,
  interactivePrompt,
  onTriggerInteract,
  onOpenVercelGuide,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'walk' | 'weather' | 'quest'>('walk');
  const [isHoldingWalk, setIsHoldingWalk] = useState(false);

  // Virtual 360-degree thumb joystick state
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const [joystickPuck, setJoystickPuck] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingJoystick, setIsDraggingJoystick] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);

  const MAX_RADIUS = 38; // max pixel offset for puck

  const updateJoystickFromEvent = (clientX: number, clientY: number) => {
    const el = joystickContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) {
      setJoystickPuck({ x: 0, y: 0 });
      onJoystickMove(0, 0);
      return;
    }

    const clampedDist = Math.min(dist, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const puckX = Math.cos(angle) * clampedDist;
    const puckY = Math.sin(angle) * clampedDist;

    setJoystickPuck({ x: puckX, y: puckY });
    onJoystickMove(puckX / MAX_RADIUS, puckY / MAX_RADIUS);
  };

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    setIsDraggingJoystick(true);
    updateJoystickFromEvent(e.clientX, e.clientY);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingJoystick || activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystickFromEvent(e.clientX, e.clientY);
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
    activePointerIdRef.current = null;
    setIsDraggingJoystick(false);
    setJoystickPuck({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  const startHoldWalk = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsHoldingWalk(true);
    onWalkButtonDown();
  };

  const stopHoldWalk = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsHoldingWalk(false);
    onWalkButtonUp();
  };

  return (
    <>
      {/* Minimal Top Header Badge */}
      <div className="fixed top-4 left-4 z-40 flex items-center gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/85 border border-slate-700/80 shadow-xl">
          <span className="font-serif font-bold text-amber-100 text-sm tracking-wide">
            Sanchary's Alpine Birthday
          </span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            · {questState.chestsFound}/3 Chests
          </span>
        </div>
      </div>

      {/* Top-Right Quick Audio & Help Buttons */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={onPlayBirthdayMelody}
          title="Play Happy Birthday Chime"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-900/85 border border-slate-700/80 hover:border-amber-500/80 text-amber-300 hover:text-amber-200 shadow-lg transition cursor-pointer"
        >
          <Music className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-900/85 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white shadow-lg transition cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
        <button
          onClick={onOpenVercelGuide}
          title="How to Deploy to Vercel"
          className="min-h-[44px] px-3 py-2 rounded-xl bg-indigo-950/85 border border-indigo-700/80 hover:border-indigo-500 text-indigo-200 hover:text-white text-xs font-semibold shadow-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Deploy to Vercel</span>
        </button>
      </div>

      {/* Center Interactive Action Prompt Banner */}
      {interactivePrompt && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-[92vw]">
          <button
            onClick={onTriggerInteract}
            className="px-5 py-3 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold text-xs sm:text-sm shadow-2xl shadow-rose-950/60 border border-amber-200/40 hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-amber-200 shrink-0" />
            <span className="truncate">{interactivePrompt}</span>
          </button>
        </div>
      )}

      {/* 360-Degree Virtual Thumb Joystick (Ergonomic Lower-Left Landscape Thumb Zone) */}
      <div className="fixed bottom-3 left-3 sm:bottom-5 sm:left-6 z-40 flex flex-col items-center gap-1 select-none touch-none">
        <div
          ref={joystickContainerRef}
          onPointerDown={handleJoystickPointerDown}
          onPointerMove={handleJoystickPointerMove}
          onPointerUp={handleJoystickPointerUp}
          onPointerCancel={handleJoystickPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Virtual 360-degree movement joystick"
          className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-900/85 border-2 transition-colors shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none ${
            isDraggingJoystick ? 'border-amber-400/80 bg-slate-900/95' : 'border-slate-700/80'
          }`}
        >
          {/* Directional Indicators (Forward, Backward, Left, Right) */}
          <ChevronUp
            className={`absolute top-1.5 w-4 h-4 transition-colors pointer-events-none ${
              joystickPuck.y < -8 ? 'text-amber-300 scale-125' : 'text-slate-500'
            }`}
          />
          <ChevronDown
            className={`absolute bottom-1.5 w-4 h-4 transition-colors pointer-events-none ${
              joystickPuck.y > 8 ? 'text-amber-300 scale-125' : 'text-slate-500'
            }`}
          />
          <ChevronLeft
            className={`absolute left-1.5 w-4 h-4 transition-colors pointer-events-none ${
              joystickPuck.x < -8 ? 'text-amber-300 scale-125' : 'text-slate-500'
            }`}
          />
          <ChevronRight
            className={`absolute right-1.5 w-4 h-4 transition-colors pointer-events-none ${
              joystickPuck.x > 8 ? 'text-amber-300 scale-125' : 'text-slate-500'
            }`}
          />

          {/* Subtle center crosshair ring */}
          <div className="w-11 h-11 rounded-full border border-slate-700/40 pointer-events-none" />

          {/* Draggable Thumb Puck */}
          <div
            style={{
              transform: `translate3d(${joystickPuck.x}px, ${joystickPuck.y}px, 0)`,
            }}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg border-2 border-amber-200/70 flex items-center justify-center pointer-events-none ${
              isDraggingJoystick ? 'scale-105' : 'transition-transform duration-150'
            }`}
          >
            <Move className="w-5 h-5 text-slate-950" />
          </div>
        </div>
        <span className="text-[10px] sm:text-[11px] font-medium text-slate-300 bg-slate-900/85 px-2 py-0.5 rounded-md border border-slate-800 pointer-events-none">
          Drag to Walk 360°
        </span>
      </div>

      {/* Unified Bottom Control Dock (Offset right of joystick on mobile landscape) */}
      <div
        className={`fixed bottom-2.5 left-32 right-2.5 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 z-40 lg:w-full lg:max-w-3xl lg:px-4 transition-transform duration-300 ease-out ${
          isCollapsed ? 'translate-y-[calc(100%-2.25rem)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse Toggle Handle */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl bg-slate-900/95 border-t border-x border-slate-700/80 text-xs text-slate-300 hover:text-white shadow-lg cursor-pointer transition hover:bg-slate-800 whitespace-nowrap"
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Show Controls & Views</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Hide Dock</span>
              </>
            )}
          </button>
        </div>

        {/* Main Dock Surface */}
        <div className="rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl p-3 sm:p-4 text-slate-200">
          {/* Navigation / Mode Tab Switcher */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 gap-2">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('walk')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'walk'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Walk & Views</span>
              </button>
              <button
                onClick={() => setActiveTab('weather')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'quest'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quests ({questState.chestsFound}/3)</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 hidden xl:block font-mono whitespace-nowrap">
              Drag screen to look · Joystick or WASD to walk
            </div>
          </div>

          {/* TAB 1: Walk & Quick Scene Views */}
          {activeTab === 'walk' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Hold to Walk Forward Button */}
              <div className="flex items-center gap-2">
                <button
                  onPointerDown={startHoldWalk}
                  onPointerUp={stopHoldWalk}
                  onPointerCancel={stopHoldWalk}
                  onPointerLeave={stopHoldWalk}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition select-none touch-none cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                    isHoldingWalk
                      ? 'bg-amber-400 text-slate-950 scale-[0.98] ring-2 ring-amber-200'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                  }`}
                >
                  <Footprints className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>{isHoldingWalk ? 'Walking Forward...' : 'Hold to Walk Forward'}</span>
                </button>
              </div>

              {/* Quick Camera & Scene Waypoints */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                  Views:
                </span>
                <button
                  onClick={() => onTeleportPreset('trail')}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  🏔️ Trail
                </button>
                <button
                  onClick={() => onTeleportPreset('porch')}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  🏡 Porch & Door
                </button>
                <button
                  onClick={() => onTeleportPreset('cake')}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  🎂 Birthday Table
                </button>
                <button
                  onClick={() => onTeleportPreset('hearth')}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-orange-300 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  🔥 Fireplace
                </button>
                <button
                  onClick={() => onTeleportPreset('tv')}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  📺 TV Screen
                </button>
                <button
                  onClick={() => onTeleportPreset('gallery')}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  📸 Photo Wall
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Dynamic Snow, Wind & Reactive Fireplace Room Ambience */}
          {activeTab === 'weather' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              {/* Snowfall density */}
              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <CloudSnow className="w-3.5 h-3.5 text-sky-400" />
                  Snowfall Density:
                </label>
                <div className="flex items-center gap-1.5">
                  {(['gentle', 'cozy', 'blizzard'] as SnowPreset[]).map(p => (
                    <button
                      key={p}
                      onClick={() => onSetSnowPreset(p)}
                      className={`flex-1 min-h-[36px] py-1 px-2 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
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
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-teal-400" />
                    Mountain Wind:
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
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

              {/* Indoor Ambient Lighting & Reactive Fireplace Toggle */}
              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Room & Hearth Lighting:
                </label>
                <button
                  onClick={onToggleRoomDim}
                  className={`w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                    isRoomDimmed
                      ? 'bg-orange-500/20 border-orange-400/60 text-orange-200'
                      : 'bg-slate-800 border-slate-700 text-amber-200 hover:bg-slate-700'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>{isRoomDimmed ? 'Cozy Dimmed (Vibrant Hearth)' : 'Warm Evening (Tap to Dim)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Quest Tracker & Surprise Notes Reader */}
          {activeTab === 'quest' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="grid grid-cols-3 gap-2 flex-1">
                {INITIAL_CHESTS.map((chest, idx) => (
                  <button
                    key={chest.id}
                    onClick={() => onOpenSurpriseNote(chest)}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-amber-500/30 text-left transition cursor-pointer flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-[10px] text-slate-400 truncate">Surprise Note #{idx + 1}</div>
                      <div className="font-semibold text-amber-200 truncate">{chest.tag}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex flex-col">
                  <span className="text-[10px] text-slate-400">Candles & Cake</span>
                  <span className={`font-semibold ${questState.cakeCut ? 'text-rose-400' : 'text-amber-300'}`}>
                    {questState.cakeCut ? 'Sliced! 🍰' : questState.candlesBlown ? 'Candles Out ✨' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
