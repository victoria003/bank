import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

function buildResponse(body: unknown, status = 200) {
  return buildJsonResponse(body, { status });
}

export async function onRequestGet(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = verifyToken(auth);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  try {
    const result = await executeSnowflakeSql(context, 'SELECT id, name, email, details, created_at, updated_at FROM RECORDS ORDER BY created_at DESC');
    return buildResponse(result.rows);
  } catch (err: any) {
    return buildResponse({ error: err.message || 'Snowflake query failed' }, 500);
  }
}

export async function onRequestPost(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = verifyToken(auth);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  try {
    const body = await context.request.json();
    const { name, email, details } = body;
    if (!name || !email) return buildResponse({ error: 'Name and email required' }, 400);

    const id = `rec-${Date.now().toString(36)}-${Math.floor(Math.random() * 9000 + 1000)}`;
    await executeSnowflakeSql(context,
      'INSERT INTO RECORDS (id, name, email, details, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP())',
      [id, name, email, details || '']
    );

    const result = await executeSnowflakeSql(context, 'SELECT id, name, email, details, created_at, updated_at FROM RECORDS WHERE id = ?', [id]);
    return buildResponse(result.rows[0] || null, 201);
  } catch (err: any) {
    return buildResponse({ error: err.message || 'Bad Request' }, 400);
  }
}
