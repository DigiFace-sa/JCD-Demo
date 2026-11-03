#!/usr/bin/env node
/**
 * Pitch-day launcher: serves dist-pitch/ on localhost and opens Chrome (or Edge) in kiosk mode.
 * Zero dependencies: only Node's standard library, so it runs on any machine with Node installed.
 *
 *   node scripts/pitch.mjs            → opens the 3D Experience
 *   node scripts/pitch.mjs --tour     → opens the Experience and autostarts the Guided Tour
 *   node scripts/pitch.mjs --no-kiosk → normal browser window (for rehearsals)
 *   node scripts/pitch.mjs --no-browser → serve only
 *
 * The server stops automatically when the browser window is closed.
 */
import { spawn } from 'node:child_process';
import { existsSync, createReadStream, statSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist-pitch');
const PORTS = [4321, 4322, 4323, 4324, 4325];
const args = new Set(process.argv.slice(2));
const ROUTE = args.has('--tour') ? '?tour=1#/experience' : '#/experience';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.glb': 'model/gltf-binary',
  '.ktx2': 'image/ktx2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.wasm': 'application/wasm',
};

function fail(message) {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

if (!existsSync(join(ROOT, 'index.html'))) {
  fail('dist-pitch/ not found. Build it first with:  npm run build:pitch');
}

function handle(request, response) {
  const urlPath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const filePath = normalize(join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) {
    response.writeHead(403).end();
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(filePath).pipe(response);
}

function listen(ports) {
  return new Promise((resolvePort, reject) => {
    const [port, ...rest] = ports;
    if (port === undefined) {
      reject(new Error('No free port between 4321 and 4325.'));
      return;
    }
    const server = createServer(handle);
    server.once('error', () => {
      listen(rest).then(resolvePort, reject);
    });
    server.listen(port, '127.0.0.1', () => {
      resolvePort({ server, port });
    });
  });
}

function findBrowser() {
  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ]
      : process.platform === 'win32'
        ? [
            `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
            `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
          ]
        : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find((path) => existsSync(path));
}

const { server, port } = await listen(PORTS).catch((error) => fail(error.message));
const url = `http://localhost:${port}/${ROUTE}`;
const browser = args.has('--no-browser') ? undefined : findBrowser();

console.log(`\n  Jeddah Central — pitch build\n  Serving ${url}\n`);

if (!browser) {
  if (!args.has('--no-browser'))
    console.log('  Chrome/Edge not found. Open the address above in a browser.');
  console.log('  Press Ctrl+C to stop.\n');
} else {
  // A dedicated profile guarantees a fresh window with these flags even if Chrome is already open.
  const profile = mkdtempSync(join(tmpdir(), 'jcdc-pitch-'));
  const flags = [
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-translate', // never offer to translate the Arabic pages mid-pitch
    '--disable-features=Translate,TranslateUI',
    '--disable-session-crashed-bubble',
    '--disable-infobars',
    '--autoplay-policy=no-user-gesture-required',
    '--ignore-gpu-blocklist',
    args.has('--no-kiosk') ? '--start-maximized' : '--kiosk',
    url,
  ];
  const child = spawn(browser, flags, { stdio: 'ignore' });
  console.log(
    args.has('--no-kiosk')
      ? '  Close the browser window to stop.\n'
      : '  Kiosk mode: press Cmd+Q (Mac) or Alt+F4 (Windows) to exit.\n',
  );
  child.on('exit', () => {
    server.close();
    process.exit(0);
  });
}
