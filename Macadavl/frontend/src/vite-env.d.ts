/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API base (e.g. https://…onrender.com/api). Unset → same-origin `/api`. */
  readonly VITE_API_URL?: string
}
