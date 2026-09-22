/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QUAKELENS_MANIFEST_URL?: string;
  readonly VITE_QUAKELENS_MAP_STYLE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
