import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works from Capacitor's file-based WebView.
  base: './',
  server: { host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
