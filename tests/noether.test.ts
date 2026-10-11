import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createHalfPilot, createNoetherPilot, NOETHER as N, noetherLevel as level, twinPoint, type HalfOptions } from '../src/levels/noether';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const body = (state: Snapshot, id: string) => state.bodies.find(b => b.id === id)!;
const outwardApples = level.apples.filter(apple => !apple.id.endsWith('-return')).map(apple => apple.id);
const returnApples = level.apples.filter(apple => apple.id.endsWith('-return')).map(apple => apple.id);

async function ride(pilot: (state: Snapshot) => Controls, seconds = 160, map: Level = level, watch?: (state: Snapshot, input: Controls) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  try {
    for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) {
      const input = pilot(state);
      state = game.step(1 / 120, input); watch?.(state, input);
    }
    return state;
  } finally { game.destroy(); }
}
async function demonstrate() {
  const frames: Snapshot[] = [];
  const state = await ride(createNoetherPilot(), 160, level, s => frames.push(s));
  return { state, frames };
}
let run: ReturnType<typeof demonstrate> | undefined;
const route = () => run ??= demonstrate();

it('is its own image under a half turn about the origin: every stone, plank, wedge, piston and apple has a twin', () => {
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const originals = level.surfaces.filter(s => !s.id.endsWith('-twin'));
  expect(originals.length * 2).toBe(level.surfaces.length);
  for (const s of originals) {
    const twin = level.surfaces.find(t => t.id === `${s.id}-twin`)!;
    expect(twin, s.id).toBeDefined();
    expect(near(twin.x, -s.x) && near(twin.y, -s.y) && near(twin.w, s.w) && near(twin.h, s.h), s.id).toBe(true);
    expect(Math.abs(wrap((twin.angle ?? 0) - (s.angle ?? 0) - Math.PI)), s.id).toBeLessThan(1e-9);
    expect(twin.kind).toBe(s.kind);
  }
  const [swing, swingTwin] = level.swings!;
  expect(swingTwin.anchor).toEqual(twinPoint(swing.anchor));
  expect({ ...swingTwin, id: swing.id, anchor: swing.anchor, angle: swing.angle }).toEqual(swing);
  const [wedge, wedgeTwin] = level.props!;
  expect(wedgeTwin).toMatchObject({ ...twinPoint(wedge), angle: Math.PI, w: wedge.w, h: wedge.h, toe: wedge.toe, damping: wedge.damping,
    socket: { ...wedge.socket, ...twinPoint(wedge.socket!) } });
  const chock = level.props!.find(p => p.id === N.ids.chock)!, chockTwin = level.props!.find(p => p.id === `${N.ids.chock}-twin`)!;
  expect(chockTwin).toMatchObject({ ...twinPoint(chock), angle: Math.PI, w: chock.w, h: chock.h, density: chock.density, friction: chock.friction });
  const pistons = level.timePlatforms!.filter(t => !t.id.endsWith('-twin'));
  for (const t of pistons) {
    const twin = level.timePlatforms!.find(u => u.id === `${t.id}-twin`)!;
    expect([twin.from, twin.to, twin.period, twin.offset]).toEqual([twinPoint(t.from), twinPoint(t.to), t.period, t.offset]);
  }
  for (const id of outwardApples) {
    const apple = level.apples.find(a => a.id === id)!, twin = level.apples.find(a => a.id === `${id}-return`)!;
    expect({ x: twin.x, y: twin.y }).toEqual(twinPoint(apple));
  }
  expect(outwardApples).toHaveLength(5);
  expect(level.bounds.min).toEqual(twinPoint(level.bounds.max));
  expect(level.portals ?? []).toHaveLength(0);
  // The door is on the home deck beside the spawn, and the spawn frame sits .72 above the deck.
  expect(level.spawn.y).toBeCloseTo(N.T0 + .72, 9);
  expect(Math.abs(level.exit.x - level.spawn.x)).toBeLessThan(4);
  expect(level.difficulty).toBe(15.5);
});

