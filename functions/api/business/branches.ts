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
        branch_id AS id,
        branch_name AS name,
        city,
        manager,
        customer_count AS customerCount,
        active_loans AS activeLoans,
        total_deposits AS totalDeposits,
        total_revenue AS totalRevenue,
        transaction_count AS transactionCount,
        growth_rate AS growthRate
      FROM BRANCH_PERFORMANCE
      ORDER BY branch_name
      LIMIT 200
    `);

    return buildJsonResponse(result.rows.map((row: any) => ({
      ...row,
      customerCount: Number(row.customerCount),
      activeLoans: Number(row.activeLoans),
      totalDeposits: Number(row.totalDeposits),
      totalRevenue: Number(row.totalRevenue),
      transactionCount: Number(row.transactionCount),
      growthRate: Number(row.growthRate)
    })));
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake query failed' }, { status: 500 });
  }
}
