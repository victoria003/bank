import { buildJsonResponse, verifyToken } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

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

  try {
    const result = await executeSnowflakeSql(context, body.query, body.bindings || []);
    return buildJsonResponse({
      success: true,
      columns: result.raw?.resultSetMetaData?.rowType ?? [],
      rows: result.rows,
      stats: result.stats,
      message: result.message
    });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake query failed' }, { status: 500 });
  }
}