it('rides the top face out, rounds the east nose, rides the underside home inverted, and opens the door after the circuit', async () => {
  const { state, frames } = await route();
  expect(state.status).toBe('complete');
  expect([...state.collected].sort()).toEqual(level.apples.map(apple => apple.id).sort());
  // All five outward apples come before any return apple: the circuit is two halves.
  const order = state.collected;
  expect(order.slice(0, 5).sort()).toEqual([...outwardApples].sort());
  expect(order.slice(5).sort()).toEqual([...returnApples].sort());
  expect(state.elapsed).toBeGreaterThan(90);
  expect(state.elapsed).toBeLessThan(150);
  // The door is behind the spawn: the rider sets off away from it and reaches it only at the end, off the west nose.
  expect(level.exit.x).toBeLessThan(level.spawn.x);
  const turnIndex = frames.findIndex(s => s.bike.y < N.T0 && s.bike.x > 0);
  const firstAtDoor = frames.findIndex(s => Math.hypot(s.bike.x - level.exit.x, s.bike.y - level.exit.y) < 2);
  expect(firstAtDoor).toBeGreaterThan(turnIndex);
  expect(frames.slice(0, turnIndex).every(s => s.bike.x > level.exit.x + 2)).toBe(true);
  const turned = frames[turnIndex];
  expect(turned.collected.sort()).toEqual([...outwardApples].sort());
  // On the underside the world is turned halfway round, so in its own frame the rider rides the
  // return as the outward ride: on the high decks, the world sits within .35 rad of level (top) or
  // of a half turn (underside) for about the same share of the time.
  const level0 = (s: Snapshot, sign: number) => Math.abs(wrap(s.worldAngle - (sign < 0 ? Math.PI : 0))) < .35;
  const high = (s: Snapshot, sign: number) => sign * s.bike.y > N.T1 - 1 && sign * s.bike.y < N.E + 1;
  const top = frames.slice(0, turnIndex).filter(s => high(s, 1)), underside = frames.slice(turnIndex).filter(s => high(s, -1));
  expect(underside.length / 120).toBeGreaterThan(10);
  const share = (phase: Snapshot[], sign: number) => phase.filter(s => level0(s, sign)).length / phase.length;
  expect(share(underside, -1)).toBeGreaterThan(.35);
  expect(Math.abs(share(underside, -1) - share(top, 1))).toBeLessThan(.15);
  expect(Math.hypot(state.bike.x - level.exit.x, state.bike.y - level.exit.y)).toBeLessThan(2);
}, 60_000);

it('meets every mechanic twice: both planks swing a quarter turn, both wedges are seated by the rider, both lifts carry the rider up', async () => {
  const { frames } = await route();
  const turn = frames.findIndex(s => s.bike.y < N.T0 && s.bike.x > 0);
  const out = frames.slice(0, turn), back = frames.slice(turn);
  // Planks: the original reaches the tower on the way out, the twin (in its own frame) on the way back.
  expect(Math.max(...out.map(s => body(s, N.ids.swing).angle))).toBeGreaterThan(Math.PI / 2 - .03);
  expect(Math.max(...back.map(s => wrap(body(s, `${N.ids.swing}-twin`).angle - Math.PI)))).toBeGreaterThan(Math.PI / 2 - .03);
  // Wedges: the original is seated on the way out, the twin only on the way back, and each was pushed (not slid) home.
  expect(body(out.at(-1)!, N.ids.wedge).settled).toBe(true);
  expect(body(out.at(-1)!, `${N.ids.wedge}-twin`).settled).toBeFalsy();
  expect(body(back.at(-1)!, `${N.ids.wedge}-twin`).settled).toBe(true);
  const [wedge] = level.props!;
  for (const [phase, id, frame] of [[out, N.ids.wedge, (s: Snapshot) => s], [back, `${N.ids.wedge}-twin`, (s: Snapshot) => ({ ...s, bike: twinPoint(s.bike) })]] as const) {
    const seatedAt = phase.find(s => body(s, id).settled)!;
    const bike = frame(seatedAt).bike;
    expect(Math.abs(bike.x - wedge.socket!.x), id).toBeLessThan(6);
    // The rider is on the deck behind it or already on its ramp, never below the deck.
    expect(bike.y, id).toBeGreaterThan(N.T1);
    expect(bike.y, id).toBeLessThan(N.E + 1.5);
  }
  // Lifts: the rider rises the 3.5 m shaft on a piston in each half (in that half's frame).
  for (const [phase, sign] of [[out, 1], [back, -1]] as const) {
    const onLift = phase.filter(s => Math.abs(sign * s.bike.x - N.lift.x) < .6 && sign * s.bike.y > N.pit.ledge && sign * s.bike.y < N.T1 + 1);
    const heights = onLift.map(s => sign * s.bike.y);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(3);
  }
}, 60_000);

