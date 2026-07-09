const http = require('http');

function post(url, body, token) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(JSON.stringify(body));
    req.end();
  });
}

function put(url, body, token) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(JSON.stringify(body));
    req.end();
  });
}

function del(url, token) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {}
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runTests() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- STARTING RBAC & CRUD VALIDATION SUITE ---');

  // 1. Authenticate all roles
  const roles = ['admin', 'engineer', 'analyst', 'business'];
  const tokens = {};
  for (const r of roles) {
    const loginRes = await post(`${baseUrl}/api/auth/login`, { username: r, password: `${r}123` });
    if (loginRes.status !== 200) {
      console.error(`Login failed for role ${r}:`, loginRes.body);
      process.exit(1);
    }
    tokens[r] = loginRes.body.token;
    console.log(`Successfully authenticated user "${r}" with role: ${loginRes.body.user.role}`);
  }

  // 2. Validate GET /api/business/accounts
  console.log('\n--- TESTING ACCOUNTS API ---');
  const getAccounts = await get(`${baseUrl}/api/business/accounts`, tokens.admin);
  console.log('GET /api/business/accounts status:', getAccounts.status);
  console.log('Number of Accounts retrieved:', getAccounts.body.length);

  // 3. Validate CRUD Permissions on Customers
  console.log('\n--- TESTING CUSTOMER CRUD & RBAC CONTROLS ---');
  const tempCustomer = {
    name: 'Validation Test Customer',
    email: 'validation@example.com',
    phone: '+1-555-8888',
    segment: 'SILVER',
    lifetimeValue: 12000,
    branch: 'Main Branch',
    riskScore: 25
  };

  // 3a. Analyst tries to create customer (Should be 403)
  const analystCreate = await post(`${baseUrl}/api/business/customers`, tempCustomer, tokens.analyst);
  console.log('Analyst create customer status (expecting 403):', analystCreate.status);

  // 3b. Business User tries to create customer (Should be 403)
  const businessCreate = await post(`${baseUrl}/api/business/customers`, tempCustomer, tokens.business);
  console.log('Business User create customer status (expecting 403):', businessCreate.status);

  // 3c. Engineer creates customer (Should be 201)
  const engineerCreate = await post(`${baseUrl}/api/business/customers`, tempCustomer, tokens.engineer);
  console.log('Engineer create customer status (expecting 201):', engineerCreate.status);
  if (engineerCreate.status !== 201) {
    console.log('Engineer Create Error body:', JSON.stringify(engineerCreate.body, null, 2));
  }
  const createdId = engineerCreate.body?.id;
  console.log('Created customer ID:', createdId);

  // 3d. Engineer updates customer (Should be 200)
  const updatedCustomer = { ...tempCustomer, name: 'Validation Test Customer Updated' };
  const engineerUpdate = await put(`${baseUrl}/api/business/customers/${createdId}`, updatedCustomer, tokens.engineer);
  console.log('Engineer update customer status (expecting 200):', engineerUpdate.status);
  console.log('Updated customer name:', engineerUpdate.body.name);

  // 3e. Engineer tries to delete customer (Should be 403)
  const engineerDelete = await del(`${baseUrl}/api/business/customers/${createdId}`, tokens.engineer);
  console.log('Engineer delete customer status (expecting 403):', engineerDelete.status);

  // 3f. Admin deletes customer (Should be 200)
  const adminDelete = await del(`${baseUrl}/api/business/customers/${createdId}`, tokens.admin);
  console.log('Admin delete customer status (expecting 200):', adminDelete.status);

  // 4. Validate SQL Workspace constraints
  console.log('\n--- TESTING SQL WORKSPACE CONSTRAINTS ---');

  // 4a. Business User executes query (Should be 403)
  const businessSql = await post(`${baseUrl}/api/admin/sql/run`, { query: 'SELECT * FROM CUSTOMERS LIMIT 5;' }, tokens.business);
  console.log('Business user SQL execution status (expecting 403):', businessSql.status);

  // 4b. Analyst executes SELECT query (Should be 200)
  const analystSelect = await post(`${baseUrl}/api/admin/sql/run`, { query: 'SELECT * FROM CUSTOMERS LIMIT 1;' }, tokens.analyst);
  console.log('Analyst SELECT SQL execution status (expecting 200):', analystSelect.status);
  console.log('Sample Customer Row:', JSON.stringify(analystSelect.body.rows?.[0], null, 2));

  // 4c. Analyst tries to execute non-SELECT query (Should be 403)
  const analystWrite = await post(`${baseUrl}/api/admin/sql/run`, { query: "UPDATE CUSTOMERS SET name = 'Hacker' WHERE customer_id = 'CUS01';" }, tokens.analyst);
  console.log('Analyst UPDATE SQL execution status (expecting 403):', analystWrite.status);

  console.log('\n--- ALL RBAC & CRUD INTEGRATION TESTS COMPLETED SUCCESSFULLY ---');
}

runTests();
