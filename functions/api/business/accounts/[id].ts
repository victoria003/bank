import { buildJsonResponse, verifyToken, verifyPermission } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

export async function onRequestPut(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'update', 'accounts')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    const body = await context.request.json();
    const { customerId, type, balance, status } = body;
    if (!customerId || !type) {
      return buildJsonResponse({ success: false, error: 'Customer ID and Type are required.' }, { status: 400 });
    }

    // Verify customer exists
    const customerCheck = await executeSnowflakeSql(context, 'SELECT customer_id FROM CUSTOMERS WHERE customer_id = ?', [customerId]);
    if (!customerCheck.rows.length) {
      return buildJsonResponse({ success: false, error: 'Invalid Customer ID: Customer does not exist.' }, { status: 400 });
    }

    const currentBalance = balance !== undefined ? Number(balance) : 0;

    await executeSnowflakeSql(context,
      `UPDATE ACCOUNTS
       SET customer_id = ?, account_type = ?, balance = ?, status = ?
       WHERE account_number = ?`,
      [customerId, type, currentBalance, status || 'ACTIVE', id]
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
    `, [id]);

    if (!result.rows.length) {
      return buildJsonResponse({ success: false, error: 'Account not found.' }, { status: 404 });
    }

    const updated = result.rows[0];
    updated.balance = Number(updated.balance);

    return buildJsonResponse(updated);
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Account update failed' }, { status: 500 });
  }
}

export async function onRequestDelete(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'delete', 'accounts')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    // Delete account's transactions first to avoid dependency blocks if any exist
    await executeSnowflakeSql(context, 'DELETE FROM TRANSACTIONS WHERE account_number = ?', [id]);
    await executeSnowflakeSql(context, 'DELETE FROM ACCOUNTS WHERE account_number = ?', [id]);

    return buildJsonResponse({ success: true });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Account deletion failed' }, { status: 500 });
  }
}
