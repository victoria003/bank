import { buildJsonResponse, verifyToken } from '../../../_auth';

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await context.request.json();
  if (!body.query) {
    return buildJsonResponse({ success: false, error: 'SQL query text is required.' }, { status: 400 });
  }

  return buildJsonResponse({
    columns: [],
    rows: [],
    durationMs: 0,
    stagedLogs: {
      id: 'LOG-9999',
      queryText: body.query,
      user: user.username,
      role: user.role,
      timestamp: new Date().toISOString(),
      durationMs: 0,
      status: 'SUCCESS',
      rowsCount: 0
    }
  });
}
