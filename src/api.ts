export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiPath(p: string) {
  if (!p) return API_BASE;
  if (!API_BASE) return p;
  return `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
}

export default apiPath;
