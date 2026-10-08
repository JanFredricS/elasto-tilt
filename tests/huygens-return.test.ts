import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createHuygensPilot, HUYGENS as H, huygensReturnLevel as level } from '../src/levels/huygens-return';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

const swingOf = (state: Snapshot) => state.bodies.find(body => body.id === H.swing)!;
async function ride(pilot: (state: Snapshot) => Controls, seconds = 75, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}

it('lines the plank up with the start shelf at rest and with the tower when swung a quarter turn', () => {
  const [swing] = level.swings!;
  expect(level.swings).toHaveLength(1);
  // At rest (θ = 0) the plank's top face is the shelf's top, its underside the shelf's underside.
  expect(swing.anchor.y - swing.length + .12).toBeCloseTo(H.shelf.top, 6);
  expect(swing.anchor.y - swing.length - .12).toBeCloseTo(H.shelf.bottom, 6);
  // At θ = 90° the top face is the tower's west face, the underside the fin's east face.
  expect(swing.anchor.x + swing.length - .12).toBeCloseTo(H.westFace, 6);
  expect(swing.anchor.x + swing.length + .12).toBeCloseTo(H.westFace + H.course.fin, 6);
  // The door is under the start shelf: only the underside ride reaches it.
  expect(level.exit.y).toBeLessThan(H.shelf.bottom);
});

it('lays the saw-teeth flush with the running level: no lip, no trench, no spikes, no JUMP sign', () => {
  const C = H.course, [z0, z1] = C.zigzag;
  // The crown's radius sets the course's running level; the run-up, every tooth tip and the runway share it.
  expect(C.high).toBe(6);
  for (let s = 0; s <= z0; s += .5) expect(H.profile(s)).toBeCloseTo(C.high, 9);
  for (let s = z0; s <= z1 + 1e-9; s += C.pitch) expect(H.profile(s)).toBeCloseTo(C.high, 9);
  for (let s = z1; s < C.easing[0]; s += .5) expect(H.profile(s)).toBeCloseTo(C.high, 9);
  expect(Math.max(...Array.from({ length: 400 }, (_, i) => H.profile(i * C.end / 400)))).toBeCloseTo(C.high, 9);
  // Steep V notches, far deeper than the wheel (radius .34) can sink: it settles a full radius below the tips.
  for (let s = z0 + C.pitch / 2; s < z1; s += C.pitch) expect(H.profile(s)).toBeCloseTo(C.high - C.depth, 9);
  const half = Math.atan2(C.pitch / 2, C.depth);
  expect(C.depth - .34 / Math.sin(half)).toBeGreaterThan(.34);
  expect(Math.atan2(C.depth, C.pitch / 2)).toBeGreaterThan(65 * Math.PI / 180);
  // A long runway at the same level before the easing down to the fin.
  expect(C.landing[0]).toBe(z1); expect(C.landing[1] - C.landing[0]).toBeGreaterThanOrEqual(8);
  // Plain stone: a slow rider is stopped, not killed.
  expect(level.surfaces.filter(surface => surface.kind === 'hazard')).toHaveLength(0);
  expect(level.routeHints!.map(hint => hint.label)).not.toContain('JUMP');
  const apple = level.apples.find(item => item.id === 'huygens-teeth')!, along = H.crown - apple.y;
  expect(along).toBeGreaterThan(z0); expect(along).toBeLessThan(z1);
});

it('completes Huygens’ Return: out on the swing, skimming the saw-teeth, home beneath the plank', async () => {
  let maxTheta = 0, minLater = Infinity, crossed = false, rodeUnder = false;
  const state = await ride(createHuygensPilot(), 75, level, s => {
    const theta = swingOf(s).angle;
    maxTheta = Math.max(maxTheta, theta);
    const z = s.bike.x - H.westFace, along = H.crown - s.bike.y;
    if (along > H.course.landing[0] + 1 && z > 0) crossed = true;
    if (crossed) minLater = Math.min(minLater, theta);
    // Beneath the plank: the bike is farther from the anchor than the plank.
    const r = Math.hypot(s.bike.x - H.anchor.x, s.bike.y - H.anchor.y);
    if (theta > .3 && theta < 1.2 && r > H.length + .3) rodeUnder = true;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(maxTheta).toBeGreaterThan(Math.PI / 2 - .02);
  expect(crossed).toBe(true);
  expect(rodeUnder).toBe(true);
  expect(minLater).toBeLessThan(.05);
  expect(state.bike.y).toBeLessThan(H.shelf.bottom);
  expect(state.elapsed).toBeLessThan(70);
}, 120_000);

it.each([6.5, 9])('skimming the saw-teeth tolerates a %f m/s target crossing speed', async speed => {
  const state = await ride(createHuygensPilot(speed));
  expect(state.status).toBe('complete');
}, 120_000);

it.each([-.1, .1])('skimming the saw-teeth tolerates leaning the world %f rad off level', async lean => {
  const state = await ride(createHuygensPilot(8, lean));
  expect(state.status).toBe('complete');
}, 120_000);

it.each([1.4, 2])('the crown tolerates rounding it at %f m/s', async rounding => {
  const state = await ride(createHuygensPilot(8, 0, .65, rounding));
  expect(state.status).toBe('complete');
}, 120_000);

it.each([.5, .8])('re-parking the plank tolerates tipping the world %f rad past level', async park => {
  const state = await ride(createHuygensPilot(8, 0, park));
  expect(state.status).toBe('complete');
}, 120_000);

it.each([2, 3])('a rider who rolls onto the saw-teeth at %f m/s drops into a notch and is stuck there', async speed => {
  // The same pilot, still tipping the world forward to hold its target speed over the teeth.
  let maxAlong = -Infinity, entry = 0, last = 0;
  const state = await ride(createHuygensPilot(speed), 50, level, s => {
    const along = H.crown - s.bike.y;
    if (s.bike.x - H.westFace > 3) {
      if (along < H.course.zigzag[0]) entry = (along - last) * 120;
      maxAlong = Math.max(maxAlong, along);
    }
    last = along;
  });
  expect(entry).toBeLessThan(2.5);
  // Not killed: stopped, and never across.
  expect(state.status).toBe('playing');
  expect(maxAlong).toBeGreaterThan(H.course.zigzag[0] + 1);
  expect(maxAlong).toBeLessThan(H.course.zigzag[1]);
  expect(state.collected).not.toContain('huygens-underside');
}, 120_000);

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: true }, { tilt: -1, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 30);
  expect(state.status).not.toBe('complete');
}, 60_000);

it('the campaign replay table drives Huygens’ Return at its own index', async () => {
  const index = levels.indexOf(level);
  expect(index).toBeGreaterThan(0);
  expect((await ride(createReplayPilot(index), 75)).status).toBe('complete');
}, 120_000);
