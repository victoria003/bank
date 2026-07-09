import React, { useState } from 'react';
import apiPath from '../../api';
import { Plus, Edit2, Trash2, Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface AccountsManagerProps {
  token: string;
  user: any;
  accounts: any[];
  customers: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function AccountsManager({
  token,
  user,
  accounts,
  customers,
  isLoading,
  onRefresh
}: AccountsManagerProps) {
  // Filters, Pagination, & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<string>('accountNumber');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const itemsPerPage = 6;

  // Dialog States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  // Form States
  const [form, setForm] = useState({
    accountNumber: '',
    customerId: '',
    type: 'CHECKING',
    balance: 0,
    status: 'ACTIVE'
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

  // Format helper
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Perform create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountNumber || !form.customerId || !form.type) {
      showToast('error', 'All fields are required.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(apiPath('/api/business/accounts'), {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');
      
      showToast('success', `Account ${data.accountNumber} successfully created.`);
      setShowAddModal(false);
      setForm({ accountNumber: '', customerId: '', type: 'CHECKING', balance: 0, status: 'ACTIVE' });
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Creation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform edit setup
  const openEdit = (account: any) => {
    setSelectedAccount(account);
    setForm({
      accountNumber: account.accountNumber || '',
      customerId: account.customerId || '',
      type: account.type || 'CHECKING',
      balance: account.balance || 0,
      status: account.status || 'ACTIVE'
    });
    setShowEditModal(true);
  };

  // Perform update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/accounts/${selectedAccount.accountNumber}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update account');
      
      showToast('success', `Account ${data.accountNumber} updated successfully!`);
      setShowEditModal(false);
      setSelectedAccount(null);
      setForm({ accountNumber: '', customerId: '', type: 'CHECKING', balance: 0, status: 'ACTIVE' });
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform delete setup
  const openDelete = (account: any) => {
    setSelectedAccount(account);
    setShowDeleteModal(true);
  };

  // Perform delete execution
  const handleDelete = async () => {
    if (!selectedAccount) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/accounts/${selectedAccount.accountNumber}`), {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      showToast('success', `Account record purged from database.`);
      setShowDeleteModal(false);
      setSelectedAccount(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Deletion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve Customer Name
  const getCustomerName = (custId: string) => {
    const cust = customers.find(c => c.id === custId);
    return cust ? cust.name : 'Unknown Customer';
  };

  // Filtering Logic
  const filteredAccounts = accounts.filter(acc => {
    const custName = getCustomerName(acc.customerId).toLowerCase();
    const searchLow = search.toLowerCase();
    const matchesSearch =
      acc.accountNumber.toLowerCase().includes(searchLow) ||
      acc.customerId.toLowerCase().includes(searchLow) ||
      custName.includes(searchLow);

    const matchesStatus = statusFilter === 'ALL' || acc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sorting Logic
  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortAsc ? (aVal - bVal) : (bVal - aVal);
    }
  });

  // Pagination bounds
  const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedAccounts.slice(indexOfFirstItem, indexOfLastItem);

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
            placeholder="Search accounts by account number, ID, or customer name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-slate-500 flex items-center font-bold uppercase tracking-wider gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">🟢 Active</option>
              <option value="DORMANT">🟡 Dormant</option>
              <option value="FROZEN">❄️ Frozen</option>
            </select>
          </div>

          {canWrite && (
            <button
              onClick={() => {
                setForm({ accountNumber: `ACC${Math.floor(100000 + Math.random() * 900000)}`, customerId: customers[0]?.id || '', type: 'CHECKING', balance: 1000, status: 'ACTIVE' });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/10"
            >
              <Plus className="h-4 w-4" /> Create Account
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
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('accountNumber')}>
                  Account Number {sortField === 'accountNumber' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4">Customer Holder</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('type')}>
                  Type {sortField === 'type' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none text-right" onClick={() => handleSort('balance')}>
                  Current Balance {sortField === 'balance' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('status')}>
                  Status {sortField === 'status' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                {canWrite && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-mono italic">
                    Querying accounts matrix...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((a) => (
                  <tr key={a.accountNumber} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200 font-mono">
                      {a.accountNumber}
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-slate-300 font-bold">{getCustomerName(a.customerId)}</div>
                      <div className="text-[10px] text-slate-500 font-mono font-medium">{a.customerId}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold font-mono">
                        {a.type}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-emerald-400 text-right font-mono text-xs">
                      {formatUSD(a.balance || 0)}
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                        a.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        a.status === 'FROZEN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => openEdit(a)}
                            title="Edit account details"
                            className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openDelete(a)}
                            disabled={!canDelete}
                            title={canDelete ? "Delete account record" : "Admin privileges required"}
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
                  <td colSpan={6} className="p-16 text-center text-slate-600 font-mono flex flex-col items-center justify-center space-y-2">
                    <AlertTriangle className="h-8 w-8 text-slate-700" />
                    <span>No active accounts found matching search filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {sortedAccounts.length > itemsPerPage && (
          <div className="bg-slate-900/30 border-t border-slate-850 px-4 py-3 flex items-center justify-between text-xs font-mono text-slate-500">
            <div>
              Showing <span className="text-slate-300 font-bold">{indexOfFirstItem + 1}</span> to{' '}
              <span className="text-slate-300 font-bold">{Math.min(indexOfLastItem, sortedAccounts.length)}</span> of{' '}
              <span className="text-slate-300 font-bold">{sortedAccounts.length}</span> accounts
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

      {/* --- CREATE ACCOUNT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Open New Bank Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Account Number</label>
                <input
                  type="text"
                  required
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  placeholder="e.g. ACC103892"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Customer Holder</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="" disabled>-- Select Customer Holder --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Account Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="CHECKING">CHECKING</option>
                    <option value="SAVINGS">SAVINGS</option>
                    <option value="LOAN">LOAN</option>
                    <option value="CREDIT">CREDIT CARD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Initial Deposit</label>
                  <input
                    type="number"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Account Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DORMANT">DORMANT</option>
                  <option value="FROZEN">FROZEN</option>
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
                  {actionLoading ? 'Creating...' : 'Open Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT ACCOUNT MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Edit Account Metadata</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Account Number</label>
                <input
                  type="text"
                  disabled
                  value={form.accountNumber}
                  className="w-full p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg text-slate-500 font-mono uppercase cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Customer Holder</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Account Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="CHECKING">CHECKING</option>
                    <option value="SAVINGS">SAVINGS</option>
                    <option value="LOAN">LOAN</option>
                    <option value="CREDIT">CREDIT CARD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Current Balance</label>
                  <input
                    type="number"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Account Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DORMANT">DORMANT</option>
                  <option value="FROZEN">FROZEN</option>
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
                <AlertTriangle className="h-4.5 w-4.5" /> Decommission Account
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to delete bank account{' '}
                <span className="text-white font-bold font-mono">{selectedAccount?.accountNumber}</span>?
              </p>
              <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-300 leading-snug">
                <strong>WARNING:</strong> This action will delete all nested transaction histories for this account to maintain database consistency.
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold rounded-lg cursor-pointer"
                >
                  Keep Account
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
