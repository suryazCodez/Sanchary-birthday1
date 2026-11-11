import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Flame, Scissors, Volume2, Mic, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../audio/SoundEngine';

interface CakeCuttingModalProps {
  candlesBlown: boolean;
  cakeCut: boolean;
  onExtinguishCandles: () => void;
  onCutCake: () => void;
  onClose: () => void;
}

export const CakeCuttingModal: React.FC<CakeCuttingModalProps> = ({
  candlesBlown,
  cakeCut,
  onExtinguishCandles,
  onCutCake,
  onClose,
}) => {
  const [blowProgress, setBlowProgress] = useState(0);
  const [isBlowing, setIsBlowing] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [sliceProgress, setSliceProgress] = useState(0);
  const [isSlicing, setIsSlicing] = useState(false);

  const blowTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Trigger confetti burst
  const triggerConfettiCelebration = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ff6b8b', '#ffd166', '#06d6a0', '#118ab2', '#a56de2', '#ffbe0b'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 60,
        origin: { x: 0.1, y: 0.7 },
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 60,
        origin: { x: 0.9, y: 0.7 },
      });
    }, 400);
  };

  // Button hold blow logic
  useEffect(() => {
    if (isBlowing && !candlesBlown) {
      soundEngine.playCandleBlowPuff();
      blowTimerRef.current = window.setInterval(() => {
        setBlowProgress(prev => {
          const next = prev + 14;
          if (next >= 100) {
            setTimeout(() => {
              handleBlowSuccess();
            }, 0);
            return 100;
          }
          return next;
        });
      }, 100);
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

      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

        // Loud blow / wind detection threshold
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

  const handleSliceCake = () => {
    if (cakeCut) return;
    setIsSlicing(true);
    setSliceProgress(100);
    soundEngine.playCakeCutSlice();
    soundEngine.playCheerAndFanfare();
    triggerConfettiCelebration();
    setTimeout(() => {
      onCutCake();
      setIsSlicing(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-center overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          {!candlesBlown ? 'Step 1: Blow Out Candles' : !cakeCut ? 'Step 2: Cut the Cake' : 'Celebration Complete!'}
        </div>

        {/* Cake Visual Representation */}
        <div className="relative w-44 h-44 mx-auto my-3 flex items-center justify-center">
          <div className="relative w-36 h-36 rounded-full bg-gradient-to-b from-rose-200 to-amber-100 shadow-xl border-4 border-amber-200/60 flex items-center justify-center">
            {/* Candle Flames */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[0, 72, 144, 216, 288].map((deg, i) => (
                <div
                  key={i}
                  style={{
                    transform: `rotate(${deg}deg) translate(38px) rotate(-${deg}deg)`,
                  }}
                  className="absolute"
                >
                  <div className="w-2.5 h-6 bg-amber-300 rounded-sm shadow-sm relative">
                    {!candlesBlown ? (
                      <div className="absolute -top-4 -left-1 w-4 h-5 bg-gradient-to-t from-amber-500 to-yellow-200 rounded-full animate-bounce shadow-lg shadow-amber-400/80" />
                    ) : (
                      <div className="absolute -top-2 left-0.5 w-1 h-3 bg-slate-400 opacity-60 rounded-full" />
                    )}
                  </div>
                </div>
              ))}
              {/* Center Candle */}
              <div className="w-3 h-8 bg-amber-300 rounded-sm shadow-sm relative">
                {!candlesBlown ? (
                  <div className="absolute -top-5 -left-1 w-5 h-6 bg-gradient-to-t from-rose-500 via-amber-400 to-yellow-100 rounded-full animate-pulse shadow-xl shadow-amber-400/90" />
                ) : (
                  <div className="absolute -top-3 left-1 w-1.5 h-4 bg-slate-500 opacity-50 rounded-full" />
                )}
              </div>
            </div>

            {/* Cut line indicator */}
            {candlesBlown && (
              <div
                className={`absolute w-full h-1 bg-amber-900/60 transition-all duration-500 ${
                  cakeCut || isSlicing ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-40'
                }`}
              />
            )}
          </div>
        </div>

        {/* Phase 1: Blow Candles */}
        {!candlesBlown ? (
          <div>
            <h2 className="text-2xl font-serif font-bold text-amber-100 mb-2">
              Make a Wish, Sanchary!
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              Close your eyes, Sanchary, make the biggest wish for your new year of life, and blow out your candles!
            </p>

            {/* Hold to blow button */}
            <div className="space-y-3">
              <button
                onMouseDown={() => setIsBlowing(true)}
                onMouseUp={() => setIsBlowing(false)}
                onTouchStart={() => setIsBlowing(true)}
                onTouchEnd={() => setIsBlowing(false)}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 active:from-amber-600 active:to-rose-600 text-white font-bold text-base shadow-xl transition cursor-pointer select-none relative overflow-hidden"
              >
                {/* Progress fill bar inside button */}
                <div
                  style={{ width: `${blowProgress}%` }}
                  className="absolute inset-0 bg-white/25 transition-all duration-100"
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Flame className="w-5 h-5 text-amber-200" />
                  {isBlowing ? `Blowing... (${blowProgress}%)` : 'Hold to Breathe & Blow'}
                </span>
              </button>

              {/* Optional mic blow button */}
              <button
                onClick={toggleMicBlow}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  micActive
                    ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{micActive ? 'Listening for your blow into microphone...' : 'Or use Microphone to Blow'}</span>
              </button>
            </div>
          </div>
        ) : !cakeCut ? (
          /* Phase 2: Cut the Cake */
          <div>
            <h2 className="text-2xl font-serif font-bold text-rose-200 mb-2">
              The Candles Are Out, Sanchary! ✨
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              The room lights have dimmed to a cozy evening glow, and Mom and Dad are cheering for you! Pick up the knife and cut your celebration slice.
            </p>

            <button
              onClick={handleSliceCake}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold text-base shadow-xl transition cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Scissors className="w-5 h-5 text-amber-200 rotate-90" />
              <span>Slice Sanchary's Birthday Cake! 🍰</span>
            </button>
          </div>
        ) : (
          /* Phase 3: Cake cut celebration */
          <div>
            <h2 className="text-2xl font-serif font-bold text-amber-200 mb-2">
              🎉 Happy Birthday Dearest Sanchary! 🎉
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              Your wish is sealed in the mountain stars, Sanchary! Enjoy your special celebration with Mom, Dad, and all the heartfelt memories surrounding you.
            </p>

            <div className="flex gap-2">
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
                Enjoy the Party
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
