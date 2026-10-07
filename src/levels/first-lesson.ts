import type { Controls, Level, Snapshot, Vec } from '../types';
import { profileAt, terrain, type Terrace } from './early';

const p = (x: number, y: number): Vec => ({ x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** Level road, one gentle cosine descent (1.4 m over 16 m: at most 8°), and
 * a long level run-out to the door and a stop wall. Gentle enough that
 * (with this map's soft brake) holding BRAKE from the hill top cannot pitch
 * the bike over the bars, even with the world held .4 rad further right. */
export const lessonProfile: Terrace[] = [[-6, 0], [12, 0], [28, -1.4], [46, -1.4]];
export const LESSON_DOOR_X = 41;

/** Campaign index 0: the whole game in one breath. No hazards, no return trip,
 * no brakes needed: tilt to roll, gather three apples, roll into the door. */
export const firstLessonLevel: Level = {
  id: 'newtons-first-lesson', name: 'Newton’s First Lesson', subtitle: 'A body at rest stays at rest',
  mechanic: 'Tilt the world and gravity does the pedalling. Gather three apples on the road and the hill, then ride into the door.',
  hint: 'Tilt right a little to start rolling. Gather the apples and roll on into the door.',
  spawn: p(0, .72), bounds: { min: p(-9, -7), max: p(50, 8) },
  surfaces: [
    ...terrain('lesson', lessonProfile),
    // Stone walls at both ends: tilting the wrong way only rolls you back
    // against the first; an overshoot only bumps the front wheel on the second.
    { id: 'lesson-back', x: -6.3, y: 1.4, w: .6, h: 3.6 },
    { id: 'lesson-stop', x: 46.3, y: lessonProfile.at(-1)![1] + 1.4, w: .6, h: 3.6 },
  ],
  apples: [6, 20, 32].map((x, i) => ({ id: `lesson-${i}`, x, y: profileAt(lessonProfile, x).y + .9 })),
  // A soft brake (.3 of the usual pad torque): a newcomer who grabs it at speed
  // off the hill top slows down instead of going over the bars.
  brakeScale: .3,
  exit: p(LESSON_DOOR_X, lessonProfile.at(-1)![1] + .8), difficulty: .5, accent: '#e8b56a',
};

/** Observation-only demonstration: hold an easy speed along the road by
 * tilting alone (no brake), and ease into the door. */
export function createFirstLessonPilot() {
  let previous: Snapshot | undefined;
  return (state: Snapshot): Controls => {
    const vx = previous ? (state.bike.x - previous.bike.x) * 120 : 0;
    const vy = previous ? (state.bike.y - previous.bike.y) * 120 : 0;
    previous = state;
    const theta = profileAt(lessonProfile, state.bike.x).angle;
    const speed = clamp((LESSON_DOOR_X + .3 - state.bike.x) * .9, .3, 2.4);
    const along = vx * Math.cos(theta) + vy * Math.sin(theta);
    const target = theta + clamp((speed - along) * .23, -.3, .3);
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false };
  };
}
