import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@qr-studio/shared': path.resolve(root, 'packages/shared/src/index.ts'),
      '@qr-studio/qr-engine/svg': path.resolve(
        root,
        'packages/qr-engine/src/svg.ts',
      ),
      '@qr-studio/qr-engine/validation': path.resolve(
        root,
        'packages/qr-engine/src/validation.ts',
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
