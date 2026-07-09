import React, { useState } from 'react';
import apiPath from '../../api';
import { Plus, Edit2, Trash2, Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface BranchesManagerProps {
  token: string;
  user: any;
  branches: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function BranchesManager({
  token,
  user,
  branches,
  isLoading,
  onRefresh
}: BranchesManagerProps) {
  // Filters, Pagination, & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const itemsPerPage = 6;

  // Dialog States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

  // Form States
  const [form, setForm] = useState({
    name: '',
    city: '',
    manager: '',
    customerCount: 0,
    activeLoans: 0,
    totalDeposits: 0,
    totalRevenue: 0,
    transactionCount: 0,
    growthRate: 0
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // Perform create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city || !form.manager) {
      showToast('error', 'Branch Name, City, and Manager are required.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(apiPath('/api/business/branches'), {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create branch');
      
      showToast('success', `Branch ${data.name} created successfully.`);
      setShowAddModal(false);
      setForm({ name: '', city: '', manager: '', customerCount: 0, activeLoans: 0, totalDeposits: 0, totalRevenue: 0, transactionCount: 0, growthRate: 0 });
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Creation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform edit setup
  const openEdit = (branch: any) => {
    setSelectedBranch(branch);
    setForm({
      name: branch.name || '',
      city: branch.city || '',
      manager: branch.manager || '',
      customerCount: branch.customerCount || 0,
      activeLoans: branch.activeLoans || 0,
      totalDeposits: branch.totalDeposits || 0,
      totalRevenue: branch.totalRevenue || 0,
      transactionCount: branch.transactionCount || 0,
      growthRate: branch.growthRate || 0
    });
    setShowEditModal(true);
  };

  // Perform update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/branches/${selectedBranch.id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update branch');
      
      showToast('success', `Branch ${data.name} updated successfully.`);
      setShowEditModal(false);
      setSelectedBranch(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform delete setup
  const openDelete = (branch: any) => {
    setSelectedBranch(branch);
    setShowDeleteModal(true);
  };

  // Perform delete execution
  const handleDelete = async () => {
    if (!selectedBranch) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/branches/${selectedBranch.id}`), {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete branch');

      showToast('success', `Branch performance record deleted.`);
      setShowDeleteModal(false);
      setSelectedBranch(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Deletion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter
  const filteredBranches = branches.filter(b => {
    const searchLow = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(searchLow) ||
      b.city.toLowerCase().includes(searchLow) ||
      b.manager.toLowerCase().includes(searchLow) ||
      b.id.toLowerCase().includes(searchLow)
    );
  });

  // Sort
  const sortedBranches = [...filteredBranches].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortAsc ? (aVal - bVal) : (bVal - aVal);
    }
  });

  // Pagination bounds
  const totalPages = Math.ceil(sortedBranches.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedBranches.slice(indexOfFirstItem, indexOfLastItem);

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
            placeholder="Search branches by name, city, or manager..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {canWrite && (
          <button
            onClick={() => {
              setForm({ name: '', city: '', manager: '', customerCount: 150, activeLoans: 45, totalDeposits: 5000000, totalRevenue: 120000, transactionCount: 1200, growthRate: 5.5 });
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/10"
          >
            <Plus className="h-4 w-4" /> Add Branch
          </button>
        )}
      </div>

      {/* Relational Data Table Grid */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('name')}>
                  Branch {sortField === 'name' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('city')}>
                  City {sortField === 'city' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4">Manager</th>
                <th className="p-4 text-right cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('customerCount')}>
                  Customers {sortField === 'customerCount' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 text-right cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('totalDeposits')}>
                  Total Deposits {sortField === 'totalDeposits' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 text-right cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('totalRevenue')}>
                  Annual Revenue {sortField === 'totalRevenue' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 text-right cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('growthRate')}>
                  Growth {sortField === 'growthRate' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                {canWrite && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-mono italic">
                    Querying branch metrics...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200">
                      <div>{b.name}</div>
                      <span className="text-[9px] text-slate-500 font-mono font-medium">{b.id}</span>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{b.city}</td>
                    <td className="p-4 text-slate-300 font-medium">{b.manager}</td>
                    <td className="p-4 text-right font-mono font-bold text-slate-200">
                      {b.customerCount}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      {formatUSD(b.totalDeposits || 0)}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-200">
                      {formatUSD(b.totalRevenue || 0)}
                    </td>
                    <td className={`p-4 text-right font-mono font-bold ${b.growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {b.growthRate}%
                    </td>
                    {canWrite && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => openEdit(b)}
                            title="Edit branch performance parameters"
                            className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openDelete(b)}
                            disabled={!canDelete}
                            title={canDelete ? "Prune branch registry" : "Admin privileges required"}
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
                    <span>No branch registries found matching filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {sortedBranches.length > itemsPerPage && (
          <div className="bg-slate-900/30 border-t border-slate-850 px-4 py-3 flex items-center justify-between text-xs font-mono text-slate-500">
            <div>
              Showing <span className="text-slate-300 font-bold">{indexOfFirstItem + 1}</span> to{' '}
              <span className="text-slate-300 font-bold">{Math.min(indexOfLastItem, sortedBranches.length)}</span> of{' '}
              <span className="text-slate-300 font-bold">{sortedBranches.length}</span> registries
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

      {/* --- ADD BRANCH MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Open New Regional Branch</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Uptown Branch"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">City Location</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Boston"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">General Manager</label>
                <input
                  type="text"
                  required
                  value={form.manager}
                  onChange={(e) => setForm({ ...form, manager: e.target.value })}
                  placeholder="e.g. Sarah Connor"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Customer Count</label>
                  <input
                    type="number"
                    value={form.customerCount}
                    onChange={(e) => setForm({ ...form, customerCount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Active Loans</label>
                  <input
                    type="number"
                    value={form.activeLoans}
                    onChange={(e) => setForm({ ...form, activeLoans: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Transaction Count</label>
                  <input
                    type="number"
                    value={form.transactionCount}
                    onChange={(e) => setForm({ ...form, transactionCount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Total Deposits (USD)</label>
                  <input
                    type="number"
                    value={form.totalDeposits}
                    onChange={(e) => setForm({ ...form, totalDeposits: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Growth (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.growthRate}
                    onChange={(e) => setForm({ ...form, growthRate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Total Annual Revenue (USD)</label>
                <input
                  type="number"
                  value={form.totalRevenue}
                  onChange={(e) => setForm({ ...form, totalRevenue: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
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
                  {actionLoading ? 'Creating...' : 'Register Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT BRANCH MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Edit Branch performance parameters</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">City Location</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">General Manager</label>
                <input
                  type="text"
                  required
                  value={form.manager}
                  onChange={(e) => setForm({ ...form, manager: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Customer Count</label>
                  <input
                    type="number"
                    value={form.customerCount}
                    onChange={(e) => setForm({ ...form, customerCount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Active Loans</label>
                  <input
                    type="number"
                    value={form.activeLoans}
                    onChange={(e) => setForm({ ...form, activeLoans: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Transaction Count</label>
                  <input
                    type="number"
                    value={form.transactionCount}
                    onChange={(e) => setForm({ ...form, transactionCount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Total Deposits (USD)</label>
                  <input
                    type="number"
                    value={form.totalDeposits}
                    onChange={(e) => setForm({ ...form, totalDeposits: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Growth (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.growthRate}
                    onChange={(e) => setForm({ ...form, growthRate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Total Annual Revenue (USD)</label>
                <input
                  type="number"
                  value={form.totalRevenue}
                  onChange={(e) => setForm({ ...form, totalRevenue: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
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
                <AlertTriangle className="h-4.5 w-4.5" /> Prune Branch Registry
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete branch performance registry for{' '}
                <span className="text-white font-bold font-mono">{selectedBranch?.name}</span>?
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 text-slate-400 leading-snug">
                This branch record will be permanently deleted from the active branch registry table in the Snowflake database layer. This action is irreversible.
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold rounded-lg cursor-pointer"
                >
                  Keep Registry
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
