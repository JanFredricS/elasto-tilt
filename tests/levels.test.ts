import { describe, expect, it } from 'vitest';
import { levels } from '../src/levels';
import type { Level, Vec } from '../src/types';

type Box = Vec & { w: number; h: number; angle?: number };
type Part = { shape: 'box'; box: Box } | { shape: 'ball'; x: number; y: number; radius: number };
const epsilon = 0.001;
const inside = (point: Vec, level: Level) =>
  Number.isFinite(point.x) && Number.isFinite(point.y) &&
  point.x >= level.bounds.min.x - epsilon && point.x <= level.bounds.max.x + epsilon &&
  point.y >= level.bounds.min.y - epsilon && point.y <= level.bounds.max.y + epsilon;
const corners = (box: Box): Vec[] => {
  const c = Math.cos(box.angle ?? 0), s = Math.sin(box.angle ?? 0);
  return [-1, 1].flatMap((sx) => [-1, 1].map((sy) => {
    const x = sx * box.w / 2, y = sy * box.h / 2;
    return { x: box.x + c * x - s * y, y: box.y + s * x + c * y };
  }));
};
const boxInside = (box: Box, level: Level) =>
  Number.isFinite(box.w) && Number.isFinite(box.h) && Number.isFinite(box.angle ?? 0) &&
  box.w > 0 && box.h > 0 && corners(box).every((point) => inside(point, level));
const ballInside = (x: number, y: number, radius: number, level: Level) =>
  Number.isFinite(radius) && radius > 0 &&
  inside({ x: x - radius, y: y - radius }, level) &&
  inside({ x: x + radius, y: y + radius }, level);
const boxOverlap = (a: Box, b: Box) => {
  const axes = [0, Math.PI / 2, a.angle ?? 0, (a.angle ?? 0) + Math.PI / 2,
    b.angle ?? 0, (b.angle ?? 0) + Math.PI / 2];
  return axes.every((angle) => {
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const projectedRadius = (box: Box) => box.w / 2 * Math.abs(Math.cos((box.angle ?? 0) - angle)) +
      box.h / 2 * Math.abs(Math.sin((box.angle ?? 0) - angle));
    return Math.abs((a.x - b.x) * ux + (a.y - b.y) * uy) < projectedRadius(a) + projectedRadius(b) - epsilon;
  });
};
const ballBoxOverlap = (x: number, y: number, radius: number, box: Box) => {
  const c = Math.cos(box.angle ?? 0), s = Math.sin(box.angle ?? 0);
  const dx = x - box.x, dy = y - box.y;
  const localX = c * dx + s * dy, localY = -s * dx + c * dy;
  const outsideX = Math.max(Math.abs(localX) - box.w / 2, 0);
  const outsideY = Math.max(Math.abs(localY) - box.h / 2, 0);
  return outsideX * outsideX + outsideY * outsideY < (radius - epsilon) ** 2;
};
const partOverlapsBox = (part: Part, box: Box) => part.shape === 'box'
  ? boxOverlap(part.box, box) : ballBoxOverlap(part.x, part.y, part.radius, box);
const partOverlapsBall = (part: Part, x: number, y: number, radius: number) => part.shape === 'ball'
  ? Math.hypot(part.x - x, part.y - y) < part.radius + radius - epsilon
  : ballBoxOverlap(x, y, radius, part.box);

// Rapier's initial chassis and wheel assembly; these are deliberately more
// stringent than checking the chassis centre alone.
const spawnParts = (spawn: Vec) => [
  { shape: 'box' as const, box: { x: spawn.x, y: spawn.y, w: 1.16, h: 0.24 } },
  { shape: 'ball' as const, x: spawn.x - 0.70, y: spawn.y - 0.36, radius: 0.34 },
  { shape: 'ball' as const, x: spawn.x + 0.70, y: spawn.y - 0.36, radius: 0.34 },
  { shape: 'ball' as const, x: spawn.x + 0.10, y: spawn.y + 0.69, radius: 0.21 },
] satisfies Part[];

