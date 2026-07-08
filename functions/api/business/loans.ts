import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(context.request.url).searchParams;
  const category = params.get('category')?.trim()?.toUpperCase() || 'ALL';
  const rating = params.get('rating')?.trim()?.toUpperCase() || 'ALL';

  try {
    const bindings: any[] = [];
    let query = `
      SELECT
        l.loan_id AS id,
        COALESCE(c.name, 'Unknown') AS customer_name,
        l.category,
        l.amount,
        l.interest_rate,
        l.term_months,
        l.emi,
        l.remaining_balance,
        TO_CHAR(l.next_due_date, 'YYYY-MM-DD') AS next_due_date,
        l.status,
        l.risk_rating,
        l.recovered_amount
      FROM LOANS l
      LEFT JOIN CUSTOMERS c ON l.customer_id = c.customer_id
      WHERE 1 = 1
    `;

    if (category !== 'ALL') {
      query += ` AND UPPER(l.category) = ?`;
      bindings.push(category);
    }
    if (rating !== 'ALL') {
      query += ` AND UPPER(l.risk_rating) = ?`;
      bindings.push(rating);
    }

    query += ` ORDER BY l.next_due_date ASC NULLS LAST LIMIT 200`;

    const result = await executeSnowflakeSql(context, query, bindings);
    return buildJsonResponse(result.rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      interestRate: Number(row.interestRate),
      termMonths: Number(row.termMonths),
      emi: Number(row.emi),
      remainingBalance: Number(row.remainingBalance),
      recoveredAmount: Number(row.recoveredAmount)
    })));
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake query failed' }, { status: 500 });
  }
}
