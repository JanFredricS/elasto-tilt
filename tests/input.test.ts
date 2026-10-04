import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInput, screenBank } from '../src/input';
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
function settle(input: InputController) { for (let i = 0; i < 120; i++) input.read(1 / 120); return input.read(1 / 120); }
beforeEach(() => { surface = new Surface(); documentSurface = new Surface(); vi.stubGlobal('window', surface); vi.stubGlobal('document', documentSurface); });
afterEach(() => { controllers.splice(0).forEach(c => c.destroy()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('shared keyboard, touch, and calibrated motion command', () => {
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
    event('deviceorientation', { beta: 0, gamma: 12 }); expect(settle(input).worldAngle).toBe(0);
    event('deviceorientation', { beta: 0, gamma: 12.5 }); expect(settle(input).worldAngle).toBe(0);
    event('deviceorientation', { beta: 0, gamma: 22 });
    const held = settle(input); expect(held.tilt).toBe(0); expect(held.worldAngle).toBeCloseTo(27.75 * Math.PI / 180, 5);
    for (let i = 0; i < 60; i++) {
      event('deviceorientation', { beta: 0, gamma: 22 });
      expect(settle(input).worldAngle).toBeCloseTo(held.worldAngle!, 5);
    }
    input.calibrate(); expect(settle(input).worldAngle).toBeCloseTo(0, 5); expect(input.mode).toContain('Motion');
  });
  it('supports landscape axes, recalibrates screen rotation, and preserves fallback on denial', async () => {
    const input = controller(); await input.enableMotion();
    surface.screen.orientation.angle = 90; surface.screen.orientation.dispatchEvent(new Event('change'));
    event('deviceorientation', { beta: 70, gamma: 0 }); expect(settle(input).worldAngle).toBe(0);
    event('deviceorientation', { beta: 48, gamma: 0 }); expect(settle(input).worldAngle).toBeCloseTo(-63.75 * Math.PI / 180, 5);
    surface.DeviceOrientationEvent = { requestPermission: async () => 'denied' };
    expect(await input.enableMotion()).toContain('denied');
    event('keydown', { code: 'KeyD' }); expect(settle(input).tilt).toBeCloseTo(1, 5);
  });
  it('detaches listeners on destroy and ignores null sensor samples', async () => {
    const input = controller(); await input.enableMotion();
    event('deviceorientation', { beta: null, gamma: null }); expect(settle(input).tilt).toBe(0);
    input.destroy(); event('keydown', { code: 'Space' }); expect(input.read(.1).brake).toBe(false);
  });
  it('holds the last absolute pose during sensor silence and reanchors on blur or reset', async () => {
    const input = controller(); await input.enableMotion();
    event('deviceorientation', { beta: 0, gamma: 0 });
    event('deviceorientation', { beta: 0, gamma: 25 }); const held = settle(input).worldAngle!;
    for (let i = 0; i < 3600; i++) expect(input.read(1 / 60).worldAngle).toBeCloseTo(held, 5);
    event('deviceorientation', { beta: null, gamma: null }); expect(settle(input).worldAngle).toBeCloseTo(held, 5);
    input.read(.01, .8); event('blur'); expect(input.read(.01).worldAngle).toBeUndefined();
    event('deviceorientation', { beta: 0, gamma: 25 }); expect(settle(input).worldAngle).toBeCloseTo(.8, 5);
    input.reset(-.4);
    event('deviceorientation', { beta: 0, gamma: 0 }); expect(settle(input).worldAngle).toBeCloseTo(-.4, 5);
  });
  it('ignores stale permission denial after a newer successful permission request', async () => {
    let deny!: (permission: string) => void;
    surface.DeviceOrientationEvent = { requestPermission: () => new Promise<string>(resolve => { deny = resolve; }) };
    const input = controller(); const old = input.enableMotion();
    surface.DeviceOrientationEvent = { requestPermission: async () => 'granted' };
    await input.enableMotion(); deny('denied'); await old;
    event('deviceorientation', { beta: 0, gamma: 0 });
    expect(input.mode).toBe('Motion — angle control');
  });

  it('keeps bank continuous near upright Euler aliasing and respects screen direction', () => {
    expect(screenBank(0, 10, 0)).toBeCloseTo(10);
    expect(screenBank(10, 0, 90)).toBeCloseTo(10);
    expect(screenBank(10, 0, 270)).toBeCloseTo(-10);
    expect(screenBank(0, 10, 180)).toBeCloseTo(-10);
    expect(screenBank(80, 90, 0)).toBeCloseTo(10);
    expect(screenBank(89, 80, 0)).toBeCloseTo(screenBank(91, -80, 0));
  });

  it('caps full phone bank at half a turn and permits touch override without snapping back', async () => {
    const input = controller(); await input.enableMotion();
    event('deviceorientation', { beta: 0, gamma: 0 });
    event('deviceorientation', { beta: 0, gamma: 80 }); expect(settle(input).worldAngle).toBeCloseTo(Math.PI, 5);
    input.setTouchTilt(1); expect(settle(input).tilt).toBeCloseTo(1, 5);
    input.read(.01, 4); input.setTouchTilt(0);
    expect(settle(input).worldAngle).toBeCloseTo(4, 5);
    event('deviceorientation', { beta: 0, gamma: 40 }); expect(settle(input).worldAngle).toBeLessThan(4);
  });

});
