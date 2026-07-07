export const executiveMetrics = {
  totalCustomers: 4200,
  totalAccounts: 7400,
  totalTransactions: 128450,
  totalLoans: 1600,
  totalRevenue: 2754300,
  totalBranches: 18,
  activeLoans: 1340,
  highRiskTransactions: 42,
  dailyTransactions: [
    { date: '2026-07-01', count: 1280, amount: 145200 },
    { date: '2026-07-02', count: 1375, amount: 154900 },
    { date: '2026-07-03', count: 1190, amount: 132400 },
    { date: '2026-07-04', count: 1420, amount: 162700 },
    { date: '2026-07-05', count: 1505, amount: 173100 },
    { date: '2026-07-06', count: 1460, amount: 168900 },
    { date: '2026-07-07', count: 1520, amount: 174500 }
  ],
  monthlyRevenue: [
    { month: 'Jan', revenue: 420000, transactions: 18000 },
    { month: 'Feb', revenue: 390000, transactions: 17200 },
    { month: 'Mar', revenue: 450000, transactions: 19000 },
    { month: 'Apr', revenue: 465000, transactions: 19600 },
    { month: 'May', revenue: 478000, transactions: 20250 },
    { month: 'Jun', revenue: 483000, transactions: 20600 }
  ],
  recentActivities: [
    { id: 'TX-1001', type: 'DEPOSIT', customer: 'Evelyn Harper', amount: 10250, timestamp: '2026-07-07 09:08', status: 'COMPLETED' },
    { id: 'TX-1002', type: 'WITHDRAWAL', customer: 'Marcus Quinn', amount: 1840, timestamp: '2026-07-07 08:54', status: 'COMPLETED' },
    { id: 'TX-1003', type: 'TRANSFER', customer: 'Sophie Reed', amount: 5200, timestamp: '2026-07-07 08:42', status: 'PENDING' },
    { id: 'TX-1004', type: 'NEW_ACCOUNT', customer: 'Ali Brooks', amount: 0, timestamp: '2026-07-07 08:35', status: 'COMPLETED' },
    { id: 'TX-1005', type: 'LOAN_EMI', customer: 'Nina Patel', amount: 3050, timestamp: '2026-07-07 08:10', status: 'COMPLETED' }
  ]
};

export const customers = [
  {
    id: 'CUST-001',
    name: 'Evelyn Harper',
    email: 'evelyn.harper@example.com',
    phone: '+1 415-555-0137',
    segment: 'PLATINUM',
    lifetimeValue: 218000,
    branch: 'Downtown',
    riskScore: 18,
    joinedDate: '2024-09-12',
    accounts: [
      { accountNumber: 'ACC-10021', type: 'CHECKING', balance: 42000, status: 'ACTIVE' },
      { accountNumber: 'ACC-10022', type: 'SAVINGS', balance: 98000, status: 'ACTIVE' }
    ]
  }
];

export const transactions = [
  {
    id: 'TX-1001',
    accountNumber: 'ACC-10021',
    customerName: 'Evelyn Harper',
    type: 'DEPOSIT',
    amount: 10250,
    currency: 'USD',
    timestamp: '2026-07-07 09:08',
    status: 'COMPLETED',
    merchant: 'Federal Bank',
    location: 'San Francisco, CA',
    riskFactor: 'LOW'
  }
];

export const loans = [
  {
    id: 'LN-4361',
    customerName: 'Marcus Quinn',
    category: 'BUSINESS',
    amount: 185000,
    interestRate: 4.2,
    termMonths: 84,
    emi: 2810,
    remainingBalance: 154300,
    nextDueDate: '2026-07-15',
    status: 'ACTIVE',
    riskRating: 'B',
    recoveredAmount: 30700
  }
];

export const branches = [
  {
    id: 'BR-01',
    name: 'Downtown',
    city: 'San Francisco',
    manager: 'Julian Ramirez',
    customerCount: 2120,
    activeLoans: 420,
    totalDeposits: 1840000,
    totalRevenue: 725000,
    transactionCount: 53200,
    growthRate: 8.3
  }
];

