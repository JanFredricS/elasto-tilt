import { Application, Container, Graphics } from 'pixi.js';
import type { BodyView, GameRenderer, Level, Snapshot, Vec } from './types';

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

function drawWheel(g: Graphics): void {
  // Machined rim, narrow sidewall and crossed spokes: a small technical object,
  // with enough contrast to read at phone scale without a heavy cartoon outline.
  ellipsePath(g, 0, 0, .34, .34, 64).fill(0x162a32);
  ellipsePath(g, 0, 0, .317, .317, 64).stroke({ color: 0x52656c, width: .009 });
  ellipsePath(g, 0, 0, .286, .286, 64).fill(C.ivory).stroke({ color: 0xa4b4b7, width: .019 });
  ellipsePath(g, 0, 0, .272, .272, 64).stroke({ color: 0x294650, width: .009 });
  for (let n = 0; n < 16; n++) {
    const a = n * TAU / 16;
    const offset = n % 2 ? .55 : -.55;
    line(g, { x: Math.cos(a + offset) * .043, y: Math.sin(a + offset) * .043 },
      { x: Math.cos(a) * .268, y: Math.sin(a) * .268 }, 0x7a9199, .007, .72);
  }
  ellipsePath(g, 0, 0, .089, .089, 64).stroke({ color: 0x93a8aa, width: .009 });
  ellipsePath(g, 0, 0, .041, .041, 64).fill(0x24434d);
  ellipsePath(g, 0, 0, .019, .019, 64).fill(0xe7eeea);
  line(g, { x: .289, y: -.025 }, { x: .289, y: .025 }, C.orange, .018);
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
  const appleLayer = new Container();
  const dynamic = new Graphics();
  const bikeWheels = new Container();
  const bikeFrame = new Graphics();
  const helmet = new Graphics();
  const exit = new Graphics();
  const location = new Graphics();
  world.addChild(architecture, terrain, ornaments, appleLayer, dynamic, bikeWheels, bikeFrame, helmet, exit, location);
  app.stage.addChild(world);

  let level: Level | undefined;
  let appleViews = new Map<string, Graphics>();
  const dynamicViews = new Map<string, Graphics>();
  let swingAnchors = new Map<string, Vec>();
  let camera: Vec = { x: 0, y: 0 };
  let cameraReady = false;
  let scale = 48;
  let elapsed = 0;
  let surveying = false;
  const wheelViews = [new Graphics(), new Graphics()];
  for (const wheel of wheelViews) {
    drawWheel(wheel);
    bikeWheels.addChild(wheel);
  }

  function resize(): void {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    app.renderer.resize(w, h);
    const portrait = h > w * 1.1;
    const sceneWidth = portrait ? 9.4 : 15.5;
    const sceneHeight = portrait ? 13.8 : 9.1;
    scale = clamp(Math.min(w / sceneWidth, h / sceneHeight), 26, 88);
    if (surveying && level) {
      const span = { x: level.bounds.max.x - level.bounds.min.x, y: level.bounds.max.y - level.bounds.min.y };
      scale = Math.min((w - 36) / span.x, Math.max(80, h - (portrait ? 260 : 170)) / span.y);
    }
    world.scale.set(scale, -scale);
    world.position.set(w / 2, surveying ? h / 2 + 12 : h / 2 + (portrait ? -0.16 * h : 0));
  }

  function load(nextLevel: Level): void {
    level = nextLevel;
    swingAnchors = new Map((nextLevel.swings ?? []).map(swing => [swing.id, swing.anchor]));
    elapsed = 0;
    camera = { ...nextLevel.spawn };
    cameraReady = false;
    architecture.clear();
    terrain.clear();
    terrain.removeChildren().forEach(child => child.destroy());
    ornaments.clear();
    dynamic.clear();
    dynamic.removeChildren().forEach(child => child.destroy());
    dynamicViews.clear();
    exit.clear();
    appleLayer.removeChildren().forEach(child => child.destroy());
    appleViews = new Map();

    // Keep most of the air clear: terrain and moving objects are the puzzle.
    const { min, max } = nextLevel.bounds;
    architecture.rect(min.x - 2, min.y - 2, max.x - min.x + 4, max.y - min.y + 4)
      .fill({ color: C.ivory, alpha: .001 });
    const spacing = 8;
    for (let x = Math.floor(min.x / spacing) * spacing; x < max.x; x += spacing) {
      line(architecture, { x, y: min.y }, { x, y: max.y }, C.ghost, .010, .12);
    }
    for (let y = Math.floor(min.y / spacing) * spacing; y < max.y; y += spacing) {
      line(architecture, { x: min.x, y }, { x: max.x, y }, C.ghost, .010, .12);
    }

    for (const surface of nextLevel.surfaces) {
      const piece = new Graphics();
      const fill = surface.kind === 'hazard' ? C.red : C.ink;
      if (nextLevel.id === 'eschers-orchard' && surface.kind !== 'hazard') {
        // A shallow cut-stone extrusion makes overlapping galleries legible.
        // Every solid top is still an actual collider; the offset is only a bevel.
        const l = -surface.w / 2, r = surface.w / 2, b = -surface.h / 2;
        piece.poly([l, b, r, b, r + .23, b - .23, l + .23, b - .23]).fill(0x729094);
        piece.poly([r, b, r, surface.h / 2, r + .23, surface.h / 2 - .23, r + .23, b - .23]).fill(0xa2b4b2);
      }
      piece.rect(-surface.w / 2, -surface.h / 2, surface.w, surface.h).fill(fill);
      piece.rect(-surface.w / 2, surface.h / 2 - Math.min(.075, surface.h / 3), surface.w, Math.min(.075, surface.h / 3))
        .fill(surface.kind === 'hazard' ? C.orange : C.inkLight);
      if (surface.kind === 'hazard') {
        for (let x = -surface.w / 2 + .16; x < surface.w / 2; x += .3) {
          line(piece, { x, y: -surface.h / 2 + .05 }, { x: x + .2, y: surface.h / 2 - .05 }, C.ivory, .025, .47);
        }
      }
      if (surface.kind === 'cradle') {
        piece.rect(-surface.w / 2, surface.h / 2 - .04, surface.w, .04).fill(C.gold);
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

    // Portal-shaped exit is deliberately distinct from solid surfaces.
    exit.roundRect(-.36, -.48, .72, .96, .15).fill({ color: C.ink, alpha: .13 });
    exit.roundRect(-.32, -.44, .64, .88, .12).stroke({ color: C.ink, width: .065 });
    exit.roundRect(-.22, -.34, .44, .67, .08).stroke({ color: C.gold, width: .035 });
    circle(exit, .205, -.02, .035, C.orange);
    exit.position.set(nextLevel.exit.x, nextLevel.exit.y);

    for (const swing of nextLevel.swings ?? []) {
      circle(ornaments, swing.anchor.x, swing.anchor.y, .105, C.gold, C.ink, .026);
    }
    for (const platform of nextLevel.timePlatforms ?? []) {
      // Endpoints show the platform's range without suggesting extra footing.
      line(ornaments, platform.from, platform.to, C.rope, .018, .34);
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
      if (!item) {
        const fill = body.kind === 'time' ? C.gold : body.kind === 'swing' ? C.ink : body.inverted ? C.red : C.rope;
        const rim = body.kind === 'time' ? C.orange : C.inkDeep;
        item = new Graphics();
        if (body.shape === 'ball') {
          ellipsePath(item, 0, 0, body.w / 2, body.w / 2).fill(fill);
          ellipsePath(item, 0, 0, body.w / 2, body.w / 2).stroke({ color: rim, width: .045 });
          ellipsePath(item, -body.w * .1, body.w * .1, Math.max(.025, body.w * .06), Math.max(.025, body.w * .06), 20).fill({ color: C.ivory, alpha: .45 });
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
    const wheels = state.bodies.filter(body => body.kind === 'wheel');
    bikeFrame.clear();
    helmet.clear();
    if (!frame || wheels.length < 2) {
      for (const view of wheelViews) view.visible = false;
      return;
    }
    const axis = { x: Math.cos(frame.angle), y: Math.sin(frame.angle) };
    wheels.sort((a, b) => ((a.x - frame.x) * axis.x + (a.y - frame.y) * axis.y)
      - ((b.x - frame.x) * axis.x + (b.y - frame.y) * axis.y));
    const [rear, front] = wheels;
    [rear, front].forEach((wheel, index) => {
      wheelViews[index].visible = true;
      wheelViews[index].position.set(wheel.x, wheel.y);
      wheelViews[index].rotation = wheel.angle;
    });
    bikeFrame.position.set(frame.x, frame.y);
    bikeFrame.rotation = frame.angle;
    const hub = (wheel: BodyView): Vec => ({
      x: (wheel.x - frame.x) * axis.x + (wheel.y - frame.y) * axis.y,
      y: -(wheel.x - frame.x) * axis.y + (wheel.y - frame.y) * axis.x,
    });
    const r = hub(rear), f = hub(front);
    const crank = { x: -.09, y: -.25 }, seat = { x: -.31, y: .10 };
    const headTube = { x: .39, y: .16 }, handle = { x: .48, y: .31 };
    // Far leg sits behind the frame. Filled jersey/shorts and articulated limbs
    // replace the stick figure; the crouch stays within the real head hitbox.
    line(bikeFrame, { x: -.27, y: .24 }, { x: -.42, y: -.015 }, 0x547079, .091);
    line(bikeFrame, { x: -.42, y: -.015 }, { x: -.20, y: -.31 }, 0x9baead, .06);
    line(bikeFrame, { x: -.23, y: -.32 }, { x: -.10, y: -.34 }, 0x243c46, .045);
    // Paired chain stays, sculpted tubes, dark carbon fork and metal fittings.
    line(bikeFrame, r, crank, 0x879da1, .028);
    line(bikeFrame, { x: r.x, y: r.y + .025 }, { x: crank.x, y: crank.y + .035 }, 0x3e565e, .013);
    for (const [a, b, width] of [[r, seat, .030], [seat, crank, .046], [crank, headTube, .060],
      [seat, headTube, .045]] as [Vec, Vec, number][]) {
      line(bikeFrame, a, b, 0xb84f38, width + .015);
      line(bikeFrame, { x: a.x, y: a.y + .009 }, { x: b.x, y: b.y + .009 }, 0xf5855f, width);
      line(bikeFrame, { x: a.x, y: a.y + .022 }, { x: b.x, y: b.y + .022 }, 0xffc2a5, .009, .85);
    }
    line(bikeFrame, headTube, f, 0x1c3641, .049);
    line(bikeFrame, { x: .43, y: .09 }, { x: .50, y: -.09 }, 0xa5b5b8, .025);
    line(bikeFrame, seat, { x: -.36, y: .24 }, 0x566c76, .028);
    bikeFrame.moveTo(-.51, .255).bezierCurveTo(-.47, .29, -.29, .28, -.22, .25, .999)
      .lineTo(-.23, .22).lineTo(-.48, .22).closePath().fill(0x19323e);
    line(bikeFrame, headTube, handle, 0x92a7aa, .025);
    line(bikeFrame, { x: .43, y: .32 }, { x: .60, y: .33 }, 0x1b3540, .028);
    line(bikeFrame, { x: .55, y: .33 }, { x: .64, y: .32 }, 0x172c34, .046);
    bikeFrame.moveTo(.58, .30).bezierCurveTo(.71, .13, .60, .01, .51, .02, .999)
      .stroke({ color: 0x3c5861, width: .010 });
    circle(bikeFrame, crank.x, crank.y, .070, 0x1a3540, 0x9daeb0, .012);
    line(bikeFrame, crank, { x: .035, y: -.32 }, 0x9caeb0, .022);
    line(bikeFrame, { x: -.02, y: -.34 }, { x: .12, y: -.34 }, 0x203b45, .025);
    // Tailored jersey with a shoulder panel, then the near leg and gloved arm.
    bikeFrame.moveTo(-.37, .26).bezierCurveTo(-.32, .45, -.19, .59, -.045, .60, .999)
      .bezierCurveTo(.04, .60, .09, .53, .05, .47, .999).lineTo(-.20, .26)
      .closePath().fill(0x315f70);
    bikeFrame.moveTo(-.31, .39).bezierCurveTo(-.22, .51, -.11, .57, -.04, .56, .999)
      .lineTo(.017, .50).lineTo(-.23, .32).closePath().fill(0xeff1e9);
    line(bikeFrame, { x: -.29, y: .38 }, { x: -.12, y: .49 }, 0xf28c64, .035);
    line(bikeFrame, { x: -.27, y: .27 }, { x: -.06, y: .06 }, 0x203b48, .13);
    line(bikeFrame, { x: -.06, y: .06 }, { x: .02, y: -.24 }, 0xb3c2bd, .063);
    line(bikeFrame, { x: .02, y: -.27 }, { x: .145, y: -.30 }, 0x203b48, .05);
    line(bikeFrame, { x: -.01, y: .51 }, { x: .24, y: .31 }, 0x355e70, .078);
    line(bikeFrame, { x: .24, y: .31 }, handle, 0xb3c2bd, .052);
    circle(bikeFrame, handle.x, handle.y, .039, 0x203b48);
    if (head) {
      // Smooth helmet shell follows the .21 m collision circle. No features
      // outside it imply extra clearance around the vulnerable head.
      ellipsePath(helmet, 0, 0, .205, .205, 64).fill(0x203b48);
      helmet.moveTo(-.197, -.015).bezierCurveTo(-.22, .21, .10, .27, .197, .055, .999)
        .bezierCurveTo(.09, .005, -.055, -.025, -.197, -.015, .999).fill(0xf4f1e5);
      helmet.moveTo(-.165, .085).bezierCurveTo(-.08, .20, .075, .185, .15, .085, .999)
        .stroke({ color: 0xf18a63, width: .030, cap: 'round' });
      helmet.moveTo(.025, -.030).lineTo(.173, .018).lineTo(.183, -.058)
        .lineTo(.070, -.11).closePath().fill(0x72989f);
      line(helmet, { x: -.11, y: -.044 }, { x: -.025, y: -.16 }, 0xa4b9b5, .018);
      helmet.position.set(head.x, head.y);
      helmet.rotation = head.angle;
    }
  }

  function render(state: Snapshot, dt: number): void {
    if (!level) return;
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
    overview(enabled) { surveying = enabled; cameraReady = false; resize(); },
    resize,
    destroy() {
      observer.disconnect();
      app.destroy(true, { children: true, context: true });
    },
  };
}
