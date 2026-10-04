import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createFlipSpiralPilot, flipSpiralLevels, spiralGaps } from '../src/levels/flip-spiral';
import type { Controls, Level, Snapshot, Surface, Vec } from '../src/types';

const distanceToSurface = (point: Vec, surface: Surface) => {
  const c = Math.cos(surface.angle ?? 0), s = Math.sin(surface.angle ?? 0);
  const dx = point.x - surface.x, dy = point.y - surface.y;
  return Math.hypot(Math.max(0, Math.abs(dx * c + dy * s) - surface.w / 2),
    Math.max(0, Math.abs(-dx * s + dy * c) - surface.h / 2));
};
async function replay(index: 0 | 1, dt = 1 / 120, custom?: (s: Snapshot) => Controls, level = flipSpiralLevels[index], idle = 0) {
  const game = await createPhysics(); game.load(level);
  const pilot = custom ?? createFlipSpiralPilot(index);
  let state = game.snapshot();
  for (let t = 0; t < Math.round(idle / dt); t++) state = game.step(dt, { tilt: 0, brake: false });
  let previous = state.bike, distance = 0, lastPolar = 0, progress = 0;
  let topSupport = false, undersideSupport = false, nose = false, maximumX = 0;
  const airborne = spiralGaps.map(() => 0), landing = spiralGaps.map(() => false), appleOrder: string[] = [];
  const trace: string[] = [];
  for (let k = 0; k < 120 / dt && state.status === 'playing'; k++) {
    state = game.step(dt, pilot(state));
    distance += Math.hypot(state.bike.x - previous.x, state.bike.y - previous.y); previous = state.bike;
    for (const id of state.collected) if (!appleOrder.includes(id)) appleOrder.push(id);
    maximumX = Math.max(maximumX, state.bike.x);
    const wheels = state.bodies.filter(b => b.kind === 'wheel');
    const frame = state.bodies.find(b => b.id === 'frame')!;
    if (index === 0) {
      topSupport ||= state.bike.x > 4 && state.bike.x < 20 && wheels.every(w => Math.abs(w.y - 4.34) < .05);
      undersideSupport ||= state.bike.x > 4 && state.bike.x < 20 && wheels.every(w => Math.abs(w.y + 4.34) < .05) && Math.cos(frame.angle) < -.95;
      nose ||= state.bike.x > 28 && Math.abs(state.bike.y) < 1 && Math.sin(frame.angle) < -.9;
    } else {
      const polar = Math.atan2(state.bike.x, -state.bike.y);
      progress += Math.atan2(Math.sin(polar - lastPolar), Math.cos(polar - lastPolar)); lastPolar = polar;
      for (const [i, gap] of spiralGaps.entries()) {
        // Measure clearance from every actual collider, not an assumed animation state.
        if (progress > gap.from && progress < gap.to + .6) {
          const clear = wheels.every(w => level.surfaces.every(surface => distanceToSurface(w, surface) > .38));
          if (progress < gap.to && clear) airborne[i] += dt;
          if (progress > gap.to + .05 && !clear) landing[i] = true;
        }
      }
    }
    if (k % Math.round(5 / dt) === 0) trace.push(`${state.elapsed.toFixed(1)}s (${state.bike.x.toFixed(1)}, ${state.bike.y.toFixed(1)}) / ${state.collected.length} apples`);
  }
  game.destroy();
  return { state, distance, progress, airborne, landing, topSupport, undersideSupport, nose, maximumX, appleOrder, trace };
}

it('rides both faces of the SAME solid strip and physically turns around its exposed end', async () => {
  const result = await replay(0);
  expect(result.state.status, result.trace.join(' → ')).toBe('complete');
  expect(result.appleOrder).toEqual(flipSpiralLevels[0].apples.map(a => a.id));
  expect(result.topSupport).toBe(true); expect(result.undersideSupport).toBe(true); expect(result.nose).toBe(true);
  expect(result.maximumX).toBeGreaterThan(28.5); expect(result.distance).toBeGreaterThan(55);
  expect(result.state.worldAngle).toBeLessThan(-3);
});

it('winds over two circular turns, flies each real hole, lands and reaches the centre door', async () => {
  const result = await replay(1);
  expect(result.state.status, result.trace.join(' → ')).toBe('complete');
  expect(result.appleOrder).toEqual(flipSpiralLevels[1].apples.map(a => a.id));
  expect(result.progress).toBeGreaterThan(Math.PI * 4);
  expect(Math.hypot(result.state.bike.x, result.state.bike.y)).toBeLessThan(4);
  expect(result.distance).toBeGreaterThan(175);
  for (const duration of result.airborne) expect(duration).toBeGreaterThan(.12);
  expect(result.landing).toEqual(spiralGaps.map(() => true));
});

it.each([0, 1] as const)('also completes map %i from a slightly higher release at the game’s fixed timestep', async index => {
  const level: Level = { ...flipSpiralLevels[index], spawn: { ...flipSpiralLevels[index].spawn, y: flipSpiralLevels[index].spawn.y + .04 } };
  const result = await replay(index, 1 / 120, undefined, level);
  expect(result.state.status, result.trace.join(' → ')).toBe('complete');
});

it('needs the spiral flight steering, not just a normal rolling controller', async () => {
  let previous: Vec | undefined, time = 0, angle = 0, lastRaw = 0;
  const result = await replay(1, 1 / 120, s => {
    const raw = s.bodies.find(b => b.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const dt = s.elapsed - time;
    const v = previous && dt > 0 ? ((s.bike.x - previous.x) * Math.cos(angle) + (s.bike.y - previous.y) * Math.sin(angle)) / dt : 0;
    previous = s.bike; time = s.elapsed;
    return { tilt: 0, worldAngle: angle + Math.max(-.3, Math.min(.3, (3 - v) * .22)), brake: false };
  });
  expect(result.state.status).not.toBe('complete');
  expect(result.state.collected).not.toContain('spiral-apple-2');
});

it.each([0, 1] as const)('map %i rejects idle, full tilt and fixed-gravity shortcuts', async index => {
  for (const tilt of [-1, 0, 1]) expect((await replay(index, 1 / 60, () => ({ tilt, brake: false }))).state.status).not.toBe('complete');
  for (const worldAngle of [-Math.PI / 2, .2, Math.PI / 2, Math.PI])
    expect((await replay(index, 1 / 60, () => ({ tilt: 0, brake: false, worldAngle }))).state.status).not.toBe('complete');
});

 it.each(Array.from({ length: 31 }, (_, frame) => frame))('finishes with only touch-rate controls after %i idle frames', async frame => {
   const idle = frame / 120;
   const pilot = createFlipSpiralPilot(1);
   const result = await replay(1, 1 / 120, state => {
     const controls = pilot(state);
     expect(controls.worldAngle).toBeUndefined();
     expect(Math.abs(controls.tilt)).toBeLessThanOrEqual(1);
     return controls;
   }, flipSpiralLevels[1], idle);
   expect(result.state.status, result.trace.join(' → ')).toBe('complete');
 });
 it('also completes the spiral at 60 Hz', async () => {
   const result = await replay(1, 1 / 60);
   expect(result.state.status, result.trace.join(' → ')).toBe('complete');
 });
