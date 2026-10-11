import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import { paletteFor } from '../src/art-direction';
import {
  buildKepler, createKeplerPilot, KEPLER_APPLES, KEPLER_HINTS, KEPLER_PILOT, KEPLER_SHAPE, keplerPilotFor, keplersOrbitLevel, keplerTrack,
} from '../src/levels/kepler';
import type { Controls, Level, Snapshot } from '../src/types';

async function ride(level: Level, pilot: (state: Snapshot) => Controls, dt = 1 / 120, seconds = 45) {
  const game = await createPhysics(); game.load(level);
  let state = game.snapshot(); const frames: Snapshot[] = [], inputs: Controls[] = [];
  try {
    for (let i = 0; i < seconds / dt && state.status === 'playing'; i++) {
      const input = pilot(state); inputs.push(input);
      state = game.step(dt, input); frames.push(state);
    }
    return { state, frames, inputs };
  } finally { game.destroy(); }
}

const { roofY, tip, lip, padFrom, padTo, bottom, alcove, door, broadRight, broadLeft, tight } = keplerTrack;
const apple = (id: string) => keplersOrbitLevel.apples.find(a => a.id === id)!;
/** The same map with the brass pad taken out: the chain's own stone chord is left at the foot. */
const stoneLevel = buildKepler(KEPLER_SHAPE, KEPLER_APPLES, KEPLER_HINTS, false).level;
const firstIndex = (frames: Snapshot[], id: string) => frames.findIndex(s => s.collected.includes(id));

