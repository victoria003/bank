import React, { useState } from 'react';
import apiPath from '../../api';
import { Plus, Edit2, Trash2, Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface LoansManagerProps {
  token: string;
  user: any;
  loans: any[];
  customers: any[];
  isLoading: boolean;
  onRefresh: () => void;
  loanCategory: string;
  setLoanCategory: (val: string) => void;
  loanRating: string;
  setLoanRating: (val: string) => void;
}

export default function LoansManager({
  token,
  user,
  loans,
  customers,
  isLoading,
  onRefresh,
  loanCategory,
  setLoanCategory,
  loanRating,
  setLoanRating
}: LoansManagerProps) {
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const itemsPerPage = 6;

  // Dialog States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  // Form States
  const [form, setForm] = useState({
    customerId: '',
    category: 'PERSONAL',
    amount: 10000,
    interestRate: 6.5,
    termMonths: 24,
    emi: 445,
    remainingBalance: 10000,
    nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ACTIVE',
    riskRating: 'A',
    recoveredAmount: 0
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
    if (!form.customerId || !form.category || form.amount === undefined || form.interestRate === undefined || form.termMonths === undefined) {
      showToast('error', 'All essential fields are required.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(apiPath('/api/business/loans'), {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue loan');
      
      showToast('success', `Loan registry created successfully for holder.`);
      setShowAddModal(false);
      setForm({
        customerId: '',
        category: 'PERSONAL',
        amount: 10000,
        interestRate: 6.5,
        termMonths: 24,
        emi: 445,
        remainingBalance: 10000,
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'ACTIVE',
        riskRating: 'A',
        recoveredAmount: 0
      });
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Creation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform edit setup
  const openEdit = (loan: any) => {
    setSelectedLoan(loan);
    setForm({
      // loan.customerId is now returned directly by the GET /api/business/loans endpoint
      customerId: loan.customerId || (customers.find((c: any) => c.name === loan.customerName)?.id) || '',
      category: loan.category || 'PERSONAL',
      amount: loan.amount || 0,
      interestRate: loan.interestRate || 0,
      termMonths: loan.termMonths || 0,
      emi: loan.emi || 0,
      remainingBalance: loan.remainingBalance || 0,
      // Always provide a valid YYYY-MM-DD date — fallback to 30 days from now
      nextDueDate: (loan.nextDueDate && loan.nextDueDate !== 'null')
        ? loan.nextDueDate
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: loan.status || 'ACTIVE',
      riskRating: loan.riskRating || 'A',
      recoveredAmount: loan.recoveredAmount || 0
    });
    setShowEditModal(true);
  };


  // Perform update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/loans/${selectedLoan.id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update loan');
      
      showToast('success', `Loan registry updated successfully.`);
      setShowEditModal(false);
      setSelectedLoan(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform delete setup
  const openDelete = (loan: any) => {
    setSelectedLoan(loan);
    setShowDeleteModal(true);
  };

  // Perform delete execution
  const handleDelete = async () => {
    if (!selectedLoan) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiPath(`/api/business/loans/${selectedLoan.id}`), {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete loan');

      showToast('success', `Loan registry record successfully decommissioned.`);
      setShowDeleteModal(false);
      setSelectedLoan(null);
      onRefresh();
    } catch (err: any) {
      showToast('error', err.message || 'Deletion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Search Filter
  const filteredLoans = loans.filter(loan => {
    const searchLow = search.toLowerCase();
    const customerName = loan.customerName?.toLowerCase() || '';
    return (
      loan.id.toLowerCase().includes(searchLow) ||
      customerName.includes(searchLow) ||
      loan.category.toLowerCase().includes(searchLow)
    );
  });

  // Sorting Logic
  const sortedLoans = [...filteredLoans].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortAsc ? (aVal - bVal) : (bVal - aVal);
    }
  });

  // Pagination bounds
  const totalPages = Math.ceil(sortedLoans.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedLoans.slice(indexOfFirstItem, indexOfLastItem);

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
            placeholder="Search loans by loan ID, category, or customer holder name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-slate-500 flex items-center font-bold uppercase tracking-wider">Category:</span>
            <select
              value={loanCategory}
              onChange={(e) => { setLoanCategory(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="HOME">🏠 Home Loan</option>
              <option value="AUTO">🚗 Auto Loan</option>
              <option value="PERSONAL">👥 Personal</option>
              <option value="BUSINESS">💼 Business</option>
              <option value="EDUCATION">🎓 Education</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-slate-500 flex items-center font-bold uppercase tracking-wider">Rating:</span>
            <select
              value={loanRating}
              onChange={(e) => { setLoanRating(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Ratings</option>
              <option value="A">Grade A (Prime)</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
              <option value="D">Grade D</option>
              <option value="E">Grade E (Subprime)</option>
            </select>
          </div>

          {canWrite && (
            <button
              onClick={() => {
                setForm({
                  customerId: customers[0]?.id || '',
                  category: 'PERSONAL',
                  amount: 15000,
                  interestRate: 5.5,
                  termMonths: 36,
                  emi: 452,
                  remainingBalance: 15000,
                  nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  status: 'ACTIVE',
                  riskRating: 'A',
                  recoveredAmount: 0
                });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/10"
            >
              <Plus className="h-4 w-4" /> Issue Loan
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
                  Loan ID {sortField === 'id' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4">Customer Holder</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('category')}>
                  Category {sortField === 'category' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 text-right cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('amount')}>
                  Principal {sortField === 'amount' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="p-4 text-right">Remaining Balance</th>
                <th className="p-4">Rate & Term</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 select-none" onClick={() => handleSort('status')}>
                  Status {sortField === 'status' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                {canWrite && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-mono italic">
                    Querying loans matrix...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200 font-mono">
                      <div>{l.id}</div>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-black font-mono border uppercase ${
                        l.riskRating === 'A' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        l.riskRating === 'B' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                        l.riskRating === 'C' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        l.riskRating === 'D' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        Grade {l.riskRating}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-bold">
                      {l.customerName}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold font-mono">
                        {l.category}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-200 text-right font-mono text-xs">
                      {formatUSD(l.amount || 0)}
                    </td>
                    <td className="p-4 font-bold text-rose-400 text-right font-mono text-xs">
                      {formatUSD(l.remainingBalance || 0)}
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-slate-300 font-mono font-medium">{l.interestRate}% Interest</div>
                      <div className="text-[10px] text-slate-500 font-mono">{l.termMonths} Months | EMI: {formatUSD(l.emi || 0)}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                        l.status === 'ACTIVE' || l.status === 'FULLY_PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        l.status === 'DISBURSED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => openEdit(l)}
                            title="Edit loan parameters"
                            className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openDelete(l)}
                            disabled={!canDelete}
                            title={canDelete ? "Purge loan registry" : "Admin privileges required"}
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
                    <span>No loans found matching filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {sortedLoans.length > itemsPerPage && (
          <div className="bg-slate-900/30 border-t border-slate-850 px-4 py-3 flex items-center justify-between text-xs font-mono text-slate-500">
            <div>
              Showing <span className="text-slate-300 font-bold">{indexOfFirstItem + 1}</span> to{' '}
              <span className="text-slate-300 font-bold">{Math.min(indexOfLastItem, sortedLoans.length)}</span> of{' '}
              <span className="text-slate-300 font-bold">{sortedLoans.length}</span> registries
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

      {/* --- ADD LOAN MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Issue Corporate/Personal Loan</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Assigned Customer Holder</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="" disabled>-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Loan Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="PERSONAL">PERSONAL</option>
                    <option value="HOME">HOME LOAN</option>
                    <option value="AUTO">AUTO LOAN</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="EDUCATION">EDUCATION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Principal Amount (USD)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value), remainingBalance: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Term (Months)</label>
                  <input
                    type="number"
                    required
                    value={form.termMonths}
                    onChange={(e) => setForm({ ...form, termMonths: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Monthly EMI</label>
                  <input
                    type="number"
                    value={form.emi}
                    onChange={(e) => setForm({ ...form, emi: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Remaining Balance</label>
                  <input
                    type="number"
                    value={form.remainingBalance}
                    onChange={(e) => setForm({ ...form, remainingBalance: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Recovered Amt</label>
                  <input
                    type="number"
                    value={form.recoveredAmount}
                    onChange={(e) => setForm({ ...form, recoveredAmount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Next Due Date</label>
                  <input
                    type="date"
                    value={form.nextDueDate}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Risk Rating</label>
                  <select
                    value={form.riskRating}
                    onChange={(e) => setForm({ ...form, riskRating: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                    <option value="D">Grade D</option>
                    <option value="E">Grade E</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Loan Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="FULLY_PAID">FULLY PAID</option>
                  <option value="DELINQUENT">DELINQUENT</option>
                  <option value="DISBURSED">DISBURSED</option>
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
                  {actionLoading ? 'Issuing...' : 'Issue Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT LOAN MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm tracking-wider uppercase">Edit Loan Parameters</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Assigned Customer Holder</label>
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
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Loan Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="PERSONAL">PERSONAL</option>
                    <option value="HOME">HOME LOAN</option>
                    <option value="AUTO">AUTO LOAN</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="EDUCATION">EDUCATION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Principal Amount (USD)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Term (Months)</label>
                  <input
                    type="number"
                    required
                    value={form.termMonths}
                    onChange={(e) => setForm({ ...form, termMonths: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Monthly EMI</label>
                  <input
                    type="number"
                    value={form.emi}
                    onChange={(e) => setForm({ ...form, emi: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Remaining Balance</label>
                  <input
                    type="number"
                    value={form.remainingBalance}
                    onChange={(e) => setForm({ ...form, remainingBalance: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Recovered Amt</label>
                  <input
                    type="number"
                    value={form.recoveredAmount}
                    onChange={(e) => setForm({ ...form, recoveredAmount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Next Due Date</label>
                  <input
                    type="date"
                    value={form.nextDueDate}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Risk Rating</label>
                  <select
                    value={form.riskRating}
                    onChange={(e) => setForm({ ...form, riskRating: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                    <option value="D">Grade D</option>
                    <option value="E">Grade E</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase font-mono">Loan Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="FULLY_PAID">FULLY PAID</option>
                  <option value="DELINQUENT">DELINQUENT</option>
                  <option value="DISBURSED">DISBURSED</option>
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
                <AlertTriangle className="h-4.5 w-4.5" /> Decommission Loan
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to permanently decommission corporate loan{' '}
                <span className="text-white font-bold font-mono">{selectedLoan?.id}</span>?
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 text-slate-400 leading-snug">
                This record will be permanently deleted from the active loan portfolio in the Snowflake database layer. This action is irreversible.
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
