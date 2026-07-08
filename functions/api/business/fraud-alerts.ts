import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await executeSnowflakeSql(context, `
      SELECT
        alert_id AS id,
        transaction_id AS transactionId,
        COALESCE(c.name, 'Unknown') AS customerName,
        amount,
        alert_type AS type,
        TO_CHAR(f.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
        risk_score AS riskScore,
        status,
        details
      FROM FRAUD_ALERTS f
      LEFT JOIN CUSTOMERS c ON f.customer_id = c.customer_id
      ORDER BY f.timestamp DESC
      LIMIT 200
    `);

    return buildJsonResponse(result.rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      riskScore: Number(row.riskScore)
    })));
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake query failed' }, { status: 500 });
  }
}
