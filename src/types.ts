/**
 * Type declarations for the Banking Analytics Platform
 */

export type UserRole = 'BANKING_ADMIN' | 'BANKING_DATA_ENGINEER' | 'BANKING_ANALYST' | 'BANKING_BUSINESS_USER';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface ExecutiveMetrics {
  totalCustomers: number;
  totalAccounts: number;
  totalTransactions: number;
  totalLoans: number;
  totalRevenue: number;
  totalBranches: number;
  activeLoans: number;
  highRiskTransactions: number;
  dailyTransactions: { date: string; count: number; amount: number }[];
  monthlyRevenue: { month: string; revenue: number; transactions: number }[];
  recentActivities: {
    id: string;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'LOAN_EMI' | 'NEW_ACCOUNT';
    customer: string;
    amount: number;
    timestamp: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
  }[];
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  segment: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  lifetimeValue: number;
  branch: string;
  riskScore: number; // 0 to 100
  joinedDate: string;
  accounts: {
    accountNumber: string;
    type: 'CHECKING' | 'SAVINGS' | 'LOAN' | 'CREDIT';
    balance: number;
    status: 'ACTIVE' | 'DORMANT' | 'FROZEN';
  }[];
}

export interface TransactionRecord {
  id: string;
  accountNumber: string;
  customerName: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'CREDIT_CARD' | 'LOAN_EMI' | 'NEW_ACCOUNT';
  amount: number;
  currency: string;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REJECTED';
  merchant?: string;
  location?: string;
  riskFactor: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface LoanRecord {
  id: string;
  customerName: string;
  category: 'HOME' | 'AUTO' | 'PERSONAL' | 'BUSINESS' | 'EDUCATION';
  amount: number;
  interestRate: number;
  termMonths: number;
  emi: number;
  remainingBalance: number;
  nextDueDate: string;
  status: 'ACTIVE' | 'DELINQUENT' | 'FULLY_PAID' | 'DISBURSED';
  riskRating: 'A' | 'B' | 'C' | 'D' | 'E'; // E is highest risk
  recoveredAmount: number;
}

export interface BranchRecord {
  id: string;
  name: string;
  city: string;
  manager: string;
  customerCount: number;
  activeLoans: number;
  totalDeposits: number;
  totalRevenue: number;
  transactionCount: number;
  growthRate: number;
}

export interface FraudAlert {
  id: string;
  transactionId: string;
  customerName: string;
  amount: number;
  type: 'VELOCITY_LIMIT' | 'HIGH_VALUE' | 'GEOGRAPHIC_ANOMALY' | 'DUPLICATE_TX';
  timestamp: string;
  riskScore: number;
  status: 'OPEN' | 'INVESTIGATING' | 'DISMISSED' | 'CONFIRMED';
  details: string;
}

export interface SQLQueryLog {
  id: string;
  queryText: string;
  user: string;
  role: string;
  timestamp: string;
  durationMs: number;
  status: 'SUCCESS' | 'ERROR';
  rowsCount?: number;
  errorMessage?: string;
}

export interface WarehouseMetrics {
  name: string;
  state: 'STARTED' | 'SUSPENDED' | 'RESIZING';
  size: 'X-SMALL' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'X-LARGE';
  creditsPerHour: number;
  autoSuspendMin: number;
  activeQueries: number;
  queuedQueries: number;
}

export interface SnowflakeFeature {
  id: string;
  name: string;
  category: 'DATA_ENGINEERING' | 'SECURITY' | 'RECOVERY' | 'MONITORING' | 'AI_ML';
  status: 'ACTIVE' | 'SIMULATED' | 'SUPPORTED';
  description: string;
  sqlTemplate: string;
}
