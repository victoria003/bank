import { buildJsonResponse, verifyToken, verifyPermission } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

export async function onRequestPut(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'update', 'customers')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    const body = await context.request.json();
    const { name, email, phone, segment, lifetimeValue, branch, riskScore } = body;
    if (!name || !email) {
      return buildJsonResponse({ success: false, error: 'Name and email are required.' }, { status: 400 });
    }

    const ltv = lifetimeValue !== undefined ? Number(lifetimeValue) : 0;
    const rScore = riskScore !== undefined ? Number(riskScore) : 0;

    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

    await executeSnowflakeSql(context,
      `UPDATE CUSTOMERS
       SET name = ?, email = ?, phone = ?, segment = ?, lifetime_value = ?, branch_name = ?, risk_score = ?
       WHERE customer_id = ?`,
      [name, email, cleanPhone, segment || 'BRONZE', ltv, branch || 'Main Branch', rScore, id]
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
    `, [id]);

    if (!result.rows.length) {
      return buildJsonResponse({ success: false, error: 'Customer not found.' }, { status: 404 });
    }

    const updated = result.rows[0];
    updated.lifetimeValue = Number(updated.lifetimeValue);
    updated.riskScore = Number(updated.riskScore);

    // Fetch accounts too
    const accountsResult = await executeSnowflakeSql(
      context,
      `SELECT account_number, account_type AS type, balance, status, customer_id FROM ACCOUNTS WHERE customer_id = ?`,
      [id]
    );
    updated.accounts = accountsResult.rows.map((acc: any) => ({
      accountNumber: acc.accountNumber,
      type: acc.type,
      balance: Number(acc.balance),
      status: acc.status
    }));

    return buildJsonResponse(updated);
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Customer update failed' }, { status: 500 });
  }
}

export async function onRequestDelete(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'delete', 'customers')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    // Delete customer's accounts first to avoid dependency blocks if any exist
    await executeSnowflakeSql(context, 'DELETE FROM ACCOUNTS WHERE customer_id = ?', [id]);
    await executeSnowflakeSql(context, 'DELETE FROM CUSTOMERS WHERE customer_id = ?', [id]);

    return buildJsonResponse({ success: true });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Customer deletion failed' }, { status: 500 });
  }
}
