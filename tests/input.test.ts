import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bankOffset, createInput, screenBank } from '../src/input';
import type { InputController } from '../src/types';

class Surface extends EventTarget {
  screen = { orientation: Object.assign(new EventTarget(), { angle: 0 }) };
  DeviceOrientationEvent: unknown = class {};
  hidden = false;
}
let surface: Surface, documentSurface: Surface;
const controllers: InputController[] = [];
function controller() { const input = createInput(); controllers.push(input); return input; }
function event(type: string, values: Record<string, unknown> = {}) {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, values); surface.dispatchEvent(e); return e;
}
const deg = Math.PI / 180;
/** A phone tilted back `pitch` degrees from upright, turned `bank` degrees
 * clockwise about its screen normal like a steering wheel. */
function steer(bank: number, pitch = 30) {
  const p = pitch * deg, t = bank * deg;
  return { beta: Math.asin(Math.cos(p) * Math.cos(t)) / deg, gamma: Math.atan2(Math.cos(p) * Math.sin(t), Math.sin(p)) / deg };
}
function pose(bank: number, pitch = 30) { event('deviceorientation', steer(bank, pitch)); }
function settle(input: InputController) { for (let i = 0; i < 120; i++) input.read(1 / 120); return input.read(1 / 120); }
beforeEach(() => { surface = new Surface(); documentSurface = new Surface(); vi.stubGlobal('window', surface); vi.stubGlobal('document', documentSurface); });
afterEach(() => { controllers.splice(0).forEach(c => c.destroy()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('shared keyboard, touch, and calibrated motion command', () => {
  it('has an odd monotonic curve, precise neutral steering, and accessible full inversion', () => {
    expect(bankOffset(.75)).toBe(0);
    expect(bankOffset(-.75)).toBe(-0);
    expect(bankOffset(10) * 180 / Math.PI).toBeCloseTo(11.734, 3);
    expect(bankOffset(30) * 180 / Math.PI).toBeCloseTo(51.961, 3);
    expect(bankOffset(45) * 180 / Math.PI).toBeCloseTo(110.786, 3);
    expect(bankOffset(75)).toBe(2 * Math.PI);
    expect(bankOffset(-75)).toBe(-2 * Math.PI);
    expect(bankOffset(-80)).toBe(-bankOffset(80));
    // After a 12° blend from the cubic's end slope (5π/74.25 rad/°) the curve
    // cruises at a steady 1.25 world°/phone°.
    const blendEnd = 2 * Math.PI + 12 * (5 * Math.PI / 74.25 + 1.25 * deg) / 2;
    expect(bankOffset(87)).toBeCloseTo(blendEnd, 10);
    expect(bankOffset(287)).toBeCloseTo(blendEnd + 200 * 1.25 * deg, 10);
    expect(bankOffset(NaN)).toBe(0);
    for (const value of [Infinity, -Infinity, 1e6, -1e6]) expect(Number.isFinite(bankOffset(value))).toBe(true);
    for (let bank = 1; bank <= 400; bank++) {
      expect(bankOffset(bank)).toBeGreaterThan(bankOffset(bank - 1));
      expect(bankOffset(-bank)).toBe(-bankOffset(bank));
    }
    expect(bankOffset(55) - bankOffset(50)).toBeGreaterThan(3 * (bankOffset(10) - bankOffset(5)));
  });

  it('is C¹ through the full-turn knee and the cruise join, then steady near 1:1', () => {
    const h = 1e-5;
    const slope = (x: number) => (bankOffset(x + h) - bankOffset(x - h)) / (2 * h);
    const left = (x: number) => (bankOffset(x) - bankOffset(x - h)) / h;
    const right = (x: number) => (bankOffset(x + h) - bankOffset(x)) / h;
    for (const knee of [75, 87]) {
      expect(right(knee)).toBeCloseTo(left(knee), 3);
      expect(right(-knee)).toBeCloseTo(left(-knee), 3);
    }
    expect(slope(75)).toBeCloseTo(5 * Math.PI / 74.25, 3);
    // The blend decreases the gain monotonically and never undershoots cruise.
    for (let bank = 75.5; bank < 87; bank += .5) {
      expect(slope(bank)).toBeLessThan(slope(bank - .5) + 1e-6);
      expect(slope(bank)).toBeGreaterThan(1.25 * deg - 1e-6);
    }
    for (const bank of [90, 180, 360, 720, 1080]) expect(slope(bank) / deg).toBeCloseTo(1.25, 6);
    // Spiral Sanctuary (~802° of world rotation) fits in about one physical turn.
    let bank = 0; while (bankOffset(bank) < 802 * deg) bank += .1;
    expect(bank).toBeLessThan(400);
  });
  it('maps arrows / A D and space, prevents scrolling, and releases on blur', () => {
    const input = controller();
    expect(event('keydown', { code: 'ArrowRight' }).defaultPrevented).toBe(true);
    event('keydown', { code: 'Space' });
    expect(settle(input).tilt).toBeCloseTo(1, 5); expect(input.read(.01).brake).toBe(true);
    event('blur'); expect(input.read(.01)).toEqual({ tilt: 0, brake: false });
    event('keydown', { code: 'KeyA' }); expect(settle(input).tilt).toBeCloseTo(-1, 5);
    event('keyup', { code: 'KeyA' }); expect(settle(input).tilt).toBe(0);
  });
  it('bounds and smooths touch input and releases touch brake when hidden', () => {
    const input = controller(); input.setTouchTilt(99); input.setBrake(true);
    const first = input.read(1 / 120); expect(first.tilt).toBeGreaterThan(0); expect(first.tilt).toBeLessThan(.2);
    expect(settle(input).tilt).toBeCloseTo(1, 5);
    documentSurface.hidden = true; documentSurface.dispatchEvent(new Event('visibilitychange'));
    expect(input.read(.01)).toEqual({ tilt: 0, brake: false });
    input.setTouchTilt(NaN); expect(input.read(.01).tilt).toBe(0);
  });
  it('requests permission, auto-calibrates first sample, uses deadzone and explicit calibration', async () => {
    const permission = vi.fn(async () => 'granted');
    surface.DeviceOrientationEvent = { requestPermission: permission };
    const input = controller(); expect(await input.enableMotion()).toContain('Waiting'); expect(permission).toHaveBeenCalledOnce();
    pose(12); expect(settle(input).worldAngle).toBe(0);
    pose(12.5); expect(settle(input).worldAngle).toBe(0);
    pose(22);
    const held = settle(input); expect(held.tilt).toBe(0); expect(held.worldAngle).toBeCloseTo(11.734156 * Math.PI / 180, 5);
    for (let i = 0; i < 60; i++) {
      pose(22);
      expect(settle(input).worldAngle).toBeCloseTo(held.worldAngle!, 5);
    }
    input.calibrate(); expect(settle(input).worldAngle).toBeCloseTo(0, 5); expect(input.mode).toContain('Motion');
  });
  it('keeps calibration and the world angle through an OS screen rotation mid-hold, and preserves fallback on denial', async () => {
    const input = controller(); await input.enableMotion();
    pose(0); pose(50); const held = settle(input).worldAngle!;
    expect(held).toBeCloseTo(bankOffset(50), 5);
    // Auto-rotate fires while the phone is held still at 50°.
    surface.screen.orientation.angle = 90;
    surface.screen.orientation.dispatchEvent(new Event('change')); event('orientationchange');
    pose(50);
    for (let i = 0; i < 120; i++) expect(input.read(1 / 120).worldAngle).toBeCloseTo(held, 6);
    // Steering continues from the same calibration in the new screen orientation.
    pose(60); expect(settle(input).worldAngle).toBeCloseTo(bankOffset(60), 5);
    surface.screen.orientation.angle = 0; event('orientationchange');
    pose(40); expect(settle(input).worldAngle).toBeCloseTo(bankOffset(40), 5);
    surface.DeviceOrientationEvent = { requestPermission: async () => 'denied' };
    expect(await input.enableMotion()).toContain('denied');
    event('keydown', { code: 'KeyD' }); expect(settle(input).tilt).toBeCloseTo(1, 5);
  });
  it.each([-2, -1, 1, 2])('calibrates at %s full turns without commanding another revolution', async turns => {
    const input = controller(), angle = turns * 2 * Math.PI;
    input.read(.01, angle); await input.enableMotion();
    pose(10);
    expect(settle(input).worldAngle).toBe(angle);
    input.calibrate();
    expect(input.read(1 / 120, angle).worldAngle).toBe(angle);
    expect(settle(input).worldAngle).toBe(angle);
  });
  it.each([-1, 1])('calibrates to the nearest flat turn in direction %s', async sign => {
    const input = controller(), flat = sign * 2 * Math.PI, actual = flat + sign * .4;
    input.read(.01, actual); await input.enableMotion();
    pose(10);
    input.calibrate();
    let previousDistance = Math.abs(actual - flat);
    for (let i = 0; i < 120; i++) {
      const target = input.read(1 / 120, actual).worldAngle!;
      const distance = (target - flat) * sign;
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(previousDistance);
      previousDistance = distance;
    }
    expect(previousDistance).toBeLessThan(.00001);
  });
  it('starts calibration from the actual world angle when the sensor target is ahead', async () => {
    const input = controller(); await input.enableMotion();
    pose(0);
    pose(75);
    expect(settle(input).worldAngle).toBeCloseTo(2 * Math.PI, 5);
    input.read(0, .3); input.calibrate();
    expect(input.read(0, .3).worldAngle).toBe(.3);
    const first = input.read(1 / 120, .3).worldAngle!;
    expect(first).toBeGreaterThan(0); expect(first).toBeLessThan(.3);
    expect(settle(input).worldAngle).toBeCloseTo(0, 5);
  });
  it('detaches listeners on destroy and ignores null sensor samples', async () => {
    const input = controller(); await input.enableMotion();
    event('deviceorientation', { beta: null, gamma: null }); expect(settle(input).tilt).toBe(0);
    input.destroy(); event('keydown', { code: 'Space' }); expect(input.read(.1).brake).toBe(false);
  });
  it('holds the last absolute pose during sensor silence and reanchors on blur or reset', async () => {
    const input = controller(); await input.enableMotion();
    pose(0);
    pose(25); const held = settle(input).worldAngle!;
    for (let i = 0; i < 3600; i++) expect(input.read(1 / 60).worldAngle).toBeCloseTo(held, 5);
    event('deviceorientation', { beta: null, gamma: null }); expect(settle(input).worldAngle).toBeCloseTo(held, 5);
    input.read(.01, .8); event('blur'); expect(input.read(.01).worldAngle).toBeUndefined();
    pose(25); expect(settle(input).worldAngle).toBeCloseTo(.8, 5);
    input.reset(-.4);
    pose(0); expect(settle(input).worldAngle).toBeCloseTo(-.4, 5);
  });
  it('ignores stale permission denial after a newer successful permission request', async () => {
    let deny!: (permission: string) => void;
    surface.DeviceOrientationEvent = { requestPermission: () => new Promise<string>(resolve => { deny = resolve; }) };
    const input = controller(); const old = input.enableMotion();
    surface.DeviceOrientationEvent = { requestPermission: async () => 'granted' };
    await input.enableMotion(); deny('denied'); await old;
    pose(0);
    expect(input.mode).toBe('Motion — angle control');
  });

  it('measures the steering-wheel angle through vertical and upside down, independent of Euler aliasing', () => {
    for (const pitch of [0, 30, 60, 75]) {
      for (const bank of [-170, -120, -90, -45, 0, 10, 45, 89, 90, 91, 135, 179]) {
        const { beta, gamma } = steer(bank, pitch);
        expect(screenBank(beta, gamma, 0)).toBeCloseTo(bank, 6);
      }
    }
    expect(screenBank(80, 90, 0)).toBeCloseTo(10);
    expect(screenBank(90, 0, 0)).toBeCloseTo(0);
    expect(screenBank(0, 90, 0)).toBeCloseTo(90);
    expect(screenBank(-90, 0, 0)).toBeCloseTo(-180);
    expect(screenBank(89, 80, 0)).toBeCloseTo(screenBank(91, -80, 0));
    // The screen-content rotation adds exactly its angle (wrapped).
    expect(screenBank(90, 0, 90)).toBeCloseTo(90);
    expect(screenBank(80, 90, 270)).toBeCloseTo(-80);
    expect(screenBank(80, 90, 180)).toBeCloseTo(-170);
  });

  it('turns the world monotonically as the phone is steered 0 to 180 degrees, with no fold-back at vertical', async () => {
    for (const sign of [1, -1]) {
      const input = controller(); await input.enableMotion();
      pose(0);
      let previous = settle(input).worldAngle!;
      for (let bank = 5; bank <= 180; bank += 5) {
        pose(sign * bank);
        const angle = settle(input).worldAngle!;
        expect((angle - previous) * sign).toBeGreaterThan(0);
        expect(angle).toBeCloseTo(bankOffset(sign * bank), 3);
        previous = angle;
      }
      input.destroy();
    }
  });

  it('keeps going past upside down to a full phone turn (unwrapped) and unwinds back', async () => {
    const input = controller(); await input.enableMotion();
    pose(0, 45);
    let previous = settle(input).worldAngle!;
    for (let bank = 3; bank <= 720; bank += 3) {
      pose(bank, 45);
      const angle = input.read(1 / 120).worldAngle!;
      expect(angle).toBeGreaterThanOrEqual(previous);
      previous = angle;
    }
    expect(settle(input).worldAngle).toBeCloseTo(bankOffset(720), 3);
    for (let bank = 717; bank >= 0; bank -= 3) pose(bank, 45);
    settle(input); expect(settle(input).worldAngle).toBeCloseTo(0, 5);
  });

  it('freezes a flat phone instead of jumping, then resumes from the frozen value', async () => {
    const input = controller(); await input.enableMotion();
    // A flat phone cannot calibrate; motion waits for a well-defined pose.
    event('deviceorientation', { beta: 0, gamma: 0 }); expect(settle(input).worldAngle).toBeUndefined();
    pose(0); pose(20); const held = settle(input).worldAngle!;
    expect(held).toBeCloseTo(bankOffset(20), 5);
    for (const [beta, gamma] of [[0, 0], [3, -5], [-4, 6], [1, 9], [-8, -3]]) {
      event('deviceorientation', { beta, gamma });
      expect(settle(input).worldAngle).toBeCloseTo(held, 6);
    }
    // Leaving flat at a different steering direction does not jump either...
    pose(-70, 60);
    expect(settle(input).worldAngle).toBeCloseTo(held, 6);
    // ...and further steering continues from the frozen bank.
    pose(-60, 60); expect(settle(input).worldAngle).toBeCloseTo(bankOffset(30), 5);
  });

  it('uses hysteresis around the flat threshold', async () => {
    const input = controller(); await input.enableMotion();
    pose(0); pose(20, 77); const tracked = settle(input).worldAngle!;
    expect(tracked).toBeCloseTo(bankOffset(20), 5);
    pose(25, 79); expect(settle(input).worldAngle).toBeCloseTo(bankOffset(25), 5); // 11° from flat: still tracking
    pose(30, 81); const frozen = settle(input).worldAngle!; // 9°: frozen
    expect(frozen).toBeCloseTo(bankOffset(25), 5);
    pose(35, 78); expect(settle(input).worldAngle).toBeCloseTo(frozen, 6); // 12°: still frozen
    pose(35, 70); expect(settle(input).worldAngle).toBeCloseTo(frozen, 6); // resumes, re-referenced
    pose(40, 70); expect(settle(input).worldAngle).toBeCloseTo(bankOffset(30), 5);
  });

  it('continues past 75° instead of clamping and permits touch override without snapping back', async () => {
    const input = controller(); await input.enableMotion();
    pose(0);
    pose(75); expect(settle(input).worldAngle).toBeCloseTo(2 * Math.PI, 5);
    pose(80); expect(settle(input).worldAngle).toBeCloseTo(bankOffset(80), 5);
    expect(bankOffset(80)).toBeGreaterThan(2 * Math.PI);
    input.setTouchTilt(1); expect(settle(input).tilt).toBeCloseTo(1, 5);
    input.read(.01, 4); input.setTouchTilt(0);
    expect(settle(input).worldAngle).toBeCloseTo(4, 5);
    pose(40); expect(settle(input).worldAngle).toBeLessThan(4);
  });

});
