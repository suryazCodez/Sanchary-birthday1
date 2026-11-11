import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Flame, Mic, CheckCircle2, Wand2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../audio/SoundEngine';
import {
  GUIDED_CUT_PATHS,
  GuidedCakeSliceState,
  SliceParticle,
  createInitialSliceState,
  interpolateCutPoint,
  advanceGuidedSliceState,
  stepGuidedSliceProgress,
  getOverallSlicePercent,
  createSliceParticlesAt,
} from '../utils/cakeSlicing';

interface CakeCuttingModalProps {
  candlesBlown: boolean;
  cakeCut: boolean;
  onExtinguishCandles: () => void;
  onCutCake: () => void;
  onSliceProgress?: (normalizedProgress: number) => void;
  onClose: () => void;
}

export const CakeCuttingModal: React.FC<CakeCuttingModalProps> = ({
  candlesBlown,
  cakeCut,
  onExtinguishCandles,
  onCutCake,
  onSliceProgress,
  onClose,
}) => {
  const [blowProgress, setBlowProgress] = useState(0);
  const [isBlowing, setIsBlowing] = useState(false);
  const [micActive, setMicActive] = useState(false);

  // Guided 2-stroke cake slicing state
  const [sliceState, setSliceState] = useState<GuidedCakeSliceState>(() => createInitialSliceState());
  const [isDraggingKnife, setIsDraggingKnife] = useState(false);
  const [isHoldingAutoGuide, setIsHoldingAutoGuide] = useState(false);
  const [particles, setParticles] = useState<SliceParticle[]>([]);
  const [bladeFlash, setBladeFlash] = useState(false);

  const svgStageRef = useRef<SVGSVGElement | null>(null);
  const blowTimerRef = useRef<number | null>(null);
  const autoGuideTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const particleSeedRef = useRef<number>(1);
  const lastSoundTimeRef = useRef<number>(0);

  // Trigger celebratory confetti burst
  const triggerConfettiCelebration = useCallback(() => {
    confetti({
      particleCount: 110,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ff6b8b', '#ffd166', '#06d6a0', '#118ab2', '#a56de2', '#ffbe0b'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 70,
        angle: 60,
        spread: 60,
        origin: { x: 0.12, y: 0.7 },
      });
      confetti({
        particleCount: 70,
        angle: 120,
        spread: 60,
        origin: { x: 0.88, y: 0.7 },
      });
    }, 350);
  }, []);

  // Animate active crumb/sparkle particles
  useEffect(() => {
    if (particles.length === 0) return;
    const id = window.setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.08, // subtle gravity on crumbs
            life: p.life - 0.07,
          }))
          .filter(p => p.life > 0)
      );
    }, 30);
    return () => clearInterval(id);
  }, [particles.length]);

  // Process a slice state transition (triggers sounds, particles, 3D world sync, and completion)
  const applySliceTransition = useCallback(
    (result: {
      nextState: GuidedCakeSliceState;
      deltaProgress: number;
      justFinishedStroke: boolean;
      justCompletedAll: boolean;
    }) => {
      const { nextState, deltaProgress, justFinishedStroke, justCompletedAll } = result;
      setSliceState(nextState);

      const totalNorm = (nextState.strokeProgress[0] + nextState.strokeProgress[1]) / 2;
      onSliceProgress?.(totalNorm);

      if (deltaProgress > 0.005) {
        setBladeFlash(true);
        setTimeout(() => setBladeFlash(false), 90);

        // Spawn crumbs, frosting droplets, and sparkles at knife position
        particleSeedRef.current += 1;
        const burstCount = justFinishedStroke ? 14 : 6;
        const spawned = createSliceParticlesAt(
          nextState.knifePos.x,
          nextState.knifePos.y,
          burstCount,
          particleSeedRef.current
        );
        setParticles(prev => [...prev.slice(-36), ...spawned]);

        // Throttle continuous knife slice swish sound
        const now = performance.now();
        if (now - lastSoundTimeRef.current > 65) {
          soundEngine.init();
          soundEngine.playKnifeSliceDrag(totalNorm);
          lastSoundTimeRef.current = now;
        }
      }

      if (justFinishedStroke && !justCompletedAll) {
        soundEngine.init();
        soundEngine.playStrokeComplete(0);
      }

      if (justCompletedAll) {
        soundEngine.init();
        soundEngine.playStrokeComplete(1);
        soundEngine.playCakeCutSlice();
        soundEngine.playCheerAndFanfare();
        triggerConfettiCelebration();
        setTimeout(() => {
          onCutCake();
        }, 650);
      }
    },
    [onCutCake, onSliceProgress, triggerConfettiCelebration]
  );

  // Convert pointer event to normalized SVG coordinates (0..100)
  const handleStagePointerEvent = (clientX: number, clientY: number) => {
    if (!candlesBlown || cakeCut || sliceState.isCompleted) return;
    const svg = svgStageRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const px = ((clientX - rect.left) / rect.width) * 100;
    const py = ((clientY - rect.top) / rect.height) * 100;

    const res = advanceGuidedSliceState(sliceState, px, py);
    applySliceTransition(res);
  };

  const handlePointerDownStage = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!candlesBlown || cakeCut || sliceState.isCompleted) return;
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if synthetic
    }
    setIsDraggingKnife(true);
    handleStagePointerEvent(e.clientX, e.clientY);
  };

  const handlePointerMoveStage = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingKnife) return;
    e.stopPropagation();
    handleStagePointerEvent(e.clientX, e.clientY);
  };

  const handlePointerUpStage = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingKnife) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDraggingKnife(false);
  };

  // Hold-to-Guide-Knife button loop for effortless guided slicing on any device
  useEffect(() => {
    if (isHoldingAutoGuide && candlesBlown && !cakeCut && !sliceState.isCompleted) {
      autoGuideTimerRef.current = window.setInterval(() => {
        setSliceState(prev => {
          if (prev.isCompleted) return prev;
          const res = stepGuidedSliceProgress(prev, 0.12);
          // Schedule side-effects outside state updater
          setTimeout(() => applySliceTransition(res), 0);
          return res.nextState;
        });
      }, 75);
    } else if (autoGuideTimerRef.current) {
      clearInterval(autoGuideTimerRef.current);
      autoGuideTimerRef.current = null;
    }

    return () => {
      if (autoGuideTimerRef.current) clearInterval(autoGuideTimerRef.current);
    };
  }, [isHoldingAutoGuide, candlesBlown, cakeCut, sliceState.isCompleted, applySliceTransition]);

  // Single click on the guided assist button also advances a generous step
  const handleGuidedStepClick = () => {
    if (!candlesBlown || cakeCut || sliceState.isCompleted) return;
    const res = stepGuidedSliceProgress(sliceState, 0.28);
    applySliceTransition(res);
  };

  // Button hold blow logic (Phase 1)
  useEffect(() => {
    if (isBlowing && !candlesBlown) {
      soundEngine.init();
      soundEngine.playCandleBlowPuff();
      blowTimerRef.current = window.setInterval(() => {
        setBlowProgress(prev => {
          const next = prev + 16;
          if (next >= 100) {
            setTimeout(() => {
              handleBlowSuccess();
            }, 0);
            return 100;
          }
          return next;
        });
      }, 95);
    } else {
      if (blowTimerRef.current) {
        clearInterval(blowTimerRef.current);
        blowTimerRef.current = null;
      }
      if (!candlesBlown) {
        setBlowProgress(0);
      }
    }

    return () => {
      if (blowTimerRef.current) clearInterval(blowTimerRef.current);
    };
  }, [isBlowing, candlesBlown]);

  const handleBlowSuccess = () => {
    if (blowTimerRef.current) clearInterval(blowTimerRef.current);
    setIsBlowing(false);
    onExtinguishCandles();
    soundEngine.init();
    soundEngine.playCandleBlowPuff();
    soundEngine.playCheerAndFanfare();
    soundEngine.playBirthdayMelody();
    triggerConfettiCelebration();
  };

  // Microphone blow detection
  const toggleMicBlow = async () => {
    if (micActive) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
      setMicActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicActive(true);

      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const checkAudio = () => {
        if (!micStreamRef.current) return;
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const average = sum / buffer.length;

        if (average > 45 && !candlesBlown) {
          handleBlowSuccess();
          return;
        }

        if (!candlesBlown) {
          requestAnimationFrame(checkAudio);
        }
      };
      checkAudio();
    } catch (err) {
      console.warn('Microphone permission not granted', err);
    }
  };

  const cut0 = GUIDED_CUT_PATHS[0];
  const cut1 = GUIDED_CUT_PATHS[1];
  const cut0CurrentEnd = interpolateCutPoint(cut0, cakeCut ? 1 : sliceState.strokeProgress[0]);
  const cut1CurrentEnd = interpolateCutPoint(cut1, cakeCut ? 1 : sliceState.strokeProgress[1]);
  const activeCut = GUIDED_CUT_PATHS[sliceState.activeStrokeIndex];
  const overallPercent = cakeCut ? 100 : getOverallSlicePercent(sliceState);
  const isWedgeDetached = cakeCut || sliceState.isCompleted;
  const wedgeDx = isWedgeDetached ? 8.5 : 0;
  const wedgeDy = isWedgeDetached ? 10.5 : 0;

  return (
    <div
      role="dialog"
      aria-label="Birthday Cake Celebration"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 select-none"
    >
      <div className="relative max-w-2xl w-full max-h-[92dvh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-slate-900 border-2 border-amber-500/30 shadow-[0_0_70px_rgba(245,158,11,0.2)] p-3.5 sm:p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Cake Modal"
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Landscape-friendly responsive 2-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 items-center">
          {/* LEFT COLUMN: Interactive Top-Down Gourmet Cake & Guided Knife Stage */}
          <div className="sm:col-span-6 flex flex-col items-center justify-center">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              <svg
                ref={svgStageRef}
                data-testid="guided-cake-canvas"
                viewBox="0 0 100 100"
                onPointerDown={handlePointerDownStage}
                onPointerMove={handlePointerMoveStage}
                onPointerUp={handlePointerUpStage}
                onPointerCancel={handlePointerUpStage}
                className={`w-full h-full overflow-visible select-none touch-none ${
                  candlesBlown && !cakeCut ? 'cursor-crosshair' : 'cursor-default'
                }`}
              >
                <defs>
                  <radialGradient id="plateGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="82%" stopColor="#f1f5f9" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                  </radialGradient>
                  <radialGradient id="frostingGrad" cx="42%" cy="38%" r="58%">
                    <stop offset="0%" stopColor="#ffe4ec" />
                    <stop offset="65%" stopColor="#fda4af" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </radialGradient>
                  <radialGradient id="spongeInterior" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3b170b" />
                    <stop offset="70%" stopColor="#582614" />
                    <stop offset="100%" stopColor="#2e1107" />
                  </radialGradient>
                  <linearGradient id="silverBlade" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="45%" stopColor="#cbd5e1" />
                    <stop offset="55%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#f8fafc" />
                  </linearGradient>
                </defs>

                {/* 1. Porcelain Cake Stand Plate */}
                <circle cx="50" cy="50" r="46" fill="url(#plateGrad)" stroke="#e2b877" strokeWidth="1.2" />
                <circle
                  cx="50"
                  cy="50"
                  r="42.5"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="0.6"
                  strokeDasharray="1.5 1.5"
                />

                {/* 2. Chocolate Velvet Sponge Interior Exposed Under the Cut Wedge */}
                <path
                  d="M 50 50 L 82 69 A 37 37 0 0 1 61 86 Z"
                  fill="url(#spongeInterior)"
                  stroke="#fda4af"
                  strokeWidth="0.8"
                />
                {/* Exposed Strawberry Cream Layer Lines inside the Cake Cavity */}
                {isWedgeDetached && (
                  <g opacity="0.9">
                    <line x1="50" y1="50" x2="78" y2="66.5" stroke="#fecdd3" strokeWidth="1.2" />
                    <line x1="50" y1="50" x2="60" y2="82" stroke="#fecdd3" strokeWidth="1.2" />
                  </g>
                )}

                {/* 3. Main Birthday Cake Body (Excluding the Carved Wedge Sector) */}
                <path
                  d="M 50 50 L 61 86 A 37 37 0 1 1 82 69 Z"
                  fill="url(#frostingGrad)"
                  stroke="#fff1f2"
                  strokeWidth="1.5"
                />

                {/* Inner Gold & Cream Piping Ring on Main Cake */}
                <circle
                  cx="50"
                  cy="50"
                  r="27"
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="0.9"
                  strokeDasharray="2 2"
                  opacity="0.75"
                />

                {/* "Sanchary" Cursive Dedication on Cake Top */}
                <text
                  x="48"
                  y="34"
                  textAnchor="middle"
                  fill="#881337"
                  fontSize="5.2"
                  fontWeight="bold"
                  fontFamily="Cormorant Garamond, Georgia, serif"
                >
                  Happy Birthday
                </text>
                <text
                  x="48"
                  y="40.5"
                  textAnchor="middle"
                  fill="#9f1239"
                  fontSize="6.4"
                  fontWeight="bold"
                  fontFamily="Cormorant Garamond, Georgia, serif"
                >
                  Sanchary ✨
                </text>

                {/* 4. The Carved Birthday Wedge (Slides Outward When Both Guided Cuts Finish!) */}
                <g
                  style={{
                    transform: `translate(${wedgeDx}px, ${wedgeDy}px)`,
                    transition: 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {/* 3D Layered Sponge Side Wall of the Detached Wedge */}
                  {isWedgeDetached && (
                    <polygon
                      points="50,50 61,86 61,90 50,54"
                      fill="#5c2814"
                      stroke="#fda4af"
                      strokeWidth="0.6"
                    />
                  )}
                  <path
                    d="M 50 50 L 82 69 A 37 37 0 0 1 61 86 Z"
                    fill="url(#frostingGrad)"
                    stroke="#fff1f2"
                    strokeWidth="1.4"
                  />
                  {/* Ruby Strawberry & Rosette on the Cut Wedge */}
                  <circle cx="66" cy="69" r="3.4" fill="#fff1f2" />
                  <circle cx="66" cy="69" r="2.3" fill="#e11d48" />
                  <circle cx="65.3" cy="68.3" r="0.6" fill="#ffe4e6" />
                </g>

                {/* 5. Perimeter Piped Buttercream Rosettes & Strawberries */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, idx) => {
                  // Skip the rosette that sits on the moving wedge (around 55 deg)
                  if (deg === 45) return null;
                  const rad = (deg * Math.PI) / 180;
                  const rx = 50 + Math.cos(rad) * 31;
                  const ry = 50 + Math.sin(rad) * 31;
                  return (
                    <g key={idx}>
                      <circle cx={rx} cy={ry} r="3.2" fill="#fff1f2" />
                      <circle cx={rx} cy={ry} r="2.0" fill={idx % 2 === 0 ? '#e11d48' : '#f59e0b'} />
                    </g>
                  );
                })}

                {/* 6. Birthday Candles (Lit in Step 1, Extinguished with Wisp in Step 2) */}
                {!candlesBlown ? (
                  <g>
                    {[
                      [50, 50],
                      [36, 46],
                      [64, 46],
                      [40, 60],
                      [60, 56],
                    ].map(([cx, cy], i) => (
                      <g key={i}>
                        <rect
                          x={cx - 1.3}
                          y={cy - 6}
                          width="2.6"
                          height="7"
                          rx="1"
                          fill="#fef08a"
                          stroke="#d97706"
                          strokeWidth="0.4"
                        />
                        <ellipse cx={cx} cy={cy - 8.5} rx="2.4" ry="3.8" fill="#f59e0b" opacity="0.45" />
                        <path
                          d={`M ${cx} ${cy - 12} Q ${cx + 2.2} ${cy - 8} ${cx} ${cy - 6.2} Q ${cx - 2.2} ${cy - 8} ${cx} ${cy - 12}`}
                          fill="#fde047"
                        />
                      </g>
                    ))}
                  </g>
                ) : (
                  /* Center Golden Star Anchor Point for Guided Slicing */
                  <circle
                    cx="50"
                    cy="50"
                    r="3.2"
                    fill="#fbbf24"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                )}

                {/* 7. GUIDED CAKE SLICING OVERLAYS (Active in Step 2) */}
                {candlesBlown && (
                  <g>
                    {/* Cut 1 Guide Track & Completed Seam */}
                    {!isWedgeDetached && (
                      <>
                        {/* Glow corridor when Cut 1 is active */}
                        {sliceState.activeStrokeIndex === 0 && (
                          <line
                            x1={cut0.start.x}
                            y1={cut0.start.y}
                            x2={cut0.end.x}
                            y2={cut0.end.y}
                            stroke="rgba(251, 191, 36, 0.28)"
                            strokeWidth="6.5"
                            strokeLinecap="round"
                          />
                        )}
                        {/* Dotted Guide Line for Cut 1 */}
                        <line
                          x1={cut0.start.x}
                          y1={cut0.start.y}
                          x2={cut0.end.x}
                          y2={cut0.end.y}
                          stroke={sliceState.strokeProgress[0] >= 1 ? '#10b981' : '#fde047'}
                          strokeWidth="1.4"
                          strokeDasharray="2.5 2"
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {/* Already-Sliced Rich Chocolate Seam Along Cut 1 */}
                    {sliceState.strokeProgress[0] > 0 && !isWedgeDetached && (
                      <g>
                        <line
                          x1={cut0.start.x}
                          y1={cut0.start.y}
                          x2={cut0CurrentEnd.x}
                          y2={cut0CurrentEnd.y}
                          stroke="#3b170b"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                        <line
                          x1={cut0.start.x}
                          y1={cut0.start.y}
                          x2={cut0CurrentEnd.x}
                          y2={cut0CurrentEnd.y}
                          stroke="#fda4af"
                          strokeWidth="0.9"
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {/* Cut 2 Guide Track & Completed Seam */}
                    {!isWedgeDetached && (
                      <>
                        {sliceState.activeStrokeIndex === 1 && (
                          <line
                            x1={cut1.start.x}
                            y1={cut1.start.y}
                            x2={cut1.end.x}
                            y2={cut1.end.y}
                            stroke="rgba(251, 191, 36, 0.32)"
                            strokeWidth="6.5"
                            strokeLinecap="round"
                          />
                        )}
                        <line
                          x1={cut1.start.x}
                          y1={cut1.start.y}
                          x2={cut1.end.x}
                          y2={cut1.end.y}
                          stroke={
                            sliceState.activeStrokeIndex === 1
                              ? '#fde047'
                              : 'rgba(254, 240, 138, 0.45)'
                          }
                          strokeWidth="1.4"
                          strokeDasharray="2.5 2"
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {/* Already-Sliced Rich Chocolate Seam Along Cut 2 */}
                    {sliceState.strokeProgress[1] > 0 && !isWedgeDetached && (
                      <g>
                        <line
                          x1={cut1.start.x}
                          y1={cut1.start.y}
                          x2={cut1CurrentEnd.x}
                          y2={cut1CurrentEnd.y}
                          stroke="#3b170b"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                        <line
                          x1={cut1.start.x}
                          y1={cut1.start.y}
                          x2={cut1CurrentEnd.x}
                          y2={cut1CurrentEnd.y}
                          stroke="#fda4af"
                          strokeWidth="0.9"
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {/* Rim Target Node ("SLICE TO HERE") */}
                    {!isWedgeDetached && (
                      <g>
                        <circle
                          cx={activeCut.end.x}
                          cy={activeCut.end.y}
                          r="4.2"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                        />
                        <text
                          x={activeCut.end.x}
                          y={activeCut.end.y + 1.3}
                          textAnchor="middle"
                          fill="#0f172a"
                          fontSize="3.8"
                          fontWeight="bold"
                        >
                          {sliceState.activeStrokeIndex + 1}
                        </text>
                      </g>
                    )}

                    {/* 8. Real-Time Crumb, Frosting & Golden Sparkle Slicing Particles */}
                    {particles.map(pt =>
                      pt.kind === 'sparkle' ? (
                        <polygon
                          key={pt.id}
                          points={`${pt.x},${pt.y - pt.size} ${pt.x + pt.size * 0.35},${pt.y - pt.size * 0.35} ${pt.x + pt.size},${pt.y} ${pt.x + pt.size * 0.35},${pt.y + pt.size * 0.35} ${pt.x},${pt.y + pt.size} ${pt.x - pt.size * 0.35},${pt.y + pt.size * 0.35} ${pt.x - pt.size},${pt.y} ${pt.x - pt.size * 0.35},${pt.y - pt.size * 0.35}`}
                          fill={pt.color}
                          opacity={Math.max(0, pt.life)}
                        />
                      ) : (
                        <circle
                          key={pt.id}
                          cx={pt.x}
                          cy={pt.y}
                          r={pt.size * 0.55}
                          fill={pt.color}
                          opacity={Math.max(0, pt.life)}
                        />
                      )
                    )}

                    {/* 9. Interactive Silver Pastry Knife Following Finger / Cursor */}
                    {!isWedgeDetached && (
                      <g
                        transform={`translate(${sliceState.knifePos.x}, ${sliceState.knifePos.y}) rotate(${sliceState.knifeAngleDeg - 15})`}
                      >
                        {/* Touch Target Halo */}
                        <circle
                          cx="0"
                          cy="0"
                          r={isDraggingKnife ? '9.5' : '7.5'}
                          fill={bladeFlash ? 'rgba(253, 224, 71, 0.42)' : 'rgba(251, 191, 36, 0.22)'}
                          stroke="#fde047"
                          strokeWidth="0.9"
                        />
                        {/* Knife Blade */}
                        <path
                          d="M 0 0 L 18 -3.2 L 21 0 L 18 2.4 L 0 1.8 Z"
                          fill="url(#silverBlade)"
                          stroke="#334155"
                          strokeWidth="0.6"
                        />
                        {/* Brass Bolster */}
                        <rect x="17.5" y="-2.2" width="2.5" height="4.4" rx="0.6" fill="#eab308" />
                        {/* Pearl Handle */}
                        <rect
                          x="20"
                          y="-2.0"
                          width="11"
                          height="4.0"
                          rx="1.8"
                          fill="#fef3c7"
                          stroke="#b45309"
                          strokeWidth="0.5"
                        />
                      </g>
                    )}
                  </g>
                )}
              </svg>
            </div>

            {/* Live Cut Progress Badges Below Cake */}
            {candlesBlown && (
              <div className="flex items-center gap-2 mt-1 text-xs font-mono tabular-nums">
                <span
                  className={`px-2.5 py-1 rounded-lg border ${
                    sliceState.strokeProgress[0] >= 1 || cakeCut
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  }`}
                >
                  Cut 1: {Math.round((cakeCut ? 1 : sliceState.strokeProgress[0]) * 100)}%
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg border ${
                    sliceState.strokeProgress[1] >= 1 || cakeCut
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : sliceState.activeStrokeIndex === 1
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Cut 2: {Math.round((cakeCut ? 1 : sliceState.strokeProgress[1]) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Step Instructions & Interactive Controls */}
          <div className="sm:col-span-6 text-center sm:text-left flex flex-col justify-center">
            <div className="inline-flex items-center self-center sm:self-start gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {!candlesBlown
                ? 'Step 1 of 2 · Blow Out Candles'
                : !isWedgeDetached
                ? `Step 2 of 2 · ${activeCut.label}`
                : 'Celebration Complete!'}
            </div>

            {!candlesBlown ? (
              /* PHASE 1: BLOW CANDLES */
              <div>
                <h2 className="text-2xl font-serif font-bold text-amber-100 mb-2">
                  Make a Wish, Sanchary!
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
                  Close your eyes, Sanchary, make your biggest birthday wish, and blow out the 5 glowing candles!
                </p>

                <div className="space-y-2.5">
                  <button
                    onPointerDown={() => setIsBlowing(true)}
                    onPointerUp={() => setIsBlowing(false)}
                    onPointerLeave={() => setIsBlowing(false)}
                    onClick={() => {
                      // Instant accessible fallback if tapped quickly
                      if (blowProgress < 100) {
                        setBlowProgress(prev => {
                          const next = prev + 50;
                          if (next >= 100) {
                            setTimeout(() => handleBlowSuccess(), 0);
                            return 100;
                          }
                          return next;
                        });
                      }
                    }}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-sm sm:text-base shadow-xl transition cursor-pointer select-none relative overflow-hidden"
                  >
                    <div
                      style={{ width: `${blowProgress}%` }}
                      className="absolute inset-0 bg-white/25 transition-all duration-100"
                    />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Flame className="w-5 h-5 text-amber-200" />
                      {isBlowing ? `Blowing Candles... (${blowProgress}%)` : 'Hold or Tap to Blow Out Candles'}
                    </span>
                  </button>

                  <button
                    onClick={toggleMicBlow}
                    className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      micActive
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{micActive ? 'Listening for your blow into mic...' : 'Or Blow into Microphone'}</span>
                  </button>
                </div>
              </div>
            ) : !isWedgeDetached ? (
              /* PHASE 2: GUIDED 2-STROKE CAKE SLICING */
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-rose-200 mb-1.5">
                  Guided Cake Slicing ({overallPercent}%)
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mb-3 leading-relaxed">
                  {activeCut.instruction}
                </p>

                {/* Step-by-step visual checklist */}
                <div className="space-y-1.5 mb-4 text-xs">
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl border ${
                      sliceState.strokeProgress[0] >= 1
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      1. First Radial Slice (Center ★ to Target ①) —{' '}
                      <strong>{Math.round(sliceState.strokeProgress[0] * 100)}%</strong>
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl border ${
                      sliceState.strokeProgress[1] >= 1
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                        : sliceState.activeStrokeIndex === 1
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      2. Second Radial Slice (Center ★ to Target ②) —{' '}
                      <strong>{Math.round(sliceState.strokeProgress[1] * 100)}%</strong>
                    </span>
                  </div>
                </div>

                {/* Tactile Hold/Tap Guided Slicing Assist Button */}
                <button
                  onPointerDown={() => setIsHoldingAutoGuide(true)}
                  onPointerUp={() => setIsHoldingAutoGuide(false)}
                  onPointerLeave={() => setIsHoldingAutoGuide(false)}
                  onClick={handleGuidedStepClick}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xl transition cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  <Wand2 className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>
                    {isHoldingAutoGuide
                      ? `Guiding Silver Knife... (${overallPercent}%)`
                      : 'Drag Knife on Cake · Or Hold/Tap to Guide Slice'}
                  </span>
                </button>
              </div>
            ) : (
              /* PHASE 3: WEDGE CARVED & CELEBRATION COMPLETE */
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-amber-200 mb-2">
                  🎉 Happy Birthday Dearest Sanchary! 🎉
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
                  You carved the perfect layered velvet & berry birthday slice! It is now served on the porcelain plate in the 3D chalet while Mom & Dad cheer for you.
                </p>

                <div className="flex gap-2.5">
                  <button
                    onClick={triggerConfettiCelebration}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>More Confetti!</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    See 3D Sliced Cake
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
