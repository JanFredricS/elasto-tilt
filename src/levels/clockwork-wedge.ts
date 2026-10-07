import type { Apple, Controls, Level, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const g = (id: string, x: number, y: number, w: number, h = .6): Surface => ({ id, x, y, w, h, kind: 'ground' });
const a = (id: string, x: number, y: number): Apple => ({ id, x, y });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** A block spanning x0..x1 with its top at `top`, reaching down to `bottom`. */
const block = (id: string, x0: number, x1: number, top: number, bottom: number): Surface =>
  g(id, (x0 + x1) / 2, (top + bottom) / 2, x1 - x0, top - bottom);
/** A quarter arc ridden on its inside (as in late.ts): eight tangent faces. */
const turn = (id: string, x: number, y: number, radius: number, start: number): Surface[] => {
  const thickness = .42, step = Math.PI / 16;
  return Array.from({ length: 8 }, (_, i) => {
    const angle = start + (i + .5) * step, r = radius + thickness / 2;
    return { ...g(`${id}-${i}`, x + Math.cos(angle) * r, y + Math.sin(angle) * r,
      2 * r * Math.sin(step / 2) + .12, thickness), angle: angle + Math.PI / 2 };
  });
};
/** A ground slab whose top face runs from `from` to `to` (ridden on the side
 * to the left of that direction: from left to right, its top). */
const slab = (id: string, from: Vec, to: Vec, h = .6): Surface => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { ...g(id, (from.x + to.x) / 2 + Math.sin(angle) * h / 2, (from.y + to.y) / 2 - Math.cos(angle) * h / 2,
    Math.hypot(to.x - from.x, to.y - from.y), h), angle };
};
/** The deck's west end, ridden westward: its edge rounded over a knee into a
 * straight slide down to the left, then bent level again into a short table
 * whose lip is `lip` above the floor. A slide adds no pitch spin (a square
 * edge this high would pivot the rider nose-over); the table launches the
 * rider level and fast, so it lands on both wheels; and ending above the
 * floor leaves headroom to ride back east beneath it. Thin (.3 m) faces. */
function westChute(top: Vec, lip: number, angle: number, knee: number, bend: number) {
  const surfaces: Surface[] = [];
  let at = top, n = 0;
  // A face ridden from right to left is the slab from `to` back to `at` (top up).
  const piece = (to: Vec, chain?: string) => { surfaces.push({ ...slab(`wedge-chute-${n++}`, to, at, .3), ...(chain ? { chain } : {}) }); at = to; };
  const arc = (h0: number, h1: number, radius: number, chain: string) => {
    const pieces = 6, step = (h1 - h0) / pieces, chord = 2 * radius * Math.sin(Math.abs(step) / 2);
    for (let i = 0; i < pieces; i++) {
      const heading = h0 + (i + .5) * step;
      piece(p(at.x + chord * Math.cos(heading), at.y + chord * Math.sin(heading)), chain);
    }
  };
  arc(Math.PI, Math.PI + angle, knee, 'wedge-chute-knee');
  const drop = at.y - (lip + bend * (1 - Math.cos(angle)));
  piece(p(at.x - drop / Math.tan(angle), at.y - drop), 'wedge-chute-run');
  arc(Math.PI + angle, Math.PI, bend, 'wedge-chute-run');
  piece(p(at.x - 1.2, at.y), 'wedge-chute-run');
  return { surfaces, end: at };
}

