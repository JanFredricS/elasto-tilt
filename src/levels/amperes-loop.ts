import type { Apple, Controls, Level, RouteHint, Snapshot, Surface, Vec } from '../types';

const p = (x: number, y: number): Vec => ({ x, y });
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const DEG = Math.PI / 180;
const STEP = .3;

/**
 * Ampère's Loop, drawn from the player's own sketch. One stone carries the ride out and the ride home
 * on its two faces: its top is a bowl (the start), an S-curve runway and a curl rising to a vertical
 * lip with a long flat tower top behind it; its back drops down the tower's outer face, runs upside
 * down under the whole runway, round the bowl's outer curve and up over a crowned wall into the bowl.
 * Above the lip hangs a ring of stone, open at its lower right, whose floor ends just short of the gap.
 *
 *   - Ride the runway right, turn the world early and hit the curl fast: its straight lip throws the
 *     bike straight up through the ring's opening, where gravity (turned most of a quarter) lays it on
 *     the ring's inner wall.
 *   - Ride the ring's inside a full turn (right wall, roof, left wall, floor). On the floor, brake
 *     while the world turns forward, then let go: the bike rolls off the floor's end and drops across
 *     the gap onto the tower top, the backside of the jump.
 *   - Lean the world back to slow down on the top, then keep gravity just ahead of the bike over the
 *     shoulder, down the outer face and upside down under the runway, round the outer bowl, up the
 *     wall and over its crown into the bowl where the ride began.
 *
 * Every piece is an exact arc or straight laid end to end by heading (a turtle), so tangents match by
 * construction and the stone's outline closes on itself.
 */
export interface AmpereShape {
  /** Bowl radius (start), height of the bowl's straight inner wall above its centre, crown radius. */
  bowl: number; wall: number; crown: number;
  /** Flat at the bowl's bottom; S-curve: concave radius, convex radius, turn (deg); flat run to the curl. */
  flat: number; sIn: number; sOut: number; sTurn: number; run: number;
  /** Curl radius and lip heading (deg), straight lip length, nose radius onto the tower top. */
  curl: number; lip: number; lipLength: number; nose: number;
  /** Tower: landing-slope length and heading (deg), shoulder radius onto its outer face, radius of the sweep under into the underside. */
  top: number; slope: number; shoulder: number; backRadius: number;
  /** Runway slab thickness (top to underside) and the radius of the bowl's outer bottom curve. */
  thick: number; outer: number;
  /** Ring: inner radius and slab thickness; centre offset from the curl centre; open arc (deg) from end to start. */
  ring: number; ringThick: number; ringStart: number;
  /** The ring's right wall stands `ringIn` right of the lip's line; its floor runs on from its lowest
   *  point and ends `floorBack` left of the lip, `floorRise` above the lip's top. */
  ringIn: number; floorBack: number; floorRise: number;
}
export const AMPERE_SHAPE: AmpereShape = {
  bowl: 4, wall: 2, crown: 2.5,
  flat: 1.5, sIn: 4, sOut: 3, sTurn: 30, run: 6,
  curl: 4, lip: 90, lipLength: 1.2, nose: .4,
  top: 10, slope: 0, shoulder: 2, backRadius: 2,
  thick: 1, outer: 4,
  ring: 4, ringThick: .7, ringStart: -30, ringIn: 1.4, floorBack: 1.9, floorRise: 1.8,
};

