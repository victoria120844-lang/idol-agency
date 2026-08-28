import { defineConfig } from 'vitest/config';

// Node environment only: everything under test is pure logic from src/game/.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
