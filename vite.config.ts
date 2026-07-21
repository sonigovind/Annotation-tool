import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    manifest: 'manifest.json',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});