type Bend = 'line' | 'concave' | 'convex';
interface Leg { points: Vec[]; bend: Bend; name: string }
/** A turtle drawing a ridden face in travel order: the face lies to the left of the heading. */
class Turtle {
  legs: Leg[] = [];
  marks: Record<string, Vec & { heading: number }> = {};
  constructor(public at: Vec, public heading: number) {}
  mark(name: string) { this.marks[name] = { ...this.at, heading: this.heading }; return this; }
  straight(name: string, length: number) {
    if (length <= 1e-9) return this;
    const end = p(this.at.x + length * Math.cos(this.heading), this.at.y + length * Math.sin(this.heading));
    this.legs.push({ points: [this.at, end], bend: 'line', name }); this.at = end; return this;
  }
  /** Turn by `turn` radians on `radius`: positive is counterclockwise (a valley), negative a crest. */
  arc(name: string, radius: number, turn: number) {
    if (Math.abs(turn) < 1e-9) return this;
    const side = Math.sign(turn), centre = p(this.at.x - side * radius * Math.sin(this.heading), this.at.y + side * radius * Math.cos(this.heading));
    const from = this.heading - side * Math.PI / 2, n = Math.max(2, Math.ceil(Math.abs(turn) * radius / STEP));
    const points = Array.from({ length: n + 1 }, (_, i) => {
      const t = from + turn * i / n;
      return p(centre.x + radius * Math.cos(t), centre.y + radius * Math.sin(t));
    });
    points[0] = this.at;
    this.legs.push({ points, bend: turn > 0 ? 'concave' : 'convex', name });
    this.at = points.at(-1)!; this.heading += turn; return this;
  }
}

/** One plank between two face points in travel order; the stone lies to the right of travel. */
const plank = (id: string, a: Vec, b: Vec, thick: number, chain: string): Surface => {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return { id, x: (a.x + b.x) / 2 + Math.sin(angle) * thick / 2, y: (a.y + b.y) / 2 - Math.cos(angle) * thick / 2,
    w: Math.hypot(b.x - a.x, b.y - a.y), h: thick, angle, kind: 'ground', chain };
};
/**
 * Planks for a turtle's legs. Straights and valleys run in one chain (seams buried) until a crest
 * interrupts; a crest collides as convex hulls, split every `crestStep` so no hull's chord cuts far
 * into the stone behind it.
 */
function planks(prefix: string, legs: Leg[], thick: number, crestStep = 30 * DEG): Surface[] {
  const out: Surface[] = [];
  let chain = 0, count = 0, open = false;
  for (const leg of legs) {
    if (leg.bend === 'convex') {
      const turn = Math.abs(Math.atan2(leg.points[1].y - leg.points[0].y, leg.points[1].x - leg.points[0].x) -
        Math.atan2(leg.points.at(-1)!.y - leg.points.at(-2)!.y, leg.points.at(-1)!.x - leg.points.at(-2)!.x));
      const segments = leg.points.length - 1, per = Math.max(1, Math.round(segments / Math.max(1, Math.ceil(turn / crestStep))));
      for (let i = 0; i < segments; i++) {
        if (i % per === 0) { chain++; }
        out.push(plank(`${prefix}-${count++}`, leg.points[i], leg.points[i + 1], thick, `${prefix}-${chain}`));
      }
      open = false;
    } else {
      if (!open) { chain++; open = true; }
      for (let i = 0; i + 1 < leg.points.length; i++) out.push(plank(`${prefix}-${count++}`, leg.points[i], leg.points[i + 1], thick, `${prefix}-${chain}`));
    }
  }
  return out;
}

export interface AmpereTrack {
  /** Ridden outline of the stone in travel order, from the crown's inner foot round to its top. */
  legs: Leg[];
  marks: Record<string, Vec & { heading: number }>;
  /** Bowl, curl and ring centres. */
  bowlCentre: Vec; curlCentre: Vec; ringCentre: Vec;
  /** Ring face from its start (landing wall) round to its end (the floor's edge over the curl). */
  ringLegs: Leg[]; ringMarks: Record<string, Vec & { heading: number }>; ringFrom: Vec; ringTo: Vec;
  /** Runway level (after the S) and the underside below it. */
  runY: number; underY: number;
}

