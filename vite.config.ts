import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `pitch` mode (npm run build:pitch) writes to its own folder so a pitch build
// is never confused with a normal review build. See .env / .env.pitch.
export default defineConfig(({ mode }) => {
  const isPitch = mode === 'pitch';
  return {
    // Relative base so dist/ can be served from any folder or static host.
    base: './',
    plugins: [react()],
    build: {
      target: 'es2022',
      outDir: isPitch ? 'dist-pitch' : 'dist',
      sourcemap: !isPitch,
      // Keep the engine separate from growing scene code; both remain behind the lazy 3D route.
      rolldownOptions: {
        output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules\/three\// }] } },
      },
      chunkSizeWarningLimit: 700,
    },
  };
});
