/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Свой CORS-прокси к API ЦБ РФ (например, Cloudflare Worker или Vercel-функция) */
  readonly VITE_CBR_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
