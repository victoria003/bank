import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [summary, daily, monthly, recent] = await Promise.all([
      executeSnowflakeSql(context, `
        SELECT
          (SELECT COUNT(*) FROM CUSTOMERS) AS total_customers,
          (SELECT COUNT(*) FROM ACCOUNTS) AS total_accounts,
          (SELECT COUNT(*) FROM TRANSACTIONS) AS total_transactions,
          (SELECT COUNT(*) FROM LOANS) AS total_loans,
          (SELECT COALESCE(SUM(amount), 0) FROM TRANSACTIONS WHERE status = 'COMPLETED') AS total_revenue,
          (SELECT COUNT(*) FROM BRANCH_PERFORMANCE) AS total_branches,
          (SELECT COUNT(*) FROM LOANS WHERE status = 'ACTIVE') AS active_loans,
          (SELECT COUNT(*) FROM TRANSACTIONS WHERE risk_factor = 'HIGH' AND status = 'COMPLETED') AS high_risk_transactions
      `),
      executeSnowflakeSql(context, `
        SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') AS date,
               COUNT(*) AS count,
               COALESCE(SUM(amount), 0) AS amount
        FROM TRANSACTIONS
        WHERE timestamp >= DATEADD(day, -7, CURRENT_DATE())
        GROUP BY 1
        ORDER BY 1
      `),
      executeSnowflakeSql(context, `
        SELECT TO_CHAR(timestamp, 'YYYY-MM') AS month,
               COALESCE(SUM(amount), 0) AS revenue,
               COUNT(*) AS transactions
        FROM TRANSACTIONS
        WHERE timestamp >= DATEADD(month, -6, CURRENT_DATE())
        GROUP BY 1
        ORDER BY 1
      `),
      executeSnowflakeSql(context, `
        SELECT t.transaction_id AS id,
               t.transaction_type AS type,
               COALESCE(c.name, 'Unknown') AS customer_name,
               t.amount,
               TO_CHAR(t.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
               t.status,
               t.risk_factor AS risk_factor
        FROM TRANSACTIONS t
        LEFT JOIN ACCOUNTS a ON t.account_number = a.account_number
        LEFT JOIN CUSTOMERS c ON a.customer_id = c.customer_id
        ORDER BY t.timestamp DESC
        LIMIT 10
      `)
    ]);

    return buildJsonResponse({
      totalCustomers: summary.rows[0]?.totalCustomers ?? 0,
      totalAccounts: summary.rows[0]?.totalAccounts ?? 0,
      totalTransactions: summary.rows[0]?.totalTransactions ?? 0,
      totalLoans: summary.rows[0]?.totalLoans ?? 0,
      totalRevenue: Number(summary.rows[0]?.totalRevenue ?? 0),
      totalBranches: summary.rows[0]?.totalBranches ?? 0,
      activeLoans: summary.rows[0]?.activeLoans ?? 0,
      highRiskTransactions: summary.rows[0]?.highRiskTransactions ?? 0,
      dailyTransactions: daily.rows,
      monthlyRevenue: monthly.rows,
      recentActivities: recent.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        customer: row.customerName,
        amount: Number(row.amount),
        timestamp: row.timestamp,
        status: row.status
      }))
    });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake query failed' }, { status: 500 });
  }
}
