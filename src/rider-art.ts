import { Container, Sprite, Texture } from 'pixi.js';
import artwork from './assets/natural-philosopher.svg?raw';

/** Rasterize the philosopher vectors once at more than twice the maximum display
 * resolution. Separate wheels retain their real physics rotation; nothing is
 * stretched or redrawn on the animation loop. SVG coordinates are 100 per metre. */
export async function createRiderArt() {
  const document = new DOMParser().parseFromString(artwork, 'image/svg+xml');
  const textures: Texture[] = [];
  async function part(ids: string[], box: [number, number, number, number], local = false) {
    const [x, y, width, height] = box;
    const groups = ids.map(id => {
      const group = document.getElementById(id)!.cloneNode(true) as Element;
      if (local) group.removeAttribute('transform');
      return new XMLSerializer().serializeToString(group);
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" width="${width * 4}" height="${height * 4}" viewBox="${box.join(' ')}">${groups}</svg>`;
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const texture = Texture.from(image);
    texture.source.autoGenerateMipmaps = true;
    textures.push(texture);
    const container = new Container();
    const sprite = new Sprite(texture);
    sprite.scale.set(1 / 400, -1 / 400);
    sprite.position.set(x / 100, -y / 100);
    container.addChild(sprite);
    return container;
  }
  const [body, head, rearWheel, frontWheel] = await Promise.all([
    part(['rider-far', 'frame', 'rider'], [-110, -120, 220, 200]),
    part(['head'], [-25, -25, 50, 50], true),
    part(['rear-wheel'], [-35, -35, 70, 70], true),
    part(['front-wheel'], [-35, -35, 70, 70], true),
  ]);
  return { body, head, wheels: [rearWheel, frontWheel],
    destroy: () => textures.forEach(texture => texture.destroy(true)) };
}
