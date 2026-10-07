import { expect, it } from 'vitest';
import { createPhysics } from '../src/physics';
import { createFirstLessonPilot, firstLessonLevel, lessonProfile, LESSON_DOOR_X } from '../src/levels/first-lesson';
import { profileAt } from '../src/levels/early';
import { levels } from '../src/levels';
import type { Controls, Snapshot } from '../src/types';

const clamp = (n: number) => Math.max(-1, Math.min(1, n));
/** A motion player holding the world at `angle` (button tilt toward it). */
const holdAt = (angle: number, brake: (state: Snapshot) => boolean = () => false) =>
  (state: Snapshot): Controls => ({ tilt: clamp((angle - state.worldAngle) * 8), brake: brake(state) });
async function ride(pilot: (state: Snapshot) => Controls, seconds: number) {
  const game = await createPhysics(); game.load(firstLessonLevel);
  let state = game.snapshot(), brakes = 0, minY = state.bike.y;
  for (let i = 0; i < 120 * seconds && state.status === 'playing'; i++) {
    const control = pilot(state); brakes += Number(control.brake);
    state = game.step(1 / 120, control); minY = Math.min(minY, state.bike.y);
  }
  game.destroy();
  return { state, brakes, minY };
}

it('opens the campaign with the gentle first lesson', () => {
  expect(levels[0]).toBe(firstLessonLevel);
  expect(firstLessonLevel.apples).toHaveLength(3);
  expect(firstLessonLevel.surfaces.some(surface => surface.kind === 'hazard')).toBe(false);
  expect(firstLessonLevel.difficulty).toBeLessThan(levels[1].difficulty);
  expect(firstLessonLevel.hint).not.toMatch(/brake/i);
});

it('has a gentle (≈ 8°) hill, a long level run-out to the door and a wall behind the spawn', () => {
  let steepest = 0;
  for (let x = lessonProfile[0][0]; x <= lessonProfile.at(-1)![0]; x += .05) steepest = Math.max(steepest, Math.abs(profileAt(lessonProfile, x).angle));
  expect(steepest * 180 / Math.PI).toBeLessThanOrEqual(8.5);
  expect(steepest * 180 / Math.PI).toBeGreaterThanOrEqual(7);
  const hillEnd = lessonProfile.at(-2)![0];
  expect(LESSON_DOOR_X - hillEnd).toBeGreaterThanOrEqual(10);
  const back = firstLessonLevel.surfaces.find(surface => surface.id === 'lesson-back')!;
  expect(back.x).toBeLessThan(firstLessonLevel.spawn.x); expect(back.y + back.h / 2).toBeGreaterThan(2);
});

it('completes Newton’s First Lesson with actual Rapier controls, never braking', async () => {
  const { state, brakes, minY } = await ride(createFirstLessonPilot(), 60);
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(3);
  expect(brakes).toBe(0);
  expect(minY).toBeLessThan(-.6); // it rode down the hill
  expect(state.elapsed).toBeLessThan(45);
});

it.each([.1, .2, .3, .4, .5, .6])('completes without braking when the world is simply held tilted %s rad right', async angle => {
  const { state } = await ride(holdAt(angle), 40);
  expect(state.status).toBe('complete');
  expect(state.collected).toHaveLength(3);
});

it('has a soft brake', () => { expect(firstLessonLevel.brakeScale).toBeLessThanOrEqual(.4); });

it.each([.1, .2, .3, .4])('holding BRAKE from the hill top with the world tilted %s rad does not crash', async angle => {
  const { state } = await ride(holdAt(angle, state => state.bike.x > lessonProfile[1][0]), 30);
  expect(state.status).not.toBe('crashed');
});

it('tilting back left rolls against the back wall instead of off a cliff', async () => {
  const { state } = await ride(holdAt(-.3), 20);
  expect(state.status).toBe('playing');
  expect(state.bike.x).toBeGreaterThan(firstLessonLevel.surfaces.find(surface => surface.id === 'lesson-back')!.x);
});

it.each<Controls>([{ tilt: 0, brake: false }, { tilt: -1, brake: false }])('is not completed by doing nothing or tilting the wrong way (%o)', async control => {
  const { state } = await ride(() => control, 30);
  expect(state.status).not.toBe('complete');
});
