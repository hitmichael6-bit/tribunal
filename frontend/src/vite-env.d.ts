/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional shared-secret for the API. Baked into the bundle at build time;
  // sent as the X-Tribunal-Key header on every request. Not a true secret
  // (it ships to the browser) — see netlify/functions/lib/checkAccess.ts.
  readonly VITE_TRIBUNAL_ACCESS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
