import { Application, Container, Graphics, Text } from 'pixi.js';
import type { BodyView, GameRenderer, Level, Snapshot, Surface, Vec } from './types';
import { createRiderArt } from './rider-art';
import { drawStoneDepth, drawStoneFace, paletteFor } from './art-direction';

const C = {
  ink: 0x173f45,
  inkLight: 0x37676a,
  inkDeep: 0x103137,
  ivory: 0xfff7e9,
  cream: 0xf3e7d2,
  orange: 0xf47a49,
  red: 0xd65342,
  apple: 0xe96342,
  leaf: 0x688c62,
  rope: 0x917760,
  gold: 0xe5ad5f,
  ghost: 0xc9bcaa,
};

/** Puzzle props: higher contrast than any stone palette. */
const PROP = { loose: 0xb0703c, rim: 0x4f2f1c, hoop: 0x5e3a22, settled: 0xe8cf9e };

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;

function line(g: Graphics, from: Vec, to: Vec, color: number, width: number, alpha = 1): void {
  g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color, width, alpha, cap: 'round', join: 'round' });
}

function ellipsePath(g: Graphics, x: number, y: number, rx: number, ry: number, segments = 40): Graphics {
  const points: number[] = [];
  for (let n = 0; n < segments; n++) {
    const angle = n * TAU / segments;
    points.push(x + Math.cos(angle) * rx, y + Math.sin(angle) * ry);
  }
  return g.poly(points, true);
}

function circle(g: Graphics, x: number, y: number, radius: number, fill: number, stroke?: number, strokeWidth = 0): void {
  ellipsePath(g, x, y, radius, radius).fill(fill);
  if (stroke !== undefined) ellipsePath(g, x, y, radius, radius).stroke({ color: stroke, width: strokeWidth });
}

function local(origin: Vec, angle: number, x: number, y: number): Vec {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: origin.x + c * x - s * y, y: origin.y + s * x + c * y };
}

function drawApple(g: Graphics, x: number, y: number): void {
  // Everything is specified in map metres, so the silhouette stays readable through a full turn.
  ellipsePath(g, x - .095, y, .145, .145).fill(C.apple);
  ellipsePath(g, x + .095, y, .145, .145).fill(C.apple);
  ellipsePath(g, x, y - .04, .17, .135).fill(C.apple);
  line(g, { x, y: y + .11 }, { x: x + .025, y: y + .23 }, C.inkDeep, .023);
  ellipsePath(g, x + .102, y + .19, .075, .035, 24).fill(C.leaf);
  ellipsePath(g, x - .085, y + .055, .022, .022, 20).fill({ color: C.ivory, alpha: .65 });
}

function drawRouteArrow(g: Graphics): void {
  // Open strokes float in the air; a filled badge could be mistaken for a platform.
  const shaft = { x: -.34, y: 0 };
  const neck = { x: .23, y: 0 };
  const tip = { x: .40, y: 0 };
  const upper = { x: .18, y: .17 };
  const lower = { x: .18, y: -.17 };
  for (const [color, width, alpha] of [[C.ivory, .115, .94], [C.inkLight, .055, .90]] as const) {
    line(g, shaft, neck, color, width, alpha);
    line(g, upper, tip, color, width, alpha);
    line(g, lower, tip, color, width, alpha);
  }
  circle(g, -.49, 0, .035, C.inkLight);
}

/** Circular cousin of the route arrow: an open arc whose head shows which way the
 *  scene rolls on screen during the gravity turn. The world container's y-flip sits
 *  between this geometry and the world rotation, so spin 1 (a rising world angle,
 *  clockwise on screen) is drawn mirrored here. */
