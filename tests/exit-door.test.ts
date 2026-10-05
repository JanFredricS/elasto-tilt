import { describe, expect, it } from 'vitest';
import { exitDoorPose } from '../src/renderer';
import { levels } from '../src/levels';

const byId = (id: string) => levels.find(level => level.id === id)!;
const pose = (id: string) => exitDoorPose(byId(id).exit, byId(id).surfaces);
const deg = (radians: number) => radians * 180 / Math.PI;
/** Smallest signed difference between two angles, in degrees. */
const turn = (a: number, b: number) => deg(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe('exit door orientation', () => {
  it('stands upright on ordinary floors', () => {
    for (const id of ['newtons-orchard', 'newtons-attic', 'eschers-orchard', 'stairway-to-heaven']) {
      expect(pose(id).rotation, id).toBe(0);
    }
  });

  it('hangs from the underside of the shared stone in The Other Side', () => {
    const door = pose('underside-return');
    expect(door.surfaceId).toBe('return-shared-strip');
    expect(Math.abs(turn(door.rotation, Math.PI))).toBeLessThan(1e-6);
    // Threshold (local y = -.55) meets the stone's bottom face at y = -4.
    expect(door.y).toBeCloseTo(-4.55, 6);
  });

  it('hangs from ceilings that are ridden home upside down', () => {
    for (const id of ['pendulum-mill', 'room-on-its-side', 'contrary-conservatory', 'gravity-engine']) {
      expect(Math.abs(turn(pose(id).rotation, Math.PI)), id).toBeLessThan(1e-6);
    }
  });

  it('leans toward the spiral centre and keeps its threshold on the ribbon', () => {
    const level = byId('spiral-sanctuary');
    const door = pose('spiral-sanctuary');
    const inward = Math.atan2(-level.exit.y, -level.exit.x);
    // Door "up" (local +y) is (-sin r, cos r); it should point roughly at the centre.
    expect(Math.abs(turn(Math.atan2(Math.cos(door.rotation), -Math.sin(door.rotation)), inward))).toBeLessThan(15);
    expect(Math.hypot(door.x - level.exit.x, door.y - level.exit.y)).toBeLessThan(.8);
  });

  it('keeps free-standing exits upright and every door near its sensor', () => {
    expect(exitDoorPose({ x: 0, y: 10 }, [{ id: 'far', x: 0, y: 0, w: 4, h: 1 }]))
      .toMatchObject({ x: 0, y: 10, rotation: 0 });
    for (const level of levels) {
      const door = exitDoorPose(level.exit, level.surfaces);
      expect(Math.hypot(door.x - level.exit.x, door.y - level.exit.y), level.id).toBeLessThan(.8);
    }
  });

  it('follows a rotated surface', () => {
    const wall = { id: 'wall', x: 0, y: 0, w: 4, h: 1, angle: Math.PI / 2 };
    const door = exitDoorPose({ x: -1.3, y: 0 }, [wall]);
    // Exit sits to the wall's left, so the door's up is -x: a quarter turn counterclockwise.
    expect(turn(door.rotation, Math.PI / 2)).toBeCloseTo(0, 6);
    expect(door.x).toBeCloseTo(-.5 - .55, 6);
  });
});