it('the campaign replay table drives Noether’s Symmetry at its own index, the final map', async () => {
  const index = levels.indexOf(level);
  expect(index).toBe(levels.length - 1);
  expect((await ride(createReplayPilot(index))).status).toBe('complete');
}, 60_000);

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: true }, { tilt: -1, brake: false }, { tilt: .3, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 40);
  expect(state.status).not.toBe('complete');
  expect(state.collected.length).toBeLessThan(level.apples.length);
}, 60_000);

it('needs the spring’s throw led forward on both halves: without the lean the rider falls on the spikes', async () => {
  const [s0, s1] = N.pit.spikes;
  // Outward.
  let state = await ride(createNoetherPilot({ lean: 0 }), 60);
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeGreaterThan(s0 - 1); expect(state.bike.x).toBeLessThan(s1 + 1);
  expect(state.collected).not.toContain('noether-apple-lift');
  // Return: the outward half as demonstrated, then no lean over the twin pit.
  state = await ride(createNoetherPilot({}, { lean: 0 }), 160);
  expect(state.status).toBe('crashed');
  expect(-state.bike.x).toBeGreaterThan(s0 - 1); expect(-state.bike.x).toBeLessThan(s1 + 1);
  expect(state.collected).toEqual(expect.arrayContaining(outwardApples));
  expect(state.collected).not.toContain('noether-apple-lift-return');
}, 60_000);


it('needs a brisk boarding of the plank: a rider who rolls on slowly runs it away under the back wheel', async () => {
  const state = await ride(createNoetherPilot({ board: 1 }), 60);
  expect(state.status).toBe('crashed');
  expect(state.collected).toHaveLength(0);
  expect(Math.abs(state.bike.x - N.anchor.x)).toBeLessThan(5);
}, 60_000);

// Remove one object (or its twin) and let the same closed-loop pilot try: the ride stops at that
// object, and a twin's absence only stops the return, at the mirror image of the same place.
const without = (map: Partial<Level>): Level => ({ ...level, ...map });
it.each([
  { name: 'plank', map: (twin: boolean) => without({ swings: level.swings!.filter(s => s.id.endsWith('-twin') !== twin) }), at: N.anchor, apple: 'noether-apple-face' },
  { name: 'spring pad', map: (twin: boolean) => without({ surfaces: level.surfaces.filter(s => s.id !== `noether-pad${twin ? '-twin' : ''}`) }), at: { x: N.pit.spikes[0], y: N.pit.pad }, apple: 'noether-apple-throw' },
  { name: 'lift', map: (twin: boolean) => without({ timePlatforms: level.timePlatforms!.filter(t => t.id.endsWith('-twin') !== twin) }), at: { x: N.lift.x, y: N.pit.ledge }, apple: 'noether-apple-lift' },
  { name: 'wedge', map: (twin: boolean) => without({ props: level.props!.filter(p => p.id !== `${N.ids.wedge}${twin ? '-twin' : ''}`) }), at: { x: N.seat.x1, y: N.T1 }, apple: 'noether-apple-step' },
])('needs the $name on both halves: without it (or its twin) the ride stops there', async ({ map, at, apple }) => {
  for (const twin of [false, true]) {
    const state = await ride(createNoetherPilot(), 160, map(twin));
    const where = twin ? twinPoint(state.bike) : state.bike;
    expect(state.status, `twin ${twin}`).not.toBe('complete');
    expect(Math.hypot(where.x - at.x, where.y - at.y), `twin ${twin}`).toBeLessThan(6);
    expect(state.collected, `twin ${twin}`).not.toContain(twin ? `${apple}-return` : apple);
    if (twin) expect(state.collected).toEqual(expect.arrayContaining(outwardApples));
  }
}, 60_000);

it('holds the twin wedge on its lintel through the outward ride; without the lintel it falls out of the monument', async () => {
  const { frames } = await route();
  const turn = frames.find(s => s.bike.y < N.T0 && s.bike.x > 0)!;
  const [, twin] = level.props!;
  expect(Math.hypot(body(turn, twin.id).x - twin.x, body(turn, twin.id).y - twin.y)).toBeLessThan(1.5);
  const lintel = 'noether-lintel-twin';
  expect(level.surfaces.some(s => s.id === lintel)).toBe(true);
  let fallen: Snapshot | undefined;
  const state = await ride(createNoetherPilot(), 160, without({ surfaces: level.surfaces.filter(s => s.id !== lintel) }),
    s => { if (!fallen && s.bike.y < N.T0 && s.bike.x > 0) fallen = s; });
  expect(fallen).toBeDefined();
  expect(body(fallen!, twin.id).y).toBeLessThan(twin.y - 5);
  expect(state.status).not.toBe('complete');
  expect(state.collected).not.toContain('noether-apple-step-return');
}, 60_000);

