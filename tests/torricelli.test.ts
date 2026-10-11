import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import {
  buildTorricelli, createTorricelliPilot, TORRICELLI_APPLES, TORRICELLI_HINTS, TORRICELLI_PILOT, TORRICELLI_SHAPE as S,
  torricelliGeometry as G, torricelliLevel as level, torricelliPilotFor,
} from '../src/levels/torricelli';
import { levels } from '../src/levels';
import { createReplayPilot } from '../src/dev/replay';
import type { Controls, Level, Snapshot } from '../src/types';

const clampTilt = (tilt: number, limit: number) => Math.max(-limit, Math.min(limit, tilt));

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
  // The sill between the sockets: a ramp the inverted rider can climb, to a step clear of both mouths.
  expect(S.sill.step).toBeGreaterThan(G.sockets[1].mouth.x + G.sockets[1].half + 1);
  expect(S.sill.step).toBeLessThan(G.sockets[0].mouth.x - G.sockets[0].half - 1);
  expect(S.sill.height).toBeGreaterThan(.3);
  expect(S.sill.height / (G.sockets[0].mouth.x - G.sockets[0].half - S.sill.step)).toBeLessThan(Math.tan(13 * Math.PI / 180));
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

it('keeps each float behind its lip when the ferry is tipped hard, and each still finds its own socket', async () => {
  // The ferry is tipped well past the .5 rad it needs. The floats, rolled toward their beams' open
  // ends by the landing's back-tilt, are thrown back against their lips; a lip that stopped short of a
  // float's centre let float A squeeze under it into socket B's reach, where it never seats.
  expect(G.bankY + S.beamHeight - S.beamLip).toBeLessThan(G.bankY + S.beamHeight - S.float.radius + .15);
  for (const carry of [.7, .9]) {
    const state = await ride(torricelliPilotFor(level, G, S, { ...TORRICELLI_PILOT, carry }), 75);
    expect(state.status, `carry ${carry}`).toBe('complete');
  }
}, 120_000);

it.each([1.1, 1.5])('an extreme ferry tilt of %s rad ends in a crash on beam B’s lip, not a soft lock', async carry => {
  // Tipped this hard the rider leaves the deck in a hop and its helmet meets the .9 m lip. That is a
  // restart, which is acceptable; with the old .5 m lip, 1.2 rad instead stranded float B in socket A.
  const state = await ride(torricelliPilotFor(level, G, S, { ...TORRICELLI_PILOT, carry }), 30);
  expect(state.status).toBe('crashed');
  expect(state.bike.x).toBeGreaterThan(G.pool[1]); expect(state.bike.x).toBeLessThan(S.beams[1][0]);
}, 60_000);

/** Ride the pilot onto the far bank, stop with float B pushed out, hold the world tipped back by
 *  `angle` for 15 s with the brake on, level it for 15 s, and return the floats. */
async function backTilt(map: Level, geometry: typeof G, angle: number) {
  const game = await createPhysics(); game.load(map);
  const pilot = torricelliPilotFor(map, geometry);
  let state = game.snapshot(), phase = 0, since = 0, lastX = state.bike.x;
  for (let i = 0; i < 120 * 70 && state.status === 'playing'; i++) {
    const vx = (state.bike.x - lastX) * 120; lastX = state.bike.x;
    if (phase === 0 && state.bike.x > geometry.pool[1] + 4.5) { phase = 1; since = state.elapsed; }
    if (phase === 1 && state.elapsed - since > .2 && Math.abs(vx) < .15) { phase = 2; since = state.elapsed; }
    if (phase === 2 && state.elapsed - since > 15) { phase = 3; since = state.elapsed; }
    if (phase === 3 && state.elapsed - since > 15) break;
    const toward = (target: number, rate = .4) => clampTilt((target - state.worldAngle) * 4, rate);
    const control: Controls = phase === 0 ? pilot(state) : phase === 1 ? { tilt: toward(-.35 * Math.sign(vx), .6), brake: false }
      : { tilt: toward(phase === 2 ? angle : 0), brake: true };
    state = game.step(1 / 120, control);
  }
  game.destroy();
  expect(state.status).toBe('playing');
  expect(phase).toBe(3);
  return state.bodies.filter(body => body.kind === 'prop');
}

it.each([-.25, -.5])('a back-tilt of %s rad held while the floats are loose still leaves each float its own socket', async angle => {
  // Both floats roll down-slope, B no further than the sill's step; levelled, each rises into its own socket.
  const floats = await backTilt(level, G, angle);
  expect(floats.every(body => body.settled)).toBe(true);
  for (const [i, float] of floats.entries()) expect(float.x).toBeCloseTo(G.sockets[i].seat.x, 0);
}, 60_000);

it('without the sill, a .25 rad back-tilt rolls float B into socket A’s recess for good', async () => {
  const flat = buildTorricelli({ ...S, sill: { ...S.sill, height: 0 } }, TORRICELLI_APPLES, TORRICELLI_HINTS);
  const [a, b] = await backTilt(flat.level, flat.geometry, -.25);
  expect(a.settled || b.settled).toBeFalsy();
  expect(b.x).toBeCloseTo(G.sockets[0].seat.x, 0);
}, 60_000);

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: 1, brake: true }, { tilt: -1, brake: false }])('is not completed by fixed controls (%o)', async control => {
  const state = await ride(() => control, 30);
  expect(state.status).not.toBe('complete');
}, 60_000);

it('the campaign replay table drives Torricelli’s Well at its own index', async () => {
  const index = levels.indexOf(level);
  expect(index).toBeGreaterThan(0);
  expect((await ride(createReplayPilot(index), 75)).status).toBe('complete');
}, 120_000);
