-- ============================================================================
-- SNOWFLAKE SETUP & BOOTSTRAP SCRIPT
-- Enterprise Banking Analytics Platform
-- ============================================================================

-- 1. DATABASE & SCHEMA SETUP
CREATE OR REPLACE DATABASE ENTERPRISE_BANKING_DB;
CREATE OR REPLACE SCHEMA ENTERPRISE_BANKING_DB.BANKING_SCHEMA;

USE DATABASE ENTERPRISE_BANKING_DB;
USE SCHEMA BANKING_SCHEMA;

-- 2. WAREHOUSES CREATION
CREATE OR REPLACE WAREHOUSE BANKING_ANALYTICS_WH 
  WITH WAREHOUSE_SIZE = 'SMALL' 
  AUTO_SUSPEND = 300 
  AUTO_RESUME = TRUE 
  INITIALLY_SUSPENDED = TRUE;

CREATE OR REPLACE WAREHOUSE DATA_INGEST_WH 
  WITH WAREHOUSE_SIZE = 'SMALL' 
  AUTO_SUSPEND = 180 
  AUTO_RESUME = TRUE 
  INITIALLY_SUSPENDED = TRUE;

-- 3. ROLE HIERARCHY & COMPLIANCE SETUP
-- Create custom banking roles
CREATE OR REPLACE ROLE BANKING_ADMIN;
CREATE OR REPLACE ROLE BANKING_DATA_ENGINEER;
CREATE OR REPLACE ROLE BANKING_ANALYST;
CREATE OR REPLACE ROLE BANKING_BUSINESS_USER;

-- Setup inheritance hierarchy
GRANT ROLE BANKING_BUSINESS_USER TO ROLE BANKING_ANALYST;
GRANT ROLE BANKING_ANALYST TO ROLE BANKING_DATA_ENGINEER;
GRANT ROLE BANKING_DATA_ENGINEER TO ROLE BANKING_ADMIN;
GRANT ROLE BANKING_ADMIN TO ROLE SYSADMIN;

-- Grant database & schema access
GRANT USAGE ON DATABASE ENTERPRISE_BANKING_DB TO ROLE BANKING_BUSINESS_USER;
GRANT USAGE ON SCHEMA ENTERPRISE_BANKING_DB.BANKING_SCHEMA TO ROLE BANKING_BUSINESS_USER;
GRANT USAGE ON WAREHOUSE BANKING_ANALYTICS_WH TO ROLE BANKING_BUSINESS_USER;

-- Analysts get select permission on general views
GRANT SELECT ON ALL VIEWS IN SCHEMA ENTERPRISE_BANKING_DB.BANKING_SCHEMA TO ROLE BANKING_ANALYST;

-- Data Engineers get full modification, pipe, stream and stage controls
GRANT ALL PRIVILEGES ON DATABASE ENTERPRISE_BANKING_DB TO ROLE BANKING_DATA_ENGINEER;
GRANT USAGE ON WAREHOUSE DATA_INGEST_WH TO ROLE BANKING_DATA_ENGINEER;

-- 4. CORE ENTERPRISE TABLE SCHEMAS

-- Customers table
CREATE OR REPLACE TABLE CUSTOMERS (
  customer_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(50),
  segment VARCHAR(20) DEFAULT 'SILVER', -- PLATINUM, GOLD, SILVER, BRONZE
  lifetime_value NUMBER(15, 2) DEFAULT 0.00,
  branch_name VARCHAR(100),
  risk_score NUMBER(3, 0) DEFAULT 0, -- 0-100 (high is riskier)
  joined_date DATE DEFAULT CURRENT_DATE()
);

