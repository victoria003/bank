import { buildJsonResponse, verifyToken, verifyPermission } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

export async function onRequestPut(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'update', 'fraud')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    const body = await context.request.json();
    const { transactionId, customerId, amount, type, riskScore, status, details } = body;
    if (!transactionId || !customerId || amount === undefined || !type) {
      return buildJsonResponse({ success: false, error: 'Transaction ID, Customer ID, Amount, and Type are required.' }, { status: 400 });
    }

    // Verify customer exists
    const customerCheck = await executeSnowflakeSql(context, 'SELECT customer_id FROM CUSTOMERS WHERE customer_id = ?', [customerId]);
    if (!customerCheck.rows.length) {
      return buildJsonResponse({ success: false, error: 'Invalid Customer ID: Customer does not exist.' }, { status: 400 });
    }

    const alertAmount = Number(amount);
    const rScore = riskScore !== undefined ? Number(riskScore) : 50;

    await executeSnowflakeSql(context,
      `UPDATE FRAUD_ALERTS
       SET transaction_id = ?, customer_id = ?, amount = ?, alert_type = ?, risk_score = ?, status = ?, details = ?
       WHERE alert_id = ?`,
      [transactionId, customerId, alertAmount, type, rScore, status || 'OPEN', details || '', id]
    );

    // Fetch the updated alert
    const result = await executeSnowflakeSql(context, `
      SELECT
        alert_id AS id,
        transaction_id,
        COALESCE(c.name, 'Unknown') AS customer_name,
        amount,
        alert_type AS type,
        TO_CHAR(f.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
        f.risk_score,
        status,
        details
      FROM FRAUD_ALERTS f
      LEFT JOIN CUSTOMERS c ON f.customer_id = c.customer_id
      WHERE f.alert_id = ?
    `, [id]);

    if (!result.rows.length) {
      return buildJsonResponse({ success: false, error: 'Alert not found.' }, { status: 404 });
    }

    const updated = result.rows[0];
    updated.amount = Number(updated.amount);
    updated.riskScore = Number(updated.riskScore);

    return buildJsonResponse(updated);
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Fraud alert update failed' }, { status: 500 });
  }
}

export async function onRequestDelete(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'delete', 'fraud')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    await executeSnowflakeSql(context, 'DELETE FROM FRAUD_ALERTS WHERE alert_id = ?', [id]);
    return buildJsonResponse({ success: true });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Fraud alert deletion failed' }, { status: 500 });
  }
}
