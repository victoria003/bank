import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

function buildResponse(body: unknown, status = 200) {
  return buildJsonResponse(body, { status });
}

export async function onRequestGet(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = await verifyToken(auth, context);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  const id = context.params.id;
  try {
    const snowflakeConfigured = Boolean(
      (context && context.env && (context.env.SNOWFLAKE_OAUTH_TOKEN || context.env.SNOWFLAKE_PRIVATE_KEY)) ||
      (typeof process !== 'undefined' && (process.env.SNOWFLAKE_OAUTH_TOKEN || process.env.SNOWFLAKE_PRIVATE_KEY))
    );
    if (!snowflakeConfigured) {
      return buildResponse({ error: 'Not found' }, 404);
    }
    const result = await executeSnowflakeSql(context, 'SELECT id, name, email, details, created_at, updated_at FROM APP_RECORDS WHERE id = ?', [id]);
    if (!result.rows.length) return buildResponse({ error: 'Not found' }, 404);
    return buildResponse(result.rows[0]);
  } catch (err: any) {
    return buildResponse({ error: err.message || 'Snowflake query failed' }, 500);
  }
}

export async function onRequestPut(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = await verifyToken(auth, context);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  try {
    const id = context.params.id;
    const body = await context.request.json();
    const { name, email, details } = body;
    if (!name || !email) return buildResponse({ error: 'Name and email required' }, 400);

    await executeSnowflakeSql(context,
      'UPDATE APP_RECORDS SET name = ?, email = ?, details = ?, updated_at = CURRENT_TIMESTAMP() WHERE id = ?',
      [name, email, details || '', id]
    );

    const result = await executeSnowflakeSql(context, 'SELECT id, name, email, details, created_at, updated_at FROM APP_RECORDS WHERE id = ?', [id]);
    if (!result.rows.length) return buildResponse({ error: 'Not found' }, 404);
    return buildResponse(result.rows[0]);
  } catch (err: any) {
    return buildResponse({ error: err.message || 'Bad Request' }, 400);
  }
}

export async function onRequestDelete(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = await verifyToken(auth, context);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  const id = context.params.id;
  try {
    await executeSnowflakeSql(context, 'DELETE FROM APP_RECORDS WHERE id = ?', [id]);
    return buildResponse({ success: true });
  } catch (err: any) {
    return buildResponse({ error: err.message || 'Snowflake delete failed' }, 500);
  }
}
