import React, { useEffect, useState } from 'react';
import apiPath from '../api';
import { Trash2, Edit2, Plus, X } from 'lucide-react';

interface RecordItem {
  id: string;
  name: string;
  email: string;
  details?: string;
  created_at?: string;
}

interface Props {
  token: string;
}

export default function RecordsManager({ token }: Props) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', details: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiPath('/api/records'), { headers });
      if (!res.ok) throw new Error('Failed to fetch records');
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load records');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!form.name || !form.email) { setError('Name and email required'); return; }
    try {
      const res = await fetch(apiPath('/api/records'), { method: 'POST', headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
      setForm({ name: '', email: '', details: '' });
      await fetchAll();
    } catch (err: any) { setError(err.message || 'Create failed'); }
  };

  const startEdit = (r: RecordItem) => {
    setEditingId(r.id);
    setForm({ name: r.name, email: r.email, details: r.details || '' });
  };

  const handleUpdate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingId) return;
    setError('');
    try {
      const res = await fetch(apiPath(`/api/records/${editingId}`), { method: 'PUT', headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      setEditingId(null);
      setForm({ name: '', email: '', details: '' });
      await fetchAll();
    } catch (err: any) { setError(err.message || 'Update failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    try {
      const res = await fetch(apiPath(`/api/records/${id}`), { method: 'DELETE', headers });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      await fetchAll();
    } catch (err: any) { setError(err.message || 'Delete failed'); }
  };

  return (
    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-200">App Records</h3>
        <div className="text-xs text-slate-400">Manage application records stored in Snowflake</div>
      </div>

      {error && <div className="mb-3 text-rose-300 text-sm">{error}</div>}

      <form onSubmit={editingId ? handleUpdate : handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Name" className="p-2 bg-slate-900 border border-slate-800 rounded text-sm" />
        <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Email" className="p-2 bg-slate-900 border border-slate-800 rounded text-sm" />
        <div className="flex gap-2">
          <input value={form.details} onChange={(e) => setForm({...form, details: e.target.value})} placeholder="Details" className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded text-sm" />
          <button type="submit" className="px-3 py-2 bg-blue-600 rounded text-white text-sm flex items-center gap-2">{editingId ? <><Edit2 className="h-4 w-4"/> Update</> : <><Plus className="h-4 w-4"/> Add</>}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({name:'',email:'',details:''}); }} className="px-2 py-2 bg-slate-800 rounded text-slate-300"><X className="h-4 w-4"/></button>}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Details</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-slate-900/30">
                <td className="p-2 font-medium">{r.name}</td>
                <td className="p-2 font-mono text-slate-300">{r.email}</td>
                <td className="p-2">{r.details}</td>
                <td className="p-2 text-xs text-slate-500">{r.created_at || '-'}</td>
                <td className="p-2 text-sm flex gap-2">
                  <button onClick={() => startEdit(r)} className="p-1 bg-slate-900 border border-slate-800 rounded text-slate-300"><Edit2 className="h-4 w-4"/></button>
                  <button onClick={() => handleDelete(r.id)} className="p-1 bg-rose-900 border border-rose-800 rounded text-rose-300"><Trash2 className="h-4 w-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
