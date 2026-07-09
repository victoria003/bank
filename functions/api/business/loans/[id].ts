import { buildJsonResponse, verifyToken, verifyPermission } from '../../_auth';
import { executeSnowflakeSql } from '../../_snowflake';

export async function onRequestPut(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'update', 'loans')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

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

    const loanAmt = Number(amount);
    const rate = Number(interestRate);
    const term = Number(termMonths);
    const loanEmi = emi !== undefined ? Number(emi) : 0;
    const balance = remainingBalance !== undefined ? Number(remainingBalance) : loanAmt;
    const recovered = recoveredAmount !== undefined ? Number(recoveredAmount) : 0;

    await executeSnowflakeSql(context,
      `UPDATE LOANS
       SET customer_id = ?, category = ?, amount = ?, interest_rate = ?, term_months = ?, emi = ?, remaining_balance = ?, next_due_date = ?, status = ?, risk_rating = ?, recovered_amount = ?
       WHERE loan_id = ?`,
      [customerId, category, loanAmt, rate, term, loanEmi, balance, nextDueDate || null, status || 'ACTIVE', riskRating || 'A', recovered, id]
    );

    // Fetch the updated loan
    const result = await executeSnowflakeSql(context, `
      SELECT
        l.loan_id AS id,
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
    `, [id]);

    if (!result.rows.length) {
      return buildJsonResponse({ success: false, error: 'Loan not found.' }, { status: 404 });
    }

    const updated = result.rows[0];
    updated.amount = Number(updated.amount);
    updated.interestRate = Number(updated.interestRate);
    updated.termMonths = Number(updated.termMonths);
    updated.emi = Number(updated.emi);
    updated.remainingBalance = Number(updated.remainingBalance);
    updated.recoveredAmount = Number(updated.recoveredAmount);

    return buildJsonResponse(updated);
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Loan update failed' }, { status: 500 });
  }
}

export async function onRequestDelete(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = await verifyToken(authHeader, context);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyPermission(user, 'delete', 'loans')) {
    return buildJsonResponse({ success: false, error: 'Access Denied: Forbidden' }, { status: 403 });
  }

  const id = context.params.id;

  try {
    await executeSnowflakeSql(context, 'DELETE FROM LOANS WHERE loan_id = ?', [id]);
    return buildJsonResponse({ success: true });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: err.message || 'Loan deletion failed' }, { status: 500 });
  }
}
