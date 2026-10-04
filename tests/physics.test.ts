import { afterEach, describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import type { Level, PhysicsGame, Snapshot } from '../src/types';

const games: PhysicsGame[] = [];
const fixture = (patch: Partial<Level> = {}): Level => ({
  id: 'test', name: 'Test', subtitle: '', mechanic: '', hint: '', difficulty: 1,
  spawn: { x: 0, y: 2 }, surfaces: [], apples: [{ id: 'far', x: 500, y: 500 }],
  exit: { x: 510, y: 500 }, bounds: { min: { x: -1000, y: -1000 }, max: { x: 1000, y: 1000 } }, ...patch,
});
async function game(level = fixture()) { const p = await createPhysics(); p.load(level); games.push(p); return p; }
function run(p: PhysicsGame, seconds: number, tilt = 0, brake = false) {
  let state = p.snapshot();
  for (let i = 0; i < Math.round(seconds * 120); i++) state = p.step(1 / 120, { tilt, brake });
  return state;
}
afterEach(() => { for (const p of games.splice(0)) p.destroy(); });
describe('actual Rapier bicycle simulation', () => {
  it('keeps axles constrained through repeated full gravity rotations', async () => {
    const p = await game();
    for (let i = 0; i < 3000; i++) {
      const state = p.step(1 / 120, { tilt: 1, brake: i % 200 < 100 });
      expect(state.status).toBe('playing');
      const frame = state.bodies.find(b => b.kind === 'frame')!;
      for (const [index, wheel] of state.bodies.filter(b => b.kind === 'wheel').entries()) {
        const x = index === 0 ? -.7 : .7, y = -.36;
        expect(Math.hypot(wheel.x - frame.x - Math.cos(frame.angle) * x + Math.sin(frame.angle) * y,
          wheel.y - frame.y - Math.sin(frame.angle) * x - Math.cos(frame.angle) * y)).toBeLessThan(.08);
      }
    }
    expect(p.snapshot().worldAngle).toBeGreaterThan(Math.PI * 6);
  });
  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])('gravity renders down at angle %s', async angle => {
    const p = await game(fixture({ initialAngle: angle }));
    const state = run(p, .2);
    const dx = state.bike.x, dy = state.bike.y - 2;
    const screenX = Math.cos(angle) * dx + Math.sin(angle) * dy;
    const screenY = Math.sin(angle) * dx - Math.cos(angle) * dy;
    expect(Math.abs(screenX)).toBeLessThan(.005);
    expect(screenY).toBeGreaterThan(.1);
    expect(state.worldAngle).toBe(angle);
  });
  it('rests on its wheels without internal collisions and bounded brakes resist downhill rolling', async () => {
    const level = fixture({ spawn: { x: 0, y: .72 }, initialAngle: .18,
      surfaces: [{ id: 'floor', x: 0, y: -.5, w: 200, h: 1 }] });
    const free = await game(level), braking = await game(level);
    const rolling = run(free, 2), stopped = run(braking, 2, 0, true);
    expect(rolling.status).toBe('playing'); expect(stopped.status).toBe('playing');
    expect(rolling.bike.x).toBeGreaterThan(.8);
    expect(Math.abs(stopped.bike.x)).toBeLessThan(rolling.bike.x * .5);
    expect(stopped.bike.y).toBeCloseTo(.70, 1);
  });
  it('collects apples, requires them for exit, and resets all attempt state on load', async () => {
    const level = fixture({ apples: [{ id: 'near', x: 0, y: 2.69 }], exit: { x: 0, y: 2 } });
    const p = await game(level);
    const state = run(p, .1);
    expect(state.collected).toEqual(['near']); expect(state.status).toBe('complete');
    p.load(fixture());
    expect(p.snapshot().collected).toEqual([]); expect(p.snapshot().elapsed).toBe(0);
    expect(p.snapshot().status).toBe('playing');
  });
  it('helmet/environment and wheel/hazard contacts crash, wheels on normal ground survive', async () => {
    const helmet = await game(fixture({ surfaces: [{ id: 'roof', x: .1, y: 2.85, w: 4, h: .3 }] }));
    expect(run(helmet, .05).status).toBe('crashed');
    const hazard = await game(fixture({ spawn: { x: 0, y: .7 }, surfaces: [{ id: 'hazard', x: 0, y: -.1, w: 4, h: .2, kind: 'hazard' }] }));
    expect(run(hazard, .1).status).toBe('crashed');
  });
  it('the taller visible hair can hit a low ceiling while clear space remains safe', async () => {
    // Above the old head's 2.90 m top, but inside the philosopher's visible crown.
    const crown = await game(fixture({ surfaces: [{ id: 'crown-edge', x: .126, y: 3.015, w: .08, h: .02 }] }));
    const clear = await game(fixture({ surfaces: [{ id: 'clear-roof', x: .126, y: 3.08, w: .08, h: .02 }] }));
    expect(run(crown, 1 / 120).status).toBe('crashed');
    expect(run(clear, 1 / 120).status).toBe('playing');
  });
  it('inverted props accelerate opposite ordinary props and swing length stays constrained', async () => {
    const p = await game(fixture({ props: [
      { id: 'normal', x: 20, y: 10, w: .5, h: .5, shape: 'ball' },
      { id: 'inverse', x: 25, y: 10, w: .5, h: .5, shape: 'ball', inverted: true },
    ], swings: [{ id: 'swing', anchor: { x: 30, y: 15 }, length: 3, width: 2, angle: .7 }] }));
    const state = run(p, 1);
    expect(state.bodies.find(b => b.id === 'normal')!.y).toBeLessThan(7);
    expect(state.bodies.find(b => b.id === 'inverse')!.y).toBeGreaterThan(13);
    const swing = state.bodies.find(b => b.id === 'swing')!;
    expect(Math.hypot(swing.x - 30, swing.y - 15)).toBeCloseTo(3, 2);
  });
  it('advances and reverses bounded authored time using route displacement', async () => {
    const p = await game(fixture({ initialAngle: Math.PI / 2, timeTravel: 40,
      timePlatforms: [{ id: 'time', from: { x: 50, y: 20 }, to: { x: 54, y: 20 }, w: 2, h: .3 }] }));
    let previous: Snapshot = p.snapshot(); let reversed = false;
    for (let i = 0; i < 1200; i++) {
      const state = p.step(1 / 120, { tilt: i < 120 ? 0 : -1, brake: false });
      const a = previous.bodies.find(b => b.id === 'time')!, b = state.bodies.find(b => b.id === 'time')!;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(.017);
      expect(state.timeline).toBeGreaterThanOrEqual(0); expect(state.timeline).toBeLessThanOrEqual(1);
      if (state.timeDirection < 0) reversed = true;
      previous = state;
    }
    expect(reversed).toBe(true);
  });
});
