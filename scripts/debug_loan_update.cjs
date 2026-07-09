/**
 * Debug loan update failure — captures exact server error message
 */
const http = require('http');
const BASE = 'http://localhost:3000';

function req(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: u.port,
      path: u.pathname + u.search, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // Login as admin
  const loginRes = await req('POST', `${BASE}/api/auth/login`, { username: 'admin', password: 'admin123' });
  const adminToken = loginRes.body?.token;
  const engRes = await req('POST', `${BASE}/api/auth/login`, { username: 'engineer', password: 'engineer123' });
  const engToken = engRes.body?.token;

  // Get first loan
  const loansRes = await req('GET', `${BASE}/api/business/loans`, null, adminToken);
  const loans = loansRes.body;
  console.log('Total loans fetched:', loans?.length);
  const firstLoan = Array.isArray(loans) ? loans[0] : null;
  if (!firstLoan) { console.log('No loans found!'); return; }

  console.log('\nFirst loan raw object:');
  console.log(JSON.stringify(firstLoan, null, 2));

  // Try updating that loan as engineer (no customerId sent — server must look it up)
  const updatePayload = {
    category: firstLoan.category,
    amount: firstLoan.amount,
    interestRate: firstLoan.interestRate,
    termMonths: firstLoan.termMonths,
    emi: firstLoan.emi,
    remainingBalance: firstLoan.remainingBalance,
    status: firstLoan.status,
    riskRating: firstLoan.riskRating,
    recoveredAmount: firstLoan.recoveredAmount
  };
  console.log('\nUpdate payload (no customerId):');
  console.log(JSON.stringify(updatePayload, null, 2));

  const updateRes = await req('PUT', `${BASE}/api/business/loans/${firstLoan.id}`, updatePayload, engToken);
  console.log(`\nPUT /api/business/loans/${firstLoan.id} → HTTP ${updateRes.status}`);
  console.log('Response:', JSON.stringify(updateRes.body, null, 2));

  // Try with customerId explicitly provided
  const updatePayloadWithId = { ...updatePayload, customerId: firstLoan.customerId };
  console.log('\nUpdate payload WITH customerId:', firstLoan.customerId);
  const updateRes2 = await req('PUT', `${BASE}/api/business/loans/${firstLoan.id}`, updatePayloadWithId, engToken);
  console.log(`PUT /api/business/loans/${firstLoan.id} → HTTP ${updateRes2.status}`);
  console.log('Response:', JSON.stringify(updateRes2.body, null, 2));
}

main().catch(console.error);
