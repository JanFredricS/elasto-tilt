import { expect, it, vi } from 'vitest';
import { createPhysics } from '../src/physics';
import { bankOffset, createInput } from '../src/input';
import { createScaffoldKeyboardPilot, createTowerChasmPilot, towerChasmLevels } from '../src/levels/tower-chasm';
import { createFlipSpiralPilot, flipSpiralLevels } from '../src/levels/flip-spiral';
import { createStairwayPilot, stairwayLevel } from '../src/levels/stairway';
import type { Controls } from '../src/types';

class BrowserSurface extends EventTarget {
  performance = globalThis.performance;
  screen = { orientation: Object.assign(new EventTarget(), { angle: 0 }) };
  DeviceOrientationEvent = class {};
  hidden = false;
}
function poseForAngle(angle: number) {
  let low = 0, high = 75;
  for (let i = 0; i < 30; i++) {
    const middle = (low + high) / 2;
    if (bankOffset(middle) < Math.abs(angle)) low = middle;
    else high = middle;
  }
  return Math.sign(angle) * (low + high) / 2;
}

it.each([0, 1, 2] as const)('completes late map %i through 60 Hz motion events, smoothing and pose recentering', async index => {
  const browser = new BrowserSurface();
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', new BrowserSurface());
  const input = createInput(), game = await createPhysics();
  const level = index < 2 ? towerChasmLevels[index] : stairwayLevel;
  game.load(level);
  const pilot = index < 2 ? createTowerChasmPilot(index as 0 | 1) : createStairwayPilot();
  let rateTarget = 0;
  let state = game.snapshot(), anchor = state.worldAngle, bank = 0, recenters = 0;
  let controls: Controls = { tilt: 0, brake: false };
  const pose = (gamma: number) => {
    const event = new Event('deviceorientation');
    Object.assign(event, { beta: 0, gamma });
    browser.dispatchEvent(event);
  };
  try {
    input.reset(anchor);
    await input.enableMotion();
    pose(0);
    for (let step = 0; step < 120 * 400 && state.status === 'playing'; step++) {
      const desired = pilot(state);
      if (step % 2 === 0) {
        const target = desired.worldAngle ?? (rateTarget += desired.tilt * .95 / 60);
        if (Math.abs(target - anchor) > 5.6) {
          // The real pause/resume path calls reset(currentAngle), preserving
          // position and velocity while allowing a comfortable neutral pose.
          // No simulated time passes while paused and no body is modified.
          anchor = state.worldAngle;
          input.reset(anchor); pose(0); bank = 0; recenters++;
        }
        const desiredBank = poseForAngle(target - anchor);
        bank += Math.max(-3, Math.min(3, desiredBank - bank)); // <=180 phone degrees/second
        expect(Math.abs(bank)).toBeLessThanOrEqual(75);
        pose(bank);
        input.setBrake(desired.brake);
        controls = input.read(1 / 60, state.worldAngle);
      }
      // Matches main.ts: a rendered frame's command is held across both fixed steps.
      state = game.step(1 / 120, controls);
    }
    expect(state.status, JSON.stringify({ elapsed: state.elapsed, apples: state.collected, bike: state.bike })).toBe('complete');
    expect(state.collected).toHaveLength(level.apples.length);
    if (index < 2) expect(recenters).toBeGreaterThan(0);
    else expect(recenters).toBe(0);
    expect(state.elapsed).toBeLessThan(index === 2 ? 400 : 160);
  } finally {
    input.destroy(); game.destroy(); vi.unstubAllGlobals();
  }
});


it.each([0, 1, 2, 3] as const)('completes expansion route %i through smoothed discrete direction-button pulses', async index => {
  vi.stubGlobal('window', new BrowserSurface());
  vi.stubGlobal('document', new BrowserSurface());
  const input = createInput(), game = await createPhysics();
  const level = index < 2 ? flipSpiralLevels[index] : index === 2 ? towerChasmLevels[0] : stairwayLevel;
  game.load(level);
  const pilot = index < 2 ? createFlipSpiralPilot(index as 0 | 1) : index === 2 ? createScaffoldKeyboardPilot() : createStairwayPilot();
  let pulseError = 0;
  let state = game.snapshot();
  let controls: Controls = { tilt: 0, brake: false };
  try {
    for (let step = 0; step < 120 * (index === 3 ? 400 : 180) && state.status === 'playing'; step++) {
      const desired = pilot(state);
      if (step % 2 === 0) {
        // Convert a continuous proposal to genuine button states at frame cadence.
        pulseError += desired.tilt;
        const direction = Math.max(-1, Math.min(1, Math.round(pulseError)));
        pulseError -= direction;
        input.setTouchTilt(direction);
        input.setBrake(desired.brake);
        controls = input.read(1 / 60, state.worldAngle);
      }
      state = game.step(1 / 120, controls);
    }
    expect(state.status, JSON.stringify({ elapsed: state.elapsed, apples: state.collected, bike: state.bike })).toBe('complete');
    expect(state.collected).toHaveLength(level.apples.length);
    expect(state.elapsed).toBeLessThan(index === 3 ? 400 : 150);

  } finally {
    input.destroy(); game.destroy(); vi.unstubAllGlobals();
  }
});
