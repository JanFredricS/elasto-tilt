import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createStairwayPilot, stairwayLevel } from '../src/levels/stairway';
import type { BodyView, Controls, Snapshot, Surface } from '../src/types';

// Independent oriented-box clearance: no collision/body internals are exposed to
// the pilot. Close wheels must also be on the route-facing side of each slab.
function clearance(wheel: BodyView, surface: Surface) {
  const a = surface.angle ?? 0, dx = wheel.x - surface.x, dy = wheel.y - surface.y;
  const x = dx * Math.cos(a) + dy * Math.sin(a), y = -dx * Math.sin(a) + dy * Math.cos(a);
  return Math.hypot(Math.max(Math.abs(x) - surface.w / 2, 0), Math.max(Math.abs(y) - surface.h / 2, 0)) - wheel.w / 2;
}
const wheels = (s: Snapshot) => s.bodies.filter(body => body.kind === 'wheel');
const angle = (s: Snapshot) => s.bodies.find(body => body.id === 'frame')!.angle;
const supported = (s: Snapshot, surface: Surface) => wheels(s).every(w => Math.abs(clearance(w, surface)) < .035);
async function replay() {
  const game = await createPhysics(); game.load(stairwayLevel);
  const pilot = createStairwayPilot(); let state = game.snapshot();
  const trail: string[] = [], frames: Snapshot[] = [];
  try {
    for (let i = 0; i < 120 * 240 && state.status === 'playing'; i++) {
      state = game.step(1 / 120, pilot(state)); frames.push(state);
      if (i % 600 === 0) trail.push(`${state.elapsed.toFixed(0)}s: (${state.bike.x.toFixed(1)}, ${state.bike.y.toFixed(1)}), ${state.collected.length} apples`);
    }
    return { state, frames, trail };
  } finally { game.destroy(); }
}
let run: ReturnType<typeof replay> | undefined;
const route = () => run ??= replay();

it('climbs all four steps, collects every face and tread apple, and descends to the starting door using only player controls', async () => {
  const { state, frames, trail } = await route();
  expect(state.status, trail.join(' → ')).toBe('complete');
  expect(state.collected).toEqual(stairwayLevel.apples.map(apple => apple.id));
  expect(state.elapsed).toBeGreaterThan(120);
  expect(state.elapsed).toBeLessThan(200);
  expect(Math.hypot(state.bike.x - stairwayLevel.exit.x, state.bike.y - stairwayLevel.exit.y)).toBeLessThan(2);
  const summit = frames.find(s => s.collected.length === stairwayLevel.apples.length)!;
  expect(summit.bike.y).toBeGreaterThan(44);
  expect(state.elapsed - summit.elapsed).toBeGreaterThan(60);
  expect(stairwayLevel.spawn.x).toBe(stairwayLevel.exit.x);
  expect(stairwayLevel.portals ?? []).toHaveLength(0);
});

it('supports both wheels on every vertical riser and every horizontal tread during both ascent and descent', async () => {
  const { frames } = await route();
  for (let i = 0; i < 4; i++) for (const returning of [false, true]) {
    const phase = frames.filter(s => (s.collected.length === stairwayLevel.apples.length) === returning);
    const riser = stairwayLevel.surfaces.find(s => s.id === `stair-riser-${i}`)!;
    const tread = stairwayLevel.surfaces.find(s => s.id === `stair-tread-${i}`)!;
    const vertical = phase.filter(s => supported(s, riser) && Math.abs(angle(s) - Math.PI / 2) < .08 && wheels(s).every(w => w.x < riser.x));
    const horizontal = phase.filter(s => supported(s, tread) && Math.abs(angle(s)) < .08 && wheels(s).every(w => w.y > tread.y));
    expect(vertical.length / 120, `riser ${i}, returning ${returning}`).toBeGreaterThan(1.5);
    // The summit apple is near the middle of the final tread, so its outbound
    // settled interval is shorter than the other treads but still substantial.
    expect(horizontal.length / 120, `tread ${i}, returning ${returning}`).toBeGreaterThan(.8);
  }
});

it('physically rolls through each concave foot and exposed convex crest with a quarter-turn at each edge', async () => {
  const { frames } = await route();
  const ascending = frames.filter(s => s.collected.length < stairwayLevel.apples.length);
  for (let i = 0; i < 4; i++) for (const kind of ['foot', 'crest']) {
    const corner = stairwayLevel.surfaces.filter(s => s.id.startsWith(`stair-${kind}-${i}-`));
    const contact = ascending.filter(s => wheels(s).every(w => corner.some(surface => Math.abs(clearance(w, surface)) < .04)));
    expect(contact.length / 120, `${kind} ${i}`).toBeGreaterThan(.5);
    const first = contact[0], last = contact.at(-1)!;
    expect(first).toBeDefined(); expect(last).toBeDefined();
    const change = angle(last) - angle(first);
    expect(kind === 'foot' ? change : -change, `${kind} ${i}`).toBeGreaterThan(.65);
    expect(Math.max(...contact.map(s => Math.abs(s.worldAngle - angle(s))))).toBeLessThan(.5);
  }
});

it('keeps oversized right-angle architecture with long straight faces and only local corner fillets', () => {
  for (let i = 0; i < 4; i++) {
    const riser = stairwayLevel.surfaces.find(s => s.id === `stair-riser-${i}`)!;
    const tread = stairwayLevel.surfaces.find(s => s.id === `stair-tread-${i}`)!;
    expect(riser.h).toBe(7); expect(riser.w).toBe(.5);
    expect(tread.w).toBe(10); expect(tread.h).toBe(.5);
    expect(riser.angle ?? 0).toBe(0); expect(tread.angle ?? 0).toBe(0);
    expect(stairwayLevel.apples.some(a => a.id === `stair-face-apple-${i}` && Math.abs(a.x - riser.x) < 1.2)).toBe(true);
    expect(stairwayLevel.apples.some(a => a.id === `stair-tread-apple-${i}` && Math.abs(a.y - tread.y) < 1.2)).toBe(true);
  }
});

it('cannot be completed by idling, fixed button input, or one fixed gravity direction', async () => {
  const game = await createPhysics();
  const controls: Controls[] = [
    ...[-1, -.3, 0, .3, 1].map(tilt => ({ tilt, brake: false })),
    ...[-Math.PI / 2, .2, Math.PI / 2, Math.PI].map(worldAngle => ({ tilt: 0, worldAngle, brake: false })),
  ];
  try {
    for (const input of controls) {
      game.load(stairwayLevel); let state = game.snapshot();
      for (let i = 0; i < 120 * 200 && state.status === 'playing'; i++) state = game.step(1 / 120, input);
      expect(state.status, JSON.stringify(input)).not.toBe('complete');
      expect(state.collected.length, JSON.stringify(input)).toBeLessThan(stairwayLevel.apples.length);
    }
  } finally { game.destroy(); }
});
