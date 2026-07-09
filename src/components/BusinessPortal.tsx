import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, ArrowUpRight, ArrowDownRight, Landmark, CreditCard,
  Search, ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, BarChart2,
  SlidersHorizontal, ChevronRight, MapPin, DollarSign, PieChart, Info
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { User, ExecutiveMetrics, CustomerProfile, TransactionRecord, LoanRecord, BranchRecord, FraudAlert } from '../types';
import apiPath from '../api';

import CustomersManager from './crud/CustomersManager';
import AccountsManager from './crud/AccountsManager';
import TransactionsManager from './crud/TransactionsManager';
import LoansManager from './crud/LoansManager';
import BranchesManager from './crud/BranchesManager';
import FraudAlertsManager from './crud/FraudAlertsManager';

interface BusinessPortalProps {
  user: User;
  token: string;
}

export default function BusinessPortal({ user, token }: BusinessPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'accounts' | 'transactions' | 'loans' | 'branches' | 'fraud'>('dashboard');
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loans, setLoanRecords] = useState<LoanRecord[]>([]);
  const [branches, setBranchRecords] = useState<BranchRecord[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  
  // Filters
  const [custSearch, setCustSearch] = useState('');
  const [custSegment, setCustSegment] = useState('ALL');
  const [txType, setTxType] = useState('ALL');
  const [txRisk, setTxRisk] = useState('ALL');
  const [loanCategory, setLoanCategory] = useState('ALL');
  const [loanRating, setLoanRating] = useState('ALL');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial analytical datasets
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [resMetrics, resCust, resAccounts, resTx, resLoans, resBranches, resFraud] = await Promise.all([
        fetch(apiPath('/api/business/dashboard'), { headers }),
        fetch(apiPath('/api/business/customers'), { headers }),
        fetch(apiPath('/api/business/accounts'), { headers }),
        fetch(apiPath('/api/business/transactions'), { headers }),
        fetch(apiPath('/api/business/loans'), { headers }),
        fetch(apiPath('/api/business/branches'), { headers }),
        fetch(apiPath('/api/business/fraud-alerts'), { headers })
      ]);

      const [dataMetrics, dataCust, dataAccounts, dataTx, dataLoans, dataBranches, dataFraud] = await Promise.all([
        resMetrics.json(),
        resCust.json(),
        resAccounts.json(),
        resTx.json(),
        resLoans.json(),
        resBranches.json(),
        resFraud.json()
      ]);

      setMetrics(dataMetrics);
      setCustomers(dataCust);
      setAccounts(Array.isArray(dataAccounts) ? dataAccounts : []);
      setTransactions(dataTx);
      setLoanRecords(dataLoans);
      setBranchRecords(dataBranches);
      setFraudAlerts(dataFraud);
    } catch (err) {
      console.error(err);
      setError('Failed to refresh analytics from system server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Utility to format large values
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div id="business_portal" className="flex flex-col min-h-screen bg-slate-900 text-slate-100">
      
      {/* Portal Inner Header / Sub-Nav Bar */}
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
              Enterprise Portal
            </span>
            <span className="text-xs text-slate-500 font-mono">/ Business Intelligence Suite</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight mt-1">Commercial Banking Analytics</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            <span className="text-xs font-medium">Sync Engine</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="bg-slate-950/40 border-b border-slate-800/80 px-6 py-1 flex overflow-x-auto gap-2">
        {(['dashboard', 'customers', 'accounts', 'transactions', 'loans', 'branches', 'fraud'] as const).filter((tab) => {
          if (user.role === 'BANKING_BUSINESS_USER' || user.role === 'BUSINESS_USER') {
            return tab === 'dashboard';
          }
          return true;
        }).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              {tab === 'fraud' ? '🚨 Fraud Hub' : tab === 'accounts' ? '💳 Accounts Registry' : label + ' Analytics'}
            </button>
          );
        })}
      </div>

      {/* Core Portal Body */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {error && (
          <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 6. RECORDS MANAGER SUB-VIEW */}
        {activeTab === 'records' && (
          <div className="space-y-6 animate-fade-in">
            <RecordsManager token={token} />
          </div>
        )}

        {/* 1. EXECUTIVE DASHBOARD SUB-VIEW */}
        {activeTab === 'dashboard' && metrics && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Customers</span>
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black mt-2 text-slate-100">{metrics.totalCustomers.toLocaleString()}</div>
                <div className="text-[10px] text-emerald-400 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> +4.2% Month
                </div>
              </div>

              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Deposits</span>
                  <Landmark className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black mt-2 text-slate-100">{formatUSD(metrics.totalRevenue)}</div>
                <div className="text-[10px] text-emerald-400 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> +8.1% Growth
                </div>
              </div>

              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Transactions</span>
                  <CreditCard className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black mt-2 text-slate-100">{metrics.totalTransactions.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">Avg 12k daily</div>
              </div>

              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Loans</span>
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black mt-2 text-slate-100">{metrics.activeLoans}</div>
                <div className="text-[10px] text-emerald-400 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> 79% Recovery
                </div>
              </div>

              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Fraud Alerts</span>
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                </div>
                <div className="text-2xl font-black mt-2 text-rose-500">{metrics.highRiskTransactions}</div>
                <div className="text-[10px] text-rose-400 flex items-center mt-1">
                  <AlertTriangle className="h-3 w-3 inline mr-0.5" /> 3 Open Incidents
                </div>
              </div>

              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Branches</span>
                  <MapPin className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black mt-2 text-slate-100">{metrics.totalBranches}</div>
                <div className="text-[10px] text-slate-500 mt-1">3 Metropolitan Zones</div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Chart 1 */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Monthly Platform Growth</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                      <Bar name="Total Revenue ($)" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="Transactions Count" dataKey="transactions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2 */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Daily Ingestion Frequency</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.dailyTransactions}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" name="Transactions count" dataKey="count" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Live Feed */}
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Platform Ingestion Activities Feed</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Reference ID</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Customer Entity</th>
                      <th className="p-3">Amount (USD)</th>
                      <th className="p-3">Logged Date</th>
                      <th className="p-3">Ingest Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {metrics.recentActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-slate-300">{act.id}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            act.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            act.type === 'WITHDRAWAL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {act.type}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-200">{act.customer}</td>
                        <td className="p-3 font-mono font-semibold text-slate-300">{formatUSD(act.amount)}</td>
                        <td className="p-3 text-slate-500">{act.timestamp}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center w-max gap-1 ${
                            act.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${act.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                            {act.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. CUSTOMER ANALYTICS SUB-VIEW */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-fade-in">
            <CustomersManager
              token={token}
              user={user}
              customers={customers}
              branches={branches}
              isLoading={isLoading}
              onRefresh={fetchData}
              custSearch={custSearch}
              setCustSearch={setCustSearch}
              custSegment={custSegment}
              setCustSegment={setCustSegment}
            />
          </div>
        )}

        {/* 2.5. ACCOUNTS REGISTRY SUB-VIEW */}
        {activeTab === 'accounts' && (
          <div className="space-y-6 animate-fade-in">
            <AccountsManager
              token={token}
              user={user}
              accounts={accounts}
              customers={customers}
              isLoading={isLoading}
              onRefresh={fetchData}
            />
          </div>
        )}

        {/* 3. TRANSACTION ANALYTICS SUB-VIEW */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-fade-in">
            <TransactionsManager
              token={token}
              user={user}
              transactions={transactions}
              accounts={accounts}
              isLoading={isLoading}
              onRefresh={fetchData}
              txSearch={txSearch}
              setTxSearch={setTxSearch}
              txType={txType}
              setTxType={setTxType}
              txRisk={txRisk}
              setTxRisk={setTxRisk}
            />
          </div>
        )}

        {/* 4. LOAN PORTFOLIO SUB-VIEW */}
        {activeTab === 'loans' && (
          <div className="space-y-6 animate-fade-in">
            <LoansManager
              token={token}
              user={user}
              loans={loans}
              customers={customers}
              isLoading={isLoading}
              onRefresh={fetchData}
              loanCategory={loanCategory}
              setLoanCategory={setLoanCategory}
              loanRating={loanRating}
              setLoanRating={setLoanRating}
            />
          </div>
        )}

        {/* 5. BRANCH PERFORMANCE SUB-VIEW */}
        {activeTab === 'branches' && (
          <div className="space-y-6 animate-fade-in">
            <BranchesManager
              token={token}
              user={user}
              branches={branches}
              isLoading={isLoading}
              onRefresh={fetchData}
            />
          </div>
        )}

        {/* 6. FRAUD DETECTION HUB SUB-VIEW */}
        {activeTab === 'fraud' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-rose-950/20 border border-rose-800/60 rounded-xl flex items-start gap-3.5">
              <ShieldAlert className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-300 uppercase tracking-wider">Enterprise Compliance Threat Detection</h4>
                <p className="text-xs text-rose-400/80 leading-relaxed mt-1">
                  Red alerts signify automated Snowflake Stream velocity limit exceptions, high-value transfer anomalies, or geographic transaction triggers. These require instant escalation under regulatory policies.
                </p>
              </div>
            </div>

            <FraudAlertsManager
              token={token}
              user={user}
              fraudAlerts={fraudAlerts}
              customers={customers}
              transactions={transactions}
              isLoading={isLoading}
              onRefresh={fetchData}
            />
          </div>
        )}

      </div>
    </div>
  );
}
