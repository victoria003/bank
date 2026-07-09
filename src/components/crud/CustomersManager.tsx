import React, { useState } from 'react';
import apiPath from '../../api';
import { Plus, Edit2, Trash2, Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface CustomersManagerProps {
  token: string;
  user: any;
  customers: any[];
  branches: any[];
  isLoading: boolean;
  onRefresh: () => void;
  custSearch: string;
  setCustSearch: (val: string) => void;
  custSegment: string;
  setCustSegment: (val: string) => void;
}

export default function CustomersManager({
  token,
  user,
  customers,
  branches,
  isLoading,
  onRefresh,
  custSearch,
  setCustSearch,
  custSegment,
  setCustSegment
}: CustomersManagerProps) {
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const itemsPerPage = 6;

  // Dialog States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Form States
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    segment: 'BRONZE',
    lifetimeValue: 0,
    branch: 'Main Branch',
    riskScore: 10
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // Perform create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      showToast('error', 'Name and Email are required.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(apiPath('/api/business/customers'), {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create customer');
      
      showToast('success', `Customer ${data.name} created successfully!`);
      setShowAddModal(false);
      setForm({ name: '', email: '', phone: '', segment: 'BRONZE', lifetimeValue: 0, branch: 'Main Branch', riskScore: 10 });
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Creation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform edit setup
  const openEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      segment: customer.segment || 'BRONZE',
      lifetimeValue: customer.lifetimeValue || 0,
      branch: customer.branch || 'Main Branch',
      riskScore: customer.riskScore || 10
    });
    setShowEditModal(true);
  };

  // Perform update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/customers/${selectedCustomer.id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update customer');
      
      showToast('success', `Customer ${data.name} updated successfully!`);
      setShowEditModal(false);
      setSelectedCustomer(null);
      setForm({ name: '', email: '', phone: '', segment: 'BRONZE', lifetimeValue: 0, branch: 'Main Branch', riskScore: 10 });
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform delete setup
  const openDelete = (customer: any) => {
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  // Perform delete execution
  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/customers/${selectedCustomer.id}`), {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete customer');

      showToast('success', `Customer registry record successfully pruned.`);
      setShowDeleteModal(false);
      setSelectedCustomer(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Deletion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Process sorting & filtering logic
  const sortedCustomers = [...customers].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortAsc ? (aVal - bVal) : (bVal - aVal);
    }
  });

  // Pagination bounds
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedCustomers.slice(indexOfFirstItem, indexOfLastItem);

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
            placeholder="Search customers by name, email, or customer ID..."
            value={custSearch}
            onChange={(e) => { setCustSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-slate-500 flex items-center font-bold uppercase tracking-wider gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Segment:
            </span>
            <select
              value={custSegment}
              onChange={(e) => { setCustSegment(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Segments</option>
              <option value="PLATINUM">💎 Platinum Tier</option>
              <option value="GOLD">🥇 Gold Tier</option>
              <option value="SILVER">🥈 Silver Tier</option>
              <option value="BRONZE">🥉 Bronze Tier</option>
            </select>
          </div>

          {canWrite && (
            <button
              onClick={() => {
                setForm({ name: '', email: '', phone: '', segment: 'BRONZE', lifetimeValue: 0, branch: branches[0]?.name || 'Main Branch', riskScore: 10 });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/10"
            >
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Relational Relational Data Table Grid */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('name')}>
                  Name {sortField === 'name' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4">Contact Info</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('segment')}>
                  Segment {sortField === 'segment' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none text-right" onClick={() => handleSort('lifetimeValue')}>
                  LTV {sortField === 'lifetimeValue' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4">Center</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('riskScore')}>
                  Risk Score {sortField === 'riskScore' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                {canWrite && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 font-mono italic">
                    Querying Snowflake execution layers...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200">
                      <div>{c.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono font-medium mt-0.5">{c.id}</div>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-slate-300 font-medium">{c.email}</div>
                      <div className="text-slate-500 font-mono">{c.phone || '-'}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                        c.segment === 'PLATINUM' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                        c.segment === 'GOLD' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        c.segment === 'SILVER' ? 'bg-slate-400/10 text-slate-300 border-slate-400/20' :
                        'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      }`}>
                        {c.segment}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-emerald-400 text-right font-mono text-xs">
                      {formatUSD(c.lifetimeValue || 0)}
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{c.branch}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono ${
                          c.riskScore > 75 ? 'text-rose-500' : c.riskScore > 40 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {c.riskScore}/100
                        </span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div className={`h-full rounded-full ${
                            c.riskScore > 75 ? 'bg-rose-500' : c.riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} style={{ width: `${c.riskScore}%` }}></div>
                        </div>
                      </div>
                    </td>
                    {canWrite && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => openEdit(c)}
                            title="Edit customer details"
                            className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openDelete(c)}
                            disabled={!canDelete}
                            title={canDelete ? "Delete customer record" : "Admin privileges required to delete records"}
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
                    <span>No customer registry records found matching search filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {sortedCustomers.length > itemsPerPage && (
          <div className="bg-slate-900/30 border-t border-slate-850 px-4 py-3 flex items-center justify-between text-xs font-mono text-slate-500">
            <div>
              Showing <span className="text-slate-300 font-bold">{indexOfFirstItem + 1}</span> to{' '}
              <span className="text-slate-300 font-bold">{Math.min(indexOfLastItem, sortedCustomers.length)}</span> of{' '}
              <span className="text-slate-300 font-bold">{sortedCustomers.length}</span> registries
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

      {/* --- ADD CUSTOMER MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Register New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. john@example.com"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +1-555-0199"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Segment Tier</label>
                  <select
                    value={form.segment}
                    onChange={(e) => setForm({ ...form, segment: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="BRONZE">BRONZE</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Lifetime Value (USD)</label>
                  <input
                    type="number"
                    value={form.lifetimeValue}
                    onChange={(e) => setForm({ ...form, lifetimeValue: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Security Risk Score (0-100)</label>
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

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Local Assigned Center</label>
                <select
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.id} value={b.name}>{b.name} ({b.city})</option>
                    ))
                  ) : (
                    <option value="Main Branch">Main Branch</option>
                  )}
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
                  {actionLoading ? 'Compiling SQL...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT CUSTOMER MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Edit Customer Metadata</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Segment Tier</label>
                  <select
                    value={form.segment}
                    onChange={(e) => setForm({ ...form, segment: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="BRONZE">BRONZE</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Lifetime Value (USD)</label>
                  <input
                    type="number"
                    value={form.lifetimeValue}
                    onChange={(e) => setForm({ ...form, lifetimeValue: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Security Risk Score (0-100)</label>
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

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Local Assigned Center</label>
                <select
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.id} value={b.name}>{b.name} ({b.city})</option>
                    ))
                  ) : (
                    <option value="Main Branch">Main Branch</option>
                  )}
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
                  {actionLoading ? 'Compiling Update...' : 'Save Changes'}
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
                <AlertTriangle className="h-4.5 w-4.5" /> Security Action Required
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you absolutely sure you want to permanently delete the customer record for{' '}
                <span className="text-white font-bold font-mono">{selectedCustomer?.name}</span>?
              </p>
              <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg text-rose-300 leading-snug">
                <strong>WARNING:</strong> This will also purge all bank accounts and nested transaction histories connected to this customer to satisfy database dependency constraints.
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
