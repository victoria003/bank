import React, { useState } from 'react';
import apiPath from '../../api';
import { Plus, Edit2, Trash2, Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface TransactionsManagerProps {
  token: string;
  user: any;
  transactions: any[];
  accounts: any[];
  isLoading: boolean;
  onRefresh: () => void;
  txSearch: string;
  setTxSearch: (val: string) => void;
  txType: string;
  setTxType: (val: string) => void;
  txRisk: string;
  setTxRisk: (val: string) => void;
}

export default function TransactionsManager({
  token,
  user,
  transactions,
  accounts,
  isLoading,
  onRefresh,
  txSearch,
  setTxSearch,
  txType,
  setTxType,
  txRisk,
  setTxRisk
}: TransactionsManagerProps) {
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const itemsPerPage = 6;

  // Dialog States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  // Form States
  const [form, setForm] = useState({
    accountNumber: '',
    type: 'DEPOSIT',
    amount: 0,
    currency: 'USD',
    status: 'COMPLETED',
    merchant: '',
    location: '',
    riskFactor: 'LOW'
  });

  // Feedback States
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Trigger Toast Alert
  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Check RBAC Permissions
  const canWrite = user?.role === 'BANKING_ADMIN' || user?.role === 'BANKING_DATA_ENGINEER' || user?.role === 'ADMIN' || user?.role === 'DATA_ENGINEER';
  const canDelete = user?.role === 'BANKING_ADMIN' || user?.role === 'ADMIN';

  // Handle Sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Format helpers
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Perform create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountNumber || !form.type || form.amount === undefined) {
      showToast('error', 'Account, Type, and Amount are required.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(apiPath('/api/business/transactions'), {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register transaction');
      
      showToast('success', `Transaction ${data.id} registered successfully.`);
      setShowAddModal(false);
      setForm({ accountNumber: '', type: 'DEPOSIT', amount: 0, currency: 'USD', status: 'COMPLETED', merchant: '', location: '', riskFactor: 'LOW' });
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Registration failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform edit setup
  const openEdit = (tx: any) => {
    setSelectedTx(tx);
    setForm({
      accountNumber: tx.accountNumber || '',
      type: tx.type || 'DEPOSIT',
      amount: tx.amount || 0,
      currency: tx.currency || 'USD',
      status: tx.status || 'COMPLETED',
      merchant: tx.merchant || '',
      location: tx.location || '',
      riskFactor: tx.riskFactor || 'LOW'
    });
    setShowEditModal(true);
  };

  // Perform update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/transactions/${selectedTx.id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update transaction');
      
      showToast('success', `Transaction ${data.id} updated successfully.`);
      setShowEditModal(false);
      setSelectedTx(null);
      setForm({ accountNumber: '', type: 'DEPOSIT', amount: 0, currency: 'USD', status: 'COMPLETED', merchant: '', location: '', riskFactor: 'LOW' });
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform delete setup
  const openDelete = (tx: any) => {
    setSelectedTx(tx);
    setShowDeleteModal(true);
  };

  // Perform delete execution
  const handleDelete = async () => {
    if (!selectedTx) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/transactions/${selectedTx.id}`), {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete transaction');

      showToast('success', `Transaction record deleted.`);
      setShowDeleteModal(false);
      setSelectedTx(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Deletion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Search Filter
  const filteredTxs = transactions.filter(tx => {
    const searchLow = txSearch.toLowerCase();
    const customerName = tx.customerName?.toLowerCase() || '';
    return (
      tx.id.toLowerCase().includes(searchLow) ||
      tx.accountNumber.toLowerCase().includes(searchLow) ||
      customerName.includes(searchLow) ||
      (tx.merchant && tx.merchant.toLowerCase().includes(searchLow))
    );
  });

  // Sorting Logic
  const sortedTxs = [...filteredTxs].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortAsc ? (aVal - bVal) : (bVal - aVal);
    }
  });

  // Pagination bounds
  const totalPages = Math.ceil(sortedTxs.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedTxs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {feedback && (
        <div className={`fixed bottom-5 right-5 p-4 rounded-xl border z-50 flex items-center gap-3 animate-slide-in shadow-2xl ${
          feedback.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <ShieldAlert className="h-5 w-5 text-rose-400" />}
          <span className="text-xs font-mono font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Control panel header */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions by TX ID, Account, Customer name, or Merchant..."
            value={txSearch}
            onChange={(e) => { setTxSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-slate-500 flex items-center font-bold uppercase tracking-wider">Type:</span>
            <select
              value={txType}
              onChange={(e) => { setTxType(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT">DEPOSIT</option>
              <option value="WITHDRAWAL">WITHDRAWAL</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="CREDIT_CARD">CREDIT CARD</option>
              <option value="ONLINE">ONLINE PAYMENT</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-slate-500 flex items-center font-bold uppercase tracking-wider">Risk:</span>
            <select
              value={txRisk}
              onChange={(e) => { setTxRisk(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Risks</option>
              <option value="LOW">🟢 Low Risk</option>
              <option value="MEDIUM">🟡 Med Risk</option>
              <option value="HIGH">🔴 High Risk</option>
            </select>
          </div>

          {canWrite && (
            <button
              onClick={() => {
                setForm({ accountNumber: accounts[0]?.accountNumber || '', type: 'DEPOSIT', amount: 100, currency: 'USD', status: 'COMPLETED', merchant: 'General Merchant', location: 'Online', riskFactor: 'LOW' });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/10"
            >
              <Plus className="h-4 w-4" /> Log Transaction
            </button>
          )}
        </div>
      </div>

      {/* Relational Data Table Grid */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('id')}>
                  Transaction ID {sortField === 'id' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('accountNumber')}>
                  Account {sortField === 'accountNumber' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none text-right" onClick={() => handleSort('amount')}>
                  Amount {sortField === 'amount' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4">Details</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('timestamp')}>
                  Timestamp {sortField === 'timestamp' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('riskFactor')}>
                  Risk Factor {sortField === 'riskFactor' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                {canWrite && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 font-mono italic">
                    Querying banking ledger...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200 font-mono">
                      <div>{t.id}</div>
                      <span className={`text-[9px] font-black uppercase ${
                        t.status === 'COMPLETED' ? 'text-emerald-400' :
                        t.status === 'PENDING' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-slate-300 font-bold font-mono">{t.accountNumber}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{t.customerName}</div>
                    </td>
                    <td className={`p-4 font-bold text-right font-mono text-xs ${
                      t.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {t.type === 'DEPOSIT' ? '+' : '-'}{formatUSD(t.amount || 0)} <span className="text-[9px] text-slate-500 font-medium">{t.currency}</span>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-slate-300 font-bold">{t.merchant || 'General Store'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{t.location || 'Online'} | <span className="text-slate-400">{t.type}</span></div>
                    </td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">
                      {t.timestamp}
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                        t.riskFactor === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        t.riskFactor === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {t.riskFactor}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => openEdit(t)}
                            title="Edit transaction log"
                            className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openDelete(t)}
                            disabled={!canDelete}
                            title={canDelete ? "Delete transaction log" : "Admin privileges required"}
                            className={`p-1.5 rounded-md border transition-all cursor-pointer ${
                              canDelete
                                ? 'bg-rose-950/20 border-rose-900/30 text-rose-400 hover:text-rose-300 hover:border-rose-800'
                                : 'bg-slate-900 border-slate-900 text-slate-700 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-600 font-mono flex flex-col items-center justify-center space-y-2">
                    <AlertTriangle className="h-8 w-8 text-slate-700" />
                    <span>No ledger records found matching search filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {sortedTxs.length > itemsPerPage && (
          <div className="bg-slate-900/30 border-t border-slate-850 px-4 py-3 flex items-center justify-between text-xs font-mono text-slate-500">
            <div>
              Showing <span className="text-slate-300 font-bold">{indexOfFirstItem + 1}</span> to{' '}
              <span className="text-slate-300 font-bold">{Math.min(indexOfLastItem, sortedTxs.length)}</span> of{' '}
              <span className="text-slate-300 font-bold">{sortedTxs.length}</span> entries
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-slate-300">
                Page <span className="font-bold text-slate-200">{currentPage}</span> of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded transition-all cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- ADD TRANSACTION MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Log Bank Transaction</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Source Account</label>
                <select
                  required
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="" disabled>-- Select Source Account --</option>
                  {accounts.map((acc) => (
                    <option key={acc.accountNumber} value={acc.accountNumber}>
                      {acc.accountNumber} (Balance: {formatUSD(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Tx Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="DEPOSIT">DEPOSIT</option>
                    <option value="WITHDRAWAL">WITHDRAWAL</option>
                    <option value="TRANSFER">TRANSFER</option>
                    <option value="CREDIT_CARD">CREDIT CARD</option>
                    <option value="ONLINE">ONLINE PAYMENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Amount (USD)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Risk Level</label>
                  <select
                    value={form.riskFactor}
                    onChange={(e) => setForm({ ...form, riskFactor: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="LOW">LOW RISK</option>
                    <option value="MEDIUM">MEDIUM RISK</option>
                    <option value="HIGH">HIGH RISK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Merchant Name</label>
                  <input
                    type="text"
                    value={form.merchant}
                    onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                    placeholder="e.g. Amazon, Starbucks"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Geographic Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. San Jose, CA"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Initial Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer disabled:opacity-40"
                >
                  {actionLoading ? 'Logging...' : 'Log Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT TRANSACTION MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Edit Transaction Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Source Account</label>
                <input
                  type="text"
                  disabled
                  value={form.accountNumber}
                  className="w-full p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Tx Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="DEPOSIT">DEPOSIT</option>
                    <option value="WITHDRAWAL">WITHDRAWAL</option>
                    <option value="TRANSFER">TRANSFER</option>
                    <option value="CREDIT_CARD">CREDIT CARD</option>
                    <option value="ONLINE">ONLINE PAYMENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Amount (USD)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Risk Level</label>
                  <select
                    value={form.riskFactor}
                    onChange={(e) => setForm({ ...form, riskFactor: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="LOW">LOW RISK</option>
                    <option value="MEDIUM">MEDIUM RISK</option>
                    <option value="HIGH">HIGH RISK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Merchant Name</label>
                  <input
                    type="text"
                    value={form.merchant}
                    onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Geographic Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer disabled:opacity-40"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
              <h3 className="font-bold text-rose-400 tracking-wider uppercase flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5" /> Prune Ledger Record
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete transaction record{' '}
                <span className="text-white font-bold font-mono">{selectedTx?.id}</span>?
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 text-slate-400 leading-snug">
                This transaction record will be permanently purged from the Snowflake database layer. This action is irreversible.
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold rounded-lg cursor-pointer"
                >
                  Keep Record
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer disabled:opacity-40"
                >
                  {actionLoading ? 'Purging...' : 'Confirm Purge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
