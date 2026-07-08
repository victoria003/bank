import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await executeSnowflakeSql(context, `
      SELECT
        query_id AS id,
        query_text AS query_text,
        user_name AS user,
        role_name AS role,
        TO_CHAR(start_time, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
        total_elapsed_time / 1000 AS duration_ms,
        execution_status AS status,
        total_rows AS rows_count
      FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
      WHERE start_time >= DATEADD(day, -7, CURRENT_TIMESTAMP())
      ORDER BY start_time DESC
      LIMIT 20
    `);

    return buildJsonResponse(result.rows.map((row: any) => ({
      id: row.id,
      queryText: row.queryText,
      user: row.user,
      role: row.role,
      timestamp: row.timestamp,
      durationMs: Number(row.durationMs || 0),
      status: row.status,
      rowsCount: Number(row.rowsCount || 0)
    })));
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake query history fetch failed' }, { status: 500 });
  }
}
