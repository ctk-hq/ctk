/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_SERVER?: string;
  readonly VITE_GITHUB_CLIENT_ID?: string;
  readonly VITE_GITHUB_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
