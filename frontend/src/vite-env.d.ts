/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the backend API, e.g. "https://calc.example.com". Empty means same-origin. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
