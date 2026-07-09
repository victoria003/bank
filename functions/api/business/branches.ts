import { buildJsonResponse, verifyToken, verifyPermission } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'read', 'branches')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  try {
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
      ORDER BY branch_name
      LIMIT 200
    `);

    return buildJsonResponse(result.rows.map((row: any) => ({
      ...row,
      customerCount: Number(row.customerCount),
      activeLoans: Number(row.activeLoans),
      totalDeposits: Number(row.totalDeposits),
      totalRevenue: Number(row.totalRevenue),
      transactionCount: Number(row.transactionCount),
      growthRate: Number(row.growthRate)
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

  if (!verifyPermission(user, 'create', 'branches')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  try {
    const body = await context.request.json();
    const { name, city, manager, customerCount, activeLoans, totalDeposits, totalRevenue, transactionCount, growthRate } = body;
    if (!name || !city || !manager) {
      return buildJsonResponse({ success: false, error: 'Branch Name, City, and Manager are required.' }, { status: 400 });
    }

    const branchId = `BR${Math.floor(100 + Math.random() * 900)}`;
    const custCount = customerCount !== undefined ? Number(customerCount) : 0;
    const loansCount = activeLoans !== undefined ? Number(activeLoans) : 0;
    const deposits = totalDeposits !== undefined ? Number(totalDeposits) : 0;
    const revenue = totalRevenue !== undefined ? Number(totalRevenue) : 0;
    const txCount = transactionCount !== undefined ? Number(transactionCount) : 0;
    const gRate = growthRate !== undefined ? Number(growthRate) : 0;

    await executeSnowflakeSql(context,
      `INSERT INTO BRANCH_PERFORMANCE (branch_id, branch_name, city, manager, customer_count, active_loans, total_deposits, total_revenue, transaction_count, growth_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [branchId, name, city, manager, custCount, loansCount, deposits, revenue, txCount, gRate]
    );

    // Fetch the created branch
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
    `, [branchId]);

    const created = result.rows[0];
    if (created) {
      created.customerCount = Number(created.customerCount);
      created.activeLoans = Number(created.activeLoans);
      created.totalDeposits = Number(created.totalDeposits);
      created.totalRevenue = Number(created.totalRevenue);
      created.transactionCount = Number(created.transactionCount);
      created.growthRate = Number(created.growthRate);
    }

    return buildJsonResponse(created, { status: 201 });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Branch creation failed' }, { status: 500 });
  }
}
