import { buildJsonResponse, verifyToken, verifyPermission } from '../_auth';
import { executeSnowflakeSql } from '../_snowflake';

export async function onRequestGet(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'read', 'loans')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const params = new URL(context.request.url).searchParams;
  const category = params.get('category')?.trim()?.toUpperCase() || 'ALL';
  const rating = params.get('rating')?.trim()?.toUpperCase() || 'ALL';

  try {
    const bindings: any[] = [];
    let query = `
      SELECT
        l.loan_id AS id,
        l.customer_id,
        COALESCE(c.name, 'Unknown') AS customer_name,
        l.category,
        l.amount,
        l.interest_rate,
        l.term_months,
        l.emi,
        l.remaining_balance,
        TO_CHAR(l.next_due_date, 'YYYY-MM-DD') AS next_due_date,
        l.status,
        l.risk_rating,
        l.recovered_amount
      FROM LOANS l
      LEFT JOIN CUSTOMERS c ON l.customer_id = c.customer_id
      WHERE 1 = 1
    `;

    if (category !== 'ALL') {
      query += ` AND UPPER(l.category) = ?`;
      bindings.push(category);
    }
    if (rating !== 'ALL') {
      query += ` AND UPPER(l.risk_rating) = ?`;
      bindings.push(rating);
    }

    query += ` ORDER BY l.next_due_date ASC NULLS LAST LIMIT 200`;

    const result = await executeSnowflakeSql(context, query, bindings);
    return buildJsonResponse(result.rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      interestRate: Number(row.interestRate),
      termMonths: Number(row.termMonths),
      emi: Number(row.emi),
      remainingBalance: Number(row.remainingBalance),
      recoveredAmount: Number(row.recoveredAmount)
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

  if (!verifyPermission(user, 'create', 'loans')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  try {
    const body = await context.request.json();
    const { customerId, category, amount, interestRate, termMonths, emi, remainingBalance, nextDueDate, status, riskRating, recoveredAmount } = body;
    if (!customerId || !category || amount === undefined || interestRate === undefined || termMonths === undefined) {
      return buildJsonResponse({ success: false, error: 'Customer ID, Category, Amount, Interest Rate, and Term are required.' }, { status: 400 });
    }

    // Verify customer exists
    const customerCheck = await executeSnowflakeSql(context, 'SELECT customer_id FROM CUSTOMERS WHERE customer_id = ?', [customerId]);
    if (!customerCheck.rows.length) {
      return buildJsonResponse({ success: false, error: 'Invalid Customer ID: Customer does not exist.' }, { status: 400 });
    }

    const loanId = `LOAN${Math.floor(10000 + Math.random() * 90000)}`;
    const loanAmt = Number(amount);
    const rate = Number(interestRate);
    const term = Number(termMonths);
    const loanEmi = emi !== undefined ? Number(emi) : 0;
    const balance = remainingBalance !== undefined ? Number(remainingBalance) : loanAmt;
    const recovered = recoveredAmount !== undefined ? Number(recoveredAmount) : 0;

    await executeSnowflakeSql(context,
      `INSERT INTO LOANS (loan_id, customer_id, category, amount, interest_rate, term_months, emi, remaining_balance, next_due_date, status, risk_rating, recovered_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [loanId, customerId, category, loanAmt, rate, term, loanEmi, balance, nextDueDate || null, status || 'ACTIVE', riskRating || 'A', recovered]
    );

    // Fetch the created loan
    const result = await executeSnowflakeSql(context, `
      SELECT
        l.loan_id AS id,
        l.customer_id,
        COALESCE(c.name, 'Unknown') AS customer_name,
        l.category,
        l.amount,
        l.interest_rate,
        l.term_months,
        l.emi,
        l.remaining_balance,
        TO_CHAR(l.next_due_date, 'YYYY-MM-DD') AS next_due_date,
        l.status,
        l.risk_rating,
        l.recovered_amount
      FROM LOANS l
      LEFT JOIN CUSTOMERS c ON l.customer_id = c.customer_id
      WHERE l.loan_id = ?
    `, [loanId]);

    const created = result.rows[0];
    if (created) {
      created.amount = Number(created.amount);
      created.interestRate = Number(created.interestRate);
      created.termMonths = Number(created.termMonths);
      created.emi = Number(created.emi);
      created.remainingBalance = Number(created.remainingBalance);
      created.recoveredAmount = Number(created.recoveredAmount);
    }

    return buildJsonResponse(created, { status: 201 });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Loan creation failed' }, { status: 500 });
  }
}
