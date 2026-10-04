import type { Controls, Level, Snapshot, Surface, Vec } from '../types';
const p = (x: number, y: number): Vec => ({ x, y });
const slab = (id: string, x: number, y: number, w: number, h = .5): Surface => ({ id, x, y, w, h, kind: 'ground' });
const radius = 2;
const arc = (id: string, x: number, y: number, start: number, end: number, concave: boolean): Surface[] => {
  const count = 24, step = (end - start) / count, r = radius + (concave ? .25 : -.25);
  return Array.from({ length: count }, (_, i) => {
    const angle = start + (i + .5) * step;
    return { ...slab(`${id}-${i}`, x + r * Math.cos(angle), y + r * Math.sin(angle), 2 * r * Math.tan(Math.abs(step) / 2) + .045), angle: angle + Math.PI / 2 };
  });
};
const surfaces: Surface[] = [slab('stair-base', 4, -.25, 16)];
for (let i = 0; i < 4; i++) {
  const x = 14 + 14 * i, y = 11 * i;
  surfaces.push(...arc(`stair-foot-${i}`, x - radius, y + radius, -Math.PI / 2, 0, true),
    slab(`stair-riser-${i}`, x + .25, y + 5.5, .5, 7),
    ...arc(`stair-crest-${i}`, x + radius, y + 11 - radius, Math.PI, Math.PI / 2, false),
    slab(`stair-tread-${i}`, x + 7, y + 10.75, 10));
}
export const stairwayLevel: Level = {
  id: 'stairway-to-heaven', name: 'Stairway to Heaven', subtitle: 'Every edge is a new horizon', difficulty: 15,
  mechanic: 'Climb four enormous right-angle steps by turning gravity onto each vertical face, then easing it over every crest. Collect the summit apple and descend home.',
  hint: 'Slow at every corner. Turn the wall into your floor, then ease back as the front wheel reaches the tread. Gather both apples on each step; after the summit, reverse gently and retrace your climb.',
  spawn: p(0, .7), exit: p(0, .8), bounds: { min: p(-8, -8), max: p(76, 53) }, accent: '#a8c6d7',
  surfaces,
  apples: Array.from({ length: 4 }, (_, i) => [
    { id: `stair-face-apple-${i}`, x: 13.1 + 14 * i, y: 5.5 + 11 * i },
    { id: `stair-tread-apple-${i}`, x: 22 + 14 * i, y: 11.9 + 11 * i },
  ]).flat(),
  routeHints: [
    { x: 11, y: 6, angle: Math.PI / 2, label: 'UP' },
    { x: 17, y: 14, angle: 0, label: 'EASE OVER' },
    { x: 66, y: 47, angle: Math.PI, label: 'SUMMIT · HOME' },
  ],
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
/** An observation-only reference route: gravity commands, no body manipulation. */
export function createStairwayPilot(): (state: Snapshot) => Controls {
  let previous: Vec | undefined, lastTime = 0;
  return state => {
    const angle = state.bodies.find(body => body.id === 'frame')!.angle;
    const dt = state.elapsed - lastTime;
    const velocity = previous && dt > 0 ? ((state.bike.x - previous.x) * Math.cos(angle) + (state.bike.y - previous.y) * Math.sin(angle)) / dt : 0;
    previous = state.bike; lastTime = state.elapsed;
    const desired = state.collected.length === stairwayLevel.apples.length ? -1.3 : 1.3;
    const target = angle + clamp((desired - velocity) * .25, -.3, .3);
    const difference = Math.atan2(Math.sin(target - state.worldAngle), Math.cos(target - state.worldAngle));
    return { tilt: clamp(difference * 8, -1, 1), brake: false };
  };
}
