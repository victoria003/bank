import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import snowflake from 'snowflake-sdk';

// Load environment variables
dotenv.config();
const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USER,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  role: process.env.SNOWFLAKE_ROLE,
});
connection.connect((err, conn) => {
    if (err) {
        console.error("Unable to connect:", err.message);
    } else {
        console.log("Connected to Snowflake");
    }
});

// Initialize Gemini SDK if API key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Gemini AI SDK successfully initialized for text-to-SQL assistant.');
  } catch (err) {
    console.error('Failed to initialize Gemini AI SDK:', err);
  }
}

import {
  mockExecutiveMetrics,
  mockCustomers,
  mockTransactions,
  mockLoans,
  mockBranches,
  mockFraudAlerts,
  mockWarehouses,
  mockSnowflakeFeatures
} from './src/mockData.js';

import { User, UserRole, SQLQueryLog } from './src/types.js';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_banking_snowflake_secret_2026';

app.use(express.json());

// In-memory query logs, staged uploads, and virtual clones for the session
const queryLogs: SQLQueryLog[] = [
  {
    id: 'LOG-9921',
    queryText: 'SELECT * FROM SECURE_CUSTOMER_ANALYTICS LIMIT 10;',
    user: 'compliance_officer',
    role: 'ANALYST',
    timestamp: '2026-07-03 10:10:02',
    durationMs: 45,
    status: 'SUCCESS',
    rowsCount: 10
  },
  {
    id: 'LOG-9922',
    queryText: 'ALTER TABLE CUSTOMERS ADD COLUMN secondary_phone VARCHAR(50);',
    user: 'jane_engineer',
    role: 'DATA_ENGINEER',
    timestamp: '2026-07-03 10:12:15',
    durationMs: 120,
    status: 'SUCCESS',
    rowsCount: 0
  },
  {
    id: 'LOG-9923',
    queryText: 'SELECT SNOWFLAKE.CORTEX.SUMMARIZE(details) FROM FRAUD_ALERTS;',
    user: 'admin_user',
    role: 'ADMIN',
    timestamp: '2026-07-03 10:14:50',
    durationMs: 310,
    status: 'SUCCESS',
    rowsCount: 3
  }
];

const mockUploadHistory = [
  { id: 'LD-401', fileName: 'customers_q2_2026.csv', format: 'CSV', stage: '@INTERNAL_BANKING_STAGE', status: 'LOADED', rowsLoaded: 1245, errors: 0, timestamp: '2026-07-02 14:15' },
  { id: 'LD-402', fileName: 'merchant_blacklist.json', format: 'JSON', stage: '@INTERNAL_SECURITY_STAGE', status: 'LOADED', rowsLoaded: 42, errors: 0, timestamp: '2026-07-02 16:30' },
  { id: 'LD-403', fileName: 'high_value_trans_temp.parquet', format: 'PARQUET', stage: '@INTERNAL_INGEST_STAGE', status: 'FAILED', rowsLoaded: 0, errors: 1, timestamp: '2026-07-03 08:05', errorMessage: 'Column mismatch: field transaction_ref not found in destination.' }
];

const virtualClones: string[] = [];
let timeTravelOffsetMinutes = 0;

// Snowflake Connection Setup (Lazy initialized on demand)
let isSnowflakeConnected = !!(process.env.SNOWFLAKE_ACCOUNT && process.env.SNOWFLAKE_USER && process.env.SNOWFLAKE_PASSWORD);

// Helper to determine if credentials are fully configured
function hasSnowflakeCredentials(): boolean {
  return !!(process.env.SNOWFLAKE_ACCOUNT && process.env.SNOWFLAKE_USER && process.env.SNOWFLAKE_PASSWORD);
}

function getSnowflakeConnection() {
  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USER;
  const password = process.env.SNOWFLAKE_PASSWORD;
  if (!account || !username || !password) return null;
  
  return snowflake.createConnection({
    account: account,
    username: username,
    password: password,
    database: process.env.SNOWFLAKE_DATABASE || 'ENTERPRISE_BANKING_DB',
    schema: process.env.SNOWFLAKE_SCHEMA || 'BANKING_SCHEMA',
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'BANKING_ANALYTICS_WH',
    role: process.env.SNOWFLAKE_ROLE || 'BANKING_ADMIN'
  });
}

