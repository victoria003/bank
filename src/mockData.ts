import { ExecutiveMetrics, CustomerProfile, TransactionRecord, LoanRecord, BranchRecord, FraudAlert, WarehouseMetrics, SnowflakeFeature } from './types';

// Zeroed analytics metrics (removed sample data)
export const mockExecutiveMetrics: ExecutiveMetrics = {
  totalCustomers: 0,
  totalAccounts: 0,
  totalTransactions: 0,
  totalLoans: 0,
  totalRevenue: 0,
  totalBranches: 0,
  activeLoans: 0,
  highRiskTransactions: 0,
  dailyTransactions: [],
  monthlyRevenue: [],
  recentActivities: []
};

// Empty customer portfolio directory
export const mockCustomers: CustomerProfile[] = [];

// Empty transaction records ledger
export const mockTransactions: TransactionRecord[] = [];

// Empty active loans tracker
export const mockLoans: LoanRecord[] = [];

// Empty branch footprint list
export const mockBranches: BranchRecord[] = [];

// Empty risk compliance fraud alerts list
export const mockFraudAlerts: FraudAlert[] = [];

// Empty Snowflake warehouses metrics (will load dynamically when connected)
export const mockWarehouses: WarehouseMetrics[] = [];

// Reference directory explaining core architectural features of the platform integration
export const mockSnowflakeFeatures: SnowflakeFeature[] = [
  {
    id: 'feat-01',
    name: 'Secure Views (Customer PII)',
    category: 'DATA_ENGINEERING',
    status: 'ACTIVE',
    description: 'Masks sensitive customer SSN, credit cards, and addresses from normal analysts while allowing access for verified compliance managers.',
    sqlTemplate: 'CREATE OR REPLACE SECURE VIEW SECURE_CUSTOMER_ANALYTICS AS\nSELECT id, name, email, REGEXP_REPLACE(phone, \'\\\\d{3}-\\\\d{3}-\', \'***-***-\') as masked_phone, risk_score FROM raw_customers;'
  },
  {
    id: 'feat-02',
    name: 'Dynamic Tables (Real-Time Ingestion)',
    category: 'DATA_ENGINEERING',
    status: 'SIMULATED',
    description: 'Automatically materializes query results with specified target lag (e.g. 1 minute) to process continuous transaction flows.',
    sqlTemplate: 'CREATE OR REPLACE DYNAMIC TABLE dt_daily_fraud_alerts\nTARGET_LAG = \'1 minute\'\nWAREHOUSE = BANKING_ANALYTICS_WH\nAS\nSELECT transaction_id, customer_name, amount, risk_score\nFROM transactions_stream_tbl\nWHERE risk_score > 80;'
  },
  {
    id: 'feat-03',
    name: 'Snowflake Time Travel',
    category: 'RECOVERY',
    status: 'ACTIVE',
    description: 'Queries older states of tables within a retention period of up to 90 days. Restores dropped records or tables instantly.',
    sqlTemplate: 'SELECT * FROM raw_transactions AT(OFFSET => -60*10); -- Go back 10 minutes ago\n-- UNDROP TABLE raw_transactions;'
  },
  {
    id: 'feat-04',
    name: 'Zero-Copy Cloning',
    category: 'RECOVERY',
    status: 'ACTIVE',
    description: 'Clones tables, schemas, or entire databases instantly without duplicating physical storage blocks, ideal for sandboxed testing.',
    sqlTemplate: 'CREATE OR REPLACE TABLE raw_transactions_backup CLONE raw_transactions;\n-- Backups and test beds created in milliseconds.'
  },
  {
    id: 'feat-05',
    name: 'Cortex AI LLM Functions',
    category: 'AI_ML',
    status: 'ACTIVE',
    description: 'Utilize Snowflake Cortex AI built-in serverless functions like SNOWFLAKE.CORTEX.COMPLETE or SENTIMENT to extract insights instantly from transactions.',
    sqlTemplate: 'SELECT transaction_id, SNOWFLAKE.CORTEX.SUMMARIZE(details) as summary_memo\nFROM fraud_audit_logs\nWHERE risk_score > 75;'
  },
  {
    id: 'feat-06',
    name: 'Row-Access Masking Policies',
    category: 'SECURITY',
    status: 'ACTIVE',
    description: 'Enforces database column masking based on executing roles or session values to satisfy strict GDPR/HIPAA compliance standards.',
    sqlTemplate: 'CREATE OR REPLACE MASKING POLICY ssn_mask AS (val string)\nRETURNS string ->\nCASE WHEN CURRENT_ROLE() IN (\'ADMIN\', \'COMPLIANCE\') THEN val\nELSE \'***-**-\' || RIGHT(val, 4) END;'
  }
];
