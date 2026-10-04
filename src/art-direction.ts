import { Graphics } from 'pixi.js';
import type { Level, Surface, Vec } from './types';

export interface Palette {
  sky: string; mist: string; glow: string;
  stone: number; light: number; shade: number; edge: number; shadow: number;
}
const jade: Palette = {
  sky: '#d8e9e6', mist: '#f0e6dc', glow: '#fff5e7',
  stone: 0x8cb6b0, light: 0xd6e5d6, shade: 0x6d929c, edge: 0x496a78, shadow: 0xbdcfd1,
};
const rose: Palette = {
  sky: '#e8d9e5', mist: '#dce9e8', glow: '#fff0df',
  stone: 0xd8b5b0, light: 0xffead8, shade: 0xae92ae, edge: 0x715f80, shadow: 0xcecadc,
};
const blue: Palette = {
  sky: '#d9e3ef', mist: '#ece5ed', glow: '#fff6e7',
  stone: 0x9faeca, light: 0xe1e5f1, shade: 0x788fae, edge: 0x4e6685, shadow: 0xc5cede,
};
const sand: Palette = {
  sky: '#e7e1e7', mist: '#f2e4d5', glow: '#fff6da',
  stone: 0xd3bda0, light: 0xffead0, shade: 0xa891a4, edge: 0x776877, shadow: 0xd5cdd0,
};
export function paletteFor(id: string): Palette {
  if (['eschers-orchard', 'one-wheel-wonder'].includes(id)) return rose;
  if (['room-on-its-side', 'gravity-engine', 'stairway-to-heaven'].includes(id)) return blue;
  if (['newtons-attic', 'clockwork-apple', 'pendulum-mill'].includes(id)) return sand;
  return jade;
}

function corners(s: Surface): Vec[] {
  const c = Math.cos(s.angle ?? 0), t = Math.sin(s.angle ?? 0);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({
    x: s.x + c * x * s.w / 2 - t * y * s.h / 2,
    y: s.y + t * x * s.w / 2 + c * y * s.h / 2,
  }));
}
const poly = (g: Graphics, points: Vec[], color: number) =>
  g.poly(points.flatMap(p => [p.x, p.y])).fill(color);

/** Orthographic depth lies behind the exact physics plane. The front outline
 * remains the contact boundary through every gravity orientation. No scenery
 * inserts a fake platform, staircase, pillar or opening into the route.
 */
export function drawStoneDepth(g: Graphics, level: Level, palette: Palette): void {
  const depth = { x: .46, y: .43 };
  const ordinary = level.surfaces.filter(s => s.kind !== 'hazard');
  // Opaque, pale shadow shapes keep overlaps between small terrain segments
  // seamless. Nothing changes per frame and no full-scene blur is required.
  for (const s of ordinary) {
    const points = corners(s);
    const back = points.map(p => ({ x: p.x + depth.x + .08, y: p.y + depth.y - .08 }));
    poly(g, back, palette.shadow);
  }
  for (const s of ordinary) {
    const points = corners(s);
    const back = points.map(p => ({ x: p.x + depth.x, y: p.y + depth.y }));
    poly(g, back, palette.shade);
  }
  // Paint the continuous lit skin after every backing polygon, so neighboring
  // arc segments cannot cut dark fins into the previous segment's top face.
  for (const s of ordinary) {
    const points = corners(s);
    const back = points.map(p => ({ x: p.x + depth.x, y: p.y + depth.y }));
    for (let n = 0; n < 4; n++) {
      // Short rotated rectangles are joined curve facets; hide internal end caps.
      if ((n === 1 || n === 3) && s.angle !== undefined && s.w < 2 && s.h < 1) continue;
      const next = (n + 1) % 4, a = points[n], b = points[next];
      const nx = b.y - a.y, ny = a.x - b.x;
      if (nx * depth.x + ny * depth.y > 0) {
        poly(g, [a, b, back[next], back[n]], ny > Math.abs(nx) * .2 ? palette.light : palette.shade);
      }
    }
  }
}

export function drawStoneFace(g: Graphics, s: Surface, p: Palette): void {
  const l = -s.w / 2, r = s.w / 2, bottom = -s.h / 2, top = s.h / 2;
  g.rect(l, bottom, s.w, s.h).fill(p.stone);
  // Both faces can become ground. Fine dark rims match the collider exactly.
  g.moveTo(l, top).lineTo(r, top).stroke({ color: p.edge, width: .025 });
  g.moveTo(l, bottom).lineTo(r, bottom).stroke({ color: p.edge, width: .018 });
  if (s.w > 2 || s.h > 1) {
    g.moveTo(l, bottom).lineTo(l, top).moveTo(r, bottom).lineTo(r, top)
      .stroke({ color: p.edge, width: .018 });
  }
  if (s.w > 5 && s.h < 1) {
    for (let x = l + 2.5; x < r - .5; x += 2.5) {
      g.moveTo(x, bottom + .05).lineTo(x, top - .05).stroke({ color: p.edge, width: .012, alpha: .23 });
    }
  }
  if (s.h > 4 && s.w < 1.2) {
    for (let y = bottom + 1.4; y < top - .6; y += 2.8) {
      g.rect(-s.w * .12, y, s.w * .24, .48).fill(p.shade);
      g.moveTo(-s.w * .12, y).lineTo(s.w * .12, y).stroke({ color: p.light, width: .018 });
    }
  }
}