function runQuery(sqlText: string, binds: any[] = []): Promise<any[]> {
  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USER;
  const password = process.env.SNOWFLAKE_PASSWORD;

  if (!account || !username || !password) {
    return Promise.reject(new Error('Snowflake credentials not configured in environment. Please add them to your .env configuration.'));
  }

  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection({
      account: account,
      username: username,
      password: password,
      database: process.env.SNOWFLAKE_DATABASE || 'ENTERPRISE_BANKING_DB',
      schema: process.env.SNOWFLAKE_SCHEMA || 'BANKING_SCHEMA',
      warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'BANKING_ANALYTICS_WH',
      role: process.env.SNOWFLAKE_ROLE || 'BANKING_ADMIN'
    });

    connection.connect((err, conn) => {
      if (err) {
        console.error('Snowflake connection error:', err);
        return reject(err);
      }

      conn.execute({
        sqlText,
        binds,
        complete: (err, stmt, rows) => {
          // Prevent connection/socket leaks
          try {
            conn.destroy((err) => {
              if (err) console.error('Error destroying Snowflake connection:', err);
            });
          } catch (e) {}

          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      });
    });
  });
}

// Test users list matching RBAC roles
const USERS_DB: Record<string, User & { passwordHash: string }> = {
  admin: {
    id: 'user-001',
    username: 'admin',
    name: 'Eleanor Vance (Chief Admin)',
    email: 'evance@enterprisebank.com',
    role: 'ADMIN',
    passwordHash: 'admin123'
  },
  engineer: {
    id: 'user-002',
    username: 'engineer',
    name: 'Jane Foster (Data Architect)',
    email: 'jfoster@enterprisebank.com',
    role: 'DATA_ENGINEER',
    passwordHash: 'engineer123'
  },
  analyst: {
    id: 'user-003',
    username: 'analyst',
    name: 'Peter Parker (Risk Analyst)',
    email: 'pparker@enterprisebank.com',
    role: 'ANALYST',
    passwordHash: 'analyst123'
  },
  business: {
    id: 'user-004',
    username: 'business',
    name: 'Sarah Connor (VP Retail Banking)',
    email: 'sconnor@enterprisebank.com',
    role: 'BUSINESS_USER',
    passwordHash: 'business123'
  }
};

// Authentication Middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as User;
    (req as any).user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// RBAC Authorization Factory
function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(430).json({ error: `Forbidden. Role '${user.role}' lacks sufficient access permissions.` });
    }
    next();
  };
}

// ----------------------------------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------------------------------

// 1. AUTHENTICATION API
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const foundUser = USERS_DB[username.toLowerCase()];
  if (!foundUser || foundUser.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid username or password credentials.' });
  }

  // Create JWT token
  const tokenUser: User = {
    id: foundUser.id,
    username: foundUser.username,
    name: foundUser.name,
    email: foundUser.email,
    role: foundUser.role
  };

  const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: tokenUser });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: (req as any).user });
});

