import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [tailwindcss(), !process.env.VITEST && reactRouter()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTest.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      thresholds: { statements: 27, branches: 12, functions: 18, lines: 27 },
    },
  },
});