function drawSpinArrow(g: Graphics, direction: 1 | -1): void {
  const spin = -direction;
  const radius = .36, from = spin * -.55, to = spin * 3.1;
  const tip = { x: radius * Math.cos(to), y: radius * Math.sin(to) };
  const heading = to + spin * Math.PI / 2;
  const barb = (turn: number): Vec =>
    ({ x: tip.x + .26 * Math.cos(heading + Math.PI + turn), y: tip.y + .26 * Math.sin(heading + Math.PI + turn) });
  for (const [color, width, alpha] of [[C.ivory, .115, .94], [C.inkLight, .055, .90]] as const) {
    g.arc(0, 0, radius, from, to, spin < 0).stroke({ color, width, alpha, cap: 'round', join: 'round' });
    line(g, barb(spin * .5), tip, color, width, alpha);
    line(g, barb(spin * -.5), tip, color, width, alpha);
  }
  circle(g, radius * Math.cos(from), radius * Math.sin(from), .035, C.inkLight);
}

function distanceToSurface(point: Vec, surface: Surface): number {
  const angle = surface.angle ?? 0;
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx = point.x - surface.x, dy = point.y - surface.y;
  const outsideX = Math.max(0, Math.abs(c * dx + s * dy) - surface.w / 2);
  const outsideY = Math.max(0, Math.abs(-s * dx + c * dy) - surface.h / 2);
  return Math.hypot(outsideX, outsideY);
}

/** Door art is drawn with its threshold at local y = -DOOR_BASE (map space, y-up). */
const DOOR_BASE = .55;
const DOOR_HALF_WIDTH = .42;
/** Exits farther than this from every surface are treated as free-standing and stay upright. */
const DOOR_ATTACH_RANGE = 2.5;

export interface ExitPose { x: number; y: number; rotation: number; surfaceId?: string; distance: number }

function nearestSurfacePoint(target: Vec, surfaces: Surface[]): { point: Vec; distance: number; id: string } | undefined {
  let best: { point: Vec; distance: number; id: string } | undefined;
  for (const surface of surfaces) {
    if (surface.kind === 'hazard') continue;
    const angle = surface.angle ?? 0;
    const c = Math.cos(angle), s = Math.sin(angle);
    const dx = target.x - surface.x, dy = target.y - surface.y;
    // Clamp in the surface's own frame, then rotate back: the nearest point of a rotated box.
    const lx = clamp(c * dx + s * dy, -surface.w / 2, surface.w / 2);
    const ly = clamp(-s * dx + c * dy, -surface.h / 2, surface.h / 2);
    const point = { x: surface.x + c * lx - s * ly, y: surface.y + s * lx + c * ly };
    const distance = Math.hypot(target.x - point.x, target.y - point.y);
    if (!best || distance < best.distance) best = { point, distance, id: surface.id };
  }
  return best;
}

/**
 * Stands the exit door on the stone it belongs to: the door's "up" points from the nearest
 * point on any (rotated) surface toward the authored exit, and its threshold is set onto that
 * surface. Rotation follows the map convention (radians, counterclockwise), matching surfaces.
 * Only the drawing moves; the physics exit sensor stays at the authored point.
 */
