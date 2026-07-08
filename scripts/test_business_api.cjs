const http = require('http');

function post(url, body) {
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

function get(url, token) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
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

async function testAll() {
  const baseUrl = 'http://localhost:3000';
  console.log(`Connecting to local server at ${baseUrl}...`);

  try {
    // Login
    console.log('Logging in as admin...');
    const loginRes = await post(`${baseUrl}/api/auth/login`, { username: 'admin', password: 'admin123' });
    console.log('Login status:', loginRes.status);
    if (loginRes.status !== 200) {
      console.error('Login failed! Response:', loginRes.body);
      return;
    }

    const token = loginRes.body.token;
    console.log('Obtained token:', token.substring(0, 20) + '...');

    const endpoints = [
      '/api/business/dashboard',
      '/api/business/customers',
      '/api/business/transactions',
      '/api/business/loans',
      '/api/business/branches',
      '/api/business/fraud-alerts'
    ];

    for (const endpoint of endpoints) {
      console.log(`\n-----------------------------------------`);
      console.log(`Testing endpoint: ${endpoint}`);
      console.log(`-----------------------------------------`);
      try {
        const res = await get(`${baseUrl}${endpoint}`, token);
        console.log(`Status: ${res.status}`);
        console.log(`Response:`, JSON.stringify(res.body, null, 2));
      } catch (err) {
        console.error(`Request to ${endpoint} failed:`, err.message);
      }
    }

  } catch (err) {
    console.error('Test script crashed:', err);
  }
}

testAll();
