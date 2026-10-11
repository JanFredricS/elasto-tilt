import type { Apple, Controls, Level, RouteHint, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const THICK = .5;

/** Friction of the polished ice. An authored value wins over the tyres (combine rule Min). */
export const ICE_FRICTION = .1;
/** The brake pads keep .4 of their usual torque: on ice they barely bite, on a mat they still hold. */
export const ICE_BRAKE = .4;

/** One corner of the ridden profile, left to right. `radius` rounds it with a circular
 *  fillet; `mat` makes the straight run from this corner to the next a grippy gold mat. */
export interface IceCorner { at: Vec; radius?: number; mat?: boolean }

/**
 * The Ice House, as a single left-to-right profile (metres, y up):
 *
 *   - Spawn mat (y 0) → face 1, a 40° polished ice face 3 m tall → shelf 1,
 *     tilted 8° back down into a level mat in its valley (y 2.2).
 *   - The same twice more: faces 2 and 3 (40°, 3 m), shelves 2 and 3, mats
 *     at y 4.4 and 6.6. The three shelves stack up the cellar wall.
 *   - The slick roof: a 12° ice gable to a ridge at y 8, falling 9.5° to the
 *     head of the slide.
 *   - The long ice slide: 24° down into a 30° ice roller (a short kicker under
 *     a low vault), 40° off its back to a level mid-slide mat (y 3), then over
 *     the mat's lip, 30° down for 7.5 m into a second kicker (26° up, 46° off
 *     its back) that drops onto the door mat on the cellar floor (y −2.2).
 *     Held level with the brake on, the bike cannot shed the slide's speed on
 *     ice and is thrown off that kicker nose-first: tilt the world back instead.
 *   - Past the door, an ice run-out to a 37° kicker against the end wall, with
 *     the last apple on it: ride up, then reverse onto the door mat.
 *
 * Every face, crest and valley is a 2–5 m fillet. Off the mats the stone is
 * ice (friction ICE_FRICTION): a braked bike slides on any slope over about 6°, and
 * locked wheels scrub only about a tenth of g, so world tilt is the throttle.
 * The mats sit where the profile is level; braked on one, the bike holds with
 * the world turned up to about .7 rad. They are places to stop and rethink,
 * not a requirement: tilt alone can ride every section. Low ice vaults hang
 * over every crest; a rider who leaves the ice there (well over 5 m/s) meets
 * the vault with the helmet.
 */
export const ICE_CORNERS: IceCorner[] = [
  { at: p(-4.5, 0), mat: true },
  { at: p(7, 0), radius: 3 },
  { at: p(10.5, 3), radius: 3 },
  { at: p(16, 2.2), radius: 4, mat: true },
  { at: p(19.5, 2.2), radius: 3 },
  { at: p(23, 5.2), radius: 3 },
  { at: p(28.5, 4.4), radius: 4, mat: true },
  { at: p(32, 4.4), radius: 3 },
  { at: p(35.5, 7.4), radius: 3 },
  { at: p(41, 6.6), radius: 4, mat: true },
  { at: p(44.5, 6.6), radius: 5 },
  { at: p(51, 8), radius: 5 },
  { at: p(57, 7), radius: 4 },
  { at: p(62, 4.8), radius: 2.5 },
  { at: p(64.6, 6.3), radius: 2 },
  { at: p(68.6, 3), radius: 3, mat: true },
  { at: p(73, 3), radius: 4 },
  { at: p(79.5, -.8), radius: 2.5 },
  { at: p(83, .9), radius: 2 },
  { at: p(86, -2.2), radius: 3, mat: true },
  { at: p(90, -2.2) },
  { at: p(96, -2.4), radius: 3 },
  { at: p(98.4, -.6) },
];

/** The ridden polyline: straight runs between fillets, each fillet sampled every ≤ 5°.
 *  `mat` marks the run leaving each point. */
export function iceProfile(corners: IceCorner[] = ICE_CORNERS): { at: Vec; mat: boolean }[] {
  const points: { at: Vec; mat: boolean }[] = [{ at: corners[0].at, mat: !!corners[0].mat }];
  for (let i = 1; i < corners.length - 1; i++) {
    const { at, radius = 0, mat = false } = corners[i], prev = corners[i - 1].at, next = corners[i + 1].at;
    const a0 = Math.atan2(at.y - prev.y, at.x - prev.x), a1 = Math.atan2(next.y - at.y, next.x - at.x);
    const bend = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
    if (!radius || Math.abs(bend) < 1e-6) { points.push({ at, mat }); continue; }
    const t = radius * Math.tan(Math.abs(bend) / 2), pieces = Math.max(2, Math.ceil(Math.abs(bend) / (5 * Math.PI / 180)));
    // Centre of the fillet: on the inside of the bend, `radius` from both tangent lines.
    const side = Math.sign(bend), start = p(at.x - Math.cos(a0) * t, at.y - Math.sin(a0) * t);
    const centre = p(start.x - Math.sin(a0) * radius * side, start.y + Math.cos(a0) * radius * side);
    for (let k = 0; k <= pieces; k++) {
      const heading = a0 + bend * k / pieces;
      points.push({ at: p(centre.x + Math.sin(heading) * radius * side, centre.y - Math.cos(heading) * radius * side),
        mat: k === pieces && mat });
    }
  }
  points.push({ at: corners.at(-1)!.at, mat: false });
  return points;
}

/** Track height and heading under x (the profile never overhangs). */
export function iceTrackAt(x: number, profile = ICE_PROFILE): { y: number; angle: number } {
  const i = clamp(profile.findIndex((pt, index) => index > 0 && x <= pt.at.x), 1, profile.length - 1);
  const a = profile[i - 1].at, b = profile[i].at, t = clamp((x - a.x) / (b.x - a.x), 0, 1);
  return { y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

/** One slab per profile run, in one chain: mats are default-friction 'cradle' stone, the rest is ice. */
export function iceSurfaces(profile: { at: Vec; mat: boolean }[], friction = ICE_FRICTION): Surface[] {
  return profile.slice(1).map((end, i) => {
    const from = profile[i].at, to = end.at, angle = Math.atan2(to.y - from.y, to.x - from.x), mat = profile[i].mat;
    return { id: mat ? `ice-mat-${i}` : `ice-${i}`, chain: 'ice-house', angle,
      x: (from.x + to.x) / 2 + Math.sin(angle) * THICK / 2, y: (from.y + to.y) / 2 - Math.cos(angle) * THICK / 2,
      w: Math.hypot(to.x - from.x, to.y - from.y), h: THICK,
      ...(mat ? { kind: 'cradle' as const } : { kind: 'ground' as const, friction }) };
  });
}

export const ICE_PROFILE = iceProfile();
export const ICE_DOOR = p(88.2, -1.4);
/** Clear height (m, along the face normal) under the cellar vaults. */
export const ICE_HEADROOM = 2.6;
/** Where the vaults hang: over every crest and lip, where a fast rider leaves the ice. */
export const ICE_VAULTS: [id: string, x0: number, x1: number, clear?: number][] = [
  ['ice-vault-1', 8.5, 14], ['ice-vault-2', 21, 26.5], ['ice-vault-3', 33.5, 39],
  ['ice-vault-roof', 46, 59], ['ice-vault-roller', 63.4, 66.6, 2.4], ['ice-vault-lip', 70.5, 77], ['ice-vault-kicker', 81.6, 85],
];

/** A low ice vault following the floor beneath it at `clear` metres: its underside
 *  is the profile between x0 and x1 offset along each run's normal. Crest offsets
 *  splay apart, so each slab is a little long to close the seams. Not ridden. */
function vault(id: string, x0: number, x1: number, clear = ICE_HEADROOM): Surface[] {
  const points = [p(x0, iceTrackAt(x0).y), ...ICE_PROFILE.map(q => q.at).filter(q => q.x > x0 && q.x < x1), p(x1, iceTrackAt(x1).y)];
  return points.slice(1).map((to, i) => {
    const from = points[i], angle = Math.atan2(to.y - from.y, to.x - from.x), off = clear + THICK / 2;
    return { id: `${id}-${i}`, kind: 'ground', friction: ICE_FRICTION, angle,
      x: (from.x + to.x) / 2 - Math.sin(angle) * off, y: (from.y + to.y) / 2 + Math.cos(angle) * off,
      w: Math.hypot(to.x - from.x, to.y - from.y) + .3, h: THICK };
  });
}

/** Apples ride low over the ice (.55 m above the face), under the vaults: a rider
 *  who crests too fast leaves the ice and meets the vault instead. */
const fruit = (id: string, x: number, lift = .55): Apple => {
  const { y, angle } = iceTrackAt(x);
  return { id, x: x - Math.sin(angle) * lift, y: y + Math.cos(angle) * lift };
};
const ICE_APPLES: Apple[] = [
  fruit('ice-shelf-1', 12.6),
  fruit('ice-shelf-2', 25.1),
  fruit('ice-shelf-3', 37.6),
  fruit('ice-ridge', 51.2),
  fruit('ice-roller', 64.5),
  fruit('ice-slide-lip', 74.6),
  fruit('ice-bump', 82.8),
  // Up the ice kicker past the door: the only apple that needs a reversal.
  fruit('ice-kicker', 97.2),
];
const ICE_HINTS: RouteHint[] = [
  { x: 4.5, y: 2.2, angle: .7, label: 'ROCK', spin: 1 },
  { x: 49, y: 11.6, angle: 0, label: 'EASE' },
  { x: 63, y: 7.2, angle: -.42, label: 'HOLD BACK', spin: -1 },
  { x: 78, y: 3, angle: -.52, label: 'HOLD BACK', spin: -1 },
  { x: 93, y: 1.8, angle: Math.PI, label: 'HOME' },
];

export const iceHouseLevel: Level = {
  id: 'ice-house', name: 'The Ice House', subtitle: 'Without friction, only gravity steers',
  mechanic: 'Polished ice gives the tyres almost no grip and the brake barely bites. Climb three tilted ice shelves, cross the slick roof and ease down the long slide; only the gold-striped mats hold a braked bike.',
  hint: 'Brakes are weak on ice: tilt is your throttle. Rock the world toward each ice face to climb it, rock it back as you crest, and brake only on the gold mats.',
  spawn: p(0, .72), bounds: { min: p(-6, -4), max: p(101, 13) }, difficulty: 8.5, accent: '#9cc8e8',
  brakeScale: ICE_BRAKE,
  surfaces: [
    ...iceSurfaces(ICE_PROFILE),
    ...ICE_VAULTS.flatMap(([id, x0, x1, clear]) => vault(id, x0, x1, clear)),
    // Cellar walls at both ends.
    { id: 'ice-back-wall', x: -4.8, y: 2.5, w: .6, h: 5, kind: 'ground' },
    { id: 'ice-end-wall', x: 98.7, y: .5, w: .6, h: 6, kind: 'ground' },
  ],
  apples: ICE_APPLES, routeHints: ICE_HINTS,
  exit: ICE_DOOR,
};

/** Whether the run under x is a grippy mat. */
export function iceMatAt(x: number, profile = ICE_PROFILE): boolean {
  const i = clamp(profile.findIndex((pt, index) => index > 0 && x <= pt.at.x), 1, profile.length - 1);
  return profile[i - 1].mat;
}

/** Outbound cruise speed (m/s) the pilot holds at x: slow over every crest and lip,
 *  and slower still up the kicker past the door. */
export function iceSpeedAt(x: number): number {
  if (x > 91) return 1;
  const crests = [10.5, 23, 35.5, 51, 57, 64.6, 73, 83];
  return Math.min(...crests.map(c => Math.abs(x - c))) < 2.2 ? 1.3 : 2.2;
}

/**
 * Observation-only pilot (fixed steps of any size). Speed along the track is held
 * by tilt alone: target = heading ahead + clamp((cruise − v)·.25, ±.35). On a
 * slick face that means rocking the world into it, then back as it crests. On a
 * mat it also brakes off any excess speed. Past the door it climbs the kicker for
 * the last apple, then reverses and brakes onto the door mat.
 */
export function createIceHousePilot(): (state: Snapshot) => Controls {
  let previous: Snapshot | undefined, v = 0;
  return state => {
    const dt = previous ? state.elapsed - previous.elapsed : 0;
    const track = iceTrackAt(state.bike.x);
    if (previous && dt > 0) v = ((state.bike.x - previous.bike.x) * Math.cos(track.angle)
      + (state.bike.y - previous.bike.y) * Math.sin(track.angle)) / dt;
    previous = state;
    const home = state.collected.includes('ice-kicker');
    const cruise = home ? clamp((ICE_DOOR.x - state.bike.x) * .5, -1.5, -.3) : iceSpeedAt(state.bike.x);
    const ahead = iceTrackAt(state.bike.x + clamp(v * .5, -1.5, 1.5)).angle;
    const target = ahead + clamp((cruise - v) * .25, -.35, .35);
    const brake = iceMatAt(state.bike.x) && Math.abs(v) > Math.abs(cruise) + .4;
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake };
  };
}