// 2. BUSINESS PORTAL DATA (Visible to all logged in users with varying filters)
app.get('/api/business/dashboard', authenticateToken, async (req, res) => {
  if (!hasSnowflakeCredentials()) {
    return res.json(mockExecutiveMetrics);
  }

  try {
    const custCountRes = await runQuery('SELECT COUNT(*) as "count" FROM CUSTOMERS');
    const accCountRes = await runQuery('SELECT COUNT(*) as "count" FROM ACCOUNTS');
    const txCountRes = await runQuery('SELECT COUNT(*) as "count" FROM TRANSACTIONS');
    const loanCountRes = await runQuery('SELECT COUNT(*) as "count", COUNT(CASE WHEN status = \'ACTIVE\' THEN 1 END) as "activeCount" FROM LOANS');
    const revRes = await runQuery('SELECT SUM(total_deposits) as "sum" FROM BRANCH_PERFORMANCE');
    const branchCountRes = await runQuery('SELECT COUNT(*) as "count" FROM BRANCH_PERFORMANCE');
    const riskTxRes = await runQuery('SELECT COUNT(*) as "count" FROM TRANSACTIONS WHERE risk_factor = \'HIGH\'');

    const recentActRes = await runQuery(`
      SELECT t.transaction_id as "id", t.transaction_type as "type", c.name as "customer", 
             t.amount as "amount", TO_CHAR(t.timestamp, 'YYYY-MM-DD HH24:MI') as "timestamp", t.status as "status"
      FROM TRANSACTIONS t
      JOIN ACCOUNTS a ON t.account_number = a.account_number
      JOIN CUSTOMERS c ON a.customer_id = c.customer_id
      ORDER BY t.timestamp DESC LIMIT 5
    `);

    const dailyTxRes = await runQuery(`
      SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') as "date", COUNT(*) as "count", SUM(amount) as "amount"
      FROM TRANSACTIONS
      GROUP BY 1 ORDER BY 1 DESC LIMIT 7
    `);

    const monthlyRevRes = await runQuery(`
      SELECT TO_CHAR(timestamp, 'Mon') as "month", SUM(amount) as "revenue", COUNT(*) as "transactions"
      FROM TRANSACTIONS
      GROUP BY 1 ORDER BY MIN(timestamp) LIMIT 6
    `);

    const metrics = {
      totalCustomers: Number(custCountRes[0]?.count || 0),
      totalAccounts: Number(accCountRes[0]?.count || 0),
      totalTransactions: Number(txCountRes[0]?.count || 0),
      totalLoans: Number(loanCountRes[0]?.count || 0),
      totalRevenue: Number(revRes[0]?.sum || 0),
      totalBranches: Number(branchCountRes[0]?.count || 0),
      activeLoans: Number(loanCountRes[0]?.activeCount || 0),
      highRiskTransactions: Number(riskTxRes[0]?.count || 0),
      dailyTransactions: dailyTxRes.map((r: any) => ({
        date: r.date,
        count: Number(r.count || 0),
        amount: Number(r.amount || 0)
      })).reverse(),
      monthlyRevenue: monthlyRevRes.map((r: any) => ({
        month: r.month,
        revenue: Number(r.revenue || 0),
        transactions: Number(r.transactions || 0)
      })),
      recentActivities: recentActRes.map((r: any) => ({
        id: r.id,
        type: r.type,
        customer: r.customer,
        amount: Number(r.amount || 0),
        timestamp: r.timestamp,
        status: r.status
      }))
    };

    res.json(metrics);
  } catch (err) {
    console.error('Snowflake executive dashboard queries failed:', err);
    res.json(mockExecutiveMetrics);
  }
});