export function ampereTrackFor(s: AmpereShape): AmpereTrack {
  const B = p(0, s.bowl);
  const t = new Turtle(p(-s.bowl, s.bowl + s.wall), -Math.PI / 2).mark('wallTop');
  t.straight('wall', s.wall).arc('bowl', s.bowl, Math.PI / 2).mark('bowlBottom').straight('flat', s.flat).mark('sFrom')
    .arc('s-in', s.sIn, s.sTurn * DEG).arc('s-out', s.sOut, -s.sTurn * DEG).mark('sTo').straight('run', s.run).mark('curlFrom');
  const runY = t.at.y, K = p(t.at.x, t.at.y + s.curl);
  // The lip ends in a rounded nose onto the tower's flat top; a shoulder rolls over onto its outer face,
  // which runs straight down and sweeps under into the runway's underside (heading 180°).
  t.arc('curl', s.curl, s.lip * DEG).mark('lipFrom').straight('lip', s.lipLength).mark('lip')
    .arc('nose', s.nose, (s.slope - s.lip) * DEG).mark('top').straight('top', s.top).mark('shoulder')
    .arc('shoulder', s.shoulder, -Math.PI / 2 - s.slope * DEG).mark('back');
  const underY = runY - s.thick;
  const backRadius = Math.min(s.backRadius, t.at.y - underY);
  t.straight('back', t.at.y - underY - backRadius).arc('back-curve', backRadius, -Math.PI / 2).mark('underFrom');
  const sOutEnd = t.marks.sTo.x;
  t.straight('under', t.at.x - sOutEnd).mark('underS');
  // Under the S: the runway's crest is a valley seen from below, its valley a crest.
  t.arc('under-s-out', s.sOut - s.thick, s.sTurn * DEG).arc('under-s-in', s.sIn + s.thick, -s.sTurn * DEG);
  const outerStart = -s.bowl - 2 * s.crown + s.outer;
  t.straight('under-bowl', t.at.x - outerStart).mark('outerFrom');
  if (Math.abs(t.at.y + s.thick) > 1e-6) throw new RangeError('Ampère underside does not meet the bowl');
  t.arc('outer', s.outer, -Math.PI / 2).mark('outerWall');
  t.straight('outer-wall', s.bowl + s.wall - t.at.y).mark('crownFrom').arc('crown', s.crown, -Math.PI).mark('crownTo');
  if (Math.hypot(t.at.x - t.marks.wallTop.x, t.at.y - t.marks.wallTop.y) > 1e-6) throw new RangeError('Ampère outline does not close');
  // The ring, ridden on its inside (counterclockwise) from the landing wall round to its floor's end.
  const lipMark = t.marks.lip, O = p(lipMark.x + s.ringIn - s.ring, lipMark.y + s.floorRise + s.ring), a0 = s.ringStart * DEG;
  const floor = lipMark.x - s.floorBack - O.x;
  const ring = new Turtle(p(O.x + s.ring * Math.cos(a0), O.y + s.ring * Math.sin(a0)), a0 + Math.PI / 2);
  ring.arc('ring', s.ring, 1.5 * Math.PI - a0).mark('ringBottom').straight('floor', floor).mark('floorEnd');
  return { legs: t.legs, marks: t.marks, bowlCentre: B, curlCentre: K, ringCentre: O, ringLegs: ring.legs, ringMarks: ring.marks,
    ringFrom: ring.legs[0].points[0], ringTo: ring.at, runY, underY };
}

