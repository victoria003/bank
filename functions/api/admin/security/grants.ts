import { buildJsonResponse, verifyToken } from '../../_auth';
import { securityGrants } from '../../_mockData';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  return buildJsonResponse(securityGrants);
}