app.get('/api/business/customers', authenticateToken, async (req, res) => {
  if (!hasSnowflakeCredentials()) {
    return res.json([]);
  }

  const { search, segment } = req.query;

  try {
    let query = `
      SELECT c.customer_id as "id", c.name as "name", c.email as "email", c.phone as "phone", 
             c.segment as "segment", c.lifetime_value as "lifetimeValue", c.branch_name as "branch", 
             c.risk_score as "riskScore", TO_CHAR(c.joined_date, 'YYYY-MM-DD') as "joinedDate"
      FROM CUSTOMERS c
    `;
    const binds: any[] = [];
    const conditions: string[] = [];

    if (segment && segment !== 'ALL') {
      conditions.push(`c.segment = ?`);
      binds.push(segment);
    }
    if (search) {
      conditions.push(`(LOWER(c.name) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(c.customer_id) LIKE ?)`);
      const searchPattern = `%${(search as string).toLowerCase()}%`;
      binds.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY c.joined_date DESC LIMIT 100`;

    const rows = await runQuery(query, binds);

    const customers = await Promise.all(rows.map(async (row: any) => {
      let accounts: any[] = [];
      try {
        const accRows = await runQuery(`
          SELECT account_number as "accountNumber", account_type as "type", balance as "balance", status as "status"
          FROM ACCOUNTS
          WHERE customer_id = ?
        `, [row.id]);
        accounts = accRows.map((a: any) => ({
          accountNumber: a.accountNumber,
          type: a.type,
          balance: Number(a.balance || 0),
          status: a.status
        }));
      } catch (err) {
        // Safe fallback for missing accounts table
      }

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        segment: row.segment,
        lifetimeValue: Number(row.lifetimeValue || 0),
        branch: row.branch,
        riskScore: Number(row.riskScore || 0),
        joinedDate: row.joinedDate,
        accounts
      };
    }));

    res.json(customers);
  } catch (err) {
    console.error('Snowflake customers query failed:', err);
    res.json([]);
  }
});

app.get('/api/business/transactions', authenticateToken, async (req, res) => {
  if (!hasSnowflakeCredentials()) {
    return res.json([]);
  }

  const { type, risk } = req.query;

  try {
    let query = `
      SELECT t.transaction_id as "id", t.account_number as "accountNumber", c.name as "customerName", 
             t.transaction_type as "type", t.amount as "amount", t.currency as "currency", 
             TO_CHAR(t.timestamp, 'YYYY-MM-DD HH24:MI') as "timestamp", t.status as "status", 
             t.merchant_name as "merchant", t.location as "location", t.risk_factor as "riskFactor"
      FROM TRANSACTIONS t
      JOIN ACCOUNTS a ON t.account_number = a.account_number
      JOIN CUSTOMERS c ON a.customer_id = c.customer_id
    `;
    const binds: any[] = [];
    const conditions: string[] = [];

    if (type && type !== 'ALL') {
      conditions.push(`t.transaction_type = ?`);
      binds.push(type);
    }

    if (risk && risk !== 'ALL') {
      conditions.push(`t.risk_factor = ?`);
      binds.push(risk);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY t.timestamp DESC LIMIT 100`;

    const rows = await runQuery(query, binds);
    res.json(rows.map((row: any) => ({
      id: row.id,
      accountNumber: row.accountNumber,
      customerName: row.customerName,
      type: row.type,
      amount: Number(row.amount || 0),
      currency: row.currency,
      timestamp: row.timestamp,
      status: row.status,
      merchant: row.merchant,
      location: row.location,
      riskFactor: row.riskFactor
    })));
  } catch (err) {
    console.error('Snowflake transactions query failed:', err);
    res.json([]);
  }
});

app.get('/api/business/loans', authenticateToken, async (req, res) => {
  if (!hasSnowflakeCredentials()) {
    return res.json([]);
  }

  const { category, rating } = req.query;

  try {
    let query = `
      SELECT l.loan_id as "id", c.name as "customerName", l.category as "category", 
             l.amount as "amount", l.interest_rate as "interestRate", l.term_months as "termMonths", 
             l.emi as "emi", l.remaining_balance as "remainingBalance", l.recovered_amount as "recoveredAmount", 
             TO_CHAR(l.next_due_date, 'YYYY-MM-DD') as "nextDueDate", l.risk_rating as "riskRating", l.status as "status"
      FROM LOANS l
      JOIN CUSTOMERS c ON l.customer_id = c.customer_id
    `;
    const binds: any[] = [];
    const conditions: string[] = [];

    if (category && category !== 'ALL') {
      conditions.push(`l.category = ?`);
      binds.push(category);
    }

    if (rating && rating !== 'ALL') {
      conditions.push(`l.risk_rating = ?`);
      binds.push(rating);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY l.loan_id DESC LIMIT 100`;

    const rows = await runQuery(query, binds);
    res.json(rows.map((row: any) => ({
      id: row.id,
      customerName: row.customerName,
      category: row.category,
      amount: Number(row.amount || 0),
      interestRate: Number(row.interestRate || 0),
      termMonths: Number(row.termMonths || 0),
      emi: Number(row.emi || 0),
      remainingBalance: Number(row.remainingBalance || 0),
      recoveredAmount: Number(row.recoveredAmount || 0),
      nextDueDate: row.nextDueDate || '-',
      riskRating: row.riskRating,
      status: row.status
    })));
  } catch (err) {
    console.error('Snowflake loans query failed:', err);
    res.json([]);
  }
});

app.get('/api/business/branches', authenticateToken, async (req, res) => {
  if (!hasSnowflakeCredentials()) {
    return res.json([]);
  }

  try {
    const rows = await runQuery(`
      SELECT branch_id as "id", branch_name as "name", city as "city", manager as "manager", 
             customer_count as "customerCount", active_loans as "activeLoans", 
             total_deposits as "totalDeposits", total_revenue as "totalRevenue", 
             transaction_count as "transactionCount", growth_rate as "growthRate"
      FROM BRANCH_PERFORMANCE
      ORDER BY branch_name ASC
    `);
    res.json(rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      manager: row.manager,
      customerCount: Number(row.customerCount || 0),
      activeLoans: Number(row.activeLoans || 0),
      totalDeposits: Number(row.totalDeposits || 0),
      totalRevenue: Number(row.totalRevenue || 0),
      transactionCount: Number(row.transactionCount || 0),
      growthRate: Number(row.growthRate || 0)
    })));
  } catch (err) {
    console.error('Snowflake branches query failed:', err);
    res.json([]);
  }
});

app.get('/api/business/fraud-alerts', authenticateToken, async (req, res) => {
  if (!hasSnowflakeCredentials()) {
    return res.json([]);
  }

  try {
    const rows = await runQuery(`
      SELECT f.alert_id as "id", f.transaction_id as "transactionId", c.name as "customerName", 
             f.amount as "amount", f.alert_type as "type", TO_CHAR(f.timestamp, 'YYYY-MM-DD HH24:MI') as "timestamp", 
             f.risk_score as "riskScore", f.status as "status", f.details as "details"
      FROM FRAUD_ALERTS f
      JOIN CUSTOMERS c ON f.customer_id = c.customer_id
      ORDER BY f.timestamp DESC LIMIT 100
    `);
    res.json(rows.map((row: any) => ({
      id: row.id,
      transactionId: row.transactionId,
      customerName: row.customerName,
      amount: Number(row.amount || 0),
      type: row.type,
      timestamp: row.timestamp,
      riskScore: Number(row.riskScore || 0),
      status: row.status,
      details: row.details
    })));
  } catch (err) {
    console.error('Snowflake fraud alerts query failed:', err);
    res.json([]);
  }
});

// 3. SNOWFLAKE ADMIN PORTAL DATA

// Monitoring & Metadata status
app.get('/api/admin/monitoring', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  res.json({
    connected: isSnowflakeConnected,
    mode: isSnowflakeConnected ? 'LIVE_SNOWFLAKE_DB' : 'SIMULATED_STATE_ENGINE',
    account: process.env.SNOWFLAKE_ACCOUNT || 'AIS_DEMO_ACCOUNT.SNOWFLAKE',
    database: process.env.SNOWFLAKE_DATABASE || 'ENTERPRISE_BANKING_DB',
    schema: process.env.SNOWFLAKE_SCHEMA || 'BANKING_SCHEMA',
    warehouses: mockWarehouses,
    creditUsageMonth: 124.5,
    storageGbUsed: 485.2,
    timeTravelRetentionDays: 14,
    activePipes: 1,
    activeTasks: 1,
    activeStreams: 1
  });
});

app.get('/api/admin/warehouses', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  res.json(mockWarehouses);
});

app.get('/api/admin/tasks', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  res.json([
    { name: 'CONSOLIDATE_TRANSACTIONS_TASK', warehouse: 'BANKING_ANALYTICS_WH', schedule: 'USING CRON 0 * * * * UTC', status: 'STARTED', lastRun: '2026-07-03 09:00', nextRun: '2026-07-03 10:00' }
  ]);
});

app.get('/api/admin/streams', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  res.json([
    { name: 'TRANSACTIONS_STREAM', onTable: 'TRANSACTIONS', type: 'STANDARD', stale: false, description: 'Captures DML updates on Transactions for stream pipe consolidation.' }
  ]);
});

app.get('/api/admin/pipes', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  res.json([
    { name: 'TRANSACTIONS_SNOWPIPE', autoIngest: true, stage: '@INTERNAL_INGEST_STAGE', status: 'RUNNING', notificationChannel: 'aws_sns_topic_ingest_banking_prod' }
  ]);
});

// Data Upload Center
app.post('/api/admin/upload', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  const { fileName, fileFormat, stageName, copyIntoMode } = req.body;

  if (!fileName || !fileFormat) {
    return res.status(400).json({ error: 'File name and format are required.' });
  }

  const newLoad = {
    id: `LD-${Math.floor(100 + Math.random() * 900)}`,
    fileName,
    format: fileFormat,
    stage: stageName || '@INTERNAL_INGEST_STAGE',
    status: 'LOADED',
    rowsLoaded: Math.floor(250 + Math.random() * 2000),
    errors: 0,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };

  mockUploadHistory.unshift(newLoad);
  res.json({ message: 'COPY INTO execution simulated successfully', details: newLoad });
});

app.get('/api/admin/query-history', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER', 'ANALYST']), (req, res) => {
  res.json(queryLogs);
});

// Security center metadata
app.get('/api/admin/security/roles', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  res.json([
    { role: 'BANKING_ADMIN', parent: 'SYSADMIN', usersCount: 2, grantsCount: 42, privilegeLevel: 'Full Ownership' },
    { role: 'BANKING_DATA_ENGINEER', parent: 'BANKING_ADMIN', usersCount: 4, grantsCount: 28, privilegeLevel: 'Schema Modify + Create Stage' },
    { role: 'BANKING_ANALYST', parent: 'BANKING_DATA_ENGINEER', usersCount: 15, grantsCount: 12, privilegeLevel: 'SELECT on compliance views' },
    { role: 'BANKING_BUSINESS_USER', parent: 'BANKING_ANALYST', usersCount: 120, grantsCount: 4, privilegeLevel: 'SELECT on general KPI tables' }
  ]);
});

app.get('/api/admin/security/grants', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  res.json([
    { privilege: 'USAGE', objectType: 'DATABASE', objectName: 'ENTERPRISE_BANKING_DB', grantee: 'BANKING_BUSINESS_USER' },
    { privilege: 'USAGE', objectType: 'SCHEMA', objectName: 'BANKING_SCHEMA', grantee: 'BANKING_BUSINESS_USER' },
    { privilege: 'SELECT', objectType: 'TABLE', objectName: 'CUSTOMERS', grantee: 'BANKING_ANALYST' },
    { privilege: 'SELECT', objectType: 'VIEW', objectName: 'SECURE_CUSTOMER_ANALYTICS', grantee: 'BANKING_ANALYST' },
    { privilege: 'ALL PRIVILEGES', objectType: 'SCHEMA', objectName: 'BANKING_SCHEMA', grantee: 'BANKING_DATA_ENGINEER' }
  ]);
});

// Cloning and Time Travel Simulators
app.post('/api/admin/clone', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  const { sourceTable, destinationClone } = req.body;
  if (!sourceTable || !destinationClone) {
    return res.status(400).json({ error: 'Source table and destination clone name are required.' });
  }

  virtualClones.push(destinationClone);

  const newLog: SQLQueryLog = {
    id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
    queryText: `CREATE TABLE ${destinationClone} CLONE ${sourceTable}; -- Zero-Copy Clone Triggered`,
    user: (req as any).user.username,
    role: (req as any).user.role,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    durationMs: 15,
    status: 'SUCCESS',
    rowsCount: 0
  };
  queryLogs.unshift(newLog);

  res.json({ message: `Zero-Copy Clone '${destinationClone}' of table '${sourceTable}' created successfully in Snowflake.`, durationMs: 15 });
});

app.post('/api/admin/time-travel', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER']), (req, res) => {
  const { offsetMinutes } = req.body;
  if (offsetMinutes === undefined || isNaN(offsetMinutes)) {
    return res.status(400).json({ error: 'Offset in minutes is required.' });
  }

  timeTravelOffsetMinutes = Number(offsetMinutes);

  const newLog: SQLQueryLog = {
    id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
    queryText: `SELECT * FROM TRANSACTIONS AT(OFFSET => -60 * ${offsetMinutes}); -- Time Travel Sandbox`,
    user: (req as any).user.username,
    role: (req as any).user.role,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    durationMs: 85,
    status: 'SUCCESS',
    rowsCount: mockTransactions.length
  };
  queryLogs.unshift(newLog);

  res.json({ message: `Time Travel snapshot compiled. Retreived dataset from ${offsetMinutes} minutes ago.`, offsetMinutes });
});

// Database schema explorer metadata
app.get('/api/metadata/databases', authenticateToken, async (req, res) => {
  if (!hasSnowflakeCredentials()) {
    return res.json([]);
  }
  try {
    const rows = await runQuery('SHOW DATABASES');
    res.json(rows.map((r: any) => ({
      name: r.name || r.NAME || '',
      owner: r.owner || r.OWNER || '',
      comment: r.comment || r.COMMENT || ''
    })));
  } catch (err) {
    res.json([{ name: process.env.SNOWFLAKE_DATABASE || 'ENTERPRISE_BANKING_DB', owner: 'SYSADMIN', comment: 'Connected on-demand database' }]);
  }
});

app.get('/api/metadata/schemas', authenticateToken, async (req, res) => {
  if (!hasSnowflakeCredentials()) {
    return res.json([]);
  }
  try {
    const rows = await runQuery('SHOW SCHEMAS');
    res.json(rows.map((r: any) => ({
      database: r.database_name || r.DATABASE_NAME || '',
      name: r.name || r.NAME || '',
      type: 'STANDARD',
      owner: r.owner || r.OWNER || ''
    })));
  } catch (err) {
    res.json([{ database: process.env.SNOWFLAKE_DATABASE || 'ENTERPRISE_BANKING_DB', name: process.env.SNOWFLAKE_SCHEMA || 'BANKING_SCHEMA', type: 'STANDARD', owner: 'SYSADMIN' }]);
  }
});

app.get('/api/metadata/tables', authenticateToken, async (req, res) => {
  if (!hasSnowflakeCredentials()) {
    return res.json([]);
  }
  try {
    const schema = process.env.SNOWFLAKE_SCHEMA || 'BANKING_SCHEMA';
    const rows = await runQuery(`
      SELECT table_name as "name", row_count as "rowCount", table_type as "type"
      FROM INFORMATION_SCHEMA.TABLES
      WHERE table_schema = ?
    `, [schema]);
    res.json(rows.map((row: any) => ({
      schema,
      name: row.name,
      rowCount: Number(row.rowCount || 0),
      type: row.type === 'VIEW' ? 'VIEW' : 'TABLE'
    })));
  } catch (err) {
    res.json([
      { schema: 'BANKING_SCHEMA', name: 'CUSTOMERS', rowCount: 0, type: 'TABLE' },
      { schema: 'BANKING_SCHEMA', name: 'ACCOUNTS', rowCount: 0, type: 'TABLE' },
      { schema: 'BANKING_SCHEMA', name: 'TRANSACTIONS', rowCount: 0, type: 'TABLE' },
      { schema: 'BANKING_SCHEMA', name: 'LOANS', rowCount: 0, type: 'TABLE' },
      { schema: 'BANKING_SCHEMA', name: 'BRANCH_PERFORMANCE', rowCount: 0, type: 'TABLE' },
      { schema: 'BANKING_SCHEMA', name: 'FRAUD_ALERTS', rowCount: 0, type: 'TABLE' },
      { schema: 'BANKING_SCHEMA', name: 'SECURE_CUSTOMER_ANALYTICS', rowCount: 0, type: 'SECURE_VIEW' }
    ]);
  }
});

app.get('/api/metadata/columns', authenticateToken, async (req, res) => {
  const { table } = req.query;
  if (!hasSnowflakeCredentials() || !table) {
    return res.json([]);
  }
  try {
    const schema = process.env.SNOWFLAKE_SCHEMA || 'BANKING_SCHEMA';
    const rows = await runQuery(`
      SELECT column_name as "name", data_type as "type", is_nullable as "nullable"
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE table_schema = ? AND table_name = ?
      ORDER BY ordinal_position
    `, [schema, table]);
    res.json(rows.map((r: any) => ({
      name: r.name,
      type: r.type,
      nullable: r.nullable,
      key: r.name.toLowerCase().includes('id') || r.name.toLowerCase().includes('number') ? 'KEY' : ''
    })));
  } catch (err) {
    res.json([
      { name: 'ID', type: 'VARCHAR(50)', nullable: 'NO', key: 'PRIMARY KEY' },
      { name: 'DETAILS', type: 'VARCHAR(500)', nullable: 'YES', key: '' }
    ]);
  }
});

// AI SQL Assistant Helper Endpoint using Gemini
app.post('/api/admin/sql/ai-translate', authenticateToken, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'English description prompt is required.' });
  }

  if (!ai) {
    return res.json({
      sql: `-- (Mock AI Helper: Please configure your GEMINI_API_KEY to enable full translation capability)\nSELECT c.name, SUM(t.amount) as total_deposits\nFROM CUSTOMERS c\nJOIN ACCOUNTS a ON c.customer_id = a.customer_id\nJOIN TRANSACTIONS t ON a.account_number = t.account_number\nWHERE t.transaction_type = 'DEPOSIT'\nGROUP BY c.name\nORDER BY total_deposits DESC;`
    });
  }

  try {
    const systemPrompt = `You are a professional Snowflake SQL assistant. Translate the user's plain English request into clean, valid, standard Snowflake SQL.
Use the following schemas:
- CUSTOMERS (customer_id, name, email, phone, segment, lifetime_value, branch_name, risk_score, joined_date)
- ACCOUNTS (account_number, customer_id, account_type, balance, status)
- TRANSACTIONS (transaction_id, account_number, amount, transaction_type, currency, merchant_name, location, risk_factor, status, timestamp)
- LOANS (loan_id, customer_id, category, amount, interest_rate, term_months, emi, remaining_balance, recovered_amount, next_due_date, risk_rating, status)
- BRANCH_PERFORMANCE (branch_id, branch_name, city, manager, customer_count, active_loans, total_deposits, total_revenue, transaction_count, growth_rate)
- FRAUD_ALERTS (alert_id, transaction_id, customer_id, amount, alert_type, timestamp, risk_score, status, details)

Return ONLY the Snowflake SQL inside a markdown or text form without explanations. Keep it concise.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nTranslate: ${prompt}` }] }
      ]
    });

    const text = response.text || '';
    // Clean code blocks
    const cleanedSql = text.replace(/```sql/g, '').replace(/```/g, '').trim();
    res.json({ sql: cleanedSql });
  } catch (err) {
    console.error('Gemini text-to-SQL helper error:', err);
    res.status(500).json({ error: 'AI Translation failed. Please write SQL manual editor code.' });
  }
});

// SQL Execution API
app.post('/api/admin/sql/run', authenticateToken, requireRole(['ADMIN', 'DATA_ENGINEER', 'ANALYST']), async (req, res) => {
  const { query, adminMode } = req.body;
  const user = (req as any).user as User;

  if (!query) {
    return res.status(400).json({ error: 'SQL query text is required.' });
  }

  // Security checks: Analysts are SELECT-only
  const isSelectOnly = /^\s*(select|with|show|describe|explain|use)\b/i.test(query);

  if (user.role === 'ANALYST' && !isSelectOnly) {
    return res.status(403).json({ error: 'Security Exception: ANALYST role is restricted to Select-only read queries.' });
  }

  // Admin and Data Engineers can run CREATE, UPDATE, etc.
  if (!adminMode && !isSelectOnly) {
    return res.status(403).json({ error: 'Workspace Policy: Modification queries require enabling "Admin Advanced Mode" toggle.' });
  }

  const startTime = Date.now();

  try {
    if (!hasSnowflakeCredentials()) {
      throw new Error('Snowflake Live Connection is required. Please set up SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, and SNOWFLAKE_PASSWORD in your environment variables.');
    }

    const rows = await runQuery(query);
    const durationMs = Date.now() - startTime;

    const newLog: SQLQueryLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      queryText: query,
      user: user.username,
      role: user.role,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      durationMs,
      status: 'SUCCESS',
      rowsCount: rows.length
    };
    queryLogs.unshift(newLog);

    res.json({
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      rows,
      durationMs,
      stagedLogs: newLog
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err.message || 'Snowflake database execution error.';

    const newLog: SQLQueryLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      queryText: query,
      user: user.username,
      role: user.role,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      durationMs,
      status: 'ERROR',
      rowsCount: 0,
      errorMessage: errorMsg
    };
    queryLogs.unshift(newLog);

    res.status(400).json({ error: errorMsg, durationMs });
  }
});

// ----------------------------------------------------------------------------
// MIDDLEWARE AND VITE SERVER INJECTOR
// ----------------------------------------------------------------------------

async function bootServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Enterprise Banking Analytics full-stack portal listening on http://localhost:${PORT}`);
  });
}

bootServer();
