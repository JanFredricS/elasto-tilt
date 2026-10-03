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
  ellipsePath(g, 0, 0, 0.345, 0.345, 48).fill(C.inkDeep);
  ellipsePath(g, 0, 0, 0.275, 0.275, 48).fill(C.ivory);
  ellipsePath(g, 0, 0, 0.268, 0.268, 48).stroke({ color: C.orange, width: 0.035 });
  for (let n = 0; n < 10; n++) {
    const a = n * TAU / 10;
    line(g, { x: 0, y: 0 }, { x: Math.cos(a) * 0.255, y: Math.sin(a) * 0.255 }, C.inkLight, 0.012, .72);
  }
  circle(g, 0, 0, 0.052, C.orange);
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
  world.addChild(architecture, terrain, ornaments, appleLayer, dynamic, bikeWheels, bikeFrame, helmet, exit);
  app.stage.addChild(world);

  let level: Level | undefined;
  let appleViews = new Map<string, Graphics>();
  const dynamicViews = new Map<string, Graphics>();
  let swingAnchors = new Map<string, Vec>();
  let camera: Vec = { x: 0, y: 0 };
  let cameraReady = false;
  let scale = 48;
  let elapsed = 0;
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
    world.scale.set(scale, -scale);
    world.position.set(w / 2, h / 2 + (portrait ? -0.16 * h : 0));
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

    // Sparse architectural traces stay behind the playable geometry and never resemble a route.
    const { min, max } = nextLevel.bounds;
    architecture.rect(min.x - 2, min.y - 2, max.x - min.x + 4, max.y - min.y + 4)
      .fill({ color: C.ivory, alpha: .001 });
    const spacing = 4;
    for (let x = Math.floor(min.x / spacing) * spacing; x < max.x; x += spacing) {
      line(architecture, { x, y: min.y }, { x, y: max.y }, C.ghost, .012, .17);
    }
    for (let y = Math.floor(min.y / spacing) * spacing; y < max.y; y += spacing) {
      line(architecture, { x: min.x, y }, { x: max.x, y }, C.ghost, .012, .17);
    }

    for (const surface of nextLevel.surfaces) {
      const piece = new Graphics();
      const fill = surface.kind === 'hazard' ? C.red : C.ink;
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
    if (nextLevel.id === 'eschers-orchard') {
      // Pale impossible stairs sit well behind the actual dark colliders.
      const x0 = min.x + 1.4;
      const y0 = max.y - 1.7;
      for (let index = 0; index < 5; index++) {
        const x = x0 + index * .48;
        const y = y0 - index * .48;
        line(architecture, { x, y }, { x: x + .5, y }, C.rope, .025, .25);
        line(architecture, { x: x + .5, y }, { x: x + .5, y: y - .3 }, C.rope, .025, .25);
        line(architecture, { x: x + .5, y: y - .3 }, { x: x + .12, y: y - .3 }, C.rope, .025, .25);
      }
      line(architecture, { x: x0 + 2.45, y: y0 - 2.7 }, { x: x0 + 2.9, y: y0 + .42 }, C.rope, .02, .17);
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
    const crank = local(frame, frame.angle, -.02, -.035);
    const seat = local(frame, frame.angle, -.31, .36);
    const headTube = local(frame, frame.angle, .42, .39);
    const handle = local(frame, frame.angle, .51, .49);
    const saddleL = local(frame, frame.angle, -.47, .37);
    const saddleR = local(frame, frame.angle, -.19, .37);
    // The bicycle's double triangles stay tied to simulated hubs and remain clear at phone scale.
    for (const [a, b] of [[rear, seat], [seat, crank], [crank, rear], [seat, headTube], [headTube, crank], [headTube, front]] as [Vec, Vec][]) {
      line(bikeFrame, a, b, C.orange, .052);
    }
    line(bikeFrame, saddleL, saddleR, C.inkDeep, .075);
    line(bikeFrame, headTube, handle, C.inkDeep, .046);
    line(bikeFrame, handle, local(frame, frame.angle, .63, .49), C.inkDeep, .055);
    circle(bikeFrame, crank.x, crank.y, .078, C.inkDeep, C.orange, .018);
    const pedal = local(frame, frame.angle, -.01, -.19);
    line(bikeFrame, crank, pedal, C.inkDeep, .035);

    // Warm rider silhouette. The helmet is drawn at the physics head collider.
    const hip = local(frame, frame.angle, -.27, .48);
    const shoulder = local(frame, frame.angle, .05, .67);
    const elbow = local(frame, frame.angle, .27, .49);
    line(bikeFrame, hip, shoulder, C.inkDeep, .105);
    line(bikeFrame, shoulder, elbow, C.inkDeep, .064);
    line(bikeFrame, elbow, handle, C.inkDeep, .055);
    line(bikeFrame, hip, local(frame, frame.angle, -.03, .16), C.inkDeep, .078);
    line(bikeFrame, local(frame, frame.angle, -.03, .16), pedal, C.inkDeep, .057);
    if (head) {
      const headRadius = Math.max(.17, Math.min(.27, head.w / 2));
      ellipsePath(helmet, 0, 0, headRadius, headRadius, 48).fill(C.orange);
      helmet.arc(0, 0, .205, -.12, 2.68).stroke({ color: C.inkDeep, width: .036 });
      ellipsePath(helmet, .11, -.037, .105, .04, 24).fill(C.inkDeep);
      ellipsePath(helmet, .055, -.035, .021, .021, 20).fill(C.inkDeep);
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
    world.pivot.set(camera.x, camera.y);
    world.rotation = finite(state.worldAngle);
    for (const [id, graphic] of appleViews) {
      graphic.visible = !state.collected.includes(id);
      if (graphic.visible) graphic.scale.set(1 + Math.sin(elapsed * 3.2 + graphic.x) * .035);
    }
    exit.alpha = state.status === 'complete' ? 1 : .84 + .14 * Math.sin(elapsed * 2.5);
    drawDynamic(state);
    drawBike(state);
  }

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  return {
    load,
    render,
    resize,
    destroy() {
      observer.disconnect();
      app.destroy(true, { children: true, context: true });
    },
  };
}
