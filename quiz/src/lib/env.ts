// Centralized environment helpers for API endpoints

// Public base URL for API requests from the browser. Defaults to Next.js rewrite proxy
export const apiBase: string = process.env.NEXT_PUBLIC_API_URL || '/backend';

// Join helper that ensures exactly one slash between base and path
export function buildApiUrl(path: string): string {
  const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
