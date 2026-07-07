export type PagesUserRole = 'ADMIN' | 'DATA_ENGINEER' | 'ANALYST' | 'BUSINESS_USER';

export interface PagesUser {
  username: string;
  name: string;
  email: string;
  role: PagesUserRole;
}

const USERS_DB: Record<string, PagesUser & { password: string }> = {
  admin: {
    username: 'admin',
    password: 'admin123',
    name: 'Administrator',
    email: 'admin@example.com',
    role: 'ADMIN'
  },
  engineer: {
    username: 'engineer',
    password: 'engineer123',
    name: 'Data Engineer',
    email: 'engineer@example.com',
    role: 'DATA_ENGINEER'
  },
  analyst: {
    username: 'analyst',
    password: 'analyst123',
    name: 'Risk Analyst',
    email: 'analyst@example.com',
    role: 'ANALYST'
  },
  business: {
    username: 'business',
    password: 'business123',
    name: 'Business User',
    email: 'business@example.com',
    role: 'BUSINESS_USER'
  }
};

export function getUserForCredentials(username: string, password: string) {
  const user = USERS_DB[username.toLowerCase()];
  if (!user || user.password !== password) {
    return null;
  }
  return { username: user.username, name: user.name, email: user.email, role: user.role };
}

export function createToken(username: string) {
  return `dummy-token-${username}`;
}

export function verifyToken(authHeader: string | null) {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const match = token.match(/^dummy-token-(.+)$/);
  if (!match) return null;

  const username = match[1];
  const user = USERS_DB[username.toLowerCase()];
  if (!user) return null;
  return { username: user.username, name: user.name, email: user.email, role: user.role };
}

export function buildJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json;charset=UTF-8' },
    ...init
  });
}
