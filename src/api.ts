// Use relative API paths so the frontend calls `/api/...` directly in production
export default function apiPath(p: string) {
  if (!p) return '';
  return p.startsWith('/') ? p : `/${p}`;
}
