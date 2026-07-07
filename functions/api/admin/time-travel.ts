import { buildJsonResponse, verifyToken } from '../../_auth';
import { timeTravelResult } from '../../_mockData';

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await context.request.json();
  if (body.offsetMinutes === undefined || isNaN(body.offsetMinutes)) {
    return buildJsonResponse({ success: false, error: 'Offset in minutes is required.' }, { status: 400 });
  }

  return buildJsonResponse(timeTravelResult);
}
