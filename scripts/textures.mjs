#!/usr/bin/env node
/**
 * CC0 texture pipeline: assets/cc0-textures.json → public/textures/<id>/{color,normal,rough}.jpg
 * Uses the Poly Haven public API. Existing files are kept unless --force is passed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'assets/cc0-textures.json'), 'utf8'));
const NAMES = { Diffuse: 'color', nor_gl: 'normal', Rough: 'rough' };
const force = process.argv.includes('--force');

for (const texture of manifest.textures) {
  const dir = join(ROOT, 'public/textures', texture.id);
  mkdirSync(dir, { recursive: true });
  const files = await (await fetch(`https://api.polyhaven.com/files/${texture.asset}`)).json();
  for (const map of manifest.maps) {
    const out = join(dir, `${NAMES[map]}.jpg`);
    if (existsSync(out) && !force) continue;
    const url = files[map]?.[manifest.resolution]?.jpg?.url;
    if (!url) throw new Error(`${texture.asset}: no ${map} ${manifest.resolution} jpg`);
    writeFileSync(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
  }
  console.log(`${texture.id.padEnd(12)} ← ${texture.asset}`);
}
