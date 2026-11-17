import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@qr-studio/qr-engine/svg': path.resolve(
        root,
        'packages/qr-engine/src/svg.ts',
      ),
      '@qr-studio/qr-engine/validation': path.resolve(
        root,
        'packages/qr-engine/src/validation.ts',
      ),
      '@qr-studio/shared': path.resolve(root, 'packages/shared/src/index.ts'),
      '@qr-studio/qr-engine': path.resolve(root, 'packages/qr-engine/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
