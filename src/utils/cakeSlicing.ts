export interface Point2D {
  x: number;
  y: number;
}

export interface GuidedCutPath {
  id: number;
  label: string;
  instruction: string;
  start: Point2D;
  end: Point2D;
  angleDeg: number;
}

export interface SliceParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  kind: 'crumb' | 'sparkle' | 'frosting';
  life: number;
  maxLife: number;
}

export interface GuidedCakeSliceState {
  activeStrokeIndex: 0 | 1;
  strokeProgress: [number, number]; // [stroke0 (0..1), stroke1 (0..1)]
  knifePos: Point2D;
  knifeAngleDeg: number;
  isOnTrack: boolean;
  isCompleted: boolean;
  wedgeOffset: Point2D; // Displacement of the cut slice wedge once completed
}

/**
 * Two guided radial cuts from the center of Sanchary's cake (50, 50)
 * out to the rim to carve a celebratory birthday wedge.
 */
export const GUIDED_CUT_PATHS: [GuidedCutPath, GuidedCutPath] = [
  {
    id: 0,
    label: 'Cut 1 of 2 · First Radial Slice',
    instruction: 'Drag the silver knife from the center star along the glowing golden guide line to the outer rim!',
    start: { x: 50, y: 50 },
    end: { x: 82, y: 69 },
    angleDeg: 30.7,
  },
  {
    id: 1,
    label: 'Cut 2 of 2 · Complete the Birthday Wedge',
    instruction: 'Now drag from the center star down the second guide line to release Sanchary’s first slice!',
    start: { x: 50, y: 50 },
    end: { x: 61, y: 86 },
    angleDeg: 73.0,
  },
];

export function createInitialSliceState(): GuidedCakeSliceState {
  const firstCut = GUIDED_CUT_PATHS[0];
  return {
    activeStrokeIndex: 0,
    strokeProgress: [0, 0],
    knifePos: { ...firstCut.start },
    knifeAngleDeg: firstCut.angleDeg,
    isOnTrack: false,
    isCompleted: false,
    wedgeOffset: { x: 0, y: 0 },
  };
}

export function interpolateCutPoint(cut: GuidedCutPath, t: number): Point2D {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    x: cut.start.x + (cut.end.x - cut.start.x) * clamped,
    y: cut.start.y + (cut.end.y - cut.start.y) * clamped,
  };
}

export interface ProjectionResult {
  nextProgress: number;
  knifePos: Point2D;
  knifeAngleDeg: number;
  isOnTrack: boolean;
  deltaProgress: number;
  strokeCompleted: boolean;
}

/**
 * Projects a normalized (0..100) pointer position onto the active guided cut line
 * and advances cut progress smoothly when within the guide corridor.
 */
export function projectPointerOntoCut(
  px: number,
  py: number,
  cut: GuidedCutPath,
  currentProgress: number,
  corridorTolerance: number = 22
): ProjectionResult {
  const dx = cut.end.x - cut.start.x;
  const dy = cut.end.y - cut.start.y;
  const lenSq = dx * dx + dy * dy;
  const len = Math.sqrt(lenSq) || 1;

  // Parametric projection t along the segment [0, 1]
  const rawT = ((px - cut.start.x) * dx + (py - cut.start.y) * dy) / lenSq;
  const clampedT = Math.max(0, Math.min(1, rawT));

  // Closest point on the segment
  const closestX = cut.start.x + dx * clampedT;
  const closestY = cut.start.y + dy * clampedT;

  // Perpendicular distance from pointer to the guided line
  const distToLine = Math.hypot(px - closestX, py - closestY);
  const isOnTrack = distToLine <= corridorTolerance;

  if (!isOnTrack) {
    return {
      nextProgress: currentProgress,
      knifePos: interpolateCutPoint(cut, currentProgress),
      knifeAngleDeg: cut.angleDeg,
      isOnTrack: false,
      deltaProgress: 0,
      strokeCompleted: currentProgress >= 1,
    };
  }

  // Allow forward slicing if pointer is ahead of currentProgress
  // Cap single-event jump to +0.38 so user must genuinely drag along the guide
  let nextProgress = currentProgress;
  if (clampedT > currentProgress) {
    const maxStep = currentProgress < 0.15 ? 0.35 : 0.42;
    nextProgress = Math.min(1, Math.min(clampedT, currentProgress + maxStep));
  }

  // Snap to 1.0 when reaching >= 0.92 of the rim
  if (nextProgress >= 0.92 && clampedT >= 0.88) {
    nextProgress = 1;
  }

  const deltaProgress = Math.max(0, nextProgress - currentProgress);
  const knifePos = interpolateCutPoint(cut, nextProgress);

  return {
    nextProgress,
    knifePos,
    knifeAngleDeg: cut.angleDeg,
    isOnTrack: true,
    deltaProgress,
    strokeCompleted: nextProgress >= 1,
  };
}

