import React, { useState, useEffect } from 'react';
import apiPath from '../api';
import {
  Database, Play, Save, Download, Terminal, Upload, Trash2, History,
  ShieldCheck, ShieldAlert, Cpu, Sparkles, RefreshCw, Layers, ShieldCheck as SecurityIcon,
  HelpCircle, Clock, Undo2, Compass, AlertTriangle, CheckCircle2, ChevronRight, Sliders
} from 'lucide-react';
import { User, SQLQueryLog, WarehouseMetrics, SnowflakeFeature } from '../types';

interface AdminPortalProps {
  user: User;
  token: string;
}

const normalizeColumnName = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[_\s]+([a-z])/g, (_, letter) => letter.toUpperCase());
};

export default function AdminPortal({ user, token }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'sql' | 'engineering' | 'security' | 'recovery' | 'monitoring' | 'ai'>('sql');
  const [monitoring, setMonitoring] = useState<any>(null);
  const [queryHistory, setQueryHistory] = useState<SQLQueryLog[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Upload states
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileFormat, setFileFormat] = useState('CSV');
  const [stageName, setStageName] = useState('@INTERNAL_INGEST_STAGE');
  const [uploadHistory, setUploadHistory] = useState<any[]>([
    { id: 'LD-401', fileName: 'customers_q2_2026.csv', format: 'CSV', stage: '@INTERNAL_BANKING_STAGE', status: 'LOADED', rowsLoaded: 1245, errors: 0, timestamp: '2026-07-02 14:15' },
    { id: 'LD-402', fileName: 'merchant_blacklist.json', format: 'JSON', stage: '@INTERNAL_SECURITY_STAGE', status: 'LOADED', rowsLoaded: 42, errors: 0, timestamp: '2026-07-02 16:30' },
    { id: 'LD-403', fileName: 'high_value_trans_temp.parquet', format: 'PARQUET', stage: '@INTERNAL_INGEST_STAGE', status: 'FAILED', rowsLoaded: 0, errors: 1, timestamp: '2026-07-03 08:05', errorMessage: 'Column mismatch: field transaction_ref not found in destination.' }
  ]);

  // 2. SQL States
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM CUSTOMERS LIMIT 10;');
  const [adminMode, setAdminMode] = useState(false);
  const [savedQueries, setSavedQueries] = useState<string[]>([
    'SELECT * FROM SECURE_CUSTOMER_ANALYTICS LIMIT 10;',
    'SELECT SUM(amount), transaction_type FROM TRANSACTIONS GROUP BY 2;',
    'SELECT * FROM FRAUD_ALERTS WHERE risk_score > 80;'
  ]);
  const [queryColumns, setQueryColumns] = useState<any[]>([]);
  const [queryRows, setQueryRows] = useState<any[]>([]);
  const [queryTimeMs, setQueryTimeMs] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // 3. Engineering States
  const [engineeringFeatures, setEngineeringFeatures] = useState<SnowflakeFeature[]>([
    {
      id: 'feat-01',
      name: 'Secure Views (Customer PII)',
      category: 'DATA_ENGINEERING',
      status: 'ACTIVE',
      description: 'Masks sensitive customer SSN, credit cards, and addresses from normal analysts while allowing access for verified compliance managers.',
      sqlTemplate: 'CREATE OR REPLACE SECURE VIEW SECURE_CUSTOMER_ANALYTICS AS\nSELECT id, REGEXP_REPLACE(name, \'^(.).*(.)$\', \'\\\\1*****\\\\2\') as masked_name, email, segment, risk_score FROM CUSTOMERS;'
    },
    {
      id: 'feat-02',
      name: 'Dynamic Tables (Real-Time Ingestion)',
      category: 'DATA_ENGINEERING',
      status: 'SIMULATED',
      description: 'Automatically materializes query results with specified target lag (e.g. 1 minute) to process continuous transaction flows.',
      sqlTemplate: 'CREATE OR REPLACE DYNAMIC TABLE dt_daily_fraud_alerts\nTARGET_LAG = \'1 minute\'\nWAREHOUSE = BANKING_ANALYTICS_WH\nAS\nSELECT transaction_id, customer_name, amount, risk_score\nFROM TRANSACTIONS\nWHERE risk_score > 80;'
    },
    {
      id: 'feat-03',
      name: 'Materialized Views (Precompiled Aggregations)',
      category: 'DATA_ENGINEERING',
      status: 'ACTIVE',
      description: 'Precomputes daily transactions by branch, massively speeding up high-frequency business dashboard displays.',
      sqlTemplate: 'CREATE OR REPLACE MATERIALIZED VIEW MV_DAILY_BRANCH_AGGREGATIONS AS\nSELECT TRUNC(timestamp) as tx_date, SUM(amount) as daily_amount\nFROM TRANSACTIONS GROUP BY 1;'
    }
  ]);

  // 4. Recovery States
  const [timeTravelMinutes, setTimeTravelMinutes] = useState(10);
  const [cloneSourceTable, setCloneSourceTable] = useState('CUSTOMERS');
  const [cloneDestination, setCloneDestination] = useState('CUSTOMERS_BACKUP_STAGE');

  // Fetch initial info
  const fetchAdminData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resMon, resHist, resRoles, resGrants] = await Promise.all([
        fetch(apiPath('/api/admin/monitoring'), { headers }),
        fetch(apiPath('/api/admin/query-history'), { headers }),
        fetch(apiPath('/api/admin/security/roles'), { headers }),
        fetch(apiPath('/api/admin/security/grants'), { headers })
      ]);

      const dataMon = resMon.ok ? await resMon.json() : null;
      const dataHist = resHist.ok ? await resHist.json() : [];
      const dataRoles = resRoles.ok ? await resRoles.json() : [];
      const dataGrants = resGrants.ok ? await resGrants.json() : [];

      setMonitoring(dataMon && typeof dataMon === 'object' && !Array.isArray(dataMon) ? dataMon : null);
      setQueryHistory(Array.isArray(dataHist) ? dataHist : []);
      setRoles(Array.isArray(dataRoles) ? dataRoles : []);
      setGrants(Array.isArray(dataGrants) ? dataGrants : []);
    } catch (err) {
      console.error(err);
      setError('Connection refused. Ensure Express backend is online.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // Handle Mock Files Ingestion Trigger
  const handleIngestTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) {
      setError('Please specify a filename to load from stage.');
      return;
    }
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiPath('/api/admin/upload'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileName, fileFormat, stageName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUploadHistory(prev => [data.details, ...prev]);
      setSuccessMsg(`Snowflake Stage Execution: COPY INTO successfully compiled! Imported ${data.details.rowsLoaded} rows into destination table.`);
      setFileName('');
      fetchAdminData(); // Refresh history
    } catch (err: any) {
      setError(err.message || 'Data Loading operation failed.');
    }
  };

  // Run SQL Query
  const runSQLQuery = async (queryTextToRun?: string) => {
    const text = queryTextToRun || sqlQuery;
    if (!text) return;

    if (user.role === 'BANKING_ANALYST' || user.role === 'ANALYST') {
      const queryTrim = text.trim().replace(/^\/\*[\s\S]*?\*\//g, '').trim();
      if (!queryTrim.toUpperCase().startsWith('SELECT') && !queryTrim.toUpperCase().startsWith('SHOW')) {
        setError('Security Restriction: Risk Analysts are strictly permitted to execute read-only SELECT or SHOW statements.');
        return;
      }
    }

    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch(apiPath('/api/admin/sql/run'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: text, adminMode })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Syntax execution exception.');
      }

      setQueryColumns(data.columns || []);
      setQueryRows(data.rows || []);
      const duration = data.stats && typeof data.stats === 'object' ? (data.stats.duration || data.stats.durationMs) : null;
      setQueryTimeMs(typeof duration === 'number' ? duration : (data.durationMs || null));
      const message = typeof data.message === 'string' ? data.message : (data.message ? JSON.stringify(data.message) : 'Query executed successfully.');
      setSuccessMsg(`Compiled: ${message}`);
      fetchAdminData(); // Update history
    } catch (err: any) {
      setError(err.message || 'Execution error.');
      setQueryRows([]);
      setQueryColumns([]);
    } finally {
      setIsLoading(false);
    }
  };

  // AI Translation helper
  const handleAITranslate = async () => {
    if (!aiPrompt) return;
    setAiGenerating(true);
    setError('');
    try {
      const res = await fetch(apiPath('/api/admin/sql/ai-translate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.sql) {
        setSqlQuery(data.sql);
        setSuccessMsg('AI Suggestion: English translated to optimized Snowflake SQL.');
      }
    } catch (err) {
      setError('AI translation failed to process.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Time Travel
  const handleTimeTravel = async () => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(apiPath('/api/admin/time-travel'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ offsetMinutes: timeTravelMinutes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(`Time Travel Active: Loaded transactions schema state exactly ${timeTravelMinutes} minutes ago in retention sandbox.`);
      fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Zero-Copy Cloning
  const handleClone = async () => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(apiPath('/api/admin/clone'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sourceTable: cloneSourceTable, destinationClone: cloneDestination })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(`Zero-Copy Clone: Successfully cloned table metadata for '${cloneSourceTable}' into destination '${cloneDestination}' in 15ms.`);
      fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div id="admin_portal" className="flex flex-col min-h-screen bg-slate-900 text-slate-100">
      
      {/* Admin Title Banner */}
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full animate-pulse">
              Snowflake Console
            </span>
            {monitoring?.connected ? (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full"></span> Live Snowflake DB Connected
              </span>
            ) : (
              <span className="text-xs text-amber-400 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-pulse"></span> Virtual Simulation Mode
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight mt-1">Snowflake Administration Portal</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-xs font-medium">Sync Warehouse</span>
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="bg-slate-950/40 border-b border-slate-800/80 px-6 py-1 flex overflow-x-auto gap-1">
        {[
          { tab: 'sql', label: '💻 SQL Workspace' },
          { tab: 'upload', label: '📤 Ingest Stage' },
          { tab: 'engineering', label: '⚙️ Advanced DDL' },
          { tab: 'security', label: '🛡️ Security & Role RBAC' },
          { tab: 'recovery', label: '🕒 Time Travel & Cloning' },
          { tab: 'monitoring', label: '📊 Warehouses & Pipes' },
          { tab: 'ai', label: '✨ Cortex AI & ML' }
        ].filter(item => {
          if (user.role === 'BANKING_ANALYST' || user.role === 'ANALYST') {
            return item.tab === 'sql';
          }
          if (user.role === 'BANKING_DATA_ENGINEER' || user.role === 'DATA_ENGINEER') {
            return item.tab !== 'security';
          }
          return true;
        }).map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => {
                setActiveTab(item.tab as any);
                setError('');
                setSuccessMsg('');
              }}
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-red-500 text-red-400 font-bold bg-red-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Outer wrapper */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* Status Indicators */}
        {error && (
          <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{typeof error === 'object' ? JSON.stringify(error) : String(error)}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{typeof successMsg === 'object' ? JSON.stringify(successMsg) : String(successMsg)}</span>
          </div>
        )}

        {/* --- PAGE 1: SQL WORKSPACE --- */}
        {activeTab === 'sql' && (
          <div className="grid md:grid-cols-12 gap-6 animate-fade-in">
            {/* Editor column */}
            <div className="md:col-span-8 space-y-4">
              
              {/* Cortex Prompt Helper */}
              <div className="p-4 bg-gradient-to-r from-red-950/30 via-slate-950 to-indigo-950/30 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Sparkles className="h-4.5 w-4.5 text-red-400 shrink-0 animate-pulse" />
                  <span>SNOWFLAKE CORTEX: TRANSLATE TEXT TO SQL</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Find all Platinum customers who had transaction risk factors classified as HIGH..."
                    className="w-full px-3.5 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                  />
                  <button
                    onClick={handleAITranslate}
                    disabled={aiGenerating || !aiPrompt}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-900/40 text-white text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1"
                  >
                    {aiGenerating ? 'Interpreting...' : 'Translate'}
                  </button>
                </div>
              </div>

              {/* Core Editor Panel */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-900/80 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400 flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-slate-500" /> query_sheet_1.sql
                  </span>
                  
                  {/* Mode Toggles */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={adminMode}
                        onChange={(e) => {
                          if (user.role === 'ANALYST') {
                            setError('Security Limit: Risk Analysts cannot enable Advanced DML admin mode.');
                            return;
                          }
                          setAdminMode(e.target.checked);
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className={`font-semibold ${adminMode ? 'text-red-400 font-black' : 'text-slate-500'}`}>
                        Advanced DDL/DML Mode
                      </span>
                    </label>

                    <button
                      onClick={() => runSQLQuery()}
                      disabled={isLoading}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-white" /> Execute
                    </button>
                  </div>
                </div>

                <div className="p-1 bg-slate-950">
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full h-48 p-4 bg-slate-950 text-slate-100 font-mono text-xs border-0 focus:ring-0 focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* SQL Result Panel */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800 flex justify-between items-center text-xs">
                  <h3 className="font-bold text-slate-300 uppercase tracking-wider">Engine Results Output</h3>
                  {queryTimeMs !== null && queryTimeMs !== undefined && (
                    <span className="font-mono text-slate-500">
                      Query parsed in <span className="text-emerald-400 font-bold">{typeof queryTimeMs === 'object' ? JSON.stringify(queryTimeMs) : String(queryTimeMs)}ms</span>
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto max-h-80">
                  {queryColumns.length > 0 ? (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/90 text-slate-400 uppercase border-b border-slate-800 sticky top-0">
                        <tr>
                          {queryColumns.map((col, idx) => (
                            <th key={idx} className="p-3 whitespace-nowrap">
                              {col && typeof col === 'object' ? (col.name || '') : String(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {queryRows.length > 0 ? (
                          queryRows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-900/30">
                              {queryColumns.map((col, idx) => {
                                const name = col && typeof col === 'object' ? (col.name || '') : String(col);
                                const camelKey = normalizeColumnName(name);
                                const val = row[camelKey] !== undefined ? row[camelKey] : (row[name] !== undefined ? row[name] : row[name?.toLowerCase()]);
                                return (
                                  <td key={idx} className="p-3 text-slate-300 whitespace-nowrap">
                                    {val !== null && val !== undefined ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : 'NULL'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={queryColumns.length} className="p-8 text-center text-slate-500 italic">
                              No rows returned (empty result set).
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-slate-600 flex flex-col items-center justify-center space-y-2">
                      <Terminal className="h-8 w-8 text-slate-750" />
                      <span className="text-xs font-mono">Execute a query above to render relational Snowflake tables.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Sidebar / templates column */}
            <div className="md:col-span-4 space-y-4">
              {/* Quick Saved Queries templates */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Compass className="h-4.5 w-4.5 text-slate-500" /> Analytical Query Templates
                </h4>
                <div className="space-y-2.5">
                  {savedQueries.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSqlQuery(q);
                        runSQLQuery(q);
                      }}
                      className="w-full p-3 text-left bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 rounded-lg text-xs font-mono transition-all text-slate-300 hover:text-slate-100 flex justify-between items-start cursor-pointer"
                    >
                      <span className="truncate pr-4">{q}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Safe Mode Alert */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <SecurityIcon className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>TRANSACTION SAFE MODE</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  To protect cloud storage blocks from catastrophic dropping, standard workspaces default strictly to SELECT-only execution mode. Modifying commands (UPDATE, DELETE, CREATE) require full Admin authorization controls.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- PAGE 2: INGEST STAGE --- */}
        {activeTab === 'upload' && (
          <div className="grid md:grid-cols-12 gap-6 animate-fade-in">
            {/* Upload form / Wizard */}
            <div className="md:col-span-6 p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-5">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Stage File Ingestion Setup</h3>
              
              <form onSubmit={handleIngestTrigger} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1">Target Filename inside Stage</label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g. transactions_july_raw.csv"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase mb-1">Staging File Format</label>
                    <select
                      value={fileFormat}
                      onChange={(e) => setFileFormat(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    >
                      <option value="CSV">Comma Separated (CSV)</option>
                      <option value="JSON">Skynet Alert (JSON)</option>
                      <option value="PARQUET">Columnar block (Parquet)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold uppercase mb-1">Snowflake Internal Stage</label>
                    <select
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                    >
                      <option value="@INTERNAL_INGEST_STAGE">@INTERNAL_INGEST_STAGE</option>
                      <option value="@INTERNAL_SECURITY_STAGE">@INTERNAL_SECURITY_STAGE</option>
                      <option value="@INTERNAL_BANKING_STAGE">@INTERNAL_BANKING_STAGE</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">Compiled COPY INTO Template</span>
                  <code className="block text-[11px] text-red-400 font-mono leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-850">
                    COPY INTO raw_transactions FROM {stageName}/{fileName || 'filename'} FILE_FORMAT = (TYPE = {fileFormat} SKIP_HEADER = 1);
                  </code>
                </div>

                <button
                  type="submit"
                  disabled={!fileName}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 font-bold rounded-lg text-white text-xs cursor-pointer"
                >
                  Trigger COPY INTO Execution
                </button>
              </form>
            </div>

            {/* Ingestion history logs */}
            <div className="md:col-span-6 p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Ingest & Snowpipe Logs</h3>
              <div className="space-y-3">
                {uploadHistory.map((h, i) => (
                  <div key={h.id || i} className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/80 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-200">{h.fileName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded uppercase">{h.format}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Staged in <span className="font-mono">{h.stage}</span> • {h.timestamp}</p>
                      {h.errorMessage && (
                        <p className="text-[10px] text-rose-400 mt-2 p-2 bg-rose-950/20 rounded border border-rose-900/30 font-mono leading-relaxed">{h.errorMessage}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.status === 'LOADED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {h.status}
                      </span>
                      {h.rowsLoaded > 0 && (
                        <span className="block text-[11px] font-mono font-bold text-slate-400 mt-1">{h.rowsLoaded} rows</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- PAGE 3: DATA ENGINEERING CENTER --- */}
        {activeTab === 'engineering' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Snowflake Schema Features Setup</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {engineeringFeatures.map((f) => (
                  <div key={f.id} className="p-5 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                          {f.category}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400">{f.status}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 mt-2">{f.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.description}</p>
                    </div>

                    <div className="space-y-3">
                      <pre className="text-[10px] bg-slate-900 p-2.5 rounded border border-slate-850 font-mono text-slate-400 overflow-x-auto leading-relaxed max-h-32">
                        {f.sqlTemplate}
                      </pre>
                      <button
                        onClick={() => {
                          setSqlQuery(f.sqlTemplate);
                          setActiveTab('sql');
                          runSQLQuery(f.sqlTemplate);
                        }}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded font-semibold text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        Run inside Workspace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- PAGE 4: SECURITY CENTER --- */}
        {activeTab === 'security' && (
          <div className="grid md:grid-cols-12 gap-6 animate-fade-in">
            {/* Roles permissions table */}
            <div className="md:col-span-8 p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Role Access Permissions Grid</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Role Authority</th>
                      <th className="p-3">Parent Inherits</th>
                      <th className="p-3">Schema Privilege Scope</th>
                      <th className="p-3 text-right">Active Officers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {roles.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-3 font-bold text-red-400">{r.role}</td>
                        <td className="p-3 text-slate-400">{r.parent || 'GLOBAL_ROOT'}</td>
                        <td className="p-3 text-slate-300">{r.privilegeLevel}</td>
                        <td className="p-3 text-right text-slate-400 font-bold">{r.usersCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Governance summary */}
            <div className="md:col-span-4 p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Data Governance Policies</h3>
              
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest font-mono">Masking Policy: SSN_MASK</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automatically masks individual customer ssn strings into <code className="bg-slate-950 px-1 py-0.2 text-red-300 rounded">***-**-1011</code> for all non-privileged roles.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Row Policy: BRANCH_ACCESS_LIMIT</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Dynamically filters raw rows, locking customer lists so agents can strictly view data belonging to their assigned local branches.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PAGE 5: RECOVERY CENTER --- */}
        {activeTab === 'recovery' && (
          <div className="grid md:grid-cols-12 gap-6 animate-fade-in">
            {/* Time travel */}
            <div className="md:col-span-6 p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-5 w-5 text-red-400" /> Snowflake Time Travel Sandbox
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Retrieve historical transaction logs by selecting a time offset. This demonstrates how Snowflake can query table states prior to massive accidental updates.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1 font-semibold">
                    <span>Query Time Offset</span>
                    <span className="text-red-400 font-bold">{timeTravelMinutes} Minutes Ago</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="180"
                    step="5"
                    value={timeTravelMinutes}
                    onChange={(e) => setTimeTravelMinutes(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                </div>

                <button
                  onClick={handleTimeTravel}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-100 hover:text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Compile AT(OFFSET) query
                </button>
              </div>
            </div>

            {/* Zero Copy cloning */}
            <div className="md:col-span-6 p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Undo2 className="h-5 w-5 text-emerald-400" /> Zero-Copy Cloning
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Duplicate active Snowflake metadata blocks in milliseconds. Ideal for sandboxing and stress testing without physical storage copy charges.
              </p>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase mb-1">Source Table</label>
                    <select
                      value={cloneSourceTable}
                      onChange={(e) => setCloneSourceTable(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="CUSTOMERS">CUSTOMERS</option>
                      <option value="TRANSACTIONS">TRANSACTIONS</option>
                      <option value="LOANS">LOANS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold uppercase mb-1">Backup Clone Name</label>
                    <input
                      type="text"
                      value={cloneDestination}
                      onChange={(e) => setCloneDestination(e.target.value)}
                      placeholder="e.g. CUSTOMERS_CLONE"
                      className="w-full px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <button
                  onClick={handleClone}
                  className="w-full py-2 bg-red-600 hover:bg-red-500 font-bold rounded-lg text-white text-xs cursor-pointer"
                >
                  Trigger Metadata CLONE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- PAGE 6: MONITORING --- */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6 animate-fade-in">
            {/* Warehouse performance cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {monitoring?.warehouses?.map((wh: any, idx: number) => (
                <div key={idx} className="p-5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-200 text-sm font-mono">{wh.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        wh.state === 'STARTED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {wh.state}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Size: {wh.size} • AutoSuspend: {wh.autoSuspendMin}min</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div className="p-2.5 bg-slate-900 rounded border border-slate-850">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Active Queries</span>
                      <span className="text-slate-200 font-bold font-mono">{wh.activeQueries}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded border border-slate-850">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Queued Wait</span>
                      <span className="text-slate-200 font-bold font-mono">{wh.queuedQueries}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- PAGE 7: AI & ML CENTER --- */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Cortex AI & Snowpark Platform</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { title: 'Cortex COMPLETE()', desc: 'Snowflake serverless LLM completing queries directly inside table columns.', state: 'Active' },
                  { title: 'Cortex SENTIMENT()', desc: 'Real-time classification rating high risk threat comments.', state: 'Active' },
                  { title: 'Snowpark Python', desc: 'Execute secure pandas, numpy and scikit-learn models inside warehouses.', state: 'Simulated' }
                ].map((aiItem, i) => (
                  <div key={i} className="p-5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-red-400 font-mono">AI CORE</span>
                      <span className="text-emerald-400 font-semibold">{aiItem.state}</span>
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm mt-2">{aiItem.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{aiItem.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
