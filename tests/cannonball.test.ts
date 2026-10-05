import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import {
  buildCannonball, cannonballLevel, cannonLedges, cannonPilotFor, CANNON_PILOT, CANNON_SHAPE, createCannonballPilot,
} from '../src/levels/cannonball';
import type { Controls, Level, Snapshot } from '../src/types';

const frameAngle = (s: Snapshot) => s.bodies.find(body => body.id === 'frame')!.angle;

async function ride(level: Level, pilot: (state: Snapshot) => Controls, dt = 1 / 120, seconds = 40) {
  const game = await createPhysics(); game.load(level);
  let state = game.snapshot(); const frames: Snapshot[] = [];
  try {
    for (let i = 0; i < seconds / dt && state.status === 'playing'; i++) { state = game.step(dt, pilot(state)); frames.push(state); }
    return { state, frames };
  } finally { game.destroy(); }
}

describe("Newton's Cannonball", () => {
  it('is campaign map 7 and replays through the dev pilot index', () => {
    expect(levels[6]).toBe(cannonballLevel);
    expect(cannonballLevel.difficulty).toBe(7.25);
    expect(typeof createReplayPilot(6)).toBe('function');
    expect(() => createReplayPilot(levels.length)).toThrow(RangeError);
  });

  it('descends six alternating ±22° ledges into a walled pocket', () => {
    expect(cannonLedges).toHaveLength(6);
    cannonLedges.forEach((ledge, k) => {
      expect(ledge.dir).toBe(k % 2 === 0 ? 1 : -1);
      if (k > 0) expect(ledge.lip.y).toBeLessThan(cannonLedges[k - 1].lip.y);
      const slope = cannonballLevel.surfaces.find(s => s.id === `cannon-ledge-${k}`)!;
      expect(Math.abs(slope.angle! * 180 / Math.PI)).toBeCloseTo(CANNON_SHAPE.slant, 5);
      expect(Math.sign(slope.angle!)).toBe(-ledge.dir);
    });
    expect(cannonballLevel.apples.length).toBeGreaterThanOrEqual(5);
    expect(cannonballLevel.apples.length).toBeLessThanOrEqual(7);
    expect(cannonballLevel.exit.y).toBeLessThan(cannonLedges.at(-1)!.lip.y);
  });

  for (const hz of [120, 60]) it(`completes with every apple at 1/${hz} s steps using tilt only`, async () => {
    const { state, frames } = await ride(cannonballLevel, createCannonballPilot(), 1 / hz);
    expect(state.status).toBe('complete');
    expect([...state.collected].sort()).toEqual(cannonballLevel.apples.map(apple => apple.id).sort());
    expect(state.elapsed).toBeGreaterThan(12);
    expect(state.elapsed).toBeLessThan(30);
    // Bounds and crash sanity: the whole run stays inside the map and never brakes.
    const { min, max } = cannonballLevel.bounds;
    for (const s of frames) {
      expect(s.status === 'crashed').toBe(false);
      expect(s.bike.x).toBeGreaterThan(min.x); expect(s.bike.x).toBeLessThan(max.x);
      expect(s.bike.y).toBeGreaterThan(min.y); expect(s.bike.y).toBeLessThan(max.y);
      expect(Math.abs(s.worldAngle)).toBeLessThan(Math.PI / 2);
    }
    // After each leap the bike settles flush on the oppositely slanted ledge and rolls back down it.
    for (const [k, ledge] of cannonLedges.entries()) if (k > 0) {
      const slant = -ledge.dir * CANNON_SHAPE.slant * Math.PI / 180;
      const flush = frames.filter(s => Math.abs(frameAngle(s) - slant) < 2 * Math.PI / 180
        && (s.bike.x - ledge.lip.x) * -ledge.dir > 1.5 && Math.abs(s.bike.y - ledge.lip.y) < 2.5);
      expect(flush.length / hz, `ledge ${k}`).toBeGreaterThan(.5);
    }
  });

  it('crashes on the first leap when the world is never twisted', async () => {
    const { state } = await ride(cannonballLevel, () => ({ tilt: 0, brake: false }), 1 / 120, 20);
    expect(state.status).toBe('crashed');
    expect(state.collected.length).toBeLessThan(cannonballLevel.apples.length);
    expect(state.bike.y).toBeGreaterThan(cannonLedges[2].lip.y);
  });

  it('crashes when the rider holds a lean but never swings gravity back in flight', async () => {
    const lean = CANNON_PILOT.ride * Math.PI / 180;
    const { state } = await ride(cannonballLevel, s => ({ tilt: Math.max(-1, Math.min(1, (lean - s.worldAngle) * 8)), brake: false }), 1 / 120, 20);
    expect(state.status).not.toBe('complete');
  });

  it('is not tuned to a knife edge: nearby ledge spacings still complete', async () => {
    for (const change of [{ step: CANNON_SHAPE.step - .1 }, { step: CANNON_SHAPE.step + .1 }, { column: CANNON_SHAPE.column - .1 }, { column: CANNON_SHAPE.column + .1 }]) {
      const { level, ledges } = buildCannonball({ ...CANNON_SHAPE, ...change });
      const { state } = await ride(level, cannonPilotFor(ledges, CANNON_PILOT));
      expect(state.status, JSON.stringify(change)).toBe('complete');
    }
  });
});
