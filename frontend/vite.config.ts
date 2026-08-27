import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy is only used when running `vite` standalone (e.g. `npm --prefix
// frontend run dev`) against an already-running `netlify dev` on :8888.
// The normal workflow is `netlify dev` from the repo root, which serves
// frontend + functions together on one port and needs no proxy.
export default defineConfig({
  // Load .env from the repo root, so the single root .env file configures
  // both the functions (via `netlify dev`) and this build. Only VITE_-prefixed
  // vars are ever exposed to client code. On Netlify there's no root .env —
  // build vars come from the dashboard and Vite still reads VITE_* from the
  // process environment.
  envDir: '..',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8888',
    },
  },
});
