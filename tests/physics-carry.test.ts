import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import type { Level, Snapshot } from '../src/types';
const clamp = (x: number) => Math.max(-1, Math.min(1, x));
const fixture = (rise: number): Level => ({
  id: 'carry', name: '', subtitle: '', mechanic: '', hint: '', difficulty: 1,
  spawn: { x: 0, y: .85 }, surfaces: [], apples: [{ id: 'far', x: 80, y: 80 }], exit: { x: 90, y: 90 },
  bounds: { min: { x: -100, y: -100 }, max: { x: 100, y: 100 } },
  initialAngle: .2, timeTravel: 1, timeAxis: { x: 1, y: 0 },
  timePlatforms: [{ id: 'platform', from: { x: 0, y: 0 }, to: { x: 8, y: rise }, w: 30, h: .3 }],
});
const platform = (state: Snapshot) => state.bodies.find(b => b.id === 'platform')!;
const relativeX = (state: Snapshot) => state.bike.x - platform(state).x;
const supported = (state: Snapshot) => {
  expect(state.status).toBe('playing');
  for (const wheel of state.bodies.filter(b => b.kind === 'wheel'))
    expect(Math.abs(wheel.y - platform(state).y - .49)).toBeLessThan(.03);
};

it.each([0, 2])('freely rolls with actual supporting contact on a platform with rise %s', async rise => {
  const game = await createPhysics();
  try {
    game.load(fixture(rise));
    let state = game.snapshot();
    for (let step = 0; step < 120; step++) state = game.step(1 / 120, { tilt: 0, brake: false });
    supported(state);
    expect(state.bike.x).toBeGreaterThan(.8);
    expect(state.timeline).toBeGreaterThan(.1);
    expect(platform(state).x).toBeGreaterThan(1);
  } finally { game.destroy(); }
});

// Known residual, intentionally expected to fail. Remove `.fails` only after
// carrying no longer feeds time in this real-contact replay; see physics-residuals.md.
it.fails.each([0, 2])('KNOWN DEFECT: passive braked carrying does not advance time beyond relative travel (rise %s)', async rise => {
  const game = await createPhysics();
  try {
    game.load(fixture(rise));
    let state = game.snapshot(), before = state;
    for (let step = 0; step < 480; step++) {
      state = game.step(1 / 120, { tilt: clamp(((step < 120 ? .2 : 0) - state.worldAngle) * 8), brake: step >= 120 });
      if (step === 359) { before = state; supported(before); }
    }
    supported(state);
    expect(Math.abs(state.worldAngle)).toBeLessThan(.0001);
    const relativeTravel = Math.max(0, relativeX(state) - relativeX(before));
    // timeTravel=1; allow 3cm contact/jitter tolerance over one second.
    expect(state.timeline - before.timeline).toBeLessThanOrEqual(relativeTravel + .03);
  } finally { game.destroy(); }
});
