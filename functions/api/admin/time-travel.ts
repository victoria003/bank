import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await context.request.json();
  if (body.offsetMinutes === undefined || isNaN(body.offsetMinutes)) {
    return buildJsonResponse({ success: false, error: 'Offset in minutes is required.' }, { status: 400 });
  }

  try {
    const result = await executeSnowflakeSql(context, `
      SELECT ? AS message,
             ? AS offset_minutes,
             TO_CHAR(DATEADD(minute, -?, CURRENT_TIMESTAMP()), 'YYYY-MM-DD HH24:MI:SS') AS restored_timestamp
    `, [
      `Time Travel snapshot compiled. Retrieved dataset from ${body.offsetMinutes} minutes ago.`,
      Number(body.offsetMinutes),
      Number(body.offsetMinutes)
    ]);

    const row = result.rows[0] || {};
    return buildJsonResponse({
      message: row.message,
      offsetMinutes: Number(row.offsetMinutes || 0)
    });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake time travel simulation failed' }, { status: 500 });
  }
}
