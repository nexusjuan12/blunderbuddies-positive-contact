import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works from Capacitor's file-based WebView.
  base: './',
  // Stamped onto every asset URL so a new deploy never mixes with files cached from an old one.
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  server: { host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
