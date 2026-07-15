/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMMIT_HASH?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

declare namespace JSX {
  interface IntrinsicElements {
    'ion-icon': Record<string, unknown>;
  }
}