export function buildAmperesLoop(shape: AmpereShape = AMPERE_SHAPE, apples: Apple[] = [], routeHints: RouteHint[] = []): { level: Level; track: AmpereTrack } {
  const track = ampereTrackFor(shape);
  const surfaces = [...planks('ampere-stone', track.legs, .6), ...planks('ampere-ring', track.ringLegs, shape.ringThick)];
  const { marks } = track;
  const corners = surfaces.flatMap(s => {
    const c = Math.cos(s.angle ?? 0), n = Math.sin(s.angle ?? 0);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => p(s.x + c * u * s.w / 2 - n * v * s.h / 2, s.y + n * u * s.w / 2 + c * v * s.h / 2));
  });
  const xs = corners.map(q => q.x), ys = corners.map(q => q.y);
  const level: Level = {
    id: 'amperes-loop', name: 'Ampère’s Loop', subtitle: 'The current circles back', difficulty: 12.5, accent: '#7fb8a4',
    mechanic: 'Leap from a curl into a hanging ring, ride its inside a full turn, drop from its floor onto the back of the jump and ride the whole stone’s underside home upside down.',
    hint: 'Turn the world early and hit the curl fast to fly up into the ring. On the ring’s floor, brake while you tip the world forward, then roll off onto the tower. Lean back to slow, then keep turning: the way home is underneath.',
    spawn: p(marks.bowlBottom.x + shape.flat / 2, marks.bowlBottom.y + .72), initialAngle: 0,
    bounds: { min: p(Math.min(...xs) - 3, Math.min(...ys) - 3), max: p(Math.max(...xs) + 3, Math.max(...ys) + 3) },
    surfaces, apples, exit: p(-1.6, 1.2), routeHints,
  };
  return { level, track };
}

/** Apples on every phase of the circuit: the runway, the ring, and the upside-down return. */
export function ampereApples(track: AmpereTrack, shape: AmpereShape = AMPERE_SHAPE): Apple[] {
  const { marks, ringCentre: O, runY, underY } = track, lift = .75;
  return [
    { id: 'ampere-runway', x: marks.sTo.x + 2, y: runY + lift },
    { id: 'ampere-curl', x: marks.curlFrom.x - 1, y: runY + lift },
    { id: 'ampere-ring-roof', x: O.x, y: O.y + shape.ring - lift },
    { id: 'ampere-ring-wall', x: O.x - shape.ring + lift, y: O.y },
    { id: 'ampere-under', x: marks.curlFrom.x + 1, y: underY - lift },
    { id: 'ampere-outer', x: marks.outerWall.x - lift, y: marks.outerWall.y + 1 },
  ];
}
export function ampereHints(track: AmpereTrack): RouteHint[] {
  const { marks, ringCentre: O, ringTo, underY } = track;
  // HOME sits just past the tower's foot, under the head of an upside-down rider, so it is in view from
  // the shoulder and the outer face, where the rider must keep turning to go under.
  return [
    { x: marks.curlFrom.x - 3, y: marks.curlFrom.y + 1.6, angle: 0, label: 'JUMP', spin: 1 },
    { x: O.x, y: O.y, angle: Math.PI, label: 'LOOP' },
    { x: ringTo.x - .6, y: ringTo.y + 1.6, angle: 0, label: 'DROP', spin: 1 },
    { x: marks.top.x + 4, y: marks.top.y + 1.6, angle: 0, label: 'EASE', spin: -1 },
    { x: marks.underFrom.x - 2.5, y: underY - 2.4, angle: Math.PI, label: 'HOME', spin: -1 },
  ];
}

const shell = ampereTrackFor(AMPERE_SHAPE);
const built = buildAmperesLoop(AMPERE_SHAPE, ampereApples(shell), ampereHints(shell));
export const ampereTrack = built.track;
export const amperesLoopLevel: Level = built.level;

export interface AmperePilotTuning {
  /** Runway cruising speed, and how far (m) before the curl the world starts turning to `charge` (deg). */
  run: number; early: number; charge: number;
  /** World angle (deg) held in flight, and the speed followed round the ring. */
  fly: number; ring: number;
  /** On the ring's floor: brake until the world is `hold` (deg) past upright, then tip it to `drop` (deg). */
  hold: number; drop: number;
  /** How far past the floor's end (m) the world turns back, and how far (deg) back it leans for the landing. */
  release: number; back: number;
  /** Creeping speed home, the most world lean (rad) used to hold it, and when (s after landing) and above
   *  what excess speed it may brake. */
  home: number; homeLean: number; settle: number; brakeOver: number;
}
export const AMPERE_PILOT: AmperePilotTuning = {
  run: 7, early: 6, charge: 80, fly: 60, ring: 5, hold: 1, drop: 50, release: 0, back: 30,
  home: 2.2, homeLean: .5, settle: .8, brakeOver: 1.5,
};

