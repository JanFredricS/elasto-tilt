import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bankOffset, createInput, wrap180 } from '../src/input';
import type { InputController, SteeringMode } from '../src/types';

// Full-circle steering regression: a phone turned hand-over-hand about its
// screen normal must drive an unwrapped twist that tracks the true rotation
// for any number of turns, at any tilt that is observable (> 3° from flat),
// whatever Euler representation the browser reports for the same pose.
class Surface extends EventTarget {
  screen = { orientation: Object.assign(new EventTarget(), { angle: 0 }) };
  DeviceOrientationEvent: unknown = class {};
  hidden = false;
}
let surface: Surface;
const controllers: InputController[] = [];
const deg = Math.PI / 180;
const wrapBeta = (beta: number) => ((beta + 180) % 360 + 360) % 360 - 180;
/** Canonical W3C (beta, gamma) for a phone `tilt` degrees up from flat, twisted
 * `twist` degrees clockwise about its screen normal. gamma ∈ (-90, 90]. */
function phone(twist: number, tilt: number) {
  const s = Math.sin(tilt * deg), c = Math.cos(tilt * deg), t = twist * deg;
  return { beta: Math.asin(s * Math.cos(t)) / deg, gamma: Math.atan2(s * Math.sin(t), c) / deg };
}
/** The other Euler triple for the same gravity: beta ↔ 180 − beta (wrapped
 * into [-180, 180)) with gamma moved by a half turn, exactly as iOS flips
 * representation when gamma passes ±90. */
