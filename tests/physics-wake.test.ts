import { afterEach, describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import type { Level, PhysicsGame } from '../src/types';

const games: PhysicsGame[] = [];
const fixture = (patch: Partial<Level> = {}): Level => ({
  id: 'wake', name: '', subtitle: '', mechanic: '', hint: '', difficulty: 1,
  spawn: { x: 0, y: .72 },
  surfaces: [{ id: 'floor', x: 0, y: -.5, w: 200, h: 1 }],
  apples: [{ id: 'far', x: 500, y: 500 }], exit: { x: 510, y: 500 },
  bounds: { min: { x: -1000, y: -1000 }, max: { x: 1000, y: 1000 } }, ...patch,
});
async function game(level = fixture()) {
  const p = await createPhysics(); p.load(level); games.push(p); return p;
}
function run(p: PhysicsGame, seconds: number, tilt = 0, brake = false, worldAngle?: number) {
  let state = p.snapshot();
  for (let i = 0; i < Math.round(seconds * 120); i++) state = p.step(1 / 120, { tilt, brake, worldAngle });
  return state;
}
afterEach(() => { for (const p of games.splice(0)) p.destroy(); });

describe('gravity changes after bodies settle', () => {
  it('follows an absolute phone angle after idling, then holds it without spinning', async () => {
    const p = await game();
    const resting = run(p, 10);
    const first = p.step(1 / 120, { tilt: 0, brake: false, worldAngle: .4 });
    expect(first.worldAngle).toBeCloseTo(2.5 / 120, 8);
    const tilted = run(p, 1, 0, false, .4);
    expect(tilted.worldAngle).toBe(.4);
    expect(tilted.bike.x - resting.bike.x).toBeGreaterThan(.5);
    const held = run(p, 1, 0, false, .4);
    expect(held.status).toBe('playing');
    expect(held.worldAngle).toBe(tilted.worldAngle);
    expect(held.bike.x - tilted.bike.x).toBeGreaterThan(.5);
  });

  it.each([-1, 1])('rolls in direction %s after ten idle seconds as it does immediately', async direction => {
    const immediate = await game(), idle = await game();
    const resting = run(idle, 10);
    const still = run(idle, 1);
    expect(still.status).toBe('playing');
    expect(still.bike.x).toBe(resting.bike.x);
    expect(still.bike.y).toBe(resting.bike.y);
    run(immediate, .4, direction); run(idle, .4, direction);
    const fresh = run(immediate, 1), resumed = run(idle, 1);
    expect(fresh.status).toBe('playing'); expect(resumed.status).toBe('playing');
    expect(fresh.bike.x * direction).toBeGreaterThan(.5);
    expect((resumed.bike.x - still.bike.x) * direction).toBeGreaterThan(.5);
    expect(resumed.bike.x).toBeCloseTo(fresh.bike.x, 1);
  });

  it('continues rolling when the brake is released at a held gravity angle', async () => {
    const p = await game();
    run(p, 10);
    run(p, .3, 1, true);
    const held = run(p, 1, 0, true);
    const released = run(p, 1);
    expect(released.status).toBe('playing');
    expect(released.worldAngle).toBe(held.worldAngle);
    expect(released.bike.x - held.bike.x).toBeGreaterThan(.5);
  });

  it('wakes resting normal and inverted props and a settled swing', async () => {
    const p = await game(fixture({
      surfaces: [
        { id: 'floor', x: 0, y: -.5, w: 200, h: 1 },
        { id: 'ceiling', x: 25, y: 4.5, w: 4, h: 1 },
      ],
      props: [
        { id: 'normal', x: 20, y: .25, w: .5, h: .5, shape: 'ball' },
        { id: 'inverse', x: 25, y: 3.75, w: .5, h: .5, shape: 'ball', inverted: true },
      ],
      swings: [{ id: 'swing', anchor: { x: 40, y: 12 }, length: 3, width: 2 }],
    }));
    const resting = run(p, 10);
    const still = run(p, 1);
    const body = (state: typeof still, id: string) => state.bodies.find(b => b.id === id)!;
    for (const id of ['normal', 'inverse', 'swing']) {
      expect(body(still, id).x).toBe(body(resting, id).x);
      expect(body(still, id).y).toBe(body(resting, id).y);
    }
    run(p, .4, 1);
    const tilted = run(p, 1);
    expect(tilted.status).toBe('playing');
    expect(body(tilted, 'normal').x - body(still, 'normal').x).toBeGreaterThan(.5);
    expect(body(tilted, 'inverse').x - body(still, 'inverse').x).toBeLessThan(-.5);
    expect(body(tilted, 'swing').x - body(still, 'swing').x).toBeGreaterThan(.5);
  });
});
