import React, { useState } from 'react';
import apiPath from '../../api';
import { Plus, Edit2, Trash2, Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface FraudAlertsManagerProps {
  token: string;
  user: any;
  fraudAlerts: any[];
  customers: any[];
  transactions: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function FraudAlertsManager({
  token,
  user,
  fraudAlerts,
  customers,
  transactions,
  isLoading,
  onRefresh
}: FraudAlertsManagerProps) {
  // Filters, Pagination, & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<string>('riskScore');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const itemsPerPage = 6;

  // Dialog States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  // Form States
  const [form, setForm] = useState({
    transactionId: '',
    customerId: '',
    amount: 0,
    type: 'HIGH_VALUE',
    riskScore: 75,
    status: 'OPEN',
    details: ''
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
    if (!form.transactionId || !form.customerId || form.amount === undefined || !form.type) {
      showToast('error', 'All fields are required.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(apiPath('/api/business/fraud-alerts'), {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger fraud alert');
      
      showToast('success', `Fraud alert generated successfully.`);
      setShowAddModal(false);
      setForm({ transactionId: '', customerId: '', amount: 0, type: 'HIGH_VALUE', riskScore: 75, status: 'OPEN', details: '' });
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Creation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform edit setup
  const openEdit = (alert: any) => {
    // Look up customerId from existing customer name or match if possible
    const matchedCust = customers.find(c => c.name === alert.customerName);
    setSelectedAlert(alert);
    setForm({
      transactionId: alert.transactionId || '',
      customerId: matchedCust ? matchedCust.id : (alert.customerId || ''),
      amount: alert.amount || 0,
      type: alert.type || 'HIGH_VALUE',
      riskScore: alert.riskScore || 75,
      status: alert.status || 'OPEN',
      details: alert.details || ''
    });
    setShowEditModal(true);
  };

  // Perform update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/fraud-alerts/${selectedAlert.id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update alert');
      
      showToast('success', `Fraud alert ${selectedAlert.id} updated successfully.`);
      setShowEditModal(false);
      setSelectedAlert(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform delete setup
  const openDelete = (alert: any) => {
    setSelectedAlert(alert);
    setShowDeleteModal(true);
  };

  // Perform delete execution
  const handleDelete = async () => {
    if (!selectedAlert) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/fraud-alerts/${selectedAlert.id}`), {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete alert');

      showToast('success', `Fraud alert entry pruned.`);
      setShowDeleteModal(false);
      setSelectedAlert(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Deletion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter
  const filteredAlerts = fraudAlerts.filter(a => {
    const searchLow = search.toLowerCase();
    const custName = a.customerName?.toLowerCase() || '';
    const matchesSearch =
      a.id.toLowerCase().includes(searchLow) ||
      a.transactionId.toLowerCase().includes(searchLow) ||
      custName.includes(searchLow) ||
      a.type.toLowerCase().includes(searchLow) ||
      (a.details && a.details.toLowerCase().includes(searchLow));

    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortAsc ? (aVal - bVal) : (bVal - aVal);
    }
  });

  // Pagination bounds
  const totalPages = Math.ceil(sortedAlerts.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedAlerts.slice(indexOfFirstItem, indexOfLastItem);

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
            placeholder="Search fraud alerts by alert ID, transaction ID, customer name, type or details..."
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
              className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">🚨 Open</option>
              <option value="INVESTIGATING">🔍 Investigating</option>
              <option value="CONFIRMED">❌ Confirmed Fraud</option>
              <option value="DISMISSED">💚 Dismissed</option>
            </select>
          </div>

          {canWrite && (
            <button
              onClick={() => {
                setForm({
                  transactionId: transactions[0]?.id || '',
                  customerId: customers[0]?.id || '',
                  amount: transactions[0]?.amount || 500,
                  type: 'HIGH_VALUE',
                  riskScore: 80,
                  status: 'OPEN',
                  details: 'High value transaction triggered system warning limit threshold.'
                });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/10"
            >
              <Plus className="h-4 w-4" /> Trigger Alert
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
                  Alert ID {sortField === 'id' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4">Customer Holder</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none text-right" onClick={() => handleSort('amount')}>
                  Amount {sortField === 'amount' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4">Classification</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('riskScore')}>
                  Risk Index {sortField === 'riskScore' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('status')}>
                  Status {sortField === 'status' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4">Timestamp & Details</th>
                {canWrite && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-mono italic">
                    Querying Cortex compliance signals...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200 font-mono">
                      <div>{a.id}</div>
                      <div className="text-[10px] text-slate-500 font-mono font-medium mt-0.5">TX: {a.transactionId}</div>
                    </td>
                    <td className="p-4 text-slate-300 font-bold">
                      {a.customerName}
                    </td>
                    <td className="p-4 font-bold text-rose-400 text-right font-mono text-xs">
                      {formatUSD(a.amount || 0)}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold font-mono">
                        {a.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono ${
                          a.riskScore >= 75 ? 'text-rose-500 animate-pulse' : a.riskScore >= 40 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {a.riskScore}%
                        </span>
                        <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden md:block">
                          <div className={`h-full rounded-full ${
                            a.riskScore >= 75 ? 'bg-rose-500' : a.riskScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} style={{ width: `${a.riskScore}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                        a.status === 'CONFIRMED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        a.status === 'DISMISSED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        a.status === 'INVESTIGATING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-slate-400/10 text-slate-300 border-slate-400/20'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-4 space-y-1 max-w-xs">
                      <div className="text-[10px] text-slate-500 font-mono font-medium">{a.timestamp}</div>
                      <div className="text-slate-300 text-[11px] truncate" title={a.details}>{a.details || '-'}</div>
                    </td>
                    {canWrite && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => openEdit(a)}
                            title="Update alert status"
                            className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openDelete(a)}
                            disabled={!canDelete}
                            title={canDelete ? "Prune alert log" : "Admin privileges required"}
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
                  <td colSpan={8} className="p-16 text-center text-slate-600 font-mono flex flex-col items-center justify-center space-y-2">
                    <AlertTriangle className="h-8 w-8 text-slate-700" />
                    <span>No fraud alerts found matching filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {sortedAlerts.length > itemsPerPage && (
          <div className="bg-slate-900/30 border-t border-slate-850 px-4 py-3 flex items-center justify-between text-xs font-mono text-slate-500">
            <div>
              Showing <span className="text-slate-300 font-bold">{indexOfFirstItem + 1}</span> to{' '}
              <span className="text-slate-300 font-bold">{Math.min(indexOfLastItem, sortedAlerts.length)}</span> of{' '}
              <span className="text-slate-300 font-bold">{sortedAlerts.length}</span> entries
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

      {/* --- ADD ALERT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Raise Fraud Alert Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Target Transaction ID</label>
                <select
                  required
                  value={form.transactionId}
                  onChange={(e) => {
                    const matchedTx = transactions.find(t => t.id === e.target.value);
                    const matchedCust = customers.find(c => c.name === matchedTx?.customerName);
                    setForm({
                      ...form,
                      transactionId: e.target.value,
                      amount: matchedTx ? matchedTx.amount : 0,
                      customerId: matchedCust ? matchedCust.id : form.customerId
                    });
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
                >
                  <option value="" disabled>-- Select Transaction --</option>
                  {transactions.map((t) => (
                    <option key={t.id} value={t.id}>{t.id} - {t.customerName} ({formatUSD(t.amount)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Customer Account Holder</label>
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
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Alert Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="HIGH_VALUE">HIGH VALUE</option>
                    <option value="VELOCITY_LIMIT">VELOCITY LIMIT</option>
                    <option value="GEOGRAPHIC_ANOMALY">GEOGRAPHIC ANOMALY</option>
                    <option value="DUPLICATE_TX">DUPLICATE TX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Risk Index (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.riskScore}
                    onChange={(e) => setForm({ ...form, riskScore: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Amount Flagged</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="DISMISSED">DISMISSED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Security Investigation Details</label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  placeholder="Describe details regarding this suspicious activity..."
                  className="w-full h-20 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
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
                  {actionLoading ? 'Raising Alert...' : 'Raise Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT ALERT MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Audit Fraud Alert Registry</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Target Transaction ID</label>
                <input
                  type="text"
                  disabled
                  value={form.transactionId}
                  className="w-full p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Customer Account Holder</label>
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
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Alert Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="HIGH_VALUE">HIGH VALUE</option>
                    <option value="VELOCITY_LIMIT">VELOCITY LIMIT</option>
                    <option value="GEOGRAPHIC_ANOMALY">GEOGRAPHIC ANOMALY</option>
                    <option value="DUPLICATE_TX">DUPLICATE TX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Risk Index (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.riskScore}
                    onChange={(e) => setForm({ ...form, riskScore: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Amount Flagged</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="DISMISSED">DISMISSED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Security Investigation Details</label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  className="w-full h-20 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                />
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
                <AlertTriangle className="h-4.5 w-4.5" /> Prune Alert Log
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete fraud alert record{' '}
                <span className="text-white font-bold font-mono">{selectedAlert?.id}</span>?
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 text-slate-400 leading-snug">
                This will delete the fraud alert record entry from compliance logs. This does not delete the underlying transaction log.
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold rounded-lg cursor-pointer"
                >
                  Keep Log
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
