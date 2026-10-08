import RAPIER from '@dimforge/rapier2d-compat';
import { carriedTravel, cyclePhase, pathLength, pathPoint, RouteClock } from './physics-time';
import type { BodyView, Controls, Level, PhysicsGame, Prop, Snapshot, Surface, TimePlatform, Vec } from './types';

const GRAVITY = 9.81;
const BIKE_GROUP = (2 << 16) | 13;
const ENV_GROUP = (1 << 16) | 15;
// Loose puzzle props use their own membership bit, so the visible-head sweep
// (which only queries ENV membership) treats them as pushable, not lethal.
const PROP_GROUP = (8 << 16) | 11;
const SENSOR_GROUP = (4 << 16) | 2;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
let initialized: Promise<void> | undefined;
type RenderBody = { body: RAPIER.RigidBody; view: Omit<BodyView, 'x' | 'y' | 'angle'>; offset?: Vec };
type Tag = { kind: 'bike' | 'helmet' | 'hazard' | 'apple' | 'exit' | 'time' | 'environment' | 'prop'; id: string };
type Socketed = { body: RAPIER.RigidBody; colliders: RAPIER.Collider[]; socket: NonNullable<Prop['socket']>; view: RenderBody['view'] };

/** Closing speed (m/s) the airborne-wheel soft-CCD look-ahead must cover; the
 * distance scales with the step so larger timesteps stay protected too. */
const LANDING_SPEED = 12;
/** Default restitution of a 'spring' surface: a drop of h rebounds to ≈ e²h.
 * Rapier restitution on the tyres alone bounces each wheel separately and the
 * offset rider mass flips the bike (measured: upside down after one 2 m drop),
 * so a pad instead reflects the whole rig's pre-impact velocity about its
 * normal, uniformly: frame and wheels leave together, spin unchanged. */
export const SPRING_RESTITUTION = .9;
/** Normal approach speed (m/s) below which a pad is just floor (rolling on it never launches). */
export const SPRING_MIN_SPEED = 1.2;
/** How far (m) a chain segment's ridden face is extended into the stone past each valley joint. */
export const CHAIN_REACH = 1;
/**
 * Collision boxes for a chain of rotated cuboids laid end to end (list order) and ridden on
 * their local +y faces. Rapier resolves contacts speculatively, so a wheel rolling across an
 * exposed corner that is level with its own support (the next segment's leading corner) is
 * shoved upward and backward — a "ghost" bump at every seam, which polylines and heightfields
 * suffer from too. Where the chain bends toward its ridden side (a valley), each segment's
 * ridden face is instead extended `reach` metres past the joint on that side, where it lies
 * buried below the neighbouring faces, so its corners sit well under the rolling surface and
 * only real face contacts remain. Ends of the chain and convex joints keep the authored span.
 */
export function chainBoxes(surfaces: Surface[], reach = CHAIN_REACH): Surface[] {
  const faces = surfaces.map(surface => {
    const a = surface.angle ?? 0, dx = Math.cos(a), dy = Math.sin(a);
    return { surface, dx, dy, x: surface.x - dy * surface.h / 2, y: surface.y + dx * surface.h / 2 };
  });
  type Face = typeof faces[number];
  /** Signed distance along `a` from its face centre to its line's intersection with `b`. */
  const meet = (a: Face, b: Face) => {
    const cross = a.dx * b.dy - a.dy * b.dx;
    return Math.abs(cross) < 1e-9 ? undefined : ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / cross;
  };
  const valley = (a: Face, b: Face) => a.dx * b.dy - a.dy * b.dx > 1e-6;
  // Joint parameters along each face; chain length before/after each joint bounds the reach
  // so a buried extension never pokes out past the chain's own ends.
  const spans = faces.map(f => ({ from: -f.surface.w / 2, to: f.surface.w / 2 }));
  for (let i = 1; i < faces.length; i++) {
    const a = faces[i - 1], b = faces[i];
    if (!valley(a, b)) continue;
    const ta = meet(a, b), tb = meet(b, a);
    if (ta === undefined || tb === undefined || Math.abs(ta - a.surface.w / 2) > a.surface.w / 2 ||
      Math.abs(tb + b.surface.w / 2) > b.surface.w / 2) continue;
    spans[i - 1].to = ta; spans[i].from = tb;
  }
  // Stone available behind/ahead of each segment through consecutive valley joints only.
  const lengths = spans.map(s => s.to - s.from), n = faces.length;
  const before = new Array<number>(n).fill(0), after = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) before[i] = valley(faces[i - 1], faces[i]) ? before[i - 1] + lengths[i - 1] : 0;
  for (let i = n - 2; i >= 0; i--) after[i] = valley(faces[i], faces[i + 1]) ? after[i + 1] + lengths[i + 1] : 0;
  return faces.map((f, i) => {
    const span = { ...spans[i] };
    span.from -= Math.min(reach, before[i]); span.to += Math.min(reach, after[i]);
    const mid = (span.from + span.to) / 2, h = f.surface.h;
    return { ...f.surface, w: span.to - span.from, x: f.x + f.dx * mid + f.dy * h / 2, y: f.y + f.dy * mid - f.dx * h / 2 };
  });
}

