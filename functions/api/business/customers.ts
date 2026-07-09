import { buildJsonResponse, verifyToken, verifyPermission } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'read', 'customers')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
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

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'create', 'customers')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  try {
    const body = await context.request.json();
    const { name, email, phone, segment, lifetimeValue, branch, riskScore } = body;
    if (!name || !email) {
      return buildJsonResponse({ success: false, error: 'Name and email are required.' }, { status: 400 });
    }

    const customerId = `CUS${Math.floor(10000 + Math.random() * 90000)}`;
    const ltv = lifetimeValue !== undefined ? Number(lifetimeValue) : 0;
    const rScore = riskScore !== undefined ? Number(riskScore) : 0;

    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

    await executeSnowflakeSql(context,
      `INSERT INTO CUSTOMERS (customer_id, name, email, phone, segment, lifetime_value, branch_name, risk_score, joined_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE())`,
      [customerId, name, email, cleanPhone, segment || 'BRONZE', ltv, branch || 'Main Branch', rScore]
    );

    const result = await executeSnowflakeSql(context, `
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
      WHERE customer_id = ?
    `, [customerId]);

    const created = result.rows[0];
    if (created) {
      created.lifetimeValue = Number(created.lifetimeValue);
      created.riskScore = Number(created.riskScore);
      created.accounts = [];
    }

    return buildJsonResponse(created, { status: 201 });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Customer creation failed' }, { status: 500 });
  }
}