/**
 * The Clockwork Wedge. Geometry (metres, y up):
 *
 *   - The rider starts on a deck (top y = 5, x −20 … 5) above the floor
 *     (y = 0). Riding right lowers a 3×2.5 brass counterweight onto the door
 *     at (40, 1.25), far beyond the deck's east end, which curls up into a
 *     tall quarter-pipe: from the deck the door can be seen but not reached,
 *     and a rider who holds the world tilted right (up to a radian) just
 *     rocks in the curl. Riding left lifts the weight. TIME_TRAVEL 16 m.
 *   - The wedge (5 wide, ◢: a 2.5 m slope over a .35 m vertical toe) sits on
 *     the floor UNDER the deck, west of the spawn: sloped face west, vertical
 *     face east. It is light (density .15), grippy (friction .75) and heavily
 *     damped (linear damping 5): held at ≤ .6 rad the world never moves it
 *     (it needs ≳ .7 to creep on its own, and even at .8 it only crawls), but
 *     a rider behind it adds their own weight to the push, so a held .3 rad
 *     already moves it at a walk, and the damping caps the pushing speed
 *     (≈ 1 m/s at .3 rad, ≈ 6 m/s at .8), so the rider never slams into it
 *     when it stops. The toe is faced with a frictionless bumper: the front
 *     tyre pushes against it instead of climbing the slope. It has to be
 *     fetched from the west: ride west along the deck, down the
 *     knee-and-slide at its west end, off the lip (2.4 m up, headroom to come
 *     back under it) and into a quarter-pipe; roll back east under the deck
 *     and tilt the world right behind the wedge, pushing it along the floor
 *     until it rests against a stone post (as tall as the wedge's slope, so
 *     their tops run flush into the weight's) at the counterweight's west
 *     face. Its seat there is a recess as deep as the toe (and .3 m longer
 *     than the wedge, so it drops in level): seated, the slope starts flush
 *     with the floor and the wedge becomes fixed stone (socket). The post
 *     also keeps a loose wedge out of the door bay at any tilt.
 *   - That ride east is ≥ 40 m of floor, so the weight (top speed 4 m/s
 *     along its path, timeSpeed) is always seated long before any rider,
 *     however fast, reaches it.
 *   - From the weight's top (an apple) the only way on is east: a one-way
 *     drop over a thin wall (top 2.4) whose eave slopes down east to a hand's
 *     breadth above a down-ramp (top 1.3 m). Ridden back west, the ramp ends
 *     under the eave at the wall's face: the door cannot be entered from the
 *     east, even with the world held at 1.2 rad. Nothing hangs lower than
 *     y 8 over the crossing, so a rider can cross the weight at any speed.
 *   - The ramp leads to a half-pipe (radius 4.5, centre (52, 4.5)) that turns
 *     the rider up and over, inverted, onto the underside of a roof (y = 9)
 *     running west above the door. Riding west there is the leftward travel
 *     that lifts the weight: straight up off the door to (40, 4.6), clear of
 *     the one-way wall, then east to (46, 5.4), under the roof rider's head
 *     and over the ramp, clear of the drop line and far from the wedge.
 *   - The catch: west of the door the roof's underside steps up into a
 *     recess ceiling (lift .5 above the roof) that ends at a slick stone stop
 *     (east face x 39.2). Riding west upside down, the rider's front wheel
 *     runs onto a short grippy cup along the stop's foot and presses against
 *     the stop, while the frame's rear rests on a frictionless tooth under
 *     its east end. That hold is static at every world angle in [π, 2π]: a
 *     rider who stops turning at any point of the way round stays caught
 *     (tested with pauses of up to 5 s every .2 rad from 3.3 to 6.1 rad, and
 *     at the hold's edge, 5.95–6.12). Turning the world on round the same
 *     way (π → 2π), the wheel rolls off the cup's corner only when gravity
 *     points straight back down (≈ 2π): the frame slides a hand's breadth
 *     east on the slick tooth, tips nose-down about its west edge (the rear
 *     wheel rises into a dip in the ceiling east of the recess, so it never
 *     jams against the roof), drifts ≈ 1 m/s west and lands wheels first on
 *     the door at x ≈ 39.4–39.6. Over-rotating past level by more than ≈ .25
 *     rad before the drop tips the rider east onto the lifted weight (hint:
 *     "back to level, and hold").
 *   - The door bay's floor is a hazard strip: the door is reached in the air
 *     on the way down, so a rider with every apple finishes before touching
 *     it, and a rider missing one crashes instead of being stranded.
 */
