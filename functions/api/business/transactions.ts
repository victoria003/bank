import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(context.request.url).searchParams;
  const txType = params.get('type')?.trim()?.toUpperCase() || 'ALL';
  const txRisk = params.get('risk')?.trim()?.toUpperCase() || 'ALL';

  try {
    const bindings: any[] = [];
    let query = `
      SELECT
        t.transaction_id AS id,
        t.account_number AS accountNumber,
        COALESCE(c.name, 'Unknown') AS customerName,
        t.transaction_type AS type,
        t.amount,
        t.currency,
        TO_CHAR(t.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
        t.status,
        t.merchant_name AS merchant,
        t.location,
        t.risk_factor AS riskFactor
      FROM TRANSACTIONS t
      LEFT JOIN ACCOUNTS a ON t.account_number = a.account_number
      LEFT JOIN CUSTOMERS c ON a.customer_id = c.customer_id
      WHERE 1 = 1
    `;

    if (txType !== 'ALL') {
      query += ` AND UPPER(t.transaction_type) = ?`;
      bindings.push(txType);
    }
    if (txRisk !== 'ALL') {
      query += ` AND UPPER(t.risk_factor) = ?`;
      bindings.push(txRisk);
    }

    query += ` ORDER BY t.timestamp DESC LIMIT 200`;

    const result = await executeSnowflakeSql(context, query, bindings);
    return buildJsonResponse(result.rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount)
    })));
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake query failed' }, { status: 500 });
  }
}
