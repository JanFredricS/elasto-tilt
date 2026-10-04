import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { BIKE_AXLE_X, BIKE_AXLE_Y } from '../src/bike-geometry';
import type { Level } from '../src/types';

it('catches the front wheel on a cradle and pivots under a finite brake without joint separation', async () => {
  const game = await createPhysics();
  const level: Level = { id: 'pivot', name: '', subtitle: '', mechanic: '', hint: '', difficulty: 1,
    spawn: { x: 0, y: .7 }, surfaces: [
      { id: 'ledge', x: BIKE_AXLE_X, y: -.2, w: .7, h: .4, kind: 'cradle' },
      { id: 'lip', x: BIKE_AXLE_X + .42, y: .07, w: .14, h: .54, kind: 'cradle' },
    ], apples: [{ id: 'far', x: 80, y: 80 }], exit: { x: 90, y: 90 },
    bounds: { min: { x: -50, y: -50 }, max: { x: 50, y: 50 } } };
  try {
    game.load(level);
    let state = game.snapshot();
    for (let i = 0; i < 66; i++) {
      state = game.step(1 / 120, { tilt: 0, brake: true });
      expect(state.status).toBe('playing');
      const frame = state.bodies.find(b => b.id === 'frame')!;
      for (const [index, wheel] of state.bodies.filter(b => b.kind === 'wheel').entries()) {
        const x = index ? BIKE_AXLE_X : -BIKE_AXLE_X, y = BIKE_AXLE_Y;
        expect(Math.hypot(wheel.x - frame.x - Math.cos(frame.angle) * x + Math.sin(frame.angle) * y,
          wheel.y - frame.y - Math.sin(frame.angle) * x - Math.cos(frame.angle) * y)).toBeLessThan(.03);
      }
    }
    expect(state.bodies.find(b => b.id === 'frame')!.angle).toBeGreaterThan(.9);
    expect(state.bodies.find(b => b.id === 'wheel-1')!.y).toBeCloseTo(.34, 1);
    const rear = state.bodies.find(b => b.id === 'wheel-0')!;
    const front = state.bodies.find(b => b.id === 'wheel-1')!;
    // Wheel height difference scales with the approved wheelbase. Require the
    // same substantial one-wheel pivot without assuming the old 1.4 m spacing.
    expect(front.y - rear.y).toBeGreaterThan(BIKE_AXLE_X * 2 * .75);
  } finally { game.destroy(); }
});
