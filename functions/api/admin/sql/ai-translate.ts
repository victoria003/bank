import { buildJsonResponse, verifyToken } from '../../_auth';
import { defaultAiSql } from '../../_mockData';

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await context.request.json();
  if (!body.prompt) {
    return buildJsonResponse({ success: false, error: 'English description prompt is required.' }, { status: 400 });
  }

  return buildJsonResponse(defaultAiSql);
}
