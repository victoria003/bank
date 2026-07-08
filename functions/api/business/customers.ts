import { buildJsonResponse, verifyToken } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(context.request.url).searchParams;
  const search = params.get('search')?.trim() || '';
  const segment = params.get('segment')?.trim()?.toUpperCase() || 'ALL';

  try {
    const customerBindings: any[] = [];
    let customerQuery = `
      SELECT
        customer_id AS id,
        name,
        email,
        phone,
        segment,
        lifetime_value,
        branch_name AS branch,
        risk_score,
        TO_CHAR(joined_date, 'YYYY-MM-DD') AS joined_date
      FROM CUSTOMERS
      WHERE 1 = 1
    `;

    if (search) {
      customerQuery += ` AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ?)`;
      customerBindings.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    if (segment !== 'ALL') {
      customerQuery += ` AND UPPER(segment) = ?`;
      customerBindings.push(segment);
    }

    customerQuery += ` ORDER BY name LIMIT 200`;

    const customerResult = await executeSnowflakeSql(context, customerQuery, customerBindings);
    const customerIds = customerResult.rows.map((row: any) => row.id);

    const accounts: any[] = [];
    if (customerIds.length) {
      const accountPlaceholders = customerIds.map(() => '?').join(', ');
      const accountsResult = await executeSnowflakeSql(
        context,
        `SELECT account_number, account_type AS type, balance, status, customer_id FROM ACCOUNTS WHERE customer_id IN (${accountPlaceholders})`,
        customerIds
      );
      accounts.push(...accountsResult.rows);
    }

    const customers = customerResult.rows.map((customer: any) => ({
      ...customer,
      accounts: accounts.filter((account) => account.customerId === customer.id).map((account) => ({
        accountNumber: account.accountNumber,
        type: account.type,
        balance: Number(account.balance),
        status: account.status
      }))
    }));

    return buildJsonResponse(customers);
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Snowflake query failed' }, { status: 500 });
  }
}