export function exitDoorPose(exit: Vec, surfaces: Surface[]): ExitPose {
  const best = nearestSurfacePoint(exit, surfaces);
  // Free-standing, or authored inside stone: nothing sensible to lean on.
  if (!best || best.distance > DOOR_ATTACH_RANGE || best.distance < 1e-6) {
    return { x: exit.x, y: exit.y, rotation: 0, distance: best?.distance ?? Infinity };
  }
  const up = { x: (exit.x - best.point.x) / best.distance, y: (exit.y - best.point.y) / best.distance };
  // Where the exit sits at the very end of a ledge (the spiral's tip), slide the door back along
  // the face, up to half its width, so both threshold corners rest on stone instead of overhanging.
  // Each corner probes a short column beneath it, which tolerates a concave or tightening face
  // such as the spiral's inner ribbon but still finds nothing past the end of a straight ledge.
  const along = { x: up.y, y: -up.x };
  const solid = (p: Vec) => surfaces.some(s => s.kind !== 'hazard' && distanceToSurface(p, s) < .02);
  const footed = (shift: number) => [-1, 1].every(side => [.04, .12, .2, .28, .36].some(depth => solid({
    x: best.point.x + along.x * (shift + side * DOOR_HALF_WIDTH) - up.x * depth,
    y: best.point.y + along.y * (shift + side * DOOR_HALF_WIDTH) - up.y * depth,
  })));
  let shift = 0;
  for (let step = 0; step <= DOOR_HALF_WIDTH + 1e-9; step += .02) {
    const found = [step, -step].find(footed);
    if (found !== undefined) { shift = found; break; }
  }
  let base = { x: best.point.x + along.x * shift, y: best.point.y + along.y * shift };
  // A slid threshold may hover over a tightening curve: lower it onto the stone beneath.
  for (let depth = 0; shift !== 0 && depth <= .4; depth += .01) {
    const p = { x: base.x - up.x * depth, y: base.y - up.y * depth };
    if (solid(p)) { base = p; break; }
  }
  // Local +y maps to (-sin r, cos r) under a counterclockwise rotation r.
  const rotation = Math.atan2(-up.x, up.y);
  return {
    x: base.x + up.x * DOOR_BASE,
    y: base.y + up.y * DOOR_BASE,
    rotation: Math.abs(rotation) < 1e-9 ? 0 : rotation,
    surfaceId: best.id,
    distance: best.distance,
  };
}

function openRouteSide(origin: Vec, angle: number, surfaces: Surface[]): Vec {
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const clearance = (side: number) => {
    const point = { x: origin.x + normal.x * side * 2, y: origin.y + normal.y * side * 2 };
    return surfaces.reduce((nearest, surface) => Math.min(nearest, distanceToSurface(point, surface)), Infinity);
  };
  const side = clearance(-1) > clearance(1) ? -1 : 1;
  return { x: normal.x * side, y: normal.y * side };
}

