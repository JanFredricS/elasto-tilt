import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import {
  createIceHousePilot, ICE_BRAKE, ICE_CORNERS, ICE_DOOR, ICE_FRICTION, ICE_HEADROOM, ICE_PROFILE, ICE_VAULTS,
  iceHouseLevel as level, iceMatAt, iceSpeedAt, iceTrackAt,
} from '../src/levels/ice-house';
import type { Controls, Level, Snapshot } from '../src/types';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
async function ride(map: Level, pilot: (state: Snapshot) => Controls, dt = 1 / 120, seconds = 90) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot(); const frames: Snapshot[] = [];
  try {
    for (let i = 0; i < seconds / dt && state.status === 'playing'; i++) { state = game.step(dt, pilot(state)); frames.push(state); }
    return { state, frames };
  } finally { game.destroy(); }
}
/** The same cellar with ordinary stone: default friction everywhere and a full-strength brake. */
const grippy: Level = { ...level, brakeScale: 1, surfaces: level.surfaces.map(({ friction: _friction, ...surface }) => surface) };
/** The same cellar with every gold mat polished to ice as well. */
const allIce: Level = { ...level, surfaces: level.surfaces.map(s => s.kind === 'cradle' ? { ...s, kind: 'ground', friction: ICE_FRICTION } : s) };

/** How a rider schooled on grippy maps plays: lean a fixed amount into the
 *  direction of travel (following the track) and ride the brake for speed.
 *  With a `floor`, the world is never turned back past it on the way out. */
function brakeRider(lean: number, floor = -Infinity) {
  let previous: Snapshot | undefined, v = 0;
  return (state: Snapshot): Controls => {
    const dt = previous ? state.elapsed - previous.elapsed : 0, { angle } = iceTrackAt(state.bike.x);
    if (previous && dt > 0) v = ((state.bike.x - previous.bike.x) * Math.cos(angle) + (state.bike.y - previous.bike.y) * Math.sin(angle)) / dt;
    previous = state;
    const home = state.collected.includes('ice-kicker'), cruise = home ? -1.2 : iceSpeedAt(state.bike.x);
    let target = iceTrackAt(state.bike.x + clamp(v * .5, -1.5, 1.5)).angle + Math.sign(cruise) * lean;
    if (!home) target = Math.max(target, floor);
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: Math.abs(v) > Math.abs(cruise) };
  };
}
/** x of the crest of the slide's last kicker, which drops onto the door mat. */
const ICE_KICKER_CREST = ICE_CORNERS.find(c => c.at.x > 80 && c.at.x < ICE_DOOR.x)!.at.x;
/** Hold the brake from the start and turn the world to `angle`. */
const braced = (angle: number) => (state: Snapshot): Controls =>
  ({ tilt: clamp((angle - state.worldAngle) * 8, -1, 1), brake: true });