-- Accounts table
CREATE OR REPLACE TABLE ACCOUNTS (
  account_number VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES CUSTOMERS(customer_id),
  account_type VARCHAR(30), -- CHECKING, SAVINGS, LOAN, CREDIT
  balance NUMBER(15, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'ACTIVE' -- ACTIVE, DORMANT, FROZEN
);

-- Transactions table
CREATE OR REPLACE TABLE TRANSACTIONS (
  transaction_id VARCHAR(50) PRIMARY KEY,
  account_number VARCHAR(50) REFERENCES ACCOUNTS(account_number),
  amount NUMBER(15, 2) NOT NULL,
  transaction_type VARCHAR(30), -- DEPOSIT, WITHDRAWAL, TRANSFER, CREDIT_CARD
  currency VARCHAR(10) DEFAULT 'USD',
  merchant_name VARCHAR(100),
  location VARCHAR(100),
  risk_factor VARCHAR(20) DEFAULT 'LOW', -- LOW, MEDIUM, HIGH
  status VARCHAR(20) DEFAULT 'COMPLETED', -- COMPLETED, PENDING, FAILED
  timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Loans table
CREATE OR REPLACE TABLE LOANS (
  loan_id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES CUSTOMERS(customer_id),
  category VARCHAR(30), -- HOME, AUTO, PERSONAL, BUSINESS
  amount NUMBER(15, 2) NOT NULL,
  interest_rate NUMBER(5, 2) NOT NULL,
  term_months NUMBER(3, 0) NOT NULL,
  emi NUMBER(15, 2) NOT NULL,
  remaining_balance NUMBER(15, 2) NOT NULL,
  recovered_amount NUMBER(15, 2) DEFAULT 0.00,
  next_due_date DATE,
  risk_rating VARCHAR(5) DEFAULT 'A', -- A, B, C, D, E (E is delinquent)
  status VARCHAR(20) DEFAULT 'ACTIVE' -- ACTIVE, DELINQUENT, FULLY_PAID
);

-- Branch Performance table
CREATE OR REPLACE TABLE BRANCH_PERFORMANCE (
  branch_id VARCHAR(50) PRIMARY KEY,
  branch_name VARCHAR(100) UNIQUE,
  city VARCHAR(100),
  manager VARCHAR(100),
  customer_count NUMBER(10, 0) DEFAULT 0,
  active_loans NUMBER(10, 0) DEFAULT 0,
  total_deposits NUMBER(15, 2) DEFAULT 0.00,
  total_revenue NUMBER(15, 2) DEFAULT 0.00,
  transaction_count NUMBER(15, 0) DEFAULT 0,
  growth_rate NUMBER(5, 2) DEFAULT 0.00
);

-- Fraud Alerts table
CREATE OR REPLACE TABLE FRAUD_ALERTS (
  alert_id VARCHAR(50) PRIMARY KEY,
  transaction_id VARCHAR(50) REFERENCES TRANSACTIONS(transaction_id),
  customer_id VARCHAR(50) REFERENCES CUSTOMERS(customer_id),
  amount NUMBER(15, 2),
  alert_type VARCHAR(50), -- VELOCITY_LIMIT, HIGH_VALUE, GEOGRAPHIC_ANOMALY
  timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  risk_score NUMBER(3, 0),
  status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, INVESTIGATING, DISMISSED, CONFIRMED
  details VARCHAR(500)
);

-- 5. ADVANCED DATA ENGINEERING IMPLEMENTATIONS

-- Secure View (Anonymized PII for Analysts)
CREATE OR REPLACE SECURE VIEW SECURE_CUSTOMER_ANALYTICS AS
SELECT 
  customer_id,
  -- Mask the name for general analysts
  REGEXP_REPLACE(name, '^(.).*(.)$', '\\1*****\\2') as masked_name,
  -- Mask email domain but keep structure
  REGEXP_REPLACE(email, '(?i)^[A-Z0-9._%+-]+@', '*****@') as masked_email,
  -- Retain analytical aggregations
  segment,
  lifetime_value,
  branch_name,
  risk_score,
  joined_date
FROM CUSTOMERS;

-- Row access policy (Strict state segregation)
CREATE OR REPLACE ROW ACCESS POLICY branch_row_policy 
  AS (branch VARCHAR) RETURNS BOOLEAN ->
  CURRENT_ROLE() IN ('BANKING_ADMIN', 'BANKING_DATA_ENGINEER') 
  OR branch = 'Silicon Valley Branch' -- or use CURRENT_USER_BRANCH mapping
;

-- Materialized View (Daily transaction volumes by branch)
-- Useful to speed up query response on dashboards
CREATE OR REPLACE MATERIALIZED VIEW MV_DAILY_BRANCH_AGGREGATIONS AS
SELECT 
  TRUNC(t.timestamp) as transaction_date,
  c.branch_name,
  COUNT(t.transaction_id) as daily_count,
  SUM(t.amount) as daily_amount
FROM TRANSACTIONS t
JOIN ACCOUNTS a ON t.account_number = a.account_number
JOIN CUSTOMERS c ON a.customer_id = c.customer_id
GROUP BY 1, 2;

-- Streams (Track real-time transactions changes)
CREATE OR REPLACE STREAM TRANSACTIONS_STREAM ON TABLE TRANSACTIONS;

-- Tasks (Run batch consolidation scripts every hour)
CREATE OR REPLACE TASK CONSOLIDATE_TRANSACTIONS_TASK
  WAREHOUSE = BANKING_ANALYTICS_WH
  SCHEDULE = 'USING CRON 0 * * * * UTC' -- Every hour
AS
  INSERT INTO BRANCH_PERFORMANCE (branch_id, branch_name, total_deposits)
  SELECT 'BR-SV', 'Silicon Valley Branch', SUM(balance)
  FROM ACCOUNTS WHERE status = 'ACTIVE';

-- Resume Task
-- ALTER TASK CONSOLIDATE_TRANSACTIONS_TASK RESUME;

-- Stored Procedure: JavaScript implementation
CREATE OR REPLACE PROCEDURE PROCESS_PROMO_UPGRADE(customer_id_val VARCHAR)
RETURNS STRING
LANGUAGE JAVASCRIPT
EXECUTE AS OWNER
AS
$$
  var sql = "UPDATE CUSTOMERS SET segment = 'PLATINUM', lifetime_value = lifetime_value + 100000 WHERE customer_id = '" + CUSTOMER_ID_VAL + "'";
  var statement = snowflake.createStatement({sqlText: sql});
  statement.execute();
  return "Successfully upgraded customer " + CUSTOMER_ID_VAL + " to Platinum.";
$$;

-- Stored Procedure: Python implementation (Snowpark runtime)
CREATE OR REPLACE PROCEDURE ASSESS_CREDIT_RISK_PY(cust_id VARCHAR)
RETURNS FLOAT
LANGUAGE PYTHON
RUNTIME_VERSION = '3.8'
PACKAGES = ('snowflake-snowpark-python')
HANDLER = 'main'
AS
$$
def main(session, cust_id: str):
    # Retrieve customer risk score
    df = session.table("CUSTOMERS").filter(session.custom_expression(f"customer_id = '{cust_id}'"))
    risk_score = df.select("risk_score").collect()[0][0]
    return float(risk_score * 1.25)
$$;

-- SQL User-Defined Function (UDF)
CREATE OR REPLACE FUNCTION CALCULATE_ESTIMATED_TAX(amount FLOAT)
RETURNS FLOAT
AS
$$
  amount * 0.15
$$;

-- 6. SECURITY & DATA GOVERNANCE POLICIES

-- Masking Policy for SSN/Phone number column
CREATE OR REPLACE MASKING POLICY phone_mask AS (val string)
  RETURNS string ->
  CASE 
    WHEN CURRENT_ROLE() IN ('BANKING_ADMIN', 'BANKING_DATA_ENGINEER') THEN val
    ELSE '***-***-' || RIGHT(val, 4)
  END;

-- Apply Masking Policy
-- ALTER TABLE CUSTOMERS MODIFY COLUMN phone SET MASKING POLICY phone_mask;

-- Object Tags (Governance)
CREATE OR REPLACE TAG CONFIDENTIALITY_LEVEL_CONFIDENTIAL;
-- ALTER TABLE CUSTOMERS SET TAG CONFIDENTIALITY_LEVEL_CONFIDENTIAL = 'PII_HIGH';

-- 7. RECOVERY SYSTEMS (Time Travel & Zero-Copy Clone)
-- Keep data for 14 days (Enterprise-grade)
ALTER TABLE TRANSACTIONS SET DATA_RETENTION_TIME_IN_DAYS = 14;

-- Zero-copy database cloning for staging/backups
-- CREATE OR REPLACE DATABASE ENTERPRISE_BANKING_STAGING CLONE ENTERPRISE_BANKING_DB;

-- 8. CORTEX AI - LLM SUGGESTIONS READY
-- Run summary analyses on fraud incidents
-- SELECT 
--   alert_id, 
--   SNOWFLAKE.CORTEX.SUMMARIZE(details) as ai_summary,
--   SNOWFLAKE.CORTEX.SENTIMENT(details) as threat_vibe
-- FROM FRAUD_ALERTS;
