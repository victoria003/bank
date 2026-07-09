import { buildJsonResponse, verifyToken, verifyPermission } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'read', 'fraud')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  try {
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
      ORDER BY f.timestamp DESC
      LIMIT 200
    `);

    return buildJsonResponse(result.rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      riskScore: Number(row.riskScore)
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

  if (!verifyPermission(user, 'create', 'fraud')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

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

    const alertId = `AL${Math.floor(10000 + Math.random() * 90000)}`;
    const alertAmount = Number(amount);
    const rScore = riskScore !== undefined ? Number(riskScore) : 50;

    await executeSnowflakeSql(context,
      `INSERT INTO FRAUD_ALERTS (alert_id, transaction_id, customer_id, amount, alert_type, timestamp, risk_score, status, details)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), ?, ?, ?)`,
      [alertId, transactionId, customerId, alertAmount, type, rScore, status || 'OPEN', details || '']
    );

    // Fetch the created alert
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
    `, [alertId]);

    const created = result.rows[0];
    if (created) {
      created.amount = Number(created.amount);
      created.riskScore = Number(created.riskScore);
    }

    return buildJsonResponse(created, { status: 201 });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Fraud alert creation failed' }, { status: 500 });
  }
}
