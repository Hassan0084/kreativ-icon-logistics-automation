/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Origin of the deployed backend, e.g. `https://api.example.com`.
   *
   * Left unset in development, where the Vite dev server proxies `/api` to the
   * backend on port 5000. Required when the frontend is deployed separately.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
