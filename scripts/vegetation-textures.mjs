#!/usr/bin/env node
/**
 * Generates the foliage and bark textures used by the Blender vegetation models
 * (scripts/blender/vegetation.py) into public/textures/vegetation/. Original artwork, drawn as
 * SVG and rasterised with sharp; seeded, so output is identical on every run.
 *
 *   npm run vegetation:textures
 */
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'public/textures/vegetation');
mkdirSync(OUT, { recursive: true });

let seed = 41;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const pick = (colors) => colors[Math.floor(random() * colors.length)];
const lerp = (a, b, t) => a + (b - a) * t;

/** Date-palm frond: a curved rachis with stiff, folded leaflets, drawn along +x (base at left). */
function frond() {
  const W = 1024;
  const H = 256;
  const greens = ['#5b7a3a', '#4f6e33', '#67843f', '#6f8a45', '#566f36', '#7a8f4a'];
  let leaflets = '';
  const count = 64;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = lerp(70, W - 30, t);
    // Leaflets are longest mid-frond and shrink toward base and tip.
    const length = (Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.85 + 0.15) * 108;
    for (const side of [-1, 1]) {
      const angle = (side * (30 + random() * 10) * Math.PI) / 180;
      const dx = Math.cos(angle) * length;
      const dy = Math.sin(angle) * length;
      const w = 4 + random() * 2.5;
      const nx = (-dy / length) * w;
      const ny = (dx / length) * w;
      leaflets += `<path d="M${x},${H / 2} Q${x + dx * 0.5 + nx},${H / 2 + dy * 0.5 + ny} ${x + dx},${H / 2 + dy} Q${x + dx * 0.5 - nx},${H / 2 + dy * 0.5 - ny} ${x},${H / 2}Z" fill="${pick(greens)}" opacity="${(0.85 + random() * 0.15).toFixed(2)}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${leaflets}
    <path d="M20,${H / 2} L${W - 10},${H / 2}" stroke="#7d7445" stroke-width="5" stroke-linecap="round"/></svg>`;
  return sharp(Buffer.from(svg)).png().toFile(join(OUT, 'frond.png'));
}

/** Leaf cluster on transparency: overlapping leaves, denser toward the centre. */
function cluster(name, palette, blossom) {
  const S = 512;
  let shapes = '';
  for (let i = 0; i < 950; i++) {
    const r = Math.sqrt(random()) * (S * 0.46);
    const a = random() * Math.PI * 2;
    const x = S / 2 + Math.cos(a) * r;
    const y = S / 2 + Math.sin(a) * r;
    const rot = (random() * 360).toFixed(0);
    const flower = blossom && random() < blossom;
    const len = flower ? 9 + random() * 6 : 16 + random() * 10;
    const wid = flower ? 7 + random() * 4 : 6 + random() * 3;
    // Shade the cluster's lower rim, like self-shadowing within a canopy clump.
    const shade = 1 - Math.max(0, (y - S / 2) / (S / 2)) * 0.35;
    const color = flower ? pick(['#8a6ad8', '#9b7be2', '#7d5fcc', '#a88be6']) : pick(palette);
    shapes += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${len / 2}" ry="${wid / 2}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${color}" opacity="${(0.9 * shade + 0.1).toFixed(2)}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${shapes}</svg>`;
  return sharp(Buffer.from(svg)).png().toFile(join(OUT, `${name}.png`));
}

/** Palm trunk: rings of old leaf bases (tileable vertically). */
function palmTrunk() {
  const W = 256;
  const H = 512;
  let rings = '';
  for (let y = 0; y < H; y += 32) {
    for (let x = -32; x < W + 32; x += 32) {
      const ox = (y / 32) % 2 ? 16 : 0;
      const c = pick(['#7a6248', '#6d5640', '#836a4e', '#5f4b37']);
      rings += `<path d="M${x + ox},${y + 30} L${x + ox + 16},${y + 4} L${x + ox + 32},${y + 30} Z" fill="${c}" stroke="#3f3226" stroke-width="2"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#4a3a2c"/>${rings}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(join(OUT, 'palm-trunk.jpg'));
}

/** Broadleaf bark: vertical fissures (tileable). */
function bark() {
  const W = 256;
  const H = 512;
  let lines = '';
  for (let i = 0; i < 70; i++) {
    const x = random() * W;
    lines += `<path d="M${x},0 C${x + (random() - 0.5) * 30},${H / 3} ${x + (random() - 0.5) * 30},${(2 * H) / 3} ${x},${H}" stroke="${pick(['#3b3127', '#5a4a3a', '#2f271f', '#6b5a48'])}" stroke-width="${(2 + random() * 5).toFixed(1)}" fill="none"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#544536"/>${lines}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(join(OUT, 'bark.jpg'));
}

await Promise.all([
  frond(),
  cluster('leaves-olive', ['#6f7d4f', '#7d8a5a', '#5f6e44', '#8a9566', '#69774b'], 0),
  cluster('leaves-shade', ['#3f6a2e', '#4b7a34', '#345c27', '#5a8a3c', '#2f5224'], 0),
  cluster('leaves-jacaranda', ['#4b6a36', '#58783e'], 0.82),
  palmTrunk(),
  bark(),
]);
console.log('vegetation textures →', OUT);
