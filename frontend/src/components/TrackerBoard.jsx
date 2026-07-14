import React, { useState, useEffect, useMemo } from 'react';

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const STATUSES = [
  { id: 'applied',   label: 'Applied',    color: 'bg-sky-500/15 border-sky-500/30 text-sky-300',      dot: 'bg-sky-400' },
  { id: 'interview', label: 'Interview',  color: 'bg-violet-500/15 border-violet-500/30 text-violet-300', dot: 'bg-violet-400' },
  { id: 'offer',     label: 'Offer 🎉',   color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300', dot: 'bg-emerald-400' },
  { id: 'follow_up', label: 'Follow Up',  color: 'bg-amber-500/15 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
  { id: 'rejected',  label: 'Rejected',   color: 'bg-rose-500/15 border-rose-500/30 text-rose-300',    dot: 'bg-rose-400' },
];

const statusMeta = (id) => STATUSES.find(s => s.id === id) || STATUSES[0];

const SORT_OPTIONS = [
  { id: 'date_desc',    label: 'Date (newest)' },
  { id: 'date_asc',     label: 'Date (oldest)' },
  { id: 'company',      label: 'Company A–Z' },
  { id: 'match_desc',   label: 'Match % (high)' },
];

/* ─── Stats Summary ─────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon, color }) => (
  <div className={`flex items-center space-x-4 bg-slate-900/40 border rounded-2xl p-4 ${color}`}>
    <div className="text-2xl">{icon}</div>
    <div>
      <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
    </div>
  </div>
);

/* ─── Status Badge ───────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const meta = statusMeta(status);
  return (
    <span className={`inline-flex items-center space-x-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      <span>{meta.label}</span>
    </span>
  );
};

/* ─── Match Ring ─────────────────────────────────────────────────────────────── */
const MatchRing = ({ value }) => {
  if (!value && value !== 0) return <span className="text-xs text-slate-600">—</span>;
  const color = value >= 75 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-rose-400';
  return <span className={`text-sm font-bold font-mono ${color}`}>{Math.round(value)}%</span>;
};

/* ─── Add / Edit Modal ───────────────────────────────────────────────────────── */
const ApplicationModal = ({ initial, onClose, onSave }) => {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    company: initial?.company || '',
    position: initial?.position || '',
    status: initial?.status || 'applied',
    applied_date: initial?.applied_date || today,
    match_percent: initial?.match_percent || '',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));
  const isEdit = !!initial?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.position.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      match_percent: form.match_percent !== '' ? parseFloat(form.match_percent) : null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">{isEdit ? 'Edit Application' : 'Add Application'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl transition">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company *</label>
              <input
                value={form.company}
                onChange={e => set('company', e.target.value)}
                required
                placeholder="e.g. Stripe"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 outline-none transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Position *</label>
              <input
                value={form.position}
                onChange={e => set('position', e.target.value)}
                required
                placeholder="e.g. Senior Engineer"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-white outline-none transition"
              >
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Applied Date</label>
              <input
                type="date"
                value={form.applied_date}
                onChange={e => set('applied_date', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-white outline-none transition [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Match % (optional)</label>
            <input
              type="number"
              min="0" max="100"
              value={form.match_percent}
              onChange={e => set('match_percent', e.target.value)}
              placeholder="e.g. 82"
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Recruiter name, interview notes, referral contact..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 outline-none transition resize-none leading-relaxed"
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition shadow-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const TrackerBoard = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', app: {...} }
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  /* ── Fetch ── */
  const fetchApplications = async () => {
    try {
      const res = await fetch('http://localhost:8000/tracker');
      if (!res.ok) throw new Error('Failed to load applications.');
      setApplications(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, []);

  /* ── Create ── */
  const handleCreate = async (data) => {
    const res = await fetch('http://localhost:8000/tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) { const app = await res.json(); setApplications(prev => [app, ...prev]); }
  };

  /* ── Update ── */
  const handleUpdate = async (id, data) => {
    const res = await fetch(`http://localhost:8000/tracker/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setApplications(prev => prev.map(a => a.id === id ? updated : a));
    }
  };

  /* ── Quick Status Change ── */
  const handleStatusChange = (id, newStatus) => handleUpdate(id, { status: newStatus });

  /* ── Delete ── */
  const handleDelete = async (id) => {
    setDeletingId(id);
    const res = await fetch(`http://localhost:8000/tracker/${id}`, { method: 'DELETE' });
    if (res.ok) setApplications(prev => prev.filter(a => a.id !== id));
    setDeletingId(null);
  };

  /* ── Derived data ── */
  const stats = useMemo(() => ({
    total: applications.length,
    interview: applications.filter(a => a.status === 'interview').length,
    offer: applications.filter(a => a.status === 'offer').length,
    avgMatch: applications.filter(a => a.match_percent).length
      ? Math.round(applications.filter(a => a.match_percent).reduce((s, a) => s + a.match_percent, 0) / applications.filter(a => a.match_percent).length)
      : null,
  }), [applications]);

  const filtered = useMemo(() => {
    let list = [...applications];
    if (filterStatus !== 'all') list = list.filter(a => a.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case 'date_asc':   return list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'company':    return list.sort((a, b) => a.company.localeCompare(b.company));
      case 'match_desc': return list.sort((a, b) => (b.match_percent || 0) - (a.match_percent || 0));
      default:           return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }, [applications, filterStatus, searchQuery, sortBy]);

  /* ── Render ── */
  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
            Application Tracker
          </h2>
          <p className="text-slate-400 text-sm">Track every application from first send to final offer.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-500/20 transition"
        >
          <span className="text-lg">+</span>
          <span>Add Application</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Applied" value={stats.total} icon="📋" color="border-slate-700/60" />
        <StatCard label="Interviews" value={stats.interview} icon="🎙️" color="border-violet-700/40" />
        <StatCard label="Offers" value={stats.offer} icon="🎉" color="border-emerald-700/40" />
        <StatCard label="Avg. Match" value={stats.avgMatch !== null ? `${stats.avgMatch}%` : '—'} icon="🎯" color="border-indigo-700/40" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-2.5 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search company or position..."
            className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-slate-600 outline-none transition"
          />
        </div>

        {/* Status filter */}
        <div className="flex space-x-1.5 flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus('all')}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition ${filterStatus === 'all' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}
          >
            All ({applications.length})
          </button>
          {STATUSES.map(s => {
            const count = applications.filter(a => a.status === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition ${filterStatus === s.id ? `${s.color}` : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none"
        >
          {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading applications...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5 text-rose-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-slate-900/20 border border-slate-800/50 rounded-2xl p-14 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-white mb-2">
            {applications.length === 0 ? 'No applications yet' : 'No matches for your filters'}
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            {applications.length === 0
              ? 'Click "Add Application" to start tracking your job hunt.'
              : 'Try clearing the search or status filter.'}
          </p>
          {applications.length === 0 && (
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition"
            >
              + Add First Application
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Company & Role</th>
                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3.5">Status</th>
                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3.5">Match</th>
                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3.5">Applied</th>
                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3.5">Notes</th>
                <th className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-800/20 transition group">
                  {/* Company + Role */}
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{app.company}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{app.position}</p>
                  </td>

                  {/* Status — inline styled select */}
                  <td className="px-4 py-4">
                    <select
                      value={app.status}
                      onChange={e => handleStatusChange(app.id, e.target.value)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer outline-none transition ${statusMeta(app.status).color}`}
                      style={{ backgroundColor: 'transparent' }}
                    >
                      {STATUSES.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: '#0f172a' }}>{s.label}</option>)}
                    </select>
                  </td>

                  {/* Match % */}
                  <td className="px-4 py-4">
                    <MatchRing value={app.match_percent} />
                  </td>

                  {/* Applied Date */}
                  <td className="px-4 py-4 text-xs text-slate-400 whitespace-nowrap">
                    {app.applied_date || '—'}
                  </td>

                  {/* Notes preview */}
                  <td className="px-4 py-4 max-w-[200px]">
                    <p className="text-xs text-slate-400 truncate" title={app.notes}>
                      {app.notes || <span className="text-slate-700 italic">No notes</span>}
                    </p>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => setModal({ mode: 'edit', app })}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-white transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(app.id)}
                        disabled={deletingId === app.id}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-600/40 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 transition disabled:opacity-40"
                      >
                        {deletingId === app.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table footer */}
          <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/30 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {filtered.length} of {applications.length} application{applications.length !== 1 ? 's' : ''}
            </p>
            <p className="text-[10px] text-slate-600">Click a row's Edit button to update status or add notes</p>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal?.mode === 'add' && (
        <ApplicationModal
          onClose={() => setModal(null)}
          onSave={handleCreate}
        />
      )}
      {modal?.mode === 'edit' && (
        <ApplicationModal
          initial={modal.app}
          onClose={() => setModal(null)}
          onSave={(data) => handleUpdate(modal.app.id, data)}
        />
      )}
    </div>
  );
};

export default TrackerBoard;
