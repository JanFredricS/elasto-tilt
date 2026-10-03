import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import type { Level } from '../src/types';

it('catches the front wheel on a cradle and pivots under a finite brake without joint separation', async () => {
  const game = await createPhysics();
  const level: Level = { id: 'pivot', name: '', subtitle: '', mechanic: '', hint: '', difficulty: 1,
    spawn: { x: 0, y: .7 }, surfaces: [
      { id: 'ledge', x: .7, y: -.2, w: .7, h: .4, kind: 'cradle' },
      { id: 'lip', x: 1.12, y: .07, w: .14, h: .54, kind: 'cradle' },
    ], apples: [{ id: 'far', x: 80, y: 80 }], exit: { x: 90, y: 90 },
    bounds: { min: { x: -50, y: -50 }, max: { x: 50, y: 50 } } };
  try {
    game.load(level);
    let state = game.snapshot();
    for (let i = 0; i < 60; i++) {
      state = game.step(1 / 120, { tilt: 0, brake: true });
      expect(state.status).toBe('playing');
      const frame = state.bodies.find(b => b.id === 'frame')!;
      for (const [index, wheel] of state.bodies.filter(b => b.kind === 'wheel').entries()) {
        const x = index ? .7 : -.7, y = -.36;
        expect(Math.hypot(wheel.x - frame.x - Math.cos(frame.angle) * x + Math.sin(frame.angle) * y,
          wheel.y - frame.y - Math.sin(frame.angle) * x - Math.cos(frame.angle) * y)).toBeLessThan(.03);
      }
    }
    expect(state.bodies.find(b => b.id === 'frame')!.angle).toBeGreaterThan(.9);
    expect(state.bodies.find(b => b.id === 'wheel-1')!.y).toBeCloseTo(.34, 1);
    expect(state.bodies.find(b => b.id === 'wheel-0')!.y).toBeLessThan(-.7);
  } finally { game.destroy(); }
});
