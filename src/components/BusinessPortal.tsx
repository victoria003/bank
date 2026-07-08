import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, ArrowUpRight, ArrowDownRight, Landmark, CreditCard,
  Search, ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, BarChart2,
  SlidersHorizontal, ChevronRight, MapPin, DollarSign, PieChart, Info
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { User, ExecutiveMetrics, CustomerProfile, TransactionRecord, LoanRecord, BranchRecord, FraudAlert } from '../types';
import RecordsManager from './RecordsManager';

interface BusinessPortalProps {
  user: User;
  token: string;
}

export default function BusinessPortal({ user, token }: BusinessPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'transactions' | 'loans' | 'branches' | 'fraud' | 'records'>('dashboard');
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
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
      
      import('../api').then(({ default: apiPath }) => {});
      const [resMetrics, resCust, resTx, resLoans, resBranches, resFraud] = await Promise.all([
        fetch((await import('../api')).default('/api/business/dashboard'), { headers }),
        fetch((await import('../api')).default(`/api/business/customers?search=${custSearch}&segment=${custSegment}`), { headers }),
        fetch((await import('../api')).default(`/api/business/transactions?type=${txType}&risk=${txRisk}`), { headers }),
        fetch((await import('../api')).default(`/api/business/loans?category=${loanCategory}&rating=${loanRating}`), { headers }),
        fetch((await import('../api')).default('/api/business/branches'), { headers }),
        fetch((await import('../api')).default('/api/business/fraud-alerts'), { headers })
      ]);

      const [dataMetrics, dataCust, dataTx, dataLoans, dataBranches, dataFraud] = await Promise.all([
        resMetrics.json(),
        resCust.json(),
        resTx.json(),
        resLoans.json(),
        resBranches.json(),
        resFraud.json()
      ]);

      setMetrics(dataMetrics);
      setCustomers(dataCust);
      setTransactions(dataTx);
      setLoans(dataLoans);
      setBranches(dataBranches);
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
  }, [custSearch, custSegment, txType, txRisk, loanCategory, loanRating]);

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
        {(['dashboard', 'customers', 'transactions', 'loans', 'branches', 'fraud', 'records'] as const).map((tab) => {
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
              {tab === 'fraud' ? '🚨 Fraud Hub' : tab === 'records' ? 'Records' : label + ' Analytics'}
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
            {/* Search & Filter bar */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Query customer registry by name, email, or customer ID..."
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <span className="text-xs text-slate-400 flex items-center font-semibold uppercase gap-1 shrink-0">
                  <SlidersHorizontal className="h-4.5 w-4.5" /> Filter Segment:
                </span>
                <select
                  value={custSegment}
                  onChange={(e) => setCustSegment(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Segments</option>
                  <option value="PLATINUM">💎 Platinum Tier</option>
                  <option value="GOLD">🥇 Gold Tier</option>
                  <option value="SILVER">🥈 Silver Tier</option>
                  <option value="BRONZE">🥉 Bronze Tier</option>
                </select>
              </div>
            </div>

            {/* Customers Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {customers.map((c) => (
                <div key={c.id} className="p-5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                        {c.name}
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          c.segment === 'PLATINUM' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                          c.segment === 'GOLD' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          c.segment === 'SILVER' ? 'bg-slate-400/10 text-slate-300 border border-slate-400/20' :
                          'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {c.segment}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{c.id} • Registered {c.joinedDate}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-mono">Platform LTV</div>
                      <div className="font-bold text-emerald-400 text-sm">{formatUSD(c.lifetimeValue)}</div>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/50 rounded-lg text-[11px] border border-slate-800/40">
                    <div>
                      <span className="text-slate-500 block">Email Address</span>
                      <span className="text-slate-300 font-medium">{c.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Mobile Phone</span>
                      <span className="text-slate-300 font-medium font-mono">{c.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Assigned Center</span>
                      <span className="text-slate-300 font-medium">{c.branch}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Security Risk Profiling</span>
                      <span className={`font-bold ${
                        c.riskScore > 75 ? 'text-rose-500' : c.riskScore > 40 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {c.riskScore}/100 Risk Rating
                      </span>
                    </div>
                  </div>

                  {/* Customer Bank Accounts List */}
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Connected Bank Accounts</h5>
                    <div className="space-y-1.5">
                      {c.accounts.map((acc) => (
                        <div key={acc.accountNumber} className="flex justify-between items-center text-xs p-2 bg-slate-900/30 rounded border border-slate-800/30">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400">{acc.accountNumber}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-300 font-mono uppercase">{acc.type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-200">{formatUSD(acc.balance)}</span>
                            <span className={`h-1.5 w-1.5 rounded-full ${acc.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'}`} title={acc.status}></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {customers.length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-500 bg-slate-950 border border-slate-800 rounded-xl">No customer records matching criteria.</div>
              )}
            </div>
          </div>
        )}

        {/* 3. TRANSACTION ANALYTICS SUB-VIEW */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-fade-in">
            {/* Filters Bar */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase">Tx Type:</span>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                >
                  <option value="ALL">All Transactions</option>
                  <option value="DEPOSIT">Deposits Only</option>
                  <option value="WITHDRAWAL">Withdrawals Only</option>
                  <option value="TRANSFER">Transfers Only</option>
                  <option value="CREDIT_CARD">Credit Cards Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase">Risk Score:</span>
                <select
                  value={txRisk}
                  onChange={(e) => setTxRisk(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                >
                  <option value="ALL">All Risk Factors</option>
                  <option value="HIGH">⚠️ High Threat Score</option>
                  <option value="MEDIUM">⚡ Medium Warning</option>
                  <option value="LOW">🛡️ Safe Low Risk</option>
                </select>
              </div>

              <div className="ml-auto text-xs font-mono text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded border border-slate-800">
                Injected logs in window: {transactions.length} records
              </div>
            </div>

            {/* Transactions Ingest Table */}
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Tx Hash</th>
                      <th className="p-3">Customer Entity</th>
                      <th className="p-3">Source Account</th>
                      <th className="p-3">Transfer Type</th>
                      <th className="p-3 text-right">Value (USD)</th>
                      <th className="p-3">Logged Date</th>
                      <th className="p-3">Compliance Score</th>
                      <th className="p-3">Details / Merchant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-semibold text-blue-400">{t.id}</td>
                        <td className="p-3 font-bold text-slate-200">{t.customerName}</td>
                        <td className="p-3 font-mono text-slate-400">{t.accountNumber}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.type === 'DEPOSIT' ? 'bg-emerald-500/15 text-emerald-400' :
                            t.type === 'WITHDRAWAL' ? 'bg-rose-500/15 text-rose-400' :
                            'bg-indigo-500/15 text-indigo-400'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-right font-black text-slate-100">{formatUSD(t.amount)}</td>
                        <td className="p-3 text-slate-500">{t.timestamp}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            t.riskFactor === 'HIGH' ? 'bg-rose-500/25 text-rose-300' :
                            t.riskFactor === 'MEDIUM' ? 'bg-amber-500/25 text-amber-300' :
                            'bg-emerald-500/25 text-emerald-300'
                          }`}>
                            {t.riskFactor} RISK
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 max-w-xs truncate">{t.merchant ? `${t.merchant} (${t.location})` : 'Self Account Sync'}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">No transactions recorded in this bracket.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. LOAN ANALYTICS SUB-VIEW */}
        {activeTab === 'loans' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Loan Assets</span>
                <div className="text-2xl font-black mt-1 text-blue-400">{formatUSD(loans.reduce((acc, l) => acc + l.amount, 0))}</div>
              </div>
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Outstanding Principle</span>
                <div className="text-2xl font-black mt-1 text-slate-100">{formatUSD(loans.reduce((acc, l) => acc + l.remainingBalance, 0))}</div>
              </div>
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Recovered Margin</span>
                <div className="text-2xl font-black mt-1 text-emerald-400">{formatUSD(loans.reduce((acc, l) => acc + l.recoveredAmount, 0))}</div>
              </div>
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Delinquency Count</span>
                <div className="text-2xl font-black mt-1 text-rose-500">{loans.filter(l => l.status === 'DELINQUENT').length} Cases</div>
              </div>
            </div>

            {/* Loans Table */}
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Loan Ledger & Compliance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Reference ID</th>
                      <th className="p-3">Borrowing entity</th>
                      <th className="p-3">Asset category</th>
                      <th className="p-3">Granted Amount</th>
                      <th className="p-3">APR Rate</th>
                      <th className="p-3 font-mono">Monthly EMI</th>
                      <th className="p-3">Outstanding Bal</th>
                      <th className="p-3">FICO Tier</th>
                      <th className="p-3 text-right">Repayment status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loans.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-slate-400">{l.id}</td>
                        <td className="p-3 font-medium text-slate-200">{l.customerName}</td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono uppercase">{l.category}</span></td>
                        <td className="p-3 font-mono font-bold text-slate-300">{formatUSD(l.amount)}</td>
                        <td className="p-3 font-semibold text-cyan-400">{l.interestRate}%</td>
                        <td className="p-3 font-mono text-slate-300">{formatUSD(l.emi)}</td>
                        <td className="p-3 font-mono text-slate-300">{formatUSD(l.remainingBalance)}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded font-black ${
                            l.riskRating === 'A' ? 'bg-emerald-500/15 text-emerald-400' :
                            l.riskRating === 'B' ? 'bg-blue-500/15 text-blue-400' :
                            l.riskRating === 'C' ? 'bg-amber-500/15 text-amber-400' :
                            'bg-rose-500/15 text-rose-400'
                          }`}>
                            Class {l.riskRating}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'FULLY_PAID' ? 'bg-emerald-500/15 text-emerald-400' :
                            l.status === 'DELINQUENT' ? 'bg-rose-500/15 text-rose-400' :
                            'bg-blue-500/15 text-blue-400'
                          }`}>
                            {l.status}
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

        {/* 5. BRANCH PERFORMANCE SUB-VIEW */}
        {activeTab === 'branches' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid md:grid-cols-3 gap-6">
              {branches.map((b) => (
                <div key={b.id} className="p-5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-blue-400" /> {b.name}
                      </h4>
                      <span className="text-xs font-semibold text-emerald-400">+{b.growthRate}% Growth</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Location: {b.city} • Manager: {b.manager}</p>
                  </div>

                  <div className="space-y-2 p-3 bg-slate-900/40 rounded-lg border border-slate-800/40 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Customer Count</span>
                      <span className="text-slate-300 font-bold font-mono">{b.customerCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Active Credit Accounts</span>
                      <span className="text-slate-300 font-bold font-mono">{b.activeLoans}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Ingested deposits</span>
                      <span className="text-emerald-400 font-bold font-mono">{formatUSD(b.totalDeposits)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Annual Revenue Generation</span>
                      <span className="text-slate-200 font-bold font-mono">{formatUSD(b.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Total Transaction logs</span>
                      <span className="text-slate-400 font-mono">{b.transactionCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

            {/* Alerts Table */}
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Incident ID</th>
                      <th className="p-3">Reference Tx</th>
                      <th className="p-3">Target Customer</th>
                      <th className="p-3 text-right">Value (USD)</th>
                      <th className="p-3">Threat Category</th>
                      <th className="p-3">Logged Date</th>
                      <th className="p-3">Threat Risk Level</th>
                      <th className="p-3">Audit Details</th>
                      <th className="p-3 text-right">Action Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {fraudAlerts.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-900/40 align-top">
                        <td className="p-3 font-mono font-bold text-rose-400">{f.id}</td>
                        <td className="p-3 font-mono text-slate-400">{f.transactionId}</td>
                        <td className="p-3 font-bold text-slate-200">{f.customerName}</td>
                        <td className="p-3 font-mono text-right font-black text-slate-100">{formatUSD(f.amount)}</td>
                        <td className="p-3"><span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20 text-[10px] font-bold uppercase">{f.type}</span></td>
                        <td className="p-3 text-slate-500">{f.timestamp}</td>
                        <td className="p-3">
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5" title={`${f.riskScore}% risk`}>
                            <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${f.riskScore}%` }}></div>
                          </div>
                          <span className="text-[9px] font-bold text-rose-400 mt-0.5 block font-mono">{f.riskScore}% Threat</span>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] max-w-xs whitespace-normal leading-relaxed">{f.details}</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.status === 'OPEN' ? 'bg-rose-500/15 text-rose-400' :
                            f.status === 'INVESTIGATING' ? 'bg-amber-500/15 text-amber-400' :
                            'bg-emerald-500/15 text-emerald-400'
                          }`}>
                            {f.status}
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

      </div>
    </div>
  );
}
