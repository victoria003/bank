import { buildJsonResponse, verifyToken } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await context.request.json();
  if (!body.query) {
    return buildJsonResponse({ success: false, error: 'SQL query text is required.' }, { status: 400 });
  }

  if (user.role === 'BANKING_BUSINESS_USER' || user.role === 'BUSINESS_USER') {
    return buildJsonResponse({ success: false, error: 'Access Denied: SQL Workspace is restricted for Business Users.' }, { status: 403 });
  }

  if (user.role === 'BANKING_ANALYST' || user.role === 'ANALYST') {
    const queryTrim = body.query.trim().replace(/^\/\*[\s\S]*?\*\//g, '').trim();
    if (!queryTrim.toUpperCase().startsWith('SELECT') && !queryTrim.toUpperCase().startsWith('SHOW')) {
      return buildJsonResponse({ success: false, error: 'Access Denied: Risk Analysts are restricted to executing read-only SELECT or SHOW queries.' }, { status: 403 });
    }
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
