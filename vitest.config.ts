import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
  },
  esbuild: {
    target: 'node20'
  },
  ssr: {
    external: ['n8n-workflow']
  }
});