import { buildJsonResponse, verifyToken, verifyPermission } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

export async function onRequestPut(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'update', 'branches')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    const body = await context.request.json();
    const { name, city, manager, customerCount, activeLoans, totalDeposits, totalRevenue, transactionCount, growthRate } = body;
    if (!name || !city || !manager) {
      return buildJsonResponse({ success: false, error: 'Branch Name, City, and Manager are required.' }, { status: 400 });
    }

    const custCount = customerCount !== undefined ? Number(customerCount) : 0;
    const loansCount = activeLoans !== undefined ? Number(activeLoans) : 0;
    const deposits = totalDeposits !== undefined ? Number(totalDeposits) : 0;
    const revenue = totalRevenue !== undefined ? Number(totalRevenue) : 0;
    const txCount = transactionCount !== undefined ? Number(transactionCount) : 0;
    const gRate = growthRate !== undefined ? Number(growthRate) : 0;

    await executeSnowflakeSql(context,
      `UPDATE BRANCH_PERFORMANCE
       SET branch_name = ?, city = ?, manager = ?, customer_count = ?, active_loans = ?, total_deposits = ?, total_revenue = ?, transaction_count = ?, growth_rate = ?
       WHERE branch_id = ?`,
      [name, city, manager, custCount, loansCount, deposits, revenue, txCount, gRate, id]
    );

    // Fetch the updated branch
    const result = await executeSnowflakeSql(context, `
      SELECT
        branch_id AS id,
        branch_name AS name,
        city,
        manager,
        customer_count AS customerCount,
        active_loans AS activeLoans,
        total_deposits AS totalDeposits,
        total_revenue AS totalRevenue,
        transaction_count AS transactionCount,
        growth_rate AS growthRate
      FROM BRANCH_PERFORMANCE
      WHERE branch_id = ?
    `, [id]);

    if (!result.rows.length) {
      return buildJsonResponse({ success: false, error: 'Branch not found.' }, { status: 404 });
    }

    const updated = result.rows[0];
    updated.customerCount = Number(updated.customerCount);
    updated.activeLoans = Number(updated.activeLoans);
    updated.totalDeposits = Number(updated.totalDeposits);
    updated.totalRevenue = Number(updated.totalRevenue);
    updated.transactionCount = Number(updated.transactionCount);
    updated.growthRate = Number(updated.growthRate);

    return buildJsonResponse(updated);
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Branch update failed' }, { status: 500 });
  }
}

export async function onRequestDelete(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'delete', 'branches')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    await executeSnowflakeSql(context, 'DELETE FROM BRANCH_PERFORMANCE WHERE branch_id = ?', [id]);
    return buildJsonResponse({ success: true });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Branch deletion failed' }, { status: 500 });
  }
}
