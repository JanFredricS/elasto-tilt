import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import {
  createOuroborosPilot, ouroborosLevel, ouroborosLower, ouroborosPilotFor, ouroborosTrack, OUROBOROS_PILOT, OUROBOROS_SHAPE,
} from '../src/levels/ouroboros';
import type { Controls, Level, Snapshot } from '../src/types';

async function ride(level: Level, pilot: (state: Snapshot) => Controls, dt = 1 / 120, seconds = 40) {
  const game = await createPhysics(); game.load(level);
  let state = game.snapshot(); const frames: Snapshot[] = [];
  try {
    for (let i = 0; i < seconds / dt && state.status === 'playing'; i++) { state = game.step(dt, pilot(state)); frames.push(state); }
    return { state, frames };
  } finally { game.destroy(); }
}

const { tip, lip, floorY, top, bottom, corners } = ouroborosTrack;
const apple = (id: string) => ouroborosLevel.apples.find(a => a.id === id)!;

describe("Newton's Ouroboros", () => {
  it('is campaign map 8, between Escher’s Orchard and the Contrary Conservatory', () => {
    expect(levels[7]).toBe(ouroborosLevel);
    expect(ouroborosLevel.name).toBe('Newton’s Ouroboros');
    expect(ouroborosLevel.difficulty).toBeGreaterThan(levels[5].difficulty);
    expect(ouroborosLevel.difficulty).toBeLessThan(levels[8].difficulty);
    expect(typeof createReplayPilot(7)).toBe('function');
  });

  it('is one closed loop whose floor is broken by a hole, with a lower way to a lipped exit', () => {
    // Loop corners are 4.5–6 m arcs; the ring runs from the far lip round to the near tip.
    expect(OUROBOROS_SHAPE.radius).toBeGreaterThanOrEqual(4.5);
    expect(OUROBOROS_SHAPE.radius).toBeLessThanOrEqual(6);
    expect(corners[2].y).toBeGreaterThan(corners[1].y);
    expect(top - bottom).toBeGreaterThan(2 * OUROBOROS_SHAPE.radius);
    // The hole: the tip and the lip face each other a few metres apart at floor height.
    expect(lip.x - tip.x).toBeGreaterThan(3);
    expect(Math.abs(tip.y - floorY)).toBeLessThan(.5);
    expect(Math.abs(lip.y - floorY)).toBeLessThan(1);
    // Everything ridden is one seamless chain from the far lip, round the loop, over the edge and down to the door.
    const way = ouroborosLevel.surfaces.filter(s => s.chain === 'ouroboros-way');
    expect(way.length).toBeGreaterThan(40);
    const ends = way.map(s => {
      const c = Math.cos(s.angle!), n = Math.sin(s.angle!);
      const fx = s.x - n * s.h / 2, fy = s.y + c * s.h / 2;
      return [{ x: fx - c * s.w / 2, y: fy - n * s.w / 2 }, { x: fx + c * s.w / 2, y: fy + n * s.w / 2 }];
    });
    for (let i = 1; i < ends.length; i++) expect(Math.hypot(ends[i][0].x - ends[i - 1][1].x, ends[i][0].y - ends[i - 1][1].y)).toBeLessThan(1e-6);
    // Below the hole: corridor under a roof, a slanted ramp up to a raised pocket whose back rises into a lip.
    expect(ouroborosLower.corridorY).toBeLessThan(floorY - 4);
    expect(ouroborosLower.rampTop.y).toBeGreaterThan(ouroborosLower.rampFoot.y + 1);
    expect(ouroborosLower.roofY).toBeGreaterThan(ouroborosLower.pocketY + 2.5);
    expect(ouroborosLower.floor.at(-1)!.y).toBeGreaterThan(ouroborosLower.pocketY + 2);
    expect(ouroborosLevel.exit.x).toBeGreaterThan(ouroborosLower.rampTop.x);
    expect(ouroborosLevel.exit.y).toBeGreaterThan(ouroborosLower.pocketY);
    expect(ouroborosLevel.exit.y).toBeLessThan(floorY);
    // Only ROUND and HOME are signposted: nothing points into the hole.
    expect(ouroborosLevel.routeHints!.map(h => h.label).sort()).toEqual(['HOME', 'ROUND']);
  });

  it('opens a hole to nowhere: a sheer, undercut shaft with nothing under the hole for over 12 m', () => {
    const { floor, edgeEnd, wallEnd, corridorY, roofY } = ouroborosLower;
    // The shaft wall drops from the rounded edge and leans away from the hole.
    expect(edgeEnd.x - tip.x).toBeLessThan(.6);
    expect(wallEnd.x).toBeLessThan(edgeEnd.x);
    expect(edgeEnd.y - wallEnd.y).toBeGreaterThan(7);
    // Nothing ridden lies under the hole (right of the wall, left of the far lip) within 12 m of the floor,
    // and the corridor roof starts clear of the hole's whole span.
    for (const q of floor) if (q.x > edgeEnd.x + 1e-6 && q.x < lip.x + 1) expect(q.y).toBeLessThan(floorY - 12);
    for (const s of ouroborosLevel.surfaces.filter(s => !s.chain)) expect(s.x - s.w / 2).toBeGreaterThan(lip.x + 3);
    expect(roofY).toBeLessThan(floorY - 8);
    expect(corridorY).toBeLessThan(floorY - 14);
    expect(ouroborosLevel.bounds.min.y).toBeLessThan(corridorY - 3);
  });

  it('hangs one apple at the very top of the loop and one at its very bottom', () => {
    expect(ouroborosLevel.apples.length).toBeGreaterThanOrEqual(4);
    expect(ouroborosLevel.apples.length).toBeLessThanOrEqual(5);
    const high = apple('ouroboros-top'), low = apple('ouroboros-bottom');
    expect(top - high.y).toBeGreaterThan(.5); expect(top - high.y).toBeLessThan(1.2);
    expect(Math.abs(high.x - (corners[2].x + corners[3].x) / 2)).toBeLessThan(.5);
    expect(low.y - bottom).toBeGreaterThan(.5); expect(low.y - bottom).toBeLessThan(1.5);
    expect(low.x).toBeGreaterThan(lip.x);
    // The others are below the ring floor, on the way out.
    for (const a of ouroborosLevel.apples.filter(a => a !== high && a !== low)) expect(a.y).toBeLessThan(floorY - 2);
  });

  for (const hz of [120, 60]) it(`rides a full lap, yields into the hole and completes with every apple at 1/${hz} s`, async () => {
    const { state, frames } = await ride(ouroborosLevel, createOuroborosPilot(), 1 / hz);
    expect(state.status).toBe('complete');
    expect([...state.collected].sort()).toEqual(ouroborosLevel.apples.map(a => a.id).sort());
    expect(state.elapsed).toBeGreaterThan(15); expect(state.elapsed).toBeLessThan(35);
    // Both loop apples come before the drop, and the world turns a full revolution to get them.
    const dropped = frames.findIndex(s => s.bike.y < floorY - 2);
    expect(dropped).toBeGreaterThan(0);
    expect(frames[dropped].collected).toEqual(expect.arrayContaining(['ouroboros-top', 'ouroboros-bottom']));
    expect(Math.max(...frames.slice(0, dropped).map(s => s.worldAngle))).toBeGreaterThan(2 * Math.PI - .3);
    // Tipping in is a genuine free fall: from leaving the floor until the first impact (the first step
    // whose vertical speed jumps up) well over a second passes and the bike drops more than 10 m,
    // gathering nearly all the speed gravity alone would give it, with the world held upright.
    const vy = (i: number) => (frames[i].bike.y - frames[i - 1].bike.y) * hz;
    const left = frames.findIndex(s => s.bike.y < floorY - 1);
    let landed = left + 1;
    while (landed < frames.length && vy(landed) - vy(landed - 1) < 1) landed++;
    const seconds = (landed - left) / hz;
    expect(seconds).toBeGreaterThan(1.2);
    expect(frames[left].bike.y - frames[landed].bike.y).toBeGreaterThan(10);
    expect(-vy(landed - 1) - -vy(left)).toBeGreaterThan(.9 * 9.81 * seconds);
    const { min, max } = ouroborosLevel.bounds;
    for (const s of frames) {
      expect(s.bike.x).toBeGreaterThan(min.x); expect(s.bike.x).toBeLessThan(max.x);
      expect(s.bike.y).toBeGreaterThan(min.y); expect(s.bike.y).toBeLessThan(max.y);
    }
  });

  it('is a trap: a rider who keeps turning and never brakes is thrown over the hole, round and round', async () => {
    const pilot = ouroborosPilotFor(ouroborosTrack, ouroborosLower, OUROBOROS_PILOT, false);
    const { state, frames } = await ride(ouroborosLevel, pilot, 1 / 120, 65);
    expect(state.status).toBe('playing');
    expect(state.elapsed).toBeGreaterThan(64.9);
    expect([...state.collected].sort()).toEqual(['ouroboros-bottom', 'ouroboros-top']);
    // Never below the ring floor: every pass over the hole lands back in the loop.
    expect(Math.min(...frames.map(s => s.bike.y))).toBeGreaterThan(floorY - 2);
    let passes = 0;
    for (let i = 1; i < frames.length; i++) if (frames[i - 1].bike.x < tip.x && frames[i].bike.x >= tip.x && frames[i].bike.y < floorY + 1.5) passes++;
    expect(passes).toBeGreaterThanOrEqual(5);
    expect(state.worldAngle).toBeGreaterThan(5 * 2 * Math.PI);
  }, 30_000);
});
