import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { levels } from '../src/levels';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

it('replays the Orchard roll through both apples and the exit', async () => {
  const game = await createPhysics();
  game.load(levels[0]);
  let state = game.snapshot();
  let lastX = state.bike.x;
  for (let step = 0; step < 120 * 45 && state.status === 'playing'; step++) {
    const velocity = (state.bike.x - lastX) * 120;
    lastX = state.bike.x;
    const desired = state.bike.x < 12 ? 1.4 : 0.5;
    const targetAngle = clamp((desired - velocity) * 0.14, -0.17, 0.17);
    state = game.step(1 / 120, { tilt: clamp((targetAngle - state.worldAngle) * 8, -1, 1), brake: state.bike.x > 12 });
  }
  game.destroy();
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(2);
});

it.each([levels[4], levels[6]])('replays the wall and ceiling route in $name', async (level) => {
  const game = await createPhysics();
  game.load(level);
  let state = game.snapshot();
  let lastX = state.bike.x;
  let stage = 0;
  let sawWall = false;
  let sawCeiling = false;
  for (let step = 0; step < 120 * 40 && state.status === 'playing'; step++) {
    const velocity = (state.bike.x - lastX) * 120;
    lastX = state.bike.x;
    if (stage === 0 && state.bike.x > 11.8) stage = 1;
    if (stage === 1 && state.bike.y > level.apples[1].y - 1) stage = 2;
    const target = stage === 0 ? clamp((1.8 - velocity) * 0.14, -0.18, 0.18)
      : stage === 1 ? Math.PI / 2 : Math.PI;
    state = game.step(1 / 120, { tilt: clamp((target - state.worldAngle) * 7, -1, 1), brake: false });
    sawWall ||= state.worldAngle > 1.4 && state.collected.includes(level.apples[1].id);
    sawCeiling ||= state.worldAngle > 2.8 && state.collected.includes(level.apples[2].id);
  }
  game.destroy();
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(3);
  expect(sawWall).toBe(true);
  expect(sawCeiling).toBe(true);
});

it.each([
  { level: levels[1], gain: 0.29 },
  { level: levels[2], gain: 0.14 },
  { level: levels[3], gain: 0.14 },
  { level: levels[5], gain: 0.14 },
  { level: levels[7], gain: 0.29 },
])('replays every apple and exit in $level.name', async ({ level, gain }) => {
  const game = await createPhysics();
  game.load(level);
  let state = game.snapshot();
  let lastX = state.bike.x;
  let crossedGardenGap = false;
  let brakeApplied = false;
  let atticWeightMoved = false;
  let invertedWeightRose = false;
  for (let step = 0; step < 120 * 40 && state.status === 'playing'; step++) {
    const velocity = (state.bike.x - lastX) * 120;
    lastX = state.bike.x;
    const target = clamp((1.6 - velocity) * gain, -0.25, 0.48);
    const brake = level.id === 'one-wheel-wonder' && state.bike.x > 7.3 && state.bike.x < 9.3;
    brakeApplied ||= brake;
    state = game.step(1 / 120, { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake });
    if (level.id === 'hanging-garden' && state.bike.x > 6.2 && state.bike.x < 9.0 && state.bike.y > -1)
      crossedGardenGap = true;
    atticWeightMoved ||= level.id === 'newtons-attic' &&
      (state.bodies.find((body) => body.id === 'attic-weight')?.x ?? 0) > 4.7;
    invertedWeightRose ||= level.id === 'contrary-conservatory' &&
      (state.bodies.find((body) => body.id === 'contrary-weight')?.y ?? 0) > 5.5;
  }
  game.destroy();
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(level.apples.length);
  if (level.id === 'hanging-garden') expect(crossedGardenGap).toBe(true);
  if (level.id === 'one-wheel-wonder') expect(brakeApplied).toBe(true);
  if (level.id === 'newtons-attic') expect(atticWeightMoved).toBe(true);
  if (level.id === 'contrary-conservatory') expect(invertedWeightRose).toBe(true);
});

it('replays the Gravity Engine swing, wall turn, wall apple and exit', async () => {
  const game = await createPhysics();
  const level = levels[8];
  game.load(level);
  let state = game.snapshot();
  let lastX = state.bike.x;
  let stage = 0;
  let crossedSwingGap = false;
  let sawWallTurn = false;
  for (let step = 0; step < 120 * 40 && state.status === 'playing'; step++) {
    const velocity = (state.bike.x - lastX) * 120;
    lastX = state.bike.x;
    if (stage === 0 && state.bike.x > 17.4) stage = 1;
    if (stage === 1 && state.bike.y > 1.7) stage = 2;
    const target = stage === 0 ? clamp((1.6 - velocity) * 0.16, -0.2, 0.25)
      : stage === 1 ? Math.PI / 2 : Math.PI;
    state = game.step(1 / 120, { tilt: clamp((target - state.worldAngle) * 7, -1, 1), brake: false });
    crossedSwingGap ||= state.bike.x > 6.5 && state.bike.x < 9.8 && state.bike.y > -1;
    sawWallTurn ||= state.worldAngle > 1.4 && state.collected.includes('engine-c');
  }
  game.destroy();
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(3);
  expect(crossedSwingGap).toBe(true);
  expect(sawWallTurn).toBe(true);
});
