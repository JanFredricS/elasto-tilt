import { describe, expect, it } from 'vitest';
import { levels } from '../src/levels';
import type { Level, Surface, Vec } from '../src/types';

const half = (surface: Surface) => ({ x: surface.w / 2, y: surface.h / 2 });
const inside = (point: Vec, level: Level) =>
  point.x >= level.bounds.min.x && point.x <= level.bounds.max.x &&
  point.y >= level.bounds.min.y && point.y <= level.bounds.max.y;

// Rapier's initial chassis and wheel assembly; these are deliberately more
// stringent than checking the chassis centre alone.
const spawnParts = (spawn: Vec) => [
  { x: spawn.x, y: spawn.y, halfX: 0.58, halfY: 0.12 },
  { x: spawn.x - 0.70, y: spawn.y - 0.36, halfX: 0.34, halfY: 0.34 },
  { x: spawn.x + 0.70, y: spawn.y - 0.36, halfX: 0.34, halfY: 0.34 },
  { x: spawn.x + 0.10, y: spawn.y + 0.69, halfX: 0.21, halfY: 0.21 },
];

describe('authored campaign', () => {
  it('contains ten stable, named and progressive levels', () => {
    expect(levels.map((level) => level.id)).toEqual([
      'newtons-orchard', 'one-wheel-wonder', 'hanging-garden', 'pendulum-mill',
      'room-on-its-side', 'newtons-attic', 'eschers-orchard',
      'contrary-conservatory', 'gravity-engine', 'clockwork-apple',
    ]);
    expect(levels.map((level) => level.difficulty)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it.each(levels)('$name has finite, bounded geometry and no initial bike overlap', (level) => {
    expect(level.bounds.min.x).toBeLessThan(level.bounds.max.x);
    expect(level.bounds.min.y).toBeLessThan(level.bounds.max.y);
    const ids = [...level.surfaces, ...level.apples, ...(level.props ?? []),
      ...(level.swings ?? []), ...(level.timePlatforms ?? [])].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(level.apples.length).toBeGreaterThan(0);
    expect(inside(level.spawn, level)).toBe(true);
    expect(inside(level.exit, level)).toBe(true);

    for (const surface of level.surfaces) {
      expect(surface.w).toBeGreaterThan(0);
      expect(surface.h).toBeGreaterThan(0);
      const radius = half(surface);
      expect(inside({ x: surface.x - radius.x, y: surface.y - radius.y }, level)).toBe(true);
      expect(inside({ x: surface.x + radius.x, y: surface.y + radius.y }, level)).toBe(true);
      for (const part of spawnParts(level.spawn)) {
        const penetrationX = radius.x + part.halfX - Math.abs(surface.x - part.x);
        const penetrationY = radius.y + part.halfY - Math.abs(surface.y - part.y);
        expect(Math.min(penetrationX, penetrationY), `${level.id}: bike begins in ${surface.id}`)
          .toBeLessThanOrEqual(0.001);
      }
    }
    for (const item of level.apples) expect(inside(item, level)).toBe(true);
    for (const item of level.props ?? []) expect(inside(item, level)).toBe(true);
    for (const item of level.timePlatforms ?? []) {
      expect(inside(item.from, level)).toBe(true);
      expect(inside(item.to, level)).toBe(true);
      expect(item.w).toBeGreaterThan(0);
      expect(item.h).toBeGreaterThan(0);
    }
  });

  it('gives Orchard a continuous short roll with both apples before the exit', () => {
    const orchard = levels[0];
    const floor = orchard.surfaces[0];
    expect(floor.x - floor.w / 2).toBeLessThan(orchard.spawn.x - 1.04);
    expect(floor.x + floor.w / 2).toBeGreaterThan(orchard.exit.x + 1.04);
    expect(orchard.apples.every((item) => item.x > orchard.spawn.x && item.x < orchard.exit.x))
      .toBe(true);
    expect(orchard.apples.every((item) => Math.abs(item.y - 0.9) < 0.01)).toBe(true);
  });

  it('uses continuous, playable wall and ceiling surfaces in Escher’s Orchard', () => {
    const escher = levels[6];
    expect(escher.portals).toBeUndefined();
    const floor = escher.surfaces.find((item) => item.id === 'escher-floor')!;
    const wall = escher.surfaces.find((item) => item.id === 'escher-right-wall')!;
    const ceiling = escher.surfaces.find((item) => item.id === 'escher-ceiling')!;
    expect(floor.x + floor.w / 2).toBeGreaterThan(12);
    expect(wall.x - wall.w / 2).toBeCloseTo(16, 1);
    expect(ceiling.y - ceiling.h / 2).toBeCloseTo(10, 1);
    expect(escher.surfaces.filter((item) => item.id.startsWith('escher-lower-turn-'))).toHaveLength(4);
    expect(escher.surfaces.filter((item) => item.id.startsWith('escher-upper-turn-'))).toHaveLength(4);
    expect(escher.apples.some((item) => item.x < wall.x && item.x > wall.x - 1.5 && item.y > 3)).toBe(true);
    expect(escher.apples.some((item) => item.y < ceiling.y && item.y > ceiling.y - 1.5)).toBe(true);
    expect(escher.exit.y).toBeGreaterThan(escher.spawn.y + 7);
  });

  it('has a reversible, route-axis-driven clockwork platform pair', () => {
    const clock = levels[9];
    expect(clock.timeAxis).toEqual({ x: 1, y: 0 });
    expect(clock.timeTravel).toBeGreaterThan(0);
    expect(clock.timePlatforms).toHaveLength(2);
    for (const platform of clock.timePlatforms!) {
      expect(platform.to.y).toBeGreaterThan(platform.from.y + 2);
      expect(platform.to.x).toBeGreaterThan(platform.from.x);
    }
    expect(clock.apples.some((item) => item.y > 5)).toBe(true);
    expect(clock.exit.x).toBeGreaterThan(clock.timePlatforms![1].to.x);
  });
});