// The demonstration pilot, except that once `start` holds it brakes and holds the world at `angle` for `seconds`.
const dawdle = (start: (s: Snapshot) => boolean, angle: number, seconds: number) => {
  const pilot = createNoetherPilot();
  let from: number | undefined;
  return (s: Snapshot): Controls => {
    const input = pilot(s);
    if (from === undefined && start(s)) from = s.elapsed;
    return from !== undefined && s.elapsed - from < seconds ? { tilt: Math.max(-1, Math.min(1, (angle - s.worldAngle) * 8)), brake: true } : input;
  };
};
/** Braked on the east nose (all four top apples taken) where its heading is `heading`, the world turned to match. */
const onNose = (heading: number) => (s: Snapshot) => s.collected.length >= 4 && s.bike.x > N.nose.centre.x &&
  Math.atan2(s.bike.y - N.nose.centre.y, s.bike.x - N.nose.centre.x) <= heading + Math.PI / 2;
const onLedge = (s: Snapshot) => s.collected.length === 2 && s.bike.y < N.pit.ledge + 1.2 && Math.abs(s.bike.x - (N.X.shaft - 1.3)) < .3;

it('keeps the twin plank chocked on its stop however long the outward ride dawdles with the world tipped back; without its chock the return crashes on it', async () => {
  const twinTilt = (s: Snapshot) => Math.abs(wrap(body(s, `${N.ids.swing}-twin`).angle - Math.PI));
  for (const pilot of [dawdle(onNose(-60 * Math.PI / 180), -60 * Math.PI / 180, 60), dawdle(onLedge, -.5, 60)]) {
    let boarding: number | undefined;
    const state = await ride(pilot, 260, level, s => { if (boarding === undefined && s.bike.y < 0 && -s.bike.x > N.X.shelf - 1) boarding = twinTilt(s); });
    expect(boarding).toBeLessThan(.03);
    expect(state.status).toBe('complete');
  }
  // A heavily damped plank still creeps under its own weight: unchocked, 15 s braked on the nose tips the twin off its stop.
  const state = await ride(dawdle(onNose(-60 * Math.PI / 180), -60 * Math.PI / 180, 15), 160,
    without({ props: level.props!.filter(p => p.id !== `${N.ids.chock}-twin`) }));
  expect(state.status).toBe('crashed');
  expect(state.collected).toEqual(expect.arrayContaining(outwardApples));
  expect(state.collected).not.toContain('noether-apple-face-return');
  const where = twinPoint(state.bike);
  expect(Math.hypot(where.x - N.anchor.x, where.y - N.anchor.y)).toBeLessThan(5);
}, 60_000);

it('pushes a wedge home that the world tipped onto its recess lip before the rider came', async () => {
  for (const drift of [4.5, 6.5]) {
    const map = without({ props: level.props!.map(p => p.id === N.ids.wedge ? { ...p, x: p.x + drift } : p) });
    let tipped = 0;
    const state = await ride(createHalfPilot(), 50, map, s => { tipped = Math.max(tipped, Math.abs(body(s, N.ids.wedge).angle)); });
    expect(tipped, `drift ${drift}`).toBeGreaterThan(.05);
    expect(state.collected, `drift ${drift}`).toContain('noether-apple-step');
  }
}, 60_000);

it('seats a wedge that dropped into its recess short of the step once the world tips toward it; on rough stone it would stay loose', async () => {
  for (const rough of [false, true]) {
    const map = without({
      spawn: { x: N.seat.x0 - 3, y: N.T1 + .72 },
      surfaces: level.surfaces.map(s => s.id === 'noether-seat' && rough ? { ...s, friction: undefined } : s),
      props: level.props!.map(p => p.id === N.ids.wedge ? { ...p, x: p.socket!.x - .28, y: p.socket!.y + .01 } : p),
    });
    const state = await ride(s => ({ tilt: Math.max(-1, Math.min(1, (.4 - s.worldAngle) * 8)), brake: true }), 8, map);
    expect(!!body(state, N.ids.wedge).settled, `rough ${rough}`).toBe(!rough);
  }
}, 60_000);

it.each<HalfOptions>([{ board: 2.8 }, { board: 3.3 }, { lean: .5 }, { lean: .7 }, { push: .35 }, { push: .55 }, { rounding: 1.4 }, { rounding: 1.8 }])(
  'also completes the circuit with the pilot changed to %o on both halves', async options => {
    expect((await ride(createNoetherPilot(options))).status).toBe('complete');
  }, 60_000);
