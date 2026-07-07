import { buildJsonResponse, verifyToken } from '../_auth';
import { cloneResult } from '../_mockData';

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await context.request.json();
  if (!body.sourceTable || !body.destinationClone) {
    return buildJsonResponse({ success: false, error: 'Source table and destination clone name are required.' }, { status: 400 });
  }

  return buildJsonResponse(cloneResult);
}