describe('authored campaign', () => {
  it('checks rotated corners and circle contact in the actual collider orientation', () => {
    const tightBounds = { ...levels[0], bounds: { min: { x: -0.7, y: -0.7 }, max: { x: 0.7, y: 0.7 } } };
    expect(boxInside({ x: 0, y: 0, w: 1.2, h: 1.2 }, tightBounds)).toBe(true);
    expect(boxInside({ x: 0, y: 0, w: 1.2, h: 1.2, angle: Math.PI / 4 }, tightBounds)).toBe(false);
    expect(ballBoxOverlap(0.3, -0.7, 0.15,
      { x: 1, y: 0, w: 2, h: 0.2, angle: Math.PI / 4 })).toBe(true);
  });

  it('preserves the original ten maps and appends four progressive gravity challenges', () => {
    expect(levels.map((level) => level.id)).toEqual([
      'newtons-orchard', 'one-wheel-wonder', 'hanging-garden', 'pendulum-mill',
      'room-on-its-side', 'newtons-attic', 'eschers-orchard',
      'contrary-conservatory', 'gravity-engine', 'clockwork-apple',
      'underside-return', 'spiral-sanctuary', 'switchback-scaffold', 'the-hidden-way-home',
    ]);
    expect(levels.map((level) => level.difficulty)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it.each(levels)('$name has finite, bounded geometry and no initial bike overlap', (level) => {
    expect([level.bounds.min.x, level.bounds.min.y, level.bounds.max.x, level.bounds.max.y]
      .every(Number.isFinite)).toBe(true);
    expect(level.bounds.min.x).toBeLessThan(level.bounds.max.x);
    expect(level.bounds.min.y).toBeLessThan(level.bounds.max.y);
    const ids = [...level.surfaces, ...level.apples, ...(level.props ?? []),
      ...(level.swings ?? []), ...(level.timePlatforms ?? [])].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(level.apples.length).toBeGreaterThan(0);
    expect(inside(level.spawn, level)).toBe(true);
    expect(ballInside(level.exit.x, level.exit.y, 0.8, level)).toBe(true);
    for (const part of spawnParts(level.spawn)) {
      expect(part.shape === 'box' ? boxInside(part.box, level)
        : ballInside(part.x, part.y, part.radius, level)).toBe(true);
    }

    for (const surface of level.surfaces) {
      expect(boxInside(surface, level), `${level.id}: ${surface.id} extends beyond bounds`).toBe(true);
      for (const part of spawnParts(level.spawn))
        expect(partOverlapsBox(part, surface), `${level.id}: bike begins in ${surface.id}`).toBe(false);
    }
    for (const item of level.apples) {
      expect(ballInside(item.x, item.y, 0.4, level), `${level.id}: ${item.id} sensor is outside bounds`).toBe(true);
    }
    for (const item of level.props ?? []) {
      expect(Number.isFinite(item.h) && item.h > 0).toBe(true);
      if (item.shape === 'ball') {
        expect(ballInside(item.x, item.y, item.w / 2, level)).toBe(true);
        for (const part of spawnParts(level.spawn))
          expect(partOverlapsBall(part, item.x, item.y, item.w / 2), `${level.id}: bike begins in ${item.id}`).toBe(false);
      } else {
        expect(boxInside(item, level)).toBe(true);
        for (const part of spawnParts(level.spawn))
          expect(partOverlapsBox(part, item), `${level.id}: bike begins in ${item.id}`).toBe(false);
      }
    }
    for (const swing of level.swings ?? []) {
      expect(inside(swing.anchor, level)).toBe(true);
      expect(Number.isFinite(swing.length) && swing.length > 0).toBe(true);
      expect(Number.isFinite(swing.damping ?? 0)).toBe(true);
      const angle = swing.angle ?? 0;
      const deck: Box = { x: swing.anchor.x + Math.sin(angle) * swing.length,
        y: swing.anchor.y - Math.cos(angle) * swing.length,
        w: swing.width, h: 0.24, angle };
      expect(boxInside(deck, level), `${level.id}: ${swing.id} starts outside bounds`).toBe(true);
      for (const part of spawnParts(level.spawn))
        expect(partOverlapsBox(part, deck), `${level.id}: bike begins in ${swing.id}`).toBe(false);
    }
    for (const item of level.timePlatforms ?? []) {
      const from = { ...item.from, w: item.w, h: item.h };
      const to = { ...item.to, w: item.w, h: item.h };
      expect(boxInside(from, level)).toBe(true);
      expect(boxInside(to, level)).toBe(true);
      for (const part of spawnParts(level.spawn))
        expect(partOverlapsBox(part, from), `${level.id}: bike begins in ${item.id}`).toBe(false);
    }
  });

  it('spreads Orchard objectives through hills and a hollow, with a return door', () => {
    const orchard = levels[0];
    expect(orchard.apples.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...orchard.apples.map(a => a.x)) - orchard.spawn.x).toBeGreaterThan(40);
    expect(Math.max(...orchard.apples.map(a => a.y)) - Math.min(...orchard.apples.map(a => a.y))).toBeGreaterThan(4);
    expect(orchard.exit.x).toBeLessThan(orchard.spawn.x);
  });

  it('puts Escher objectives around nested rooms and on both sides of the shared gallery', () => {
    const escher = levels[6];
    const shared = escher.surfaces.find(s => s.id === 'escher-shared-floor-ceiling')!;
    expect(escher.apples.filter(a => a.x > shared.x - shared.w / 2 && a.x < shared.x + shared.w / 2 && a.y < shared.y)).toHaveLength(2);
    expect(escher.apples.some(a => a.y > shared.y && a.y < shared.y + 2)).toBe(true);
    expect(escher.apples.some(a => a.x < 2 && a.y > 8)).toBe(true);
    expect(escher.apples.some(a => a.x > 30 && a.y > 8)).toBe(true);
    expect(escher.apples.some(a => a.y > 16)).toBe(true);
    expect(escher.exit.y).toBeGreaterThan(shared.y);
  });

  it('has a moving clockwork lift and a return route after the high apple', () => {
    const clock = levels[9];
    expect(clock.timeAxis).toEqual({ x: 1, y: 0 });
    expect(clock.timeTravel).toBeGreaterThan(0);
    expect(clock.timePlatforms!.length).toBeGreaterThan(0);
    for (const platform of clock.timePlatforms!) {
      expect(platform.to.y).toBeGreaterThan(platform.from.y + 2);
    }
    expect(clock.apples.some((item) => item.y > clock.spawn.y + 1.5)).toBe(true);
    expect(clock.exit.x).toBeLessThan(clock.spawn.x);
  });
});