function flipped({ beta, gamma }: { beta: number; gamma: number }) {
  return { beta: wrapBeta(180 - beta), gamma: gamma >= 0 ? gamma - 180 : gamma + 180 };
}
function send(values: { beta: number; gamma: number }) {
  const e = new Event('deviceorientation'); Object.assign(e, values); surface.dispatchEvent(e);
}
/** Feeds `twist` at `tilt`; every third sample (every other near gamma ±90) uses the flipped triple. */
let sample = 0;
function feed(twist: number, tilt: number, flips = true) {
  const pose = phone(twist, tilt);
  send(flips && (Math.abs(pose.gamma) > 75 ? sample++ % 2 : sample++ % 3 === 1) ? flipped(pose) : pose);
}
async function motion(mode: SteeringMode) {
  const input = createInput(mode); controllers.push(input); await input.enableMotion(); return input;
}
const hold = (input: InputController, seconds = 3) => { let out; for (let i = 0; i < 60 * seconds; i++) out = input.read(1 / 60); return out!.worldAngle!; };
/** World angle → equivalent phone twist (degrees) for the mode's mapping. */
function twistOf(mode: SteeringMode, world: number) {
  if (mode === 'direct') return world / deg;
  let lo = -2000, hi = 2000; // bankOffset is odd and strictly monotone past the dead zone
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (bankOffset(mid) < world) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
beforeEach(() => { surface = new Surface(); sample = 0; vi.stubGlobal('window', surface); vi.stubGlobal('document', new Surface()); });
afterEach(() => { controllers.splice(0).forEach(c => c.destroy()); vi.unstubAllGlobals(); });

describe('wrap180', () => {
  it('maps any step into [-180, 180) and treats ±180 deterministically', () => {
    expect(wrap180(180)).toBe(-180);
    expect(wrap180(-180)).toBe(-180);
    expect(wrap180(540)).toBe(-180);
    expect(wrap180(179.999)).toBeCloseTo(179.999, 9);
    expect(wrap180(-179.999)).toBeCloseTo(-179.999, 9);
    // A 20° step either side of the atan2 seam is still a 20° step.
    expect(wrap180(-170 - 170)).toBeCloseTo(20, 9);
    expect(wrap180(170 - -170)).toBeCloseTo(-20, 9);
    for (let step = -179; step <= 179; step += .5) for (const from of [-179.5, -90, 0, 90, 179.5]) {
      const to = wrapBeta(from + step);
      expect(wrap180(to - from)).toBeCloseTo(step, 9);
    }
  });
});

describe('full-circle motion steering', () => {
  const tilts = [90, 60, 30, 12, 6, 4];
  for (const mode of ['direct', 'assisted'] as SteeringMode[]) {
    it.each(tilts)(`${mode}: two full turns at %s° from flat stay monotone and within 1° (with Euler flips)`, async tilt => {
      const input = await motion(mode);
      feed(0, tilt); input.read(1 / 60);
      let previous = -Infinity;
      for (let twist = 3; twist <= 720; twist += 3) {
        feed(twist, tilt);
        const world = input.read(1 / 60).worldAngle!;
        expect(world).toBeGreaterThanOrEqual(previous - 1e-12);
        previous = world;
        if (twist % 90 === 0) {
          // Hold still at each quarter: the (possibly lagged) follow settles on the truth.
          for (let i = 0; i < 6; i++) feed(twist, tilt);
          const settled = hold(input);
          expect(Math.abs(twistOf(mode, settled) - twist)).toBeLessThanOrEqual(1);
          expect(settled).toBeGreaterThanOrEqual(previous - 1e-12);
          previous = settled;
        }
      }
      // ...and back down, through zero, to two turns the other way.
      for (let twist = 717; twist >= -720; twist -= 3) {
        feed(twist, tilt);
        const world = input.read(1 / 60).worldAngle!;
        expect(world).toBeLessThanOrEqual(previous + 1e-12);
        previous = world;
      }
      expect(Math.abs(twistOf(mode, hold(input)) + 720)).toBeLessThanOrEqual(1);
    });
  }

  it.each([60, 90])('survives a worst-case 20° per 60 Hz sample (1200°/s) at %s° from flat', async tilt => {
    for (const mode of ['direct', 'assisted'] as SteeringMode[]) {
      const input = await motion(mode);
      feed(0, tilt);
      for (let twist = 20; twist <= 1440; twist += 20) { feed(twist, tilt); input.read(1 / 60); }
      expect(Math.abs(twistOf(mode, hold(input)) - 1440)).toBeLessThanOrEqual(1);
      input.destroy();
    }
  });

  it('reproduces the reported lock: a low hand-over-hand turn dipping through flat keeps its twist', async () => {
    // Phone held low (12° from flat); each hand change wobbles it to ~1° from
    // flat (frozen) and back. The old 10°/14° freeze dropped the twist made
    // during every dip, so after a few hand changes the world stopped
    // following ("thinks it is flat"). Now the dips only delay it.
    for (const mode of ['direct', 'assisted'] as SteeringMode[]) {
      const input = await motion(mode);
      feed(0, 12);
      for (let twist = 2; twist <= 720; twist += 2) {
        const dip = twist % 60 < 12 ? 1 + Math.abs(twist % 60 - 6) * 1.5 : 12;
        feed(twist, dip); input.read(1 / 60);
      }
      feed(720, 12);
      expect(Math.abs(twistOf(mode, hold(input)) - 720)).toBeLessThanOrEqual(1);
      input.destroy();
    }
  });

  it.each([90, 200])('a nearly flat phone (4° ± 0.8° noise) turned at %s°/s is neither trapped nor far behind', async rate => {
    // Audit case: with a 5° exit, noise that once dipped under 3° could keep
    // the phone frozen for good; with a .3 s lag it trailed far behind.
    let seed = 7;
    const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 1.6 - .8; };
    for (const mode of ['direct', 'assisted'] as SteeringMode[]) {
      const input = await motion(mode);
      feed(0, 4, false);
      let worst = 0;
      const step = rate / 60;
      for (let twist = step; twist <= 1080 + 1e-9; twist += step) {
        feed(twist, 4 + noise(), false); const world = input.read(1 / 60).worldAngle!;
        if (twist > 90) worst = Math.max(worst, twist - twistOf(mode, world));
      }
      for (let i = 0; i < 60; i++) { feed(1080, 4 + noise(), false); input.read(1 / 60); }
      expect(Math.abs(twistOf(mode, input.read(1 / 60).worldAngle!) - 1080)).toBeLessThanOrEqual(1);
      // Lag ≤ .15 s plus the 65 ms output smoothing.
      expect(worst).toBeLessThan(rate * .25);
      input.destroy();
    }
  });

  it('keeps tracking through an OS-style screen.orientation change (device axes only)', async () => {
    const input = await motion('direct');
    feed(0, 60);
    for (let twist = 3; twist <= 300; twist += 3) {
      if (twist === 90) surface.screen.orientation.angle = 90;
      if (twist === 180) surface.screen.orientation.angle = 180;
      if (twist === 270) surface.screen.orientation.angle = 270;
      feed(twist, 60); input.read(1 / 60);
    }
    expect(hold(input) / deg).toBeCloseTo(300, 0);
  });
});