export async function createRenderer(host: HTMLElement): Promise<GameRenderer> {
  const app = new Application();
  await app.init({
    antialias: true,
    autoDensity: true,
    resolution: clamp(window.devicePixelRatio || 1, 1, 2),
    backgroundAlpha: 0,
    width: Math.max(1, host.clientWidth),
    height: Math.max(1, host.clientHeight),
    preference: 'webgl',
  });
  app.canvas.classList.add('game-canvas');
  host.appendChild(app.canvas);

  const world = new Container();
  const architecture = new Graphics();
  const terrain = new Graphics();
  const ornaments = new Graphics();
  const wayfinding = new Container();
  const appleLayer = new Container();
  const dynamic = new Graphics();
  const bikeWheels = new Container();
  const riderArt = await createRiderArt();
  const bikeFrame = riderArt.body;
  const riderHead = riderArt.head;
  const exit = new Graphics();
  const location = new Graphics();
  // The door sits under dynamic bodies: a time platform lowered onto it covers it.
  world.addChild(architecture, terrain, ornaments, wayfinding, exit, appleLayer, dynamic, bikeWheels, bikeFrame, riderHead, location);
  app.stage.addChild(world);

  let level: Level | undefined;
  let appleViews = new Map<string, Graphics>();
  let routeArrows: Graphics[] = [];
  let routeLabels: { view: Text; arrow: Graphics; normal: Vec; width: number; height: number }[] = [];
  const dynamicViews = new Map<string, Graphics>();
  const settledViews = new Set<string>();
  let swingAnchors = new Map<string, Vec>();
  let camera: Vec = { x: 0, y: 0 };
  let cameraReady = false;
  let scale = 48;
  let elapsed = 0;
  let lastWorldAngle = 0;
  let surveying = false;
  let palette = paletteFor('newtons-orchard');
  const wheelViews = riderArt.wheels;
  for (const wheel of wheelViews) bikeWheels.addChild(wheel);

  function resize(): void {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    app.renderer.resize(w, h);
    const portrait = h > w * 1.1;
    const sceneWidth = portrait ? 9.4 : 15.5;
    const sceneHeight = portrait ? 13.8 : 9.1;
    const framing = level?.camera;
    scale = clamp(Math.min(w / sceneWidth, h / sceneHeight), 26, 88)
      * clamp(framing?.zoom ?? 1, .7, 1.2);
    if (surveying && level) {
      const span = { x: level.bounds.max.x - level.bounds.min.x, y: level.bounds.max.y - level.bounds.min.y };
      scale = Math.min((w - 36) / span.x, Math.max(80, h - (portrait ? 260 : 170)) / span.y);
    }
    world.scale.set(scale, -scale);
    world.position.set(w / 2, surveying ? h / 2 + 12
      : h / 2 + (portrait ? -0.16 * h : 0) + clamp(framing?.verticalOffset ?? 0, -.1, .1) * h);
  }

  function load(nextLevel: Level): void {
    level = nextLevel;
    palette = paletteFor(nextLevel.id);
    const shell = host.parentElement ?? host;
    shell.style.setProperty('--scene-bg-top', palette.sky);
    shell.style.setProperty('--scene-bg-bottom', palette.mist);
    shell.style.setProperty('--scene-glow', palette.glow);
    swingAnchors = new Map((nextLevel.swings ?? []).map(swing => [swing.id, swing.anchor]));
    elapsed = 0;
    camera = { ...nextLevel.spawn };
    cameraReady = false;
    architecture.clear();
    terrain.clear();
    terrain.removeChildren().forEach(child => child.destroy());
    ornaments.clear();
    wayfinding.removeChildren().forEach(child => child.destroy());
    routeArrows = [];
    routeLabels = [];
    dynamic.clear();
    dynamic.removeChildren().forEach(child => child.destroy());
    dynamicViews.clear();
    settledViews.clear();
    exit.clear();
    appleLayer.removeChildren().forEach(child => child.destroy());
    appleViews = new Map();

    drawStoneDepth(architecture, nextLevel, palette);

    for (const surface of nextLevel.surfaces) {
      const piece = new Graphics();
      if (surface.kind === 'hazard') piece.rect(-surface.w / 2, -surface.h / 2, surface.w, surface.h).fill(C.red);
      else drawStoneFace(piece, surface, palette);
      if (surface.kind === 'hazard') {
        for (let x = -surface.w / 2 + .16; x < surface.w / 2; x += .3) {
          line(piece, { x, y: -surface.h / 2 + .05 }, { x: x + .2, y: surface.h / 2 - .05 }, C.ivory, .025, .47);
        }
      }
      if (surface.kind === 'cradle') {
        piece.rect(-surface.w / 2, surface.h / 2 - .04, surface.w, .04).fill(C.gold);
      }
      if (surface.kind === 'spring') {
        // Hooke's pad: a brass plate on the ridden (+y) face over a row of coils.
        const top = surface.h / 2, plate = Math.min(.12, surface.h / 3);
        piece.rect(-surface.w / 2, top - plate, surface.w, plate).fill(C.gold);
        for (let x = -surface.w / 2 + .25; x < surface.w / 2 - .1; x += .5) {
          for (let k = 0; k < 4; k++) {
            const y0 = top - plate - k * (surface.h - plate) / 4, y1 = y0 - (surface.h - plate) / 4;
            line(piece, { x: x - .12, y: y0 }, { x: x + .12, y: y1 }, C.gold, .03, .85);
          }
        }
      }
      piece.position.set(surface.x, surface.y);
      piece.rotation = surface.angle ?? 0;
      terrain.addChild(piece);
    }

    for (const apple of nextLevel.apples) {
      const graphic = new Graphics();
      drawApple(graphic, 0, 0);
      graphic.position.set(apple.x, apple.y);
      appleLayer.addChild(graphic);
      appleViews.set(apple.id, graphic);
    }

    for (const hint of nextLevel.routeHints ?? []) {
      if (![hint.x, hint.y, hint.angle].every(Number.isFinite)) continue;
      const arrow = new Graphics();
      if (hint.spin) drawSpinArrow(arrow, hint.spin); else drawRouteArrow(arrow);
      arrow.position.set(hint.x, hint.y);
      arrow.rotation = hint.angle;
      wayfinding.addChild(arrow);
      routeArrows.push(arrow);
      if (hint.label?.trim()) {
        const label = new Text({
          text: hint.label.trim(),
          style: { fontFamily: 'Arial, sans-serif', fontSize: 24, fontWeight: '700', fill: C.inkDeep, letterSpacing: 2 },
        });
        label.anchor.set(.5);
        const bounds = label.getLocalBounds();
        wayfinding.addChild(label);
        routeLabels.push({ view: label, arrow, normal: openRouteSide(hint, hint.angle, nextLevel.surfaces),
          width: bounds.width, height: bounds.height });
      }
    }

    // A small illuminated gateway, with the same sensor location as before.
    const arch = (g: Graphics, w: number, floor: number, shoulder: number, top: number) =>
      g.moveTo(-w, floor).lineTo(-w, shoulder)
        .bezierCurveTo(-w, top, w, top, w, shoulder, .99).lineTo(w, floor).closePath();
    arch(exit, .44, -.55, .24, .76).fill(palette.shade);
    arch(exit, .37, -.51, .22, .66).fill(palette.light);
    arch(exit, .265, -.48, .20, .54).fill(palette.edge);
    arch(exit, .21, -.46, .19, .47).fill(0xf4dba6);
    exit.rect(-.42, -.55, .84, .065).fill(palette.light);
    line(exit, { x: -.19, y: -.42 }, { x: .19, y: -.42 }, 0xfff8df, .027);
    // Hang the door from whichever stone face it belongs to (floors, ceilings, walls, ramps).
    const door = exitDoorPose(nextLevel.exit, nextLevel.surfaces);
    exit.position.set(door.x, door.y);
    exit.rotation = door.rotation;

    for (const swing of nextLevel.swings ?? []) {
      circle(ornaments, swing.anchor.x, swing.anchor.y, .105, C.gold, C.ink, .026);
    }
    for (const platform of nextLevel.timePlatforms ?? []) {
      // Endpoints show the platform's range without suggesting extra footing.
      const path = platform.via ? [platform.from, platform.via, platform.to] : [platform.from, platform.to];
      for (let i = 1; i < path.length; i++) line(ornaments, path[i - 1], path[i], C.rope, .018, .34);
      circle(ornaments, platform.from.x, platform.from.y, .04, C.rope);
      circle(ornaments, platform.to.x, platform.to.y, .04, C.rope);
    }
    resize();
  }

  function drawDynamic(state: Snapshot): void {
    if (!level) return;
    dynamic.clear();
    for (const body of state.bodies) {
      if (body.kind === 'swing') {
        const anchor = swingAnchors.get(body.id);
        if (anchor) {
          const a = local(body, body.angle, -body.w * .35, body.h * .2);
          const b = local(body, body.angle, body.w * .35, body.h * .2);
          line(dynamic, anchor, a, C.rope, .035);
          line(dynamic, anchor, b, C.rope, .035);
        }
      }
    }
    for (const body of state.bodies) {
      if (body.kind !== 'prop' && body.kind !== 'swing' && body.kind !== 'time') continue;
      let item = dynamicViews.get(body.id);
      // A prop that seats in its socket is redrawn once in its settled colours.
      if (item && body.kind === 'prop' && settledViews.has(body.id) !== !!body.settled) {
        item.destroy(); dynamicViews.delete(body.id); item = undefined;
      }
      if (!item) {
        // Loose props are warm wood against the cool stone so they read as
        // movable; seated ones take a pale, stone-like face with a gold rim.
        const prop = body.kind === 'prop' && !body.inverted;
        const fill = body.kind === 'time' ? 0xe2ba7d : body.kind === 'swing' ? palette.stone : body.inverted ? C.red
          : body.settled ? PROP.settled : PROP.loose;
        const rim = body.kind === 'time' ? 0xa67a6d : prop ? (body.settled ? C.gold : PROP.rim) : palette.edge;
        item = new Graphics();
        if (body.settled) settledViews.add(body.id); else settledViews.delete(body.id);
        if (body.shape === 'ball') {
          const r = body.w / 2;
          ellipsePath(item, 0, 0, r, r).fill(fill);
          if (prop && r > .3) {
            // Barrel staves and hoops make the rolling visible.
            for (const offset of [-.45, .45]) {
              const half = Math.sqrt(1 - offset * offset) * r * .92;
              line(item, { x: offset * r, y: -half }, { x: offset * r, y: half }, PROP.hoop, Math.max(.03, r * .05), .8);
            }
            ellipsePath(item, 0, 0, r * .72, r * .72).stroke({ color: PROP.hoop, width: Math.max(.02, r * .025), alpha: .45 });
          }
          ellipsePath(item, 0, 0, r, r).stroke({ color: rim, width: prop ? Math.max(.05, r * .06) : .045 });
          ellipsePath(item, -body.w * .1, body.w * .1, Math.max(.025, body.w * .06), Math.max(.025, body.w * .06), 20).fill({ color: C.ivory, alpha: .45 });
        } else if (body.shape === 'wedge') {
          // ◢ with plank grain parallel to the ramp face.
          const corners = [-body.w / 2, -body.h / 2, body.w / 2, -body.h / 2, body.w / 2, body.h / 2,
            ...(body.toe ? [-body.w / 2, -body.h / 2 + body.toe] : [])];
          item.poly(corners).fill(fill);
          for (const t of [.3, .55, .8]) {
            line(item, { x: -body.w / 2 + body.w * t, y: -body.h / 2 + .08 }, { x: body.w / 2 - .08, y: body.h / 2 - body.h * t }, PROP.hoop, .03, .55);
          }
          item.poly(corners).stroke({ color: rim, width: prop ? .06 : .045 });
        } else {
          item.rect(-body.w / 2, -body.h / 2, body.w, body.h).fill(fill);
          item.rect(-body.w / 2, -body.h / 2, body.w, body.h).stroke({ color: rim, width: .045 });
          if (body.kind === 'time') {
            for (let x = -body.w / 2 + .16; x < body.w / 2; x += .32) {
              line(item, { x, y: -body.h * .24 }, { x: x + .12, y: body.h * .24 }, C.ivory, .028, .8);
            }
          }
          if (body.inverted) {
            line(item, { x: -body.w * .23, y: 0 }, { x: body.w * .23, y: 0 }, C.ivory, .03, .75);
          }
        }
        dynamic.addChild(item);
        dynamicViews.set(body.id, item);
      }
      item.position.set(body.x, body.y);
      item.rotation = body.angle;
    }
  }

  function drawBike(state: Snapshot): void {
    const frame = state.bodies.find(body => body.kind === 'frame');
    const head = state.bodies.find(body => body.kind === 'head');
    const wheels = [0, 1].map(index => state.bodies.find(body => body.id === `wheel-${index}`));
    bikeFrame.visible = Boolean(frame && wheels.every(Boolean));
    riderHead.visible = Boolean(head && bikeFrame.visible);
    wheels.forEach((wheel, index) => {
      const view = wheelViews[index];
      view.visible = Boolean(wheel && bikeFrame.visible);
      if (wheel) {
        view.position.set(wheel.x, wheel.y);
        view.rotation = wheel.angle;
      }
    });
    if (frame) {
      bikeFrame.position.set(frame.x, frame.y);
      bikeFrame.rotation = frame.angle;
    }
    if (head) {
      riderHead.position.set(head.x, head.y);
      riderHead.rotation = head.angle;
    }
  }

  function render(state: Snapshot, dt: number): void {
    if (!level) return;
    lastWorldAngle = finite(state.worldAngle);
    elapsed += Math.max(0, dt);
    if (!cameraReady) {
      camera = { x: finite(state.bike.x), y: finite(state.bike.y) };
      cameraReady = true;
    } else {
      const follow = 1 - Math.exp(-clamp(dt, 0, .1) * 7.5);
      camera.x += (finite(state.bike.x, camera.x) - camera.x) * follow;
      camera.y += (finite(state.bike.y, camera.y) - camera.y) * follow;
    }
    world.pivot.set(surveying ? (level.bounds.min.x + level.bounds.max.x) / 2 : camera.x,
      surveying ? (level.bounds.min.y + level.bounds.max.y) / 2 : camera.y);
    world.rotation = surveying ? 0 : finite(state.worldAngle);
    const arrowScale = Math.max(1, Math.min(2.5, 18 / (.8 * scale)));
    for (const arrow of routeArrows) arrow.scale.set(arrowScale);
    // Labels sit on the more open side of the authored arrow in map space.
    // Reserve screen pixels for both the arrow stroke and upright text, even
    // when the overview shrinks the map or the rider turns the whole world.
    const labelScale = Math.max(.01, 10 / (24 * scale));
    const worldAngle = surveying ? 0 : lastWorldAngle;
    for (const { view, arrow, normal, width, height } of routeLabels) {
      const projected = worldAngle - arrow.rotation;
      const normalX = Math.sin(projected);
      const normalY = -Math.cos(projected);
      const textHalfWidth = width * labelScale * scale / 2;
      const textHalfHeight = height * labelScale * scale / 2;
      const clearance = .23 * arrowScale * scale
        + Math.abs(normalX) * textHalfWidth + Math.abs(normalY) * textHalfHeight + 5;
      view.position.set(arrow.x + normal.x * clearance / scale, arrow.y + normal.y * clearance / scale);
      // The world's mirrored Y scale plus inverse local rotation keep text upright.
      view.rotation = worldAngle;
      view.scale.set(labelScale, -labelScale);
    }
    for (const [id, graphic] of appleViews) {
      graphic.visible = !state.collected.includes(id);
      if (graphic.visible) graphic.scale.set(surveying ? Math.max(1, 10 / scale) : 1 + Math.sin(elapsed * 3.2 + graphic.x) * .035);
    }
    exit.alpha = state.status === 'complete' ? 1 : .84 + .14 * Math.sin(elapsed * 2.5);
    drawDynamic(state);
    drawBike(state);
    location.clear();
    if (surveying) {
      const r = 5 / scale;
      location.circle(state.bike.x, state.bike.y, r * 1.8).fill({ color: C.ivory, alpha: .95 });
      location.circle(state.bike.x, state.bike.y, r).fill(C.orange).stroke({ color: C.inkDeep, width: 1 / scale });
    }
  }

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  return {
    load,
    render,
    overview(enabled) {
      surveying = enabled;
      cameraReady = false;
      // Resize and pivot together so Pixi never presents one zoomed frame
      // around the previous camera centre before the next game frame.
      if (level) world.pivot.set(enabled ? (level.bounds.min.x + level.bounds.max.x) / 2 : camera.x,
        enabled ? (level.bounds.min.y + level.bounds.max.y) / 2 : camera.y);
      world.rotation = enabled ? 0 : lastWorldAngle;
      resize();
    },
    resize,
    destroy() {
      observer.disconnect();
      app.destroy(true, { children: true, context: true });
      riderArt.destroy();
    },
  };
}
