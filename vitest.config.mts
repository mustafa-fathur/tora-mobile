// Unit tests for pure helpers (same runner and layout as the web repo).
// They run in Node, not on a phone; keep React Native imports out of tested files.
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
