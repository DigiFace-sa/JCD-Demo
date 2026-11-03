import { defineConfig } from 'vite';

// `pitch` mode (npm run build:pitch) writes to its own folder so a pitch build
// is never confused with a normal review build. See .env / .env.pitch.
export default defineConfig(({ mode }) => {
  const isPitch = mode === 'pitch';
  return {
    // Relative base so dist/ can be served from any folder or static host.
    base: './',
    build: {
      target: 'es2022',
      outDir: isPitch ? 'dist-pitch' : 'dist',
      sourcemap: !isPitch,
      // The lazy Experience chunk is mostly three.js (~150 KB gzipped) and only loads on
      // the 3D route; marketing pages stay small.
      chunkSizeWarningLimit: 700,
    },
  };
});
