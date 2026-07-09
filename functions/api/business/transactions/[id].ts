import { buildJsonResponse, verifyToken, verifyPermission } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

export async function onRequestPut(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'update', 'transactions')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

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

    const txAmount = Number(amount);

    await executeSnowflakeSql(context,
      `UPDATE TRANSACTIONS
       SET account_number = ?, transaction_type = ?, amount = ?, currency = ?, status = ?, merchant_name = ?, location = ?, risk_factor = ?
       WHERE transaction_id = ?`,
      [accountNumber, type, txAmount, currency || 'USD', status || 'COMPLETED', merchant || '', location || '', riskFactor || 'LOW', id]
    );

    // Fetch the updated transaction
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
    `, [id]);

    if (!result.rows.length) {
      return buildJsonResponse({ success: false, error: 'Transaction not found.' }, { status: 404 });
    }

    const updated = result.rows[0];
    updated.amount = Number(updated.amount);

    return buildJsonResponse(updated);
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Transaction update failed' }, { status: 500 });
  }
}

export async function onRequestDelete(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'delete', 'transactions')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    // Delete any dependent fraud alerts first to avoid constraints
    await executeSnowflakeSql(context, 'DELETE FROM FRAUD_ALERTS WHERE transaction_id = ?', [id]);
    await executeSnowflakeSql(context, 'DELETE FROM TRANSACTIONS WHERE transaction_id = ?', [id]);

    return buildJsonResponse({ success: true });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Transaction deletion failed' }, { status: 500 });
  }
}
