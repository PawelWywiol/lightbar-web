import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  server: {
    port: 3210,
    proxy: {
      '/api': {
        target: loadEnv(mode, process.cwd(), '').API_PROXY_TARGET || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  plugins: [tailwindcss(), !process.env.VITEST && reactRouter()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTest.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'workers/**/*.ts'],
      thresholds: { statements: 75, branches: 62, functions: 67, lines: 76 },
    },
  },
}));