export const WEDGE = {
  deck: { x0: -20, x1: 5, y: 5 }, floor: 0,
  door: p(40, 1.25), via: p(40, 4.6), raised: p(46, 5.4), block: { w: 3, h: 2.5 }, timeTravel: 16, timeSpeed: 4,
  /** Light, grippy and heavily damped: it stays put with the world held at .6 rad (it needs ≳ .8 to
   * slide on its own, and then only creeps), but the rider behind it adds their weight to the push, so
   * a held .3 rad moves it; the damping caps the pushing speed (≈ 1–6 m/s for .3–.8 rad). */
  wedge: { w: 5, h: 2.85, x: -9.5, friction: .75, density: .15, damping: 5, toe: .35 },
  /** The wedge's seat: a recess as deep as its toe (and .3 m longer than the wedge, so it drops in
   * flat), so seated its slope starts flush with the floor. */
  seat: { x0: 32.9 },
  stop: { x0: 38.2, x1: 38.5, h: 2.5 },
  /** The one-way wall; its eave slopes down east to (eave, ≈ 1.27): its tip is a
   * hand's breadth (eaveGap) above the down-ramp, so the step off it is small. */
  wall: { x0: 41.6, x1: 41.9, top: 2.4, eave: 43.2, eaveGap: .25 }, ramp: { from: p(41.9, 1.3), to: p(47.5, 0) },
  pipe: { x: 52, y: 4.5, r: 4.5 }, roof: { y: 9 },
  /** The catch under the roof's west end. From x0 the roof's underside is
   * raised by `lift` (the recess ceiling); it ends at a slick stop (east face
   * at x, friction stopFriction). Along the stop's foot a thin (shelf) grippy
   * cup reaches `bite` short of the front wheel's centre: the wheel presses
   * against the stop and rests on the cup's corner, and rolls off it only
   * when gravity points straight back at the roof (≈ 2π). Under the frame's
   * east end a slick tooth (tooth.x0..x1 about that end, `gap` below the
   * wheels' bottoms) carries its rear and lets it slide east on release. The
   * ceiling east of the recess (dip) rises by `rise` over `flat`, between an
   * `exit` slope and a gentler `entry` slope back down to the roof, so the
   * tipping rider's rear wheel never jams against it. See the surfaces below. */
  catch: { x: 39.2, lift: .5, dip: { x0: 40.3, exit: 25 * Math.PI / 180, rise: .3, flat: .6, entry: 15 * Math.PI / 180 }, gap: .14, shelf: .04, bite: .12, tooth: { x0: -.2, x1: .18 }, stopFriction: 0, x0: 33 },
  /** The bike's wheel radius, wheelbase, frame length and how far the wheels'
   * bottoms sit above the frame's underside (src/physics.ts). */
  bike: { wheel: .34, wheelbase: 1.4, frame: 1.16, clearance: .14 },
  westPipe: { x: -36, r: 3 }, lip: 2.4,
};
const W = WEDGE;
/** The frame's x when caught: the front wheel against the catch wall. */
export const CAUGHT_X = W.catch.x + W.bike.wheel + W.bike.wheelbase / 2;

/** The recess ceiling the caught rider hangs under, and the hold's supports. */
const CEILING = W.roof.y + W.catch.lift;
/** The roof's underside from the catch east: the catch's ceiling (lift above
 * the roof), then a dip (rise higher still) over where the caught rider's rear
 * wheel hangs, so the rider can tip nose-down without jamming against the
 * roof, then a gentle run back down to the roof the half-pipe delivers to. */
function dipSurfaces(): Surface[] {
  const d = W.catch.dip, top = CEILING + d.rise;
  const x1 = d.x0 + d.rise / Math.tan(d.exit), x2 = x1 + d.flat, x3 = x2 + (top - W.roof.y) / Math.tan(d.entry);
  return [
    block('wedge-roof', W.catch.x0, d.x0, CEILING + .6, CEILING),
    slab('wedge-roof-exit', p(x1, top), p(d.x0, CEILING), .6),
    block('wedge-roof-dip', x1, x2, top + .6, top),
    slab('wedge-roof-entry', p(x3, W.roof.y), p(x2, top), .6),
    block('wedge-roof-east', x3, W.pipe.x + .1, W.roof.y + .6, W.roof.y),
  ];
}
function catchSurfaces(): Surface[] {
  const wheelBottom = CEILING - 2 * W.bike.wheel - W.catch.gap;
  const frameBottom = wheelBottom - W.bike.clearance;
  const lip = W.catch.x + W.bike.wheel - W.catch.bite;
  const end = CAUGHT_X + W.bike.frame / 2;
  return [
    { ...slab('wedge-roof-cup', p(W.catch.x, wheelBottom), p(lip, wheelBottom), W.catch.shelf), friction: 1.1 },
    { ...slab('wedge-roof-tooth', p(end + W.catch.tooth.x0, frameBottom), p(end + W.catch.tooth.x1, frameBottom), W.catch.shelf), friction: 0 },
    { ...block('wedge-roof-stop', W.catch.x - .3, W.catch.x, CEILING, wheelBottom), friction: W.catch.stopFriction },
  ];
}
const chute = westChute(p(W.deck.x0, W.deck.y), W.lip, 50 * Math.PI / 180, 1.5, 2);
const wedgeY = W.floor + W.wedge.h / 2;
/** The ramp's height at x, and the eave's tip: its underside eaveGap above the ramp. */
const rampY = (x: number) => W.ramp.from.y + (x - W.ramp.from.x) * (W.ramp.to.y - W.ramp.from.y) / (W.ramp.to.x - W.ramp.from.x);
const eaveTip = (() => {
  const under = rampY(W.wall.eave) + W.wall.eaveGap, slope = Math.atan2(W.wall.top - under, W.wall.eave - W.wall.x1);
  return p(W.wall.eave, under + .2 / Math.cos(slope));
})();