export const fraudAlerts = [
  {
    id: 'FA-0101',
    transactionId: 'TX-0971',
    customerName: 'Sophie Reed',
    amount: 6400,
    type: 'HIGH_VALUE',
    timestamp: '2026-07-06 17:55',
    riskScore: 83,
    status: 'OPEN',
    details: 'High-value transaction over regional threshold flagged for review.'
  }
];

export const monitoring = {
  connected: false,
  mode: 'SIMULATED_STATE_ENGINE',
  account: 'AIS_DEMO_ACCOUNT.SNOWFLAKE',
  database: 'ENTERPRISE_BANKING_DB',
  schema: 'BANKING_SCHEMA',
  warehouses: [
    { name: 'BANKING_ANALYTICS_WH', state: 'STARTED', size: 'MEDIUM', creditsPerHour: 9.6, autoSuspendMin: 10, activeQueries: 2, queuedQueries: 0 }
  ],
  creditUsageMonth: 124.5,
  storageGbUsed: 485.2,
  timeTravelRetentionDays: 14,
  activePipes: 1,
  activeTasks: 1,
  activeStreams: 1
};

export const queryHistory = [
  {
    id: 'LOG-9921',
    queryText: 'SELECT * FROM SECURE_CUSTOMER_ANALYTICS LIMIT 10;',
    user: 'compliance_officer',
    role: 'ANALYST',
    timestamp: '2026-07-03 10:10:02',
    durationMs: 45,
    status: 'SUCCESS',
    rowsCount: 10
  }
];

export const securityRoles = [
  { role: 'BANKING_ADMIN', parent: 'SYSADMIN', usersCount: 2, grantsCount: 42, privilegeLevel: 'Full Ownership' },
  { role: 'BANKING_DATA_ENGINEER', parent: 'BANKING_ADMIN', usersCount: 4, grantsCount: 28, privilegeLevel: 'Schema Modify + Create Stage' },
  { role: 'BANKING_ANALYST', parent: 'BANKING_DATA_ENGINEER', usersCount: 15, grantsCount: 12, privilegeLevel: 'SELECT on compliance views' },
  { role: 'BANKING_BUSINESS_USER', parent: 'BANKING_ANALYST', usersCount: 120, grantsCount: 4, privilegeLevel: 'SELECT on general KPI tables' }
];

export const securityGrants = [
  { privilege: 'USAGE', objectType: 'DATABASE', objectName: 'ENTERPRISE_BANKING_DB', grantee: 'BANKING_BUSINESS_USER' },
  { privilege: 'USAGE', objectType: 'SCHEMA', objectName: 'BANKING_SCHEMA', grantee: 'BANKING_BUSINESS_USER' },
  { privilege: 'SELECT', objectType: 'TABLE', objectName: 'CUSTOMERS', grantee: 'BANKING_ANALYST' },
  { privilege: 'SELECT', objectType: 'VIEW', objectName: 'SECURE_CUSTOMER_ANALYTICS', grantee: 'BANKING_ANALYST' },
  { privilege: 'ALL PRIVILEGES', objectType: 'SCHEMA', objectName: 'BANKING_SCHEMA', grantee: 'BANKING_DATA_ENGINEER' }
];

export const uploadResult = {
  message: 'COPY INTO execution simulated successfully',
  details: {
    id: 'LD-404',
    fileName: 'customers_q3_2026.csv',
    format: 'CSV',
    stage: '@INTERNAL_INGEST_STAGE',
    status: 'LOADED',
    rowsLoaded: 1245,
    errors: 0,
    timestamp: '2026-07-07 11:22'
  }
};

export const defaultAiSql = {
  sql: "SELECT c.name, SUM(t.amount) as total_deposits FROM CUSTOMERS c JOIN ACCOUNTS a ON c.customer_id = a.customer_id JOIN TRANSACTIONS t ON a.account_number = t.account_number WHERE t.transaction_type = 'DEPOSIT' GROUP BY c.name ORDER BY total_deposits DESC;"
};

export const cloneResult = {
  message: "Zero-Copy Clone 'CUSTOMERS_BACKUP_STAGE' of table 'CUSTOMERS' created successfully in Snowflake.",
  durationMs: 15
};

export const timeTravelResult = {
  message: 'Time Travel snapshot compiled. Retrieved dataset from 10 minutes ago.',
  offsetMinutes: 10
};
