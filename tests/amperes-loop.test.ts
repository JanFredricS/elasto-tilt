import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import {
  AMPERE_PILOT, AMPERE_SHAPE, ampereApples, ampereHints, ampereTrack, ampereTrackFor, amperePilotFor, amperesLoopLevel as level,
  buildAmperesLoop, createAmperePilot, type AmperePilotTuning, type AmpereShape,
} from '../src/levels/amperes-loop';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

async function ride(pilot: (state: Snapshot) => Controls, seconds = 70, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}
/** The same map and pilot with some shape or tuning changed. */
function variant(shape: Partial<AmpereShape> = {}, tuning: Partial<AmperePilotTuning> = {}) {
  const s = { ...AMPERE_SHAPE, ...shape }, track = ampereTrackFor(s);
  return { map: buildAmperesLoop(s, ampereApples(track, s), ampereHints(track)).level, pilot: amperePilotFor(track, { ...AMPERE_PILOT, ...tuning }) };
}

it('hangs the ring over the lip with a clear gap below its floor and keeps the exit by the start', () => {
  const { marks, ringCentre: O, ringTo } = ampereTrack;
  // The ring's opening is over the lip: its floor ends left of the lip, its landing wall stands right of it.
  expect(ringTo.x).toBeLessThan(marks.lip.x - 1.5);
  expect(O.x + AMPERE_SHAPE.ring).toBeGreaterThan(marks.lip.x + 1);
  // The floor's end is above the tower top, across a gap.
  expect(ringTo.y).toBeGreaterThan(marks.top.y + 1);
  expect(marks.top.x - ringTo.x).toBeGreaterThan(2);
  // Plain stone, no hazards; the exit sits in the start bowl.
  expect(level.surfaces.every(surface => surface.kind === 'ground')).toBe(true);
  expect(Math.hypot(level.exit.x - level.spawn.x, level.exit.y - level.spawn.y)).toBeLessThan(3);
  expect(level.apples).toHaveLength(6);
  expect(level.routeHints!.filter(hint => hint.spin)).not.toHaveLength(0);
});

it('completes Ampère’s Loop: jump into the ring, a full lap inside, drop to the tower and home upside down', async () => {
  let ringLap = 0, onTop = false, inverted = false, last = 0, turned = 0;
  const { ringCentre: O, marks, underY } = ampereTrack;
  const state = await ride(createAmperePilot(), 70, level, s => {
    const r = Math.hypot(s.bike.x - O.x, s.bike.y - O.y);
    if (r < AMPERE_SHAPE.ring) {
      const a = Math.atan2(s.bike.y - O.y, s.bike.x - O.x);
      turned += Math.atan2(Math.sin(a - last), Math.cos(a - last)); last = a;
      ringLap = Math.max(ringLap, turned);
    } else last = Math.atan2(s.bike.y - O.y, s.bike.x - O.x);
    if (s.bike.x > marks.top.x + 1 && s.bike.y > marks.top.y && s.bike.y < marks.top.y + 1.5) onTop = true;
    // Beneath the runway, the world turned upside down.
    if (s.bike.y < underY && s.bike.x > 0 && Math.abs(Math.cos(s.worldAngle)) > .9 && Math.cos(s.worldAngle) < 0) inverted = true;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(ringLap).toBeGreaterThan(1.5 * Math.PI);
  expect(onTop).toBe(true);
  expect(inverted).toBe(true);
}, 20_000);

it.each<[string, Partial<AmperePilotTuning>]>([
  ['a later charge', { charge: 75 }], ['a steeper charge', { charge: 85 }],
  ['less forward tip on the floor', { drop: 45 }], ['more forward tip on the floor', { drop: 55 }],
  ['a slower creep home', { home: 1.5 }], ['a faster creep home', { home: 2.5 }],
])('tolerates %s', async (_, tuning) => {
  const { map, pilot } = variant({}, tuning);
  expect((await ride(pilot, 70, map)).status).toBe('complete');
}, 20_000);

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: false }, { tilt: -1, brake: false }, { tilt: 1, brake: true }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 30);
  expect(state.status).not.toBe('complete');
}, 20_000);

it('is not completed with gravity held fixed at the charge angle', async () => {
  const state = await ride(s => ({ tilt: Math.max(-1, Math.min(1, (80 * Math.PI / 180 - s.worldAngle) * 8)), brake: false }), 30);
  expect(state.status).not.toBe('complete');
}, 20_000);

it('rolling off the ring’s floor without tipping the world forward dives into the tower’s nose', async () => {
  const { map, pilot } = variant({}, { drop: 20 });
  const state = await ride(pilot, 40, map);
  expect(state.status).toBe('crashed');
  expect(state.collected).not.toContain('ampere-under');
}, 20_000);

it('a short tower top cannot stop the landing: the rider is flung off', async () => {
  const { map, pilot } = variant({ top: 3 });
  const state = await ride(pilot, 40, map);
  expect(state.status).toBe('crashed');
}, 20_000);

it('closing the gap under the ring blocks the jump', async () => {
  const { map, pilot } = variant({ ringIn: .4 });
  const state = await ride(pilot, 20, map);
  expect(state.status).toBe('crashed');
  expect(state.collected).not.toContain('ampere-ring-roof');
}, 20_000);

it('the campaign replay table drives Ampère’s Loop at its own index', async () => {
  const index = levels.indexOf(level);
  expect(index).toBe(17);
  expect((await ride(createReplayPilot(index), 70)).status).toBe('complete');
}, 20_000);
