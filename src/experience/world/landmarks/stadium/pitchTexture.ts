import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { createRandom } from '../../../utils/random';

/** FIFA-standard pitch (m) and markings. */
export const PITCH = { length: 105, width: 68 } as const;
/** Enough chalk detail for close views without uploading an oversized field texture. */
const TEXTURE_WIDTH = 2048;
const NORMAL_SIZE = 256;
const STRIPES = 12;
const LINE = 0.12;

/** Mown stripes and white markings, drawn once into a canvas (no image asset). */
export function createPitchTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = Math.round((TEXTURE_WIDTH * PITCH.width) / PITCH.length);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const s = TEXTURE_WIDTH / PITCH.length;

  const image = ctx.createImageData(canvas.width, canvas.height);
  const random = createRandom(73);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const band = Math.floor((x / canvas.width) * STRIPES) % 2;
      const grain = (random() - 0.5) * 9;
      const i = (y * canvas.width + x) * 4;
      image.data[i] = (band ? 63 : 53) + grain;
      image.data[i + 1] = (band ? 123 : 111) + grain;
      image.data[i + 2] = (band ? 51 : 46) + grain;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  ctx.strokeStyle = 'rgba(245, 245, 240, 0.92)';
  ctx.lineWidth = LINE * s * 2;
  const L = PITCH.length;
  const W = PITCH.width;
  const rect = (x: number, y: number, w: number, h: number): void => {
    ctx.strokeRect(x * s, y * s, w * s, h * s);
  };
  const m = 1; // margin to the outer line
  const spot = (x: number, y: number): void => {
    ctx.beginPath();
    ctx.arc(x * s, y * s, LINE * s, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };
  rect(m, m, L - 2 * m, W - 2 * m);
  ctx.beginPath();
  ctx.moveTo((L / 2) * s, m * s);
  ctx.lineTo((L / 2) * s, (W - m) * s);
  ctx.stroke();
  spot(L / 2, W / 2);
  ctx.beginPath();
  ctx.arc((L / 2) * s, (W / 2) * s, 9.15 * s, 0, Math.PI * 2);
  ctx.stroke();
  for (const side of [0, 1]) {
    const x = side === 0 ? m : L - m;
    const dir = side === 0 ? 1 : -1;
    rect(Math.min(x, x + dir * 16.5), W / 2 - 20.16, 16.5, 40.32);
    rect(Math.min(x, x + dir * 5.5), W / 2 - 9.16, 5.5, 18.32);
    ctx.beginPath();
    ctx.arc(
      (x + dir * 11) * s,
      (W / 2) * s,
      9.15 * s,
      dir > 0 ? -0.93 : Math.PI - 0.93,
      dir > 0 ? 0.93 : Math.PI + 0.93,
    );
    ctx.stroke();
    spot(x + dir * 11, W / 2);
  }
  for (const [x, y, angle] of [
    [m, m, 0],
    [L - m, m, Math.PI / 2],
    [L - m, W - m, Math.PI],
    [m, W - m, Math.PI * 1.5],
  ]) {
    if (x === undefined || y === undefined || angle === undefined) continue;
    ctx.beginPath();
    ctx.arc(x * s, y * s, s, angle, angle + Math.PI / 2);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Small, repeating blade-scale normals; the colour/markings remain crisp and independent. */
export function createGrassNormal(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = NORMAL_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const image = ctx.createImageData(NORMAL_SIZE, NORMAL_SIZE);
  const random = createRandom(94);
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = 128 + (random() - 0.5) * 40;
    image.data[i + 1] = 128 + (random() - 0.5) * 48;
    image.data[i + 2] = 253;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(PITCH.width / 2, PITCH.length / 2);
  texture.anisotropy = 8;
  return texture;
}