/**
 * Advances the 2-stroke guided cake slicing state from a pointer drag at (px, py).
 */
export function advanceGuidedSliceState(
  state: GuidedCakeSliceState,
  px: number,
  py: number
): { nextState: GuidedCakeSliceState; deltaProgress: number; justFinishedStroke: boolean; justCompletedAll: boolean } {
  if (state.isCompleted) {
    return {
      nextState: state,
      deltaProgress: 0,
      justFinishedStroke: false,
      justCompletedAll: false,
    };
  }

  const idx = state.activeStrokeIndex;
  const activeCut = GUIDED_CUT_PATHS[idx];
  const currentProg = state.strokeProgress[idx];

  const proj = projectPointerOntoCut(px, py, activeCut, currentProg);

  const nextStrokeProgress: [number, number] = [
    state.strokeProgress[0],
    state.strokeProgress[1],
  ];
  nextStrokeProgress[idx] = proj.nextProgress;

  // Did we just finish stroke 0?
  if (idx === 0 && proj.strokeCompleted && currentProg < 1) {
    const secondCut = GUIDED_CUT_PATHS[1];
    return {
      nextState: {
        activeStrokeIndex: 1,
        strokeProgress: nextStrokeProgress,
        knifePos: { ...secondCut.start },
        knifeAngleDeg: secondCut.angleDeg,
        isOnTrack: true,
        isCompleted: false,
        wedgeOffset: { x: 0, y: 0 },
      },
      deltaProgress: proj.deltaProgress,
      justFinishedStroke: true,
      justCompletedAll: false,
    };
  }

  // Did we just finish stroke 1 (entire wedge cut)?
  if (idx === 1 && proj.strokeCompleted && currentProg < 1) {
    return {
      nextState: {
        activeStrokeIndex: 1,
        strokeProgress: [1, 1],
        knifePos: proj.knifePos,
        knifeAngleDeg: proj.knifeAngleDeg,
        isOnTrack: true,
        isCompleted: true,
        wedgeOffset: { x: 9.5, y: 11.5 },
      },
      deltaProgress: proj.deltaProgress,
      justFinishedStroke: true,
      justCompletedAll: true,
    };
  }

  return {
    nextState: {
      ...state,
      strokeProgress: nextStrokeProgress,
      knifePos: proj.knifePos,
      knifeAngleDeg: proj.knifeAngleDeg,
      isOnTrack: proj.isOnTrack,
    },
    deltaProgress: proj.deltaProgress,
    justFinishedStroke: false,
    justCompletedAll: false,
  };
}

/**
 * Advances the active guided stroke by a deterministic step amount
 * (used for accessible step/hold-to-slice or guided assist).
 */
export function stepGuidedSliceProgress(
  state: GuidedCakeSliceState,
  stepAmount: number = 0.08
): { nextState: GuidedCakeSliceState; deltaProgress: number; justFinishedStroke: boolean; justCompletedAll: boolean } {
  if (state.isCompleted) {
    return {
      nextState: state,
      deltaProgress: 0,
      justFinishedStroke: false,
      justCompletedAll: false,
    };
  }

  const idx = state.activeStrokeIndex;
  const cut = GUIDED_CUT_PATHS[idx];
  const currentProg = state.strokeProgress[idx];
  const targetProg = Math.min(1, currentProg + Math.max(0.01, stepAmount));
  const pt = interpolateCutPoint(cut, targetProg);

  return advanceGuidedSliceState(state, pt.x, pt.y);
}

/**
 * Computes total cake slicing percentage (0..100) across both guided cuts.
 */
export function getOverallSlicePercent(state: GuidedCakeSliceState): number {
  const raw = ((state.strokeProgress[0] + state.strokeProgress[1]) / 2) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Spawns celebratory frosting, berry crumb, and gold sparkle particles at the knife tip.
 */
export function createSliceParticlesAt(
  x: number,
  y: number,
  count: number = 6,
  seed: number = 0
): SliceParticle[] {
  const colors = ['#fde68a', '#fb7185', '#fef3c7', '#f43f5e', '#d97706', '#ffffff'];
  const kinds: SliceParticle['kind'][] = ['crumb', 'sparkle', 'frosting'];
  const out: SliceParticle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = ((i + seed * 1.37) / count) * Math.PI * 2;
    const speed = 0.6 + ((i * 7 + seed) % 5) * 0.32;
    out.push({
      id: `sp_${seed}_${i}`,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.35,
      size: 2.2 + (i % 3) * 1.4,
      color: colors[(i + seed) % colors.length],
      kind: kinds[(i + seed) % kinds.length],
      life: 1,
      maxLife: 1,
    });
  }

  return out;
}