describe('The Ice House', () => {
  it('sits between Torricelli’s Well and the Gravity Engine', () => {
    const index = levels.indexOf(level);
    expect(levels[index - 1].id).toBe('torricellis-well');
    expect(levels[index + 1].id).toBe('gravity-engine');
    expect(level.difficulty).toBe(8.5);
    expect(typeof createReplayPilot(index)).toBe('function');
    expect(level.hint).toMatch(/brakes are weak on ice/i);
    expect(level.hint).toMatch(/tilt is your throttle/i);
  });

  it('is slick ice everywhere but the level gold mats, with a soft brake and no hazards', () => {
    expect(level.brakeScale).toBe(ICE_BRAKE);
    expect(level.surfaces.filter(s => s.kind === 'hazard')).toHaveLength(0);
    const ridden = level.surfaces.filter(s => s.chain === 'ice-house');
    const mats = ridden.filter(s => s.kind === 'cradle'), ice = ridden.filter(s => s.kind !== 'cradle');
    // Six mats: spawn, the valley of each of the three shelves, mid-slide and the door.
    expect(mats).toHaveLength(6);
    for (const mat of mats) { expect(mat.friction).toBeUndefined(); expect(Math.abs(mat.angle!)).toBeLessThan(1e-9); }
    for (const run of ice) { expect(run.friction).toBeGreaterThanOrEqual(.08); expect(run.friction).toBeLessThanOrEqual(.15); }
    expect(iceMatAt(level.spawn.x)).toBe(true);
    expect(iceMatAt(ICE_DOOR.x)).toBe(true);
    // Fillets are 2–6 m; three 40° shelf faces climb to three stacked mats.
    for (const corner of ICE_CORNERS) if (corner.radius) { expect(corner.radius).toBeGreaterThanOrEqual(2); expect(corner.radius).toBeLessThanOrEqual(6); }
    const faces = ridden.filter(s => Math.abs(s.angle! - 40 * Math.PI / 180) < 1 * Math.PI / 180);
    expect(faces).toHaveLength(3);
    const matHeights = [...new Set(ICE_PROFILE.filter(q => q.mat).map(q => q.at.y.toFixed(2)))].map(Number);
    expect(matHeights.slice(0, 4)).toEqual([0, 2.2, 4.4, 6.6]);
    // Vault headroom is at least the 2.4 m tunnel minimum.
    for (const [, , , clear = ICE_HEADROOM] of ICE_VAULTS) expect(clear).toBeGreaterThanOrEqual(2.4);
    // Every apple hangs low over the ice, .55 m off the face.
    for (const apple of level.apples) {
      const track = iceTrackAt(apple.x);
      expect(apple.y - track.y).toBeGreaterThan(.4); expect(apple.y - track.y).toBeLessThan(.8);
    }
  });

  for (const hz of [120, 60]) it(`completes with every apple at 1/${hz} s steps, by tilt with brakes only on mats`, async () => {
    // The campaign replay table's pilot at the native rate; the map's own pilot at 60 Hz.
    const pilot = hz === 120 ? createReplayPilot(levels.indexOf(level)) : createIceHousePilot();
    const { state, frames } = await ride(level, pilot, 1 / hz);
    expect(state.status).toBe('complete');
    expect([...state.collected].sort()).toEqual(level.apples.map(apple => apple.id).sort());
    expect(state.elapsed).toBeGreaterThan(40);
    // It climbed all three shelves, crossed the roof and came home from the kicker past the door.
    expect(Math.max(...frames.map(s => s.bike.y))).toBeGreaterThan(8.4);
    expect(Math.max(...frames.map(s => s.bike.x))).toBeGreaterThan(ICE_DOOR.x + 6);
    // Rocking: the world swings well forward to climb each face, then back for the slide.
    const angles = frames.map(s => s.worldAngle);
    expect(Math.max(...angles)).toBeGreaterThan(.45);
    expect(Math.min(...angles)).toBeLessThan(-.35);
    for (const s of frames) expect(Math.abs(s.worldAngle)).toBeLessThan(1);
  });

  it('cannot be ridden on a fixed tilt or left idle', async () => {
    const idle = await ride(level, () => ({ tilt: 0, brake: false }), 1 / 120, 20);
    expect(idle.state.status).toBe('playing');
    expect(idle.state.collected).toHaveLength(0);
    for (const angle of [.2, .3, .5]) {
      const { state } = await ride(level, s => ({ tilt: clamp((angle - s.worldAngle) * 8, -1, 1), brake: false }), 1 / 120, 40);
      expect(state.status, `held ${angle}`).not.toBe('complete');
    }
    // Too much forward tilt throws the bike off the second shelf's crest.
    const { state } = await ride(level, s => ({ tilt: clamp((.5 - s.worldAngle) * 8, -1, 1), brake: false }), 1 / 120, 40);
    expect(state.status).toBe('crashed');
    expect(state.collected).toContain('ice-shelf-1');
  });

  it('holds a braked bike on a mat but not on the ice, even with a full-strength brake', async () => {
    const drift = async (map: Level, angle: number) => {
      const { state } = await ride(map, braced(angle), 1 / 120, 4);
      return Math.abs(state.bike.x - level.spawn.x);
    };
    // The soft pad still parks the bike on a mat with the world turned .6 rad;
    // polished, the same mat lets it slide away even with the full brake.
    for (const angle of [.25, .6]) {
      expect(await drift(level, angle), `mat at ${angle}`).toBeLessThan(.2);
      expect(await drift(allIce, angle), `ice at ${angle}`).toBeGreaterThan(5);
      expect(await drift({ ...allIce, brakeScale: 1 }, angle), `full brake on ice at ${angle}`).toBeGreaterThan(5);
    }
  });

  it('gates on friction: braking for speed rides the grippy twin home but crashes on the ice', async () => {
    // A rider leaning .35 rad into the slope and braking whenever too fast: on
    // ordinary stone the brake holds the pace, on ice it cannot and the bike
    // runs away down the slide.
    const grip = await ride(grippy, brakeRider(.35));
    expect(grip.state.status).toBe('complete');
    expect(Math.max(...grip.frames.map((s, i) => i ? Math.abs(s.bike.x - grip.frames[i - 1].bike.x) * 120 : 0))).toBeLessThan(3);
    const ice = await ride(level, brakeRider(.35));
    expect(ice.state.status).toBe('crashed');
    expect(ice.state.collected.length).toBeLessThan(level.apples.length);
    // The intended tilt-throttle pilot still completes when the mats are ice too:
    // the mats are where a player can stop, not something the tilt pilot needs.
    expect((await ride(allIce, createIceHousePilot())).state.status).toBe('complete');
  });

  it('throws a rider who keeps the world level and brakes down the final slide', async () => {
    // The gentlest grippy-map habit: lean .15 rad into each climb, never turn the
    // world back past level, and brake whenever too fast. Stone lets the brake
    // shed the slide's speed; on ice the bike reaches the door kicker far too
    // fast, leaves it and lands nose-first on the door mat.
    const grip = await ride(grippy, brakeRider(.15, 0));
    expect(grip.state.status).toBe('complete');
    const ice = await ride(level, brakeRider(.15, 0));
    expect(ice.state.status).toBe('crashed');
    expect(ice.state.collected).toContain('ice-bump');
    expect(ice.state.collected).not.toContain('ice-kicker');
    expect(ice.state.bike.x).toBeGreaterThan(ICE_KICKER_CREST);
    expect(ice.state.bike.x).toBeLessThan(ICE_DOOR.x + 2);
    // Tilting the world back .2 rad on the descents instead rides the same habit home.
    expect((await ride(level, brakeRider(.15, -.2))).state.status).toBe('complete');
  });
});
