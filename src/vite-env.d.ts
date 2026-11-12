/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

/** Versão do portal (package.json), enviada ao backend em `X-Client-Version`. */
declare const __APP_VERSION__: string;
