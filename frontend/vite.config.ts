import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy is only used when running `vite` standalone (e.g. `npm --prefix
// frontend run dev`) against an already-running `netlify dev` on :8888.
// The normal workflow is `netlify dev` from the repo root, which serves
// frontend + functions together on one port and needs no proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8888',
    },
  },
});
