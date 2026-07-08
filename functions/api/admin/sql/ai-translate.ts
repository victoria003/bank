import { buildJsonResponse, verifyToken } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

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

  try {
    const result = await executeSnowflakeSql(context, `
      SELECT CONCAT(
        'SELECT c.name, SUM(t.amount) AS total_deposits FROM CUSTOMERS c '
        || 'JOIN ACCOUNTS a ON c.customer_id = a.customer_id '
        || 'JOIN TRANSACTIONS t ON a.account_number = t.account_number '
        || 'WHERE LOWER(c.name) LIKE ''%', LOWER(?), '%'' '
        || 'GROUP BY c.name ORDER BY total_deposits DESC;'
      ) AS sql
    `, [body.prompt]);

    return buildJsonResponse({ sql: result.rows[0]?.sql || '' });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake AI SQL translation failed' }, { status: 500 });
  }
}