/**
 * A chain that bends away from its ridden side at every joint (a crest or rounded nose) cannot
 * bury its seams, so it collides as ONE convex polygon instead: the hull of every segment
 * corner. Returns undefined when the chain is not convex throughout.
 */
export function convexChainHull(surfaces: Surface[]): Vec[] | undefined {
  if (surfaces.length < 2) return undefined;
  for (let i = 1; i < surfaces.length; i++) {
    const a = surfaces[i - 1].angle ?? 0, b = surfaces[i].angle ?? 0;
    if (Math.sin(b - a) > -1e-6) return undefined;
  }
  return surfaces.flatMap(s => {
    const c = Math.cos(s.angle ?? 0), n = Math.sin(s.angle ?? 0);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) =>
      ({ x: s.x + c * u * s.w / 2 - n * v * s.h / 2, y: s.y + n * u * s.w / 2 + c * v * s.h / 2 }));
  });
}

/** ◢ in its w×h box, about the box centre (the body origin): right angle at
 * the bottom-right, so pushed against a wall on its right it is a ramp up to it. */
/** ◢ in its w×h box; a toe > 0 cuts a vertical bumper face that tall at the slope's foot. */
export const wedgeVertices = (w: number, h: number, toe = 0): Vec[] => [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 },
  ...(toe > 0 ? [{ x: -w / 2, y: -h / 2 + toe }] : [])];
function wedgeCollider(w: number, h: number, toe = 0) {
  const desc = RAPIER.ColliderDesc.convexHull(new Float32Array(wedgeVertices(w, h, toe).flatMap(v => [v.x, v.y])));
  if (!desc) throw new Error(`Degenerate wedge ${w}×${h}`);
  return desc;
}

