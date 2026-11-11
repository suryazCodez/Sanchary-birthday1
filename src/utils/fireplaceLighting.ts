export interface FireplaceFlickerState {
  /** Primary hearth point light intensity */
  primaryIntensity: number;
  /** Secondary warm bounce light intensity on ceiling beams & rug */
  bounceIntensity: number;
  /** Point light attenuation range (expands when room is dimmed) */
  lightRange: number;
  /** Dynamic warm flame RGB color components (0..1) */
  colorR: number;
  colorG: number;
  colorB: number;
  /** Subtle spatial light dance offsets in meters */
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  /** Normalized (0..1) ember & flame cone emissive pulse */
  emberGlow: number;
  /** Current room ambient factor (0..1) that the fireplace is reacting to */
  roomAmbientLevel: number;
}

/**
 * Computes a realistic multi-octave flickering light state for the stone fireplace
 * that dynamically adapts to the room's ambient lighting level.
 *
 * When the room ambient light dims (e.g. from 1.0 down to 0.35 after blowing candles
 * or toggling cozy evening mode), the hearth light becomes richer, reaches further
 * across the room, and casts deeper amber-gold firelight dance.
 */
export function computeFireplaceFlickerState(
  elapsed: number,
  roomAmbientLevel: number = 1.0
): FireplaceFlickerState {
  const clampedAmbient = Math.max(0.15, Math.min(1.0, roomAmbientLevel));
  // How dimmed the room is: 0 = full bright room, 1 = fully dimmed cozy evening
  const dimContrast = (1.0 - clampedAmbient) / 0.85;

  // Multi-octave organic flame wave (combines slow breathing draft + medium flame lick + subtle crackle)
  const slowDraft = Math.sin(elapsed * 2.1) * 0.45 + Math.cos(elapsed * 3.4) * 0.3;
  const mediumDance = Math.sin(elapsed * 7.8 + 0.7) * 0.25 + Math.cos(elapsed * 11.3) * 0.18;
  const cracklePulse = Math.sin(elapsed * 19.5) * Math.sin(elapsed * 14.2) * 0.15;

  // Normalized wave in roughly [-1, 1]
  const rawWave = Math.max(-1, Math.min(1, (slowDraft + mediumDance + cracklePulse) / 1.15));
  // Normalized 0..1 flicker factor
  const flicker01 = (rawWave + 1) * 0.5;

  // Base intensity increases when the room's ambient light is dimmed so the fireplace
  // becomes the vibrant hero light source in the room
  const baseIntensity = 2.85 + dimContrast * 1.55;
  const flickerAmplitude = 0.65 + dimContrast * 0.55;
  const primaryIntensity = Math.max(1.2, baseIntensity + rawWave * flickerAmplitude);

  // Secondary warm fill bounce for the rug, mantelpiece, and ceiling beams
  const bounceBase = 0.85 + dimContrast * 0.95;
  const bounceIntensity = Math.max(0.3, bounceBase + slowDraft * (0.28 + dimContrast * 0.25));

  // Light reach expands in a darkened room
  const lightRange = 13.5 + dimContrast * 6.5 + flicker01 * 1.2;

  // Subtle color temperature shift: deep ember orange (#ff4d0a) <-> warm golden flame (#ff9e32)
  // Shifts slightly warmer/deeper in dimmed ambient mode
  const colorR = 1.0;
  const colorG = Math.max(0.28, Math.min(0.68, 0.34 + flicker01 * 0.24 - dimContrast * 0.03));
  const colorB = Math.max(0.03, Math.min(0.26, 0.05 + flicker01 * 0.14));

  // Micro-movement of the light origin so shadows on the dining table & rug dance subtly
  const offsetX = Math.sin(elapsed * 5.2) * (0.03 + dimContrast * 0.025);
  const offsetY = Math.cos(elapsed * 6.7) * (0.045 + dimContrast * 0.035);
  const offsetZ = Math.sin(elapsed * 4.3 + 1.1) * (0.05 + dimContrast * 0.04);

  const emberGlow = Math.max(0.25, Math.min(1.0, 0.52 + rawWave * 0.32 + dimContrast * 0.16));

  return {
    primaryIntensity,
    bounceIntensity,
    lightRange,
    colorR,
    colorG,
    colorB,
    offsetX,
    offsetY,
    offsetZ,
    emberGlow,
    roomAmbientLevel: clampedAmbient,
  };
}

/**
 * Computes an adaptive vertical Field of View (FOV in degrees) for landscape aspect ratios
 * so wide/ultrawide mobile screens (e.g. 19.5:9 or 20:9) do not suffer from wide-angle
 * edge distortion while preserving full scene framing.
 */
export function computeLandscapeCameraFov(width: number, height: number): number {
  if (height <= 0 || width <= 0) return 52;
  const aspect = width / height;
  if (aspect >= 2.05) {
    // Ultrawide mobile landscape (e.g. 844x390 = 2.16)
    return 45;
  }
  if (aspect >= 1.7) {
    // Standard 16:9 widescreen landscape
    return 49;
  }
  if (aspect >= 1.3) {
    return 52;
  }
  return 58;
}