export const clockworkWedgeLevel: Level = {
  id: 'clockwork-wedge', name: 'The Clockwork Wedge', subtitle: 'Wedge the weight, turn the world',
  mechanic: 'Riding right lowers the brass weight onto the door; riding left lifts it. Fetch the wedge from under the deck, push it against the weight, loop onto the roof, and let the catch above the door stop you while you turn the world.',
  hint: 'The wedge waits under the deck: ride west off the deck, come back beneath it and tilt right gently to push the wedge to the weight. Ride over the weight, loop the half-pipe onto the roof, then ride left along the roof until the stop catches you. Turn the world one full turn, back to level, and hold it there — you fall onto the door.',
  spawn: p(0, W.deck.y + .72), bounds: { min: p(-40, -4), max: p(60, 13) },
  surfaces: [
    // The floor: one level run from the west quarter-pipe to the wedge's seat.
    slab('wedge-floor', p(W.westPipe.x, 0), p(W.seat.x0, 0)),
    block('wedge-seat', W.seat.x0, W.stop.x0, -W.wedge.toe, -W.wedge.toe - .6),
    block('wedge-floor-east', W.stop.x1, W.pipe.x, 0, -.6),
    ...turn('wedge-west-pipe', W.westPipe.x, W.westPipe.r, W.westPipe.r, Math.PI),
    block('wedge-west-wall', W.westPipe.x - W.westPipe.r - .6, W.westPipe.x - W.westPipe.r, 10, W.westPipe.r - .1),
    // The deck, its west knee-and-slide, and its east quarter-pipe.
    block('wedge-deck', W.deck.x0, W.deck.x1, W.deck.y, W.deck.y - .6),
    ...chute.surfaces,
    ...turn('wedge-deck-curl', W.deck.x1, W.deck.y + 2, 2, -Math.PI / 2),
    block('wedge-deck-end', W.deck.x1 + 2, W.deck.x1 + 2.6, W.deck.y + 8, W.deck.y + 1.9),
    // The wedge's stop post at the weight's west face, and the one-way drop to the east.
    block('wedge-wheel-stop', W.stop.x0, W.stop.x1, W.stop.h, -W.wedge.toe - .3),
    block('wedge-east-wall', W.wall.x0, W.wall.x1, W.wall.top, -.1),
    // The door bay's floor is guarded: a rider who drops in with every apple
    // reaches the door before touching it; anyone else is caught here, not stranded.
    { ...block('wedge-door-guard', W.stop.x1, W.wall.x0, .1, -.05), kind: 'hazard' as const },
    slab('wedge-east-eave', p(W.wall.x1, W.wall.top), eaveTip, .2),
    slab('wedge-down-ramp', W.ramp.from, W.ramp.to),
    ...turn('wedge-pipe-low', W.pipe.x, W.pipe.y, W.pipe.r, -Math.PI / 2),
    ...turn('wedge-pipe-high', W.pipe.x, W.pipe.y, W.pipe.r, 0),
    // The roof over the door, and the catch hanging from it above the door's west side.
    ...dipSurfaces(),
    ...catchSurfaces(),
  ],
  props: [{ id: 'wedge-ramp', shape: 'wedge', x: W.wedge.x, y: wedgeY, w: W.wedge.w, h: W.wedge.h,
    density: W.wedge.density, friction: W.wedge.friction, damping: W.wedge.damping, toe: W.wedge.toe,
    socket: { x: W.stop.x0 - W.wedge.w / 2, y: W.wedge.h / 2 - W.wedge.toe, tolerance: .35, speed: .25, angle: .03 } }],
  timePlatforms: [{ id: 'wedge-weight', from: W.raised, via: W.via, to: W.door, w: W.block.w, h: W.block.h }],
  timeAxis: p(1, 0), timeTravel: W.timeTravel, timeSpeed: W.timeSpeed, timeLabel: 'COUNTERWEIGHT',
  apples: [
    a('wedge-a', -8, W.deck.y + .9),
    a('wedge-under', -26, .9),
    a('wedge-c', 24, .9),
    a('wedge-top', W.door.x, W.block.h + .9),
    a('wedge-pipe', W.pipe.x + W.pipe.r - .7, W.pipe.y),
    a('wedge-ceiling', 46, W.roof.y - .7),
  ],
  routeHints: [
    // Marks sit where the COUNTERWEIGHT panel (top right of a landscape screen; top left
    // in portrait) never covers them at the riding camera along the pilot's whole ride at
    // 1280×800, 1024×768 and 667×375: UNDER and PUSH at floor level under the deck, LOOP at
    // the foot of the down-ramp, LIFT in the half-pipe's eye. (On a 1920×1080 screen the
    // panel brushes LOOP and LIFT for ≈ .2 s while the rider hangs in the catch, far away.)
    { x: -18, y: 1, angle: 0, label: 'PUSH' },
    { x: -24, y: 1, angle: 0, label: 'UNDER' },
    { x: 46, y: 1, angle: 0, label: 'LOOP' },
    { x: 52.5, y: 5.8, angle: Math.PI, label: 'LIFT' },
    // West of the catch, so the COUNTERWEIGHT panel never sits on it during the ride over the weight.
    { x: W.catch.x - 2.2, y: W.roof.y - 1.6, angle: -1.1, label: 'TURN' },
  ],
  exit: p(W.door.x, .8), difficulty: 10.5, accent: '#d9a85b',
};

