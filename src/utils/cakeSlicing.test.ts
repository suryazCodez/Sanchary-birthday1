import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDED_CUT_PATHS,
  createInitialSliceState,
  interpolateCutPoint,
  projectPointerOntoCut,
  advanceGuidedSliceState,
  stepGuidedSliceProgress,
  getOverallSlicePercent,
  createSliceParticlesAt,
} from './cakeSlicing';

test('initial slice state starts at center (50, 50) on stroke 0 with 0% progress', () => {
  const state = createInitialSliceState();
  assert.equal(state.activeStrokeIndex, 0);
  assert.deepEqual(state.strokeProgress, [0, 0]);
  assert.deepEqual(state.knifePos, { x: 50, y: 50 });
  assert.equal(state.isCompleted, false);
  assert.equal(getOverallSlicePercent(state), 0);
});

test('projectPointerOntoCut rejects pointers far outside the guided corridor', () => {
  const cut0 = GUIDED_CUT_PATHS[0];
  const res = projectPointerOntoCut(10, 10, cut0, 0.2, 15);
  assert.equal(res.isOnTrack, false);
  assert.equal(res.nextProgress, 0.2);
  assert.equal(res.deltaProgress, 0);
});

test('dragging along Cut 1 and Cut 2 completes both strokes and detaches the cake wedge', () => {
  let state = createInitialSliceState();

  // Drag progressively along Cut 1 (0 -> 1)
  const cut0 = GUIDED_CUT_PATHS[0];
  for (const t of [0.25, 0.55, 0.85, 1.0]) {
    const pt = interpolateCutPoint(cut0, t);
    const step = advanceGuidedSliceState(state, pt.x, pt.y);
    state = step.nextState;
  }

  // Cut 1 should now be finished and activeStrokeIndex switched to 1
  assert.equal(state.strokeProgress[0], 1);
  assert.equal(state.activeStrokeIndex, 1);
  assert.equal(state.isCompleted, false);
  assert.equal(getOverallSlicePercent(state), 50);

  // Drag progressively along Cut 2 (0 -> 1)
  const cut1 = GUIDED_CUT_PATHS[1];
  let completedAllTriggered = false;
  for (const t of [0.3, 0.65, 0.95, 1.0]) {
    const pt = interpolateCutPoint(cut1, t);
    const step = advanceGuidedSliceState(state, pt.x, pt.y);
    state = step.nextState;
    if (step.justCompletedAll) completedAllTriggered = true;
  }

  assert.equal(completedAllTriggered, true);
  assert.equal(state.isCompleted, true);
  assert.deepEqual(state.strokeProgress, [1, 1]);
  assert.equal(getOverallSlicePercent(state), 100);
  assert.ok(state.wedgeOffset.x > 0 && state.wedgeOffset.y > 0);
});

test('stepGuidedSliceProgress completes both guided strokes deterministically', () => {
  let state = createInitialSliceState();
  for (let i = 0; i < 30; i++) {
    const res = stepGuidedSliceProgress(state, 0.2);
    state = res.nextState;
    if (state.isCompleted) break;
  }
  assert.equal(state.isCompleted, true);
  assert.equal(getOverallSlicePercent(state), 100);
});

test('createSliceParticlesAt spawns valid crumb, frosting, and sparkle particles', () => {
  const particles = createSliceParticlesAt(64, 58, 8, 3);
  assert.equal(particles.length, 8);
  assert.ok(particles.every(p => p.x === 64 && p.y === 58 && p.life === 1));
});
