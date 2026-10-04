import RAPIER from '@dimforge/rapier2d-compat';
import { carriedTravel, RouteClock } from './physics-time';
import type { BodyView, Controls, Level, PhysicsGame, Snapshot, Vec } from './types';

const GRAVITY = 9.81;
const BIKE_GROUP = (2 << 16) | 5;
const ENV_GROUP = (1 << 16) | 7;
const SENSOR_GROUP = (4 << 16) | 2;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
let initialized: Promise<void> | undefined;
type RenderBody = { body: RAPIER.RigidBody; view: Omit<BodyView, 'x' | 'y' | 'angle'>; offset?: Vec };
type Tag = { kind: 'bike' | 'helmet' | 'hazard' | 'apple' | 'exit' | 'time' | 'environment'; id: string };

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
  let bikeColliders: RAPIER.Collider[] = [];
  let renderBodies: RenderBody[] = [];
  let temporal: { body: RAPIER.RigidBody; from: Vec; to: Vec; lastTravel: number }[] = [];
  let tags = new Map<number, Tag>();
  let collected = new Set<string>();
  let status: Snapshot['status'] = 'playing';
  let angle = 0, elapsed = 0, phase = 0, direction = 0, physicsMs = 0;
  let previousTravel = 0;
  let clock = new RouteClock();
  let previousSupport: number | undefined;
  let axis: Vec = { x: 1, y: 0 };
  const register = (desc: RAPIER.ColliderDesc, body: RAPIER.RigidBody | undefined, tag: Tag) => {
    const collider = world!.createCollider(desc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
    tags.set(collider.handle, tag);
    return collider;
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
    wheels = []; brakeAngles = undefined; bikeColliders = []; renderBodies = []; temporal = [];
    world = new RAPIER.World({ x: GRAVITY * Math.sin(angle), y: -GRAVITY * Math.cos(angle) });
    world.numSolverIterations = 8;
    queue = new RAPIER.EventQueue(true);
    const a = next.timeAxis ?? { x: 1, y: 0 }, length = Math.hypot(a.x, a.y);
    axis = length > 0 ? { x: a.x / length, y: a.y / length } : { x: 1, y: 0 };
    previousTravel = next.spawn.x * axis.x + next.spawn.y * axis.y;
    for (const surface of next.surfaces) register(
      RAPIER.ColliderDesc.cuboid(surface.w / 2, surface.h / 2).setTranslation(surface.x, surface.y)
        .setRotation(surface.angle ?? 0).setFriction(1.1).setCollisionGroups(ENV_GROUP), undefined,
      { kind: surface.kind === 'hazard' ? 'hazard' : 'environment', id: surface.id });
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
      bikeColliders.push(register(RAPIER.ColliderDesc.ball(.34).setMass(.65).setFriction(1.5)
        .setCollisionGroups(BIKE_GROUP), wheel, { kind: 'bike', id: `wheel-${i}` }));
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
        .setGravityScale(prop.inverted ? -1 : 1).setLinearDamping(.12).setCcdEnabled(true));
      register((prop.shape === 'ball' ? RAPIER.ColliderDesc.ball(prop.w / 2) : RAPIER.ColliderDesc.cuboid(prop.w / 2, prop.h / 2))
        .setDensity(1.5).setFriction(.9).setCollisionGroups(ENV_GROUP), body, { kind: 'environment', id: prop.id });
      renderBodies.push({ body, view: { id: prop.id, w: prop.w, h: prop.h, shape: prop.shape, kind: 'prop', inverted: prop.inverted } });
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
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(platform.from.x, platform.from.y));
      register(RAPIER.ColliderDesc.cuboid(platform.w / 2, platform.h / 2).setFriction(1.3).setCollisionGroups(ENV_GROUP),
        body, { kind: 'time', id: platform.id });
      temporal.push({ body, from: platform.from, to: platform.to, lastTravel: 0 });
      renderBodies.push({ body, view: { id: platform.id, w: platform.w, h: platform.h, shape: 'box', kind: 'time' } });
    }
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
    if (controls.brake && !brakeAngles) brakeAngles = wheels.map(wheel => wheel.rotation() - frame.rotation());
    if (!controls.brake) brakeAngles = undefined;
    const brakeLimit = (frame.mass() + wheels.reduce((sum, wheel) => sum + wheel.mass(), 0)) * GRAVITY * .34 * 2;
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
    direction = clock.advance(delta - carry, level.timeTravel ?? 10,
      Math.max(1, ...temporal.map(p => Math.hypot(p.to.x - p.from.x, p.to.y - p.from.y))), dt);
    phase = clock.phase;
    for (const platform of temporal) {
      const next = { x: platform.from.x + (platform.to.x - platform.from.x) * phase,
        y: platform.from.y + (platform.to.y - platform.from.y) * phase };
      const previous = platform.body.translation();
      platform.lastTravel = (next.x - previous.x) * axis.x + (next.y - previous.y) * axis.y;
      platform.body.setNextKinematicTranslation(next);
    }
    world.step(queue);
    elapsed += dt;
    queue!.drainCollisionEvents((a, b, started) => {
      if (!started) return;
      const ta = tags.get(a), tb = tags.get(b);
      if (!ta || !tb) return;
      const bike = ta.kind === 'bike' || ta.kind === 'helmet' ? ta : tb.kind === 'bike' || tb.kind === 'helmet' ? tb : undefined;
      const other = bike === ta ? tb : ta;
      if (!bike) return;
      if (other.kind === 'apple') collected.add(other.id);
      else if (other.kind === 'hazard' || (bike.kind === 'helmet' && other.kind !== 'exit')) status = 'crashed';
    });
    // A shape query extends the vulnerable head without adding a collider that
    // would perturb the original assembly's mass/contact solver or apple reach.
    const centre = frame.translation(), rotation = frame.rotation();
    const headCentre = { x: centre.x + Math.cos(rotation) * .126126126 - Math.sin(rotation) * .795,
      y: centre.y + Math.sin(rotation) * .126126126 + Math.cos(rotation) * .795 };
    world.intersectionsWithShape(headCentre, rotation, visibleHead, () => {
      status = 'crashed'; return false;
    }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, (2 << 16) | 1, undefined, frame);
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