/** Observation-only demonstration, tilt only (it never brakes, and it turns
 * the world no faster than the buttons do). It rides west along the deck,
 * lets gravity take it down the slide (world level), turns in the west
 * quarter-pipe, then pushes the wedge east feathering the tilt to keep a
 * 1.5–2.5 m/s walking pace. Once the wedge is seated it rides
 * heading-relative like the late pilots (the world follows the frame, so the
 * half-pipe and the roof are just "forward"), briskly over the weight so it
 * clears the one-way wall and its eave. Inverted on the roof it rides west
 * slowly into the catch, waits there until it is still, then turns the world
 * on round at button rate (or, with `turnRate`, as a phone does: a
 * worldAngle target moving at that many rad/s) to a full turn, and falls
 * onto the door. */
export function createClockworkWedgePilot(options: { turnRate?: number } = {}): (state: Snapshot) => Controls {
  let previous: Vec | undefined, angle = 0, lastRawAngle = 0, still = 0, turnFrom = 0;
  let stage: 'west' | 'slide' | 'turn' | 'push' | 'ride' | 'approach' | 'caught' | 'rotate' = 'west';
  return state => {
    const dx = previous ? state.bike.x - previous.x : 0, dy = previous ? state.bike.y - previous.y : 0;
    previous = state.bike;
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRawAngle), Math.cos(raw - lastRawAngle)); lastRawAngle = raw;
    const velocity = (dx * Math.cos(angle) + dy * Math.sin(angle)) * 120;
    const { x, y } = state.bike;
    const level = (target = 0) => ({ tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false });
    const follow = (desired: number, base = angle) => level(base + clamp((desired - velocity) * .22, -.3, .3));
    const end = 2 * Math.PI;
    if (stage === 'west' && x < W.deck.x0 + .3) stage = 'slide';
    if (stage === 'slide' && x < W.westPipe.x + 1) stage = 'turn';
    if (stage === 'turn' && dx > 0) stage = 'push';
    if (stage === 'push' && state.bodies.find(body => body.id === 'wedge-ramp')?.settled) stage = 'ride';
    if (stage === 'ride' && y > W.roof.y - 1.5 && state.worldAngle > 2.9 && x < W.pipe.x - 2) stage = 'approach';
    if (stage === 'approach' && x < CAUGHT_X + 1) stage = 'caught';
    if (stage === 'caught') {
      still = Math.abs(dx) * 120 < .05 ? still + 1 : 0;
      if (still > 12) { stage = 'rotate'; turnFrom = state.elapsed; }
    }
    switch (stage) {
      case 'west': return follow(-1.6);
      case 'slide': case 'turn': return level();
      // Pushing: the world tilted toward the weight, more while the rider is slow.
      case 'push': return level(clamp(.35 + (2 - dx * 120) * .3, 0, .7));
      case 'ride': return follow(x > W.stop.x0 && x < W.wall.x1 && y > 1.8 ? 6 : y > 6 ? 2 : 1.6);
      case 'approach': return follow(2);
      case 'caught': return level(Math.PI);
      case 'rotate':
        if (options.turnRate) return { tilt: 0, brake: false, worldAngle: Math.min(end, Math.PI + options.turnRate * (state.elapsed - turnFrom)) };
        return state.worldAngle < end - .02 ? { tilt: 1, brake: false } : level(end);
    }
  };
}
