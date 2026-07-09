import { buildJsonResponse, verifyToken, verifyPermission } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'read', 'accounts')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const params = new URL(context.request.url).searchParams;
  const customerId = params.get('customerId')?.trim() || '';
  const status = params.get('status')?.trim() || '';

  try {
    let query = `
      SELECT
        account_number,
        customer_id,
        account_type AS type,
        balance,
        status
      FROM ACCOUNTS
      WHERE 1 = 1
    `;
    const bindings: any[] = [];

    if (customerId) {
      query += ` AND customer_id = ?`;
      bindings.push(customerId);
    }
    if (status && status !== 'ALL') {
      query += ` AND status = ?`;
      bindings.push(status);
    }

    query += ` ORDER BY account_number LIMIT 200`;

    const result = await executeSnowflakeSql(context, query, bindings);
    return buildJsonResponse(result.rows.map((row: any) => ({
      ...row,
      balance: Number(row.balance)
    })));
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

  if (!verifyPermission(user, 'create', 'accounts')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  try {
    const body = await context.request.json();
    const { accountNumber, customerId, type, balance, status } = body;
    if (!accountNumber || !customerId || !type) {
      return buildJsonResponse({ success: false, error: 'Account Number, Customer ID, and Type are required.' }, { status: 400 });
    }

    // Verify customer exists
    const customerCheck = await executeSnowflakeSql(context, 'SELECT customer_id FROM CUSTOMERS WHERE customer_id = ?', [customerId]);
    if (!customerCheck.rows.length) {
      return buildJsonResponse({ success: false, error: 'Invalid Customer ID: Customer does not exist.' }, { status: 400 });
    }

    const startBalance = balance !== undefined ? Number(balance) : 0;

    await executeSnowflakeSql(context,
      `INSERT INTO ACCOUNTS (account_number, customer_id, account_type, balance, status)
       VALUES (?, ?, ?, ?, ?)`,
      [accountNumber, customerId, type, startBalance, status || 'ACTIVE']
    );

    const result = await executeSnowflakeSql(context, `
      SELECT
        account_number,
        customer_id,
        account_type AS type,
        balance,
        status
      FROM ACCOUNTS
      WHERE account_number = ?
    `, [accountNumber]);

    const created = result.rows[0];
    if (created) {
      created.balance = Number(created.balance);
    }

    return buildJsonResponse(created, { status: 201 });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Account creation failed' }, { status: 500 });
  }
}
