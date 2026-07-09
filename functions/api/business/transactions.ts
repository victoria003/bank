import { buildJsonResponse, verifyToken, verifyPermission } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'read', 'transactions')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const params = new URL(context.request.url).searchParams;
  const txType = params.get('type')?.trim()?.toUpperCase() || 'ALL';
  const txRisk = params.get('risk')?.trim()?.toUpperCase() || 'ALL';

  try {
    const bindings: any[] = [];
    let query = `
      SELECT
        t.transaction_id AS id,
        t.account_number,
        COALESCE(c.name, 'Unknown') AS customer_name,
        t.transaction_type AS type,
        t.amount,
        t.currency,
        TO_CHAR(t.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
        t.status,
        t.merchant_name AS merchant,
        t.location,
        t.risk_factor
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

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'create', 'transactions')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  try {
    const body = await context.request.json();
    const { accountNumber, type, amount, currency, status, merchant, location, riskFactor } = body;
    if (!accountNumber || !type || amount === undefined) {
      return buildJsonResponse({ success: false, error: 'Account Number, Transaction Type, and Amount are required.' }, { status: 400 });
    }

    // Verify account exists
    const accountCheck = await executeSnowflakeSql(context, 'SELECT account_number FROM ACCOUNTS WHERE account_number = ?', [accountNumber]);
    if (!accountCheck.rows.length) {
      return buildJsonResponse({ success: false, error: 'Invalid Account Number: Account does not exist.' }, { status: 400 });
    }

    const txId = `TX${Math.floor(100000 + Math.random() * 900000)}`;
    const txAmount = Number(amount);

    await executeSnowflakeSql(context,
      `INSERT INTO TRANSACTIONS (transaction_id, account_number, transaction_type, amount, currency, timestamp, status, merchant_name, location, risk_factor)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), ?, ?, ?, ?)`,
      [txId, accountNumber, type, txAmount, currency || 'USD', status || 'COMPLETED', merchant || '', location || '', riskFactor || 'LOW']
    );

    // Fetch the created transaction with customer name
    const result = await executeSnowflakeSql(context, `
      SELECT
        t.transaction_id AS id,
        t.account_number,
        COALESCE(c.name, 'Unknown') AS customer_name,
        t.transaction_type AS type,
        t.amount,
        t.currency,
        TO_CHAR(t.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
        t.status,
        t.merchant_name AS merchant,
        t.location,
        t.risk_factor
      FROM TRANSACTIONS t
      LEFT JOIN ACCOUNTS a ON t.account_number = a.account_number
      LEFT JOIN CUSTOMERS c ON a.customer_id = c.customer_id
      WHERE t.transaction_id = ?
    `, [txId]);

    const created = result.rows[0];
    if (created) {
      created.amount = Number(created.amount);
    }

    return buildJsonResponse(created, { status: 201 });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Transaction registration failed' }, { status: 500 });
  }
}
