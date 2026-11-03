import { CanvasTexture, SRGBColorSpace } from 'three';

/** FIFA-standard pitch (m) and markings. */
export const PITCH = { length: 105, width: 68 } as const;
const PIXELS_PER_METRE = 10;
const STRIPES = 12;
const LINE = 0.12;

/** Mown stripes and white markings, drawn once into a canvas (no image asset). */
export function createPitchTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = PITCH.length * PIXELS_PER_METRE;
  canvas.height = PITCH.width * PIXELS_PER_METRE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const s = PIXELS_PER_METRE;

  for (let i = 0; i < STRIPES; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#3f7a32' : '#4a8a3a';
    ctx.fillRect((i * canvas.width) / STRIPES, 0, canvas.width / STRIPES + 1, canvas.height);
  }

  ctx.strokeStyle = 'rgba(245, 245, 240, 0.92)';
  ctx.lineWidth = LINE * s * 2;
  const L = PITCH.length;
  const W = PITCH.width;
  const rect = (x: number, y: number, w: number, h: number): void => {
    ctx.strokeRect(x * s, y * s, w * s, h * s);
  };
  const m = 1; // margin to the outer line
  rect(m, m, L - 2 * m, W - 2 * m);
  ctx.beginPath();
  ctx.moveTo((L / 2) * s, m * s);
  ctx.lineTo((L / 2) * s, (W - m) * s);
  ctx.stroke();
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
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
