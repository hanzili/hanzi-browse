import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    include: [
      'src/background/**/*.test.{js,jsx}',
      'src/sidepanel-preact/**/*.test.{js,jsx}',
    ],
    exclude: ['src/tests/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/sidepanel-preact'),
    },
  },
});
