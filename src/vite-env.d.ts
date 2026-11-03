/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_PLACEHOLDER_MARKERS: string;
  readonly VITE_ALLOW_DEBUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
