import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import {
  buildTorricelli, createTorricelliPilot, TORRICELLI_APPLES, TORRICELLI_HINTS, TORRICELLI_SHAPE as S, torricelliGeometry as G,
  torricelliLevel as level, torricelliPilotFor,
} from '../src/levels/torricelli';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

async function ride(pilot: (state: Snapshot) => Controls, seconds = 75, map: Level = level, watch?: (state: Snapshot) => void) {
  const game = await createPhysics(); game.load(map);
  let state = game.snapshot();
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) { state = game.step(1 / 120, pilot(state)); watch?.(state); }
  game.destroy();
  return state;
}

it('drops a deep shaft onto a cistern whose pool only the docked ferry crosses', () => {
  // Ouroboros' fall: a sheer, slightly undercut wall well over ten metres deep.
  expect(-G.wallEnd.y).toBeGreaterThan(9);
  expect(G.edgeEnd.y - G.floorY).toBeGreaterThan(10);
  expect(G.wallEnd.x).toBeLessThan(G.edgeEnd.x);
  // Water fills the pool, wider than a wheelbase plus a jump; the far bank is higher than the near floor.
  const water = level.surfaces.filter(surface => surface.kind === 'hazard');
  expect(water.map(surface => surface.id)).toEqual(['torricelli-water']);
  const [poolL, poolR] = G.pool;
  expect(poolR - poolL).toBeGreaterThan(4);
  expect(G.bankY - G.floorY).toBeGreaterThan(.6);
  // At rest the deck's top is flush with the near floor; docked, its far top corner meets the far bank.
  const [swing] = level.swings!;
  expect(swing.anchor.y - swing.length + .12).toBeCloseTo(G.floorY, 6);
  expect(swing.anchor.x - swing.width / 2).toBeGreaterThan(poolL);
  expect(Math.hypot(G.docked.x - swing.anchor.x, G.docked.y - swing.anchor.y)).toBeCloseTo(swing.length, 6);
  expect(swing.damping).toBeLessThan(3);
});

it('hangs each float under a beam whose open end is its own socket, both sockets cut into the vault', () => {
  const floats = level.props!;
  expect(floats).toHaveLength(2);
  for (const [i, float] of floats.entries()) {
    expect(float.inverted).toBe(true);
    const [lip, end] = S.beams[i];
    expect(float.x).toBeGreaterThan(lip); expect(float.x).toBeLessThan(end);
    expect(end).toBeCloseTo(S.sockets[i], 6);
    // The socket is above its float's beam and recessed into the vault.
    expect(float.socket!.x).toBeCloseTo(G.sockets[i].seat.x, 6);
    expect(G.sockets[i].seat.y).toBeGreaterThan(G.sockets[i].mouth.y);
    // Seated, the float stands proud of the vault by its crown: a foothold, not a bump.
    const proud = G.sockets[i].mouth.y - (G.sockets[i].seat.y - S.float.radius);
    expect(proud).toBeGreaterThan(.25); expect(proud).toBeLessThan(.5);
  }
  // The floor under the beams leaves the rider's head room, but not the float's.
  expect(S.beamHeight - S.beamLip).toBeGreaterThan(1.75 + .1);
  expect(S.beamHeight).toBeLessThan(1.75 + 2 * S.float.radius);
  // The vault is above everything the floats pass and the door pocket sits under the well-head, beside the shaft.
  expect(G.pocketY).toBeLessThan(0);
  expect(G.pocket[0]).toBe(S.stub);
  expect(G.door.x).toBeGreaterThan(G.pocket[0]); expect(G.door.x).toBeLessThan(G.pocket[1]);
  expect(level.exit.y - level.spawn.y).toBeLessThan(-2);
  // Everything is inside the bounds.
  for (const surface of level.surfaces) {
    expect(surface.x).toBeGreaterThan(level.bounds.min.x); expect(surface.x).toBeLessThan(level.bounds.max.x);
    expect(surface.y).toBeGreaterThan(level.bounds.min.y); expect(surface.y).toBeLessThan(level.bounds.max.y);
  }
  expect(level.routeHints!.some(hint => hint.spin === 1 && /TURN/.test(hint.label ?? ''))).toBe(true);
});

it('completes Torricelli’s Well: down the well, across on the ferry, both floats seated, home over them upside down', async () => {
  let seated = 0, rodeFerry = false, inverted = false;
  const state = await ride(createTorricelliPilot(), 75, level, s => {
    const floats = s.bodies.filter(body => body.kind === 'prop');
    seated = Math.max(seated, floats.filter(body => body.settled).length);
    if (s.bike.x > G.pool[0] + .5 && s.bike.x < G.pool[1] - .5 && s.bike.y < G.bankY + 1.5) rodeFerry = true;
    if (Math.abs(s.worldAngle) > Math.PI - .4 && s.bike.y > G.turn.y + 2) inverted = true;
  });
  expect(state.status).toBe('complete');
  expect(state.collected.sort()).toEqual(level.apples.map(apple => apple.id).sort());
  expect(seated).toBe(2);
  expect(rodeFerry).toBe(true);
  expect(inverted).toBe(true);
  expect(state.elapsed).toBeLessThan(70);
}, 120_000);

it('without the floats the vault has two open pits and the inverted climb home fails', async () => {
  const bare = buildTorricelli(S, TORRICELLI_APPLES, TORRICELLI_HINTS, false);
  expect(bare.level.props).toHaveLength(0);
  // The same pilot finds nothing to wait for, turns over and rides onto the vault.
  let turned = false, onVault = false, minX = Infinity;
  const state = await ride(torricelliPilotFor(bare.level, bare.geometry), 75, bare.level, s => {
    if (s.bike.x > G.turn.x) turned = true;
    if (turned && s.bike.y > G.turn.y + 2) { onVault = true; minX = Math.min(minX, s.bike.x); }
  });
  expect(onVault).toBe(true);
  expect(state.status).not.toBe('complete');
  // It never gets past the empty sockets.
  expect(minX).toBeGreaterThan(G.sockets[1].mouth.x - 1.5);
  expect(state.collected).toContain('torricelli-wall');
}, 120_000);

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: true }, { tilt: -1, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 30);
  expect(state.status).not.toBe('complete');
}, 60_000);

it('the campaign replay table drives Torricelli’s Well at its own index', async () => {
  const index = levels.indexOf(level);
  expect(index).toBe(10);
  expect((await ride(createReplayPilot(index), 75)).status).toBe('complete');
}, 120_000);