describe('Kepler’s Orbit', () => {
  it('is campaign map 7, between the Pendulum Mill and Escher’s Orchard, in the rose palette', () => {
    expect(levels[6]).toBe(keplersOrbitLevel);
    expect(keplersOrbitLevel.name).toBe('Kepler’s Orbit');
    expect(keplersOrbitLevel.subtitle).toBe('Equal areas in equal times');
    expect(keplersOrbitLevel.difficulty).toBe(6.75);
    expect(levels[5].id).toBe('pendulum-mill');
    expect(levels[7].id).toBe('eschers-orchard');
    expect(typeof createReplayPilot(6)).toBe('function');
    expect(paletteFor('keplers-orbit')).toBe(paletteFor('eschers-orchard'));
  });

  it('is one egg-shaped chain: broad corners over a tight end, a hole in the roof into a door alcove', () => {
    // The broad end's corners are wider than the tight end, both inside the proven 2–6 m range.
    expect(KEPLER_SHAPE.broad).toBeGreaterThan(KEPLER_SHAPE.tight);
    for (const r of [KEPLER_SHAPE.broad, KEPLER_SHAPE.tight]) { expect(r).toBeGreaterThanOrEqual(2); expect(r).toBeLessThanOrEqual(6); }
    expect(broadRight.x - broadLeft.x).toBeGreaterThan(2 * KEPLER_SHAPE.tight);
    expect(tight.y).toBeLessThan(broadRight.y - 8);
    // Everything ridden is one seamless chain.
    const way = keplersOrbitLevel.surfaces.filter(s => s.chain === 'kepler-orbit');
    expect(way.length).toBe(keplersOrbitLevel.surfaces.length - 1);
    const ends = way.map(s => {
      const c = Math.cos(s.angle!), n = Math.sin(s.angle!);
      const fx = s.x - n * s.h / 2, fy = s.y + c * s.h / 2;
      return [{ x: fx - c * s.w / 2, y: fy - n * s.w / 2 }, { x: fx + c * s.w / 2, y: fy + n * s.w / 2 }];
    });
    for (let i = 1; i < ends.length; i++) expect(Math.hypot(ends[i][0].x - ends[i - 1][1].x, ends[i][0].y - ends[i - 1][1].y)).toBeLessThan(1e-6);
    // The hole: the kicker tip and the far lip face each other across the roof, the lip a little further out.
    expect(tip.x - lip.x).toBeGreaterThan(3);
    expect(Math.abs(tip.y - roofY)).toBeLessThan(.5);
    expect(lip.y).toBeGreaterThan(roofY);
    // Beyond it, an alcove over 2.4 m deep holds the door, above the roof line.
    expect(alcove.top - roofY).toBeGreaterThan(2.4);
    expect(alcove.right - alcove.left).toBeGreaterThan(2.4);
    expect(door.y).toBeGreaterThan(roofY + 1);
    expect(door.x).toBeGreaterThan(alcove.left); expect(door.x).toBeLessThan(alcove.right);
  });

  it('has one brass pad with the default restitution across the foot of the tight end, where the ride starts', () => {
    const pads = keplersOrbitLevel.surfaces.filter(s => s.kind === 'spring');
    expect(pads).toHaveLength(1);
    expect(pads[0].restitution).toBeUndefined();
    expect(pads[0].chain).toBeUndefined();
    expect(padFrom.y).toBeCloseTo(padTo.y, 9);
    expect(Math.min(...keplerTrack.points.map(q => q.y))).toBeCloseTo(bottom, 9);
    expect(padTo.x - padFrom.x).toBeGreaterThan(2.4);
    expect(Math.abs((padFrom.x + padTo.x) / 2 - tight.x)).toBeLessThan(1e-9);
    expect(keplersOrbitLevel.spawn.y).toBeCloseTo(bottom + .72, 9);
    expect(keplersOrbitLevel.spawn.x).toBeCloseTo(tight.x, 9);
  });

  it('hangs the perihelion apple over the pad, out of reach of a rolling rider, and the aphelion in the hole’s mouth', () => {
    expect(keplersOrbitLevel.apples).toHaveLength(3);
    const peri = apple('kepler-perihelion'), aph = apple('kepler-aphelion'), roof = apple('kepler-roof');
    expect(peri.y - bottom).toBeGreaterThan(2.2);
    expect(peri.x).toBeGreaterThan(padFrom.x); expect(peri.x).toBeLessThan(padTo.x);
    // The aphelion sits beyond the roof line, between the alcove's walls.
    expect(aph.y - roofY).toBeGreaterThan(.5);
    expect(aph.x).toBeGreaterThan(alcove.left); expect(aph.x).toBeLessThan(alcove.right);
    expect(roof.y).toBeLessThan(roofY); expect(roof.x).toBeGreaterThan(tip.x);
  });

  for (const hz of [120, 60]) it(`rides round, is thrown up by the pad, yields on the roof and falls up to the door at 1/${hz} s`, async () => {
    const { state, frames } = await ride(keplersOrbitLevel, createKeplerPilot(), 1 / hz);
    expect(state.status).toBe('complete');
    expect([...state.collected].sort()).toEqual(keplersOrbitLevel.apples.map(a => a.id).sort());
    expect(state.elapsed).toBeGreaterThan(15); expect(state.elapsed).toBeLessThan(40);
    // A full lap first: over the hole at speed, round the tight end, then the perihelion from a pad throw.
    const peri = firstIndex(frames, 'kepler-perihelion'), aph = firstIndex(frames, 'kepler-aphelion');
    expect(peri).toBeGreaterThan(firstIndex(frames, 'kepler-roof'));
    expect(aph).toBeGreaterThan(peri);
    expect(frames[peri].worldAngle).toBeGreaterThan(1.5 * Math.PI);
    const vy = (i: number) => (frames[i].bike.y - frames[i - 1].bike.y) * hz;
    // The pad's throw: from falling fast to rising fast within two steps, at the foot of the tight end.
    let thrown = false;
    for (let i = 3; i <= peri; i++) thrown ||= frames[i].bike.y < bottom + 2 && vy(i - 2) < -2 && vy(i) > 2;
    expect(thrown).toBe(true);
    // The exit is upward: the bike leaves through the roof into the alcove, at the world's roof-upright.
    expect(state.bike.y).toBeGreaterThan(roofY);
    expect(Math.abs(Math.cos(state.worldAngle) + 1)).toBeLessThan(.05);
    const { min, max } = keplersOrbitLevel.bounds;
    for (const s of frames) {
      expect(s.bike.x).toBeGreaterThan(min.x); expect(s.bike.x).toBeLessThan(max.x);
      expect(s.bike.y).toBeGreaterThan(min.y); expect(s.bike.y).toBeLessThan(max.y);
    }
  });

  it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false }, { tilt: 1, brake: true }])(
    'is not completed by fixed controls (%o)', async control => {
      const { state, frames } = await ride(keplersOrbitLevel, () => control, 1 / 120, 40);
      expect(state.status).not.toBe('complete');
      expect(frames.some(s => s.collected.includes('kepler-aphelion') && s.collected.length === 3)).toBe(false);
    });

  it('is a trap for speed: a rider who never slows is thrown over the hole lap after lap and never reaches the alcove', async () => {
    const { state, frames } = await ride(keplersOrbitLevel, keplerPilotFor(keplerTrack, KEPLER_PILOT, false), 1 / 120, 60);
    expect(state.status).toBe('playing');
    expect([...state.collected].sort()).toEqual(['kepler-perihelion', 'kepler-roof']);
    expect(Math.max(...frames.map(s => s.bike.y))).toBeLessThan(roofY);
    let passes = 0;
    for (let i = 1; i < frames.length; i++) if (frames[i - 1].bike.x > tip.x && frames[i].bike.x <= tip.x && frames[i].bike.y > roofY - 2.5) passes++;
    expect(passes).toBeGreaterThanOrEqual(3);
  });

  it('needs the pad: with plain stone at the foot of the tight end the perihelion apple is never reached', async () => {
    // The same closed-loop pilot rides lap after lap but no dive into the tight end lifts it to the apple.
    const closed = await ride(stoneLevel, createKeplerPilot(), 1 / 120, 60);
    expect(closed.state.status).not.toBe('complete');
    expect(closed.state.collected).not.toContain('kepler-perihelion');
    expect(closed.state.collected).toContain('kepler-roof');
    expect(closed.state.worldAngle).toBeGreaterThan(3 * 2 * Math.PI);
    // And the exact inputs of the successful ride, replayed over stone, do not complete either.
    const { inputs } = await ride(keplersOrbitLevel, createKeplerPilot());
    const game = await createPhysics(); game.load(stoneLevel);
    let state = game.snapshot();
    for (const input of inputs) { if (state.status !== 'playing') break; state = game.step(1 / 120, input); }
    game.destroy();
    expect(state.status).not.toBe('complete');
    expect(state.collected).not.toContain('kepler-perihelion');
  });
});