/** Spawn denotes frame centre. Wheel radius .34, axles (+/-.70, -.36), head (.126126126, .795). */
export async function createPhysics(): Promise<PhysicsGame> {
  await (initialized ??= RAPIER.init());
  const visibleHead = new RAPIER.Ball(.231);
  let world: RAPIER.World | undefined;
  let queue: RAPIER.EventQueue | undefined;
  let level: Level;
  let frame: RAPIER.RigidBody;
  let wheels: RAPIER.RigidBody[] = [];
  let brakeAngles: number[] | undefined;
  let bikeColliders: RAPIER.Collider[] = [], wheelColliders: RAPIER.Collider[] = [];
  let renderBodies: RenderBody[] = [];
  let temporal: { body: RAPIER.RigidBody; path: TimePlatform; lastTravel: number }[] = [];
  let sockets: Socketed[] = [];
  let springs = new Map<number, number>(), springReady = 0;
  let tags = new Map<number, Tag>();
  let collected = new Set<string>();
  let status: Snapshot['status'] = 'playing';
  let angle = 0, elapsed = 0, phase = 0, direction = 0, physicsMs = 0;
  let previousTravel = 0;
  let clock = new RouteClock();
  let previousSupport: number | undefined;
  let predictLandings = false;
  let axis: Vec = { x: 1, y: 0 };
  const register = (desc: RAPIER.ColliderDesc, body: RAPIER.RigidBody | undefined, tag: Tag) => {
    const collider = world!.createCollider(desc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
    tags.set(collider.handle, tag);
    return collider;
  };
  const headPosition = () => {
    const centre = frame.translation(), rotation = frame.rotation();
    return { x: centre.x + Math.cos(rotation) * .126126126 - Math.sin(rotation) * .795,
      y: centre.y + Math.sin(rotation) * .126126126 + Math.cos(rotation) * .795 };
  };
  const free = () => { queue?.free(); world?.free(); queue = undefined; world = undefined; };
  const snapshot = (): Snapshot => ({
    bodies: renderBodies.map(({ body, view, offset }) => {
      const p = body.translation(), a = body.rotation();
      return { ...view, x: p.x + (offset ? Math.cos(a) * offset.x - Math.sin(a) * offset.y : 0),
        y: p.y + (offset ? Math.sin(a) * offset.x + Math.cos(a) * offset.y : 0), angle: a };
    }),
    bike: frame && world ? { ...frame.translation() } : { x: 0, y: 0 },
    worldAngle: angle, collected: [...collected], status, elapsed, timeline: phase, timeDirection: direction, physicsMs,
  });
  function load(next: Level) {
    free(); level = next;
    angle = next.initialAngle ?? 0; elapsed = phase = direction = physicsMs = 0;
    clock = new RouteClock(); previousSupport = undefined;
    status = 'playing'; collected = new Set(); tags = new Map();
    wheels = []; brakeAngles = undefined; bikeColliders = []; wheelColliders = []; renderBodies = []; temporal = []; sockets = [];
    springs = new Map(); springReady = 0;
    world = new RAPIER.World({ x: GRAVITY * Math.sin(angle), y: -GRAVITY * Math.cos(angle) });
    world.numSolverIterations = 8;
    queue = new RAPIER.EventQueue(true);
    const a = next.timeAxis ?? { x: 1, y: 0 }, length = Math.hypot(a.x, a.y);
    axis = length > 0 ? { x: a.x / length, y: a.y / length } : { x: 1, y: 0 };
    previousTravel = next.spawn.x * axis.x + next.spawn.y * axis.y;
    const chains = new Map<string, Surface[]>();
    // Stone friction: authored values (a slick rail) win over the tyres' grip, like a prop's.
    const stone = (desc: RAPIER.ColliderDesc, surface: Surface) => surface.friction === undefined ? desc.setFriction(1.1)
      : desc.setFriction(surface.friction).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
    for (const surface of next.surfaces) {
      // Chained surfaces are built below as one seam-free run.
      if (surface.chain) { chains.get(surface.chain)?.push(surface) ?? chains.set(surface.chain, [surface]); continue; }
      const collider = register(stone(RAPIER.ColliderDesc.cuboid(surface.w / 2, surface.h / 2).setTranslation(surface.x, surface.y)
        .setRotation(surface.angle ?? 0), surface).setCollisionGroups(ENV_GROUP), undefined,
      { kind: surface.kind === 'hazard' ? 'hazard' : 'environment', id: surface.id });
      if (surface.kind === 'spring') springs.set(collider.handle, clamp(surface.restitution ?? SPRING_RESTITUTION, 0, 1));
    }
    for (const [id, members] of chains) {
      const hull = convexChainHull(members);
      const desc = hull && RAPIER.ColliderDesc.convexHull(new Float32Array(hull.flatMap(v => [v.x, v.y])));
      if (desc) {
        register(stone(desc, members[0]).setCollisionGroups(ENV_GROUP), undefined,
          { kind: members[0].kind === 'hazard' ? 'hazard' : 'environment', id });
        continue;
      }
      for (const box of chainBoxes(members)) register(
        stone(RAPIER.ColliderDesc.cuboid(box.w / 2, box.h / 2).setTranslation(box.x, box.y)
          .setRotation(box.angle ?? 0), box).setCollisionGroups(ENV_GROUP), undefined,
        { kind: box.kind === 'hazard' ? 'hazard' : 'environment', id: box.id });
    }
    // Buried chain boxes overlap, so a wheel sinking into them meets several faces at once
    // and their summed depenetration throws it back out. Such levels predict landings.
    predictLandings = chains.size > 0;
    frame = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(next.spawn.x, next.spawn.y)
      .setLinearDamping(.08).setAngularDamping(.12).setCcdEnabled(true));
    bikeColliders.push(register(RAPIER.ColliderDesc.cuboid(.58, .12).setMass(2.5).setFriction(.55)
      .setCollisionGroups(BIKE_GROUP), frame, { kind: 'bike', id: 'frame' }));
    // Original upper-body collider retains mass, contact response and apple reach.
    bikeColliders.push(register(RAPIER.ColliderDesc.ball(.21).setTranslation(.10, .69).setMass(.35)
      .setCollisionGroups(BIKE_GROUP), frame, { kind: 'helmet', id: 'neck' }));
    renderBodies.push({ body: frame, view: { id: 'frame', w: 1.4, h: .72, kind: 'frame', shape: 'box' } });
    renderBodies.push({ body: frame, offset: { x: .126126126, y: .795 }, view: { id: 'head', w: .462, h: .462, kind: 'head', shape: 'ball' } });
    for (const [i, x] of [-.7, .7].entries()) {
      const wheel = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(next.spawn.x + x, next.spawn.y - .36)
        .setAngularDamping(.015).setCcdEnabled(true));
      const tyre = register(RAPIER.ColliderDesc.ball(.34).setMass(.65).setFriction(1.5)
        .setCollisionGroups(BIKE_GROUP), wheel, { kind: 'bike', id: `wheel-${i}` });
      bikeColliders.push(tyre); wheelColliders.push(tyre);
      world.createImpulseJoint(RAPIER.JointData.revolute({ x, y: -.36 }, { x: 0, y: 0 }), frame, wheel, true);
      wheels.push(wheel);
      renderBodies.push({ body: wheel, view: { id: `wheel-${i}`, w: .68, h: .68, kind: 'wheel', shape: 'ball' } });
    }
    for (const apple of next.apples) register(RAPIER.ColliderDesc.ball(.4).setTranslation(apple.x, apple.y)
      .setSensor(true).setCollisionGroups(SENSOR_GROUP), undefined, { kind: 'apple', id: apple.id });
    register(RAPIER.ColliderDesc.ball(.8).setTranslation(next.exit.x, next.exit.y).setSensor(true)
      .setCollisionGroups(SENSOR_GROUP), undefined, { kind: 'exit', id: 'exit' });
    for (const prop of next.props ?? []) {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(prop.x, prop.y)
        .setGravityScale(prop.inverted ? -1 : 1).setLinearDamping(prop.damping ?? .12).setCcdEnabled(true));
      const desc = (prop.shape === 'ball' ? RAPIER.ColliderDesc.ball(prop.w / 2)
        : prop.shape === 'wedge' ? wedgeCollider(prop.w, prop.h, prop.toe) : RAPIER.ColliderDesc.cuboid(prop.w / 2, prop.h / 2))
        .setDensity(prop.density ?? 1.5).setFriction(prop.friction ?? .9).setCollisionGroups(PROP_GROUP);
      // An authored friction is a material choice (e.g. a slick barrel), so it
      // wins over the grippy tyres and stone instead of being averaged away.
      if (prop.friction !== undefined) desc.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
      const colliders = [register(desc, body, { kind: 'prop', id: prop.id })];
      // A wedge's toe is faced with a frictionless bumper plate: a tyre rolling
      // against it pushes the wedge instead of being braked by the face.
      if (prop.shape === 'wedge' && prop.toe) colliders.push(register(RAPIER.ColliderDesc.cuboid(.02, prop.toe / 2 - .01)
        .setTranslation(-prop.w / 2 - .015, -prop.h / 2 + prop.toe / 2 + .01).setDensity(.1).setFriction(0)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setCollisionGroups(PROP_GROUP), body, { kind: 'prop', id: prop.id }));
      const view: RenderBody['view'] = { id: prop.id, w: prop.w, h: prop.h, shape: prop.shape, kind: 'prop', inverted: prop.inverted, ...(prop.toe ? { toe: prop.toe } : {}) };
      renderBodies.push({ body, view });
      if (prop.socket) sockets.push({ body, colliders, socket: prop.socket, view });
    }
    for (const swing of next.swings ?? []) {
      // A damped pendulum can fall below Rapier’s sleep-speed threshold before
      // reaching equilibrium. Keep swings responsive while a player waits on a bank.
      const rotation = swing.angle ?? 0;
      const anchor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(swing.anchor.x, swing.anchor.y));
      // Put the centre of mass at the seat and the local joint at the end of
      // its suspension. Rotate the initial seat position as well as its body.
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(
        swing.anchor.x + Math.sin(rotation) * swing.length, swing.anchor.y - Math.cos(rotation) * swing.length)
        .setRotation(rotation).setCanSleep(false).setAngularDamping(swing.damping ?? .18)
        .setLinearDamping(swing.damping ?? .18).setCcdEnabled(true));
      register(RAPIER.ColliderDesc.cuboid(swing.width / 2, .12)
        .setMass(swing.mass ?? 3).setFriction(1.5).setCollisionGroups(ENV_GROUP), body, { kind: 'environment', id: swing.id });
      world.createImpulseJoint(RAPIER.JointData.revolute({ x: 0, y: 0 }, { x: 0, y: swing.length }), anchor, body, true);
      renderBodies.push({ body, view: { id: swing.id, w: swing.width, h: .24, shape: 'box', kind: 'swing' } });
    }
    for (const platform of next.timePlatforms ?? []) {
      const start = platform.period ? pathPoint(platform, cyclePhase(0, platform.period, platform.offset)) : platform.from;
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x, start.y));
      register(RAPIER.ColliderDesc.cuboid(platform.w / 2, platform.h / 2).setFriction(1.3).setCollisionGroups(ENV_GROUP),
        body, { kind: 'time', id: platform.id });
      temporal.push({ body, path: platform, lastTravel: 0 });
      renderBodies.push({ body, view: { id: platform.id, w: platform.w, h: platform.h, shape: 'box', kind: 'time' } });
    }
  }
  /** Hooke's pads: on a fresh wheel contact with a pad, approached faster than
   * SPRING_MIN_SPEED along its normal, the rig leaves with that normal
   * component reversed and scaled by the pad's restitution. */
  function bounce(approach: Vec, spin: number) {
    let launch: { e: number; n: Vec } | undefined;
    for (const collider of wheelColliders) world!.contactPairsWith(collider, other => {
      const e = springs.get(other.handle);
      if (e === undefined || launch) return;
      world!.contactPair(collider, other, (manifold, flipped) => {
        if (launch || manifold.numSolverContacts() === 0) return;
        // The manifold normal points wheel → pad (unflipped); orient it pad → wheel.
        const normal = manifold.normal(), sign = flipped ? 1 : -1;
        launch = { e, n: { x: normal.x * sign, y: normal.y * sign } };
      });
    });
    if (!launch) return;
    const { e, n } = launch, along = approach.x * n.x + approach.y * n.y;
    if (along > -SPRING_MIN_SPEED) return;
    const v = { x: approach.x - (1 + e) * along * n.x, y: approach.y - (1 + e) * along * n.y };
    // Rigid-body launch: every part leaves with the same velocity and the
    // frame keeps its pre-impact spin, so the landing's contact torques
    // (one wheel touching first) cannot cartwheel the rider.
    for (const body of [frame, ...wheels]) body.setLinvel(v, true);
    frame.setAngvel(spin, true);
    springReady = elapsed + .12;
  }
  function step(dt: number, controls: Controls): Snapshot {
    if (!world || status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return snapshot();
    const start = performance.now();
    dt = Math.min(dt, 1 / 30);
    if (typeof controls.worldAngle === 'number' && Number.isFinite(controls.worldAngle)) {
      const difference = controls.worldAngle - angle, maxRotation = 2.5 * dt;
      angle = Math.abs(difference) <= maxRotation ? controls.worldAngle : angle + Math.sign(difference) * maxRotation;
    } else {
      angle += clamp(Number.isFinite(controls.tilt) ? controls.tilt : 0, -1, 1) * .95 * dt;
    }
    const gravity = { x: GRAVITY * Math.sin(angle), y: -GRAVITY * Math.cos(angle) };
    if (Math.abs(gravity.x - world.gravity.x) > 1e-7 || Math.abs(gravity.y - world.gravity.y) > 1e-7) {
      world.gravity = gravity;
      // Rapier does not wake sleeping bodies when world gravity changes.
      // Include props and jointed swings as well as every part of the bike.
      world.forEachRigidBody(body => { if (body.isDynamic()) body.wakeUp(); });
    }
    world.timestep = dt;
    frame.resetTorques(false);
    // The brake does nothing for the instant of a spring pad's throw (its cooldown):
    // a rider still holding it off the pad leaves with free wheels, not locked ones.
    const braking = controls.brake && elapsed >= springReady;
    if (braking && !brakeAngles) brakeAngles = wheels.map(wheel => wheel.rotation() - frame.rotation());
    if (!braking) brakeAngles = undefined;
    const brakeLimit = (frame.mass() + wheels.reduce((sum, wheel) => sum + wheel.mass(), 0)) * GRAVITY * .34 * 2 * (level.brakeScale ?? 1);
    for (const [index, wheel] of wheels.entries()) {
      wheel.resetTorques(false);
      if (brakeAngles) {
        // Finite brake-pad torque locks the wheel to the frame, not the world.
        // Inertia-aware damping stops relative spin without timestep-dependent
        // overshoot; a soft position correction prevents downhill creep.
        const relativeSpeed = wheel.angvel() - frame.angvel();
        const delta = wheel.rotation() - frame.rotation() - brakeAngles[index];
        const error = Math.atan2(Math.sin(delta), Math.cos(delta));
        const inverseInertia = wheel.effectiveWorldInvInertia() + frame.effectiveWorldInvInertia();
        const desiredTorque = inverseInertia > 0 ? (-relativeSpeed - .15 * error / dt) / (inverseInertia * dt) : 0;
        const torque = clamp(desiredTorque, -brakeLimit, brakeLimit);
        // A slipping pad cannot wind up a spring around a spinning wheel.
        if (Math.abs(desiredTorque) > brakeLimit) brakeAngles[index] = wheel.rotation() - frame.rotation();
        wheel.addTorque(torque, true); frame.addTorque(-torque, true);
      }
    }
    let support: { handle: number; score: number } | undefined;
    for (const collider of bikeColliders) {
      if (!tags.get(collider.handle)?.id.startsWith('wheel-')) continue;
      world.contactPairsWith(collider, other => {
        if (tags.get(other.handle)?.kind !== 'time') return;
        world!.contactPair(collider, other, (manifold, flipped) => {
          const normal = manifold.normal();
          const score = (normal.x * Math.sin(angle) - normal.y * Math.cos(angle)) * (flipped ? -1 : 1);
          const parent = other.parent();
          if (parent && manifold.numSolverContacts() > 0 && score > .5 && score > (support?.score ?? 0))
            support = { handle: parent.handle, score };
        });
      });
    }
    const position = frame.translation();
    const travel = position.x * axis.x + position.y * axis.y;
    const platform = temporal.find(candidate => candidate.body.handle === support?.handle);
    const delta = travel - previousTravel;
    const carry = carriedTravel(delta, platform?.lastTravel ?? 0, support !== undefined && previousSupport === support.handle);
    previousSupport = support?.handle;
    previousTravel = travel;
    // The clock's rate limit is 2 m/s along the longest path; a level's
    // timeSpeed scales it by stretching the length the limit sees. Self-running
    // (periodic) platforms keep their own time, so they do not set that limit.
    direction = clock.advance(delta - carry, level.timeTravel ?? 10,
      Math.max(1, ...temporal.filter(p => !p.path.period).map(p => pathLength(p.path))) * 2 / (level.timeSpeed ?? 2), dt);
    phase = clock.phase;
    for (const platform of temporal) {
      // A platform with a period runs on its own cycle, not the route clock.
      const { period, offset } = platform.path;
      const next = pathPoint(platform.path, period ? cyclePhase(elapsed + dt, period, offset) : phase);
      const previous = platform.body.translation();
      platform.lastTravel = (next.x - previous.x) * axis.x + (next.y - previous.y) * axis.y;
      platform.body.setNextKinematicTranslation(next);
    }
    // A wheel falling onto stone at several m/s sinks centimetres into it within one
    // step, and Rapier's depenetration then flings it back out — a visible rebound
    // despite zero restitution. While a wheel is airborne, predictive (soft-CCD)
    // contacts catch the landing before it penetrates. Rolling wheels (any contact
    // within 2.5 cm) skip it: a long prediction would let exposed seams ahead kick them.
    if (predictLandings) for (const [index, collider] of wheelColliders.entries()) {
      let rolling = false;
      world.contactPairsWith(collider, other => world!.contactPair(collider, other, manifold => {
        for (let i = 0; i < manifold.numContacts(); i++) rolling ||= manifold.contactDist(i) < .025;
      }));
      wheels[index].setSoftCcdPrediction(rolling ? 0 : Math.max(.1, LANDING_SPEED * dt));
    }
    const previousHead = headPosition();
    const approach = { ...frame.linvel() }, spin = frame.angvel();
    world.step(queue);
    elapsed += dt;
    if (springs.size && elapsed >= springReady) bounce(approach, spin);
    // A prop that comes to rest in its socket becomes terrain: fixed, solid
    // to the head like any floor, and no longer movable by later contacts.
    sockets = sockets.filter(({ body, colliders, socket, view }) => {
      const p = body.translation(), v = body.linvel();
      if (Math.hypot(p.x - socket.x, p.y - socket.y) > socket.tolerance ||
        Math.hypot(v.x, v.y) > (socket.speed ?? .2) || Math.abs(body.angvel()) > 1 ||
        (socket.angle !== undefined && Math.abs(body.rotation()) > socket.angle)) return true;
      body.setLinvel({ x: 0, y: 0 }, false); body.setAngvel(0, false);
      body.setBodyType(RAPIER.RigidBodyType.Fixed, false);
      for (const collider of colliders) {
        collider.setCollisionGroups(ENV_GROUP);
        tags.set(collider.handle, { kind: 'environment', id: tags.get(collider.handle)!.id });
      }
      view.settled = true;
      return false;
    });
    queue!.drainCollisionEvents((a, b, started) => {
      if (!started) return;
      const ta = tags.get(a), tb = tags.get(b);
      if (!ta || !tb) return;
      const bike = ta.kind === 'bike' || ta.kind === 'helmet' ? ta : tb.kind === 'bike' || tb.kind === 'helmet' ? tb : undefined;
      const other = bike === ta ? tb : ta;
      if (!bike) return;
      if (other.kind === 'apple') collected.add(other.id);
      // Loose props are puzzle objects: pushing them with the head is harmless.
      else if (other.kind === 'hazard' || (bike.kind === 'helmet' && other.kind !== 'exit' && other.kind !== 'prop')) status = 'crashed';
    });
    // A shape query extends the vulnerable head without adding a collider that
    // would perturb the original assembly's mass/contact solver or apple reach.
    const headCentre = headPosition();
    const headTravel = { x: headCentre.x - previousHead.x, y: headCentre.y - previousHead.y };
    const headHit = world.castShape(previousHead, 0, headTravel, visibleHead, 0, 1, true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, (2 << 16) | 1, undefined, frame);
    if (headHit) status = 'crashed';
    // Test exit occupancy every step so collecting the last apple inside it still completes.
    if (status === 'playing' && collected.size === level.apples.length) {
      for (const collider of bikeColliders) world.intersectionPairsWith(collider, other => {
        if (tags.get(other.handle)?.kind === 'exit') status = 'complete';
      });
    }
    const p = frame.translation();
    if (!Number.isFinite(p.x + p.y) || p.x < level.bounds.min.x - 5 || p.x > level.bounds.max.x + 5 ||
      p.y < level.bounds.min.y - 5 || p.y > level.bounds.max.y + 5) status = 'crashed';
    physicsMs = performance.now() - start;
    return snapshot();
  }
  return { load, step, snapshot, destroy() { free(); renderBodies = []; } };
}
