import { buildJsonResponse, verifyToken } from '../_auth';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  return buildJsonResponse({
    success: true,
    user: {
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}