/**
 * Observation-only pilot: tilt and brake only, read from public snapshots. Phases: cruise the runway,
 * charge the curl with the world turned early, hold gravity across the gap, follow the ring round,
 * brake on its floor while tipping the world forward, roll off, lean back for the landing, then creep the
 * rest of the way, always keeping gravity just ahead of the bike so it clings to whichever face it is on.
 */
export function amperePilotFor(track: AmpereTrack, tuning: AmperePilotTuning): (state: Snapshot) => Controls & { phase: string } {
  let previous: Vec | undefined, lastTime = 0, angle = 0, lastRaw = 0, v = 0;
  let phase: 'run' | 'charge' | 'fly' | 'ring' | 'hold' | 'drop' | 'land' | 'home' = 'run', since = 0;
  const { marks, ringCentre: O } = track, curlX = marks.curlFrom.x, lip = marks.lip;
  const R = Math.hypot(track.ringFrom.x - O.x, track.ringFrom.y - O.y);
  return state => {
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRaw), Math.cos(raw - lastRaw)); lastRaw = raw;
    const dt = state.elapsed - lastTime;
    if (previous && dt > 0) v = ((state.bike.x - previous.x) * Math.cos(angle) + (state.bike.y - previous.y) * Math.sin(angle)) / dt;
    previous = state.bike; lastTime = state.elapsed;
    const { x, y } = state.bike, ringDistance = Math.hypot(x - O.x, y - O.y);
    const go = (next: typeof phase) => { phase = next; since = state.elapsed; };
    if (phase === 'run' && x > curlX - tuning.early) go('charge');
    if (phase === 'charge' && y > lip.y + .3) go('fly');
    if (phase === 'fly' && ringDistance > R - .9 && y > O.y - R && state.elapsed - since > .2) go('ring');
    if (phase === 'ring' && angle > 2 * Math.PI - .35 && x > O.x - 1) go('hold');
    if (phase === 'hold' && state.worldAngle > 2 * Math.PI + tuning.hold * DEG) go('drop');
    if (phase === 'drop' && x > track.ringTo.x + tuning.release) go('land');
    // Only creep once the bike sits level on the tower top: the landing's impact can dip the speed
    // while the bike is still pitched nose-down, and following that pitch would roll it over.
    if (phase === 'land' && (v < tuning.home + .3 || x > marks.shoulder.x - .5) && state.elapsed - since > .3 &&
      (Math.abs(angle - 2 * Math.PI) < .25 || x > marks.shoulder.x - .5)) go('home');
    let target = angle, brake = false;
    const follow = (speed: number, lean = .3) => angle + clamp((speed - v) * .22, -lean, lean);
    if (phase === 'run') target = follow(tuning.run);
    else if (phase === 'charge') target = tuning.charge * DEG;
    else if (phase === 'fly') target = tuning.fly * DEG;
    else if (phase === 'ring') target = follow(tuning.ring);
    else if (phase === 'hold') { target = 2 * Math.PI + tuning.drop * DEG; brake = true; }
    else if (phase === 'drop') target = 2 * Math.PI + tuning.drop * DEG;
    else if (phase === 'land') target = 2 * Math.PI - tuning.back * DEG;
    else {
      target = follow(tuning.home, tuning.homeLean);
      brake = v > tuning.home + tuning.brakeOver && state.elapsed - since > tuning.settle && Math.abs(state.worldAngle - angle) < .3;
    }
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake, phase, v } as Controls & { phase: string };
  };
}

export function createAmperePilot(): (state: Snapshot) => Controls {
  return amperePilotFor(ampereTrack, AMPERE_PILOT);
}
