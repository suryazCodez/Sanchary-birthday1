import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFireplaceFlickerState,
  computeLandscapeCameraFov,
} from './fireplaceLighting';

test('fireplace light intensity and range increase when room ambient lighting is dimmed', () => {
  const brightRoom = computeFireplaceFlickerState(1.25, 1.0);
  const dimmedRoom = computeFireplaceFlickerState(1.25, 0.35);

  assert.ok(
    dimmedRoom.primaryIntensity > brightRoom.primaryIntensity,
    `Expected dimmed room intensity (${dimmedRoom.primaryIntensity}) > bright room intensity (${brightRoom.primaryIntensity})`
  );
  assert.ok(
    dimmedRoom.bounceIntensity > brightRoom.bounceIntensity,
    'Expected secondary bounce intensity to increase when room dims'
  );
  assert.ok(
    dimmedRoom.lightRange > brightRoom.lightRange,
    'Expected fireplace light reach to expand when room dims'
  );
});

test('fireplace flicker produces smooth temporal variation and valid RGB color temperature', () => {
  const t0 = computeFireplaceFlickerState(0.0, 0.5);
  const t1 = computeFireplaceFlickerState(0.35, 0.5);

  assert.notEqual(t0.primaryIntensity, t1.primaryIntensity);
  assert.notEqual(t0.offsetY, t1.offsetY);
  assert.equal(t0.colorR, 1.0);
  assert.ok(t0.colorG >= 0.28 && t0.colorG <= 0.68);
  assert.ok(t0.colorB >= 0.03 && t0.colorB <= 0.26);
});

test('computeLandscapeCameraFov adapts vertical FOV to prevent distortion on wide mobile landscape viewports', () => {
  const ultrawidePhone = computeLandscapeCameraFov(844, 390); // ~2.16 aspect
  const standardDesktop = computeLandscapeCameraFov(1440, 900); // 1.6 aspect

  assert.equal(ultrawidePhone, 45);
  assert.equal(standardDesktop, 52);
});
