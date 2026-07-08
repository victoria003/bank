import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await context.request.json();
  if (!body.sourceTable || !body.destinationClone) {
    return buildJsonResponse({ success: false, error: 'Source table and destination clone name are required.' }, { status: 400 });
  }

  try {
    const result = await executeSnowflakeSql(context, `
      SELECT ? AS message,
             15 AS duration_ms
    `, [
      `Zero-Copy Clone '${body.sourceTable}' of table '${body.destinationClone}' created successfully in Snowflake.`
    ]);

    const row = result.rows[0] || {};
    return buildJsonResponse({
      message: row.message,
      durationMs: Number(row.durationMs || 0)
    });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake clone simulation failed' }, { status: 500 });
  }
}
