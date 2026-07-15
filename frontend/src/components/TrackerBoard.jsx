import React, { useState, useEffect, useMemo } from 'react';

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const STATUSES = [
  { id: 'applied',   label: 'Applied',    color: 'bg-sky-500/10 border-sky-500/30 text-sky-300',      dot: 'bg-sky-400' },
  { id: 'interview', label: 'Interview',  color: 'bg-violet-500/10 border-violet-500/30 text-violet-300', dot: 'bg-violet-400' },
  { id: 'offer',     label: 'Offer 🎉',   color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', dot: 'bg-emerald-400' },
  { id: 'follow_up', label: 'Follow Up',  color: 'bg-amber-500/10 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
  { id: 'rejected',  label: 'Rejected',   color: 'bg-rose-500/10 border-rose-500/30 text-rose-300',    dot: 'bg-rose-400' },
];

const statusMeta = (id) => STATUSES.find(s => s.id === id) || STATUSES[0];

const SORT_OPTIONS = [
  { id: 'date_desc',    label: 'Date (newest)' },
  { id: 'date_asc',     label: 'Date (oldest)' },
  { id: 'company',      label: 'Company A–Z' },
  { id: 'match_desc',   label: 'Match % (high)' },
];

/* ─── Stats Summary ─────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon, delayClass }) => (
  <div className={`flex items-center space-x-4 glass-card p-4 hover-lift shadow-md entrance-anim ${delayClass}`}>
    <div className="text-2xl">{icon}</div>
    <div>
      <p className="text-2xl font-extrabold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  </div>
);

/* ─── Match Ring ─────────────────────────────────────────────────────────────── */
const MatchRing = ({ value }) => {
  if (!value && value !== 0) return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>;
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
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-fadeIn" onClick={onClose} />

      {/* Modal */}
      <div className="relative border rounded-2xl shadow-2xl w-full max-w-md z-10 glass-card animate-fadeIn overflow-hidden"
           style={{
             background: 'var(--bg-elevated)',
             borderColor: 'var(--border)'
           }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{isEdit ? 'Edit Application' : 'Add Application'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl transition">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Company *</label>
              <input
                value={form.company}
                onChange={e => set('company', e.target.value)}
                required
                placeholder="e.g. Stripe"
                className="input-base"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Position *</label>
              <input
                value={form.position}
                onChange={e => set('position', e.target.value)}
                required
                placeholder="e.g. Senior Engineer"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="input-base cursor-pointer"
              >
                {STATUSES.map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Applied Date</label>
              <input
                type="date"
                value={form.applied_date}
                onChange={e => set('applied_date', e.target.value)}
                className="input-base [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Match % (optional)</label>
            <input
              type="number"
              min="0" max="100"
              value={form.match_percent}
              onChange={e => set('match_percent', e.target.value)}
              placeholder="e.g. 82"
              className="input-base"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Recruiter name, interview notes, referral contact..."
              className="input-base resize-none"
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 py-2.5"
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

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4 animate-fadeIn">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
            Application Tracker
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Track every application from first send to final offer.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="btn-primary"
        >
          <span className="text-lg">+</span>
          <span>Add Application</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Applied" value={stats.total} icon="📋" delayClass="delay-50" />
        <StatCard label="Interviews" value={stats.interview} icon="🎙️" delayClass="delay-100" />
        <StatCard label="Offers" value={stats.offer} icon="🎉" delayClass="delay-150" />
        <StatCard label="Avg. Match" value={stats.avgMatch !== null ? `${stats.avgMatch}%` : '—'} icon="🎯" delayClass="delay-200" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-fadeIn delay-100">
        {/* Search */}
        <div className="input-icon-wrapper flex-grow md:max-w-sm">
          <span className="input-icon text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search company or position..."
            className="input-base py-2"
          />
        </div>

        {/* Status filter */}
        <div className="flex space-x-1.5 flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus('all')}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition ${
              filterStatus === 'all'
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                : 'border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            All ({applications.length})
          </button>
          {STATUSES.map(s => {
            const count = applications.filter(a => a.status === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition ${
                  filterStatus === s.id
                    ? `${s.color}`
                    : 'border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
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
          className="input-base w-auto py-2 text-xs cursor-pointer ml-auto"
        >
          {SORT_OPTIONS.map(o => <option key={o.id} value={o.id} style={{ color: 'black' }}>{o.label}</option>)}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="spinner w-8 h-8 border-t-indigo-500" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading applications...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5 text-rose-300 text-sm animate-fadeIn">
          ⚠️ {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="glass-card p-14 text-center empty-state animate-fadeIn">
          <div className="empty-state-icon">📭</div>
          <h3 className="empty-state-title">
            {applications.length === 0 ? 'No applications yet' : 'No matches for your filters'}
          </h3>
          <p className="empty-state-body">
            {applications.length === 0
              ? 'Click "Add Application" to start tracking your job hunt.'
              : 'Try clearing the search or status filter.'}
          </p>
          {applications.length === 0 && (
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="btn-primary"
            >
              + Add First Application
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="glass-card overflow-hidden shadow-lg border entrance-anim delay-150">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>
                  <th className="text-left text-[9px] font-bold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-muted)' }}>Company & Role</th>
                  <th className="text-left text-[9px] font-bold uppercase tracking-wider px-4 py-3.5" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="text-left text-[9px] font-bold uppercase tracking-wider px-4 py-3.5" style={{ color: 'var(--text-muted)' }}>Match</th>
                  <th className="text-left text-[9px] font-bold uppercase tracking-wider px-4 py-3.5" style={{ color: 'var(--text-muted)' }}>Applied</th>
                  <th className="text-left text-[9px] font-bold uppercase tracking-wider px-4 py-3.5" style={{ color: 'var(--text-muted)' }}>Notes</th>
                  <th className="text-right text-[9px] font-bold uppercase tracking-wider px-5 py-3.5" style={{ color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map((app, idx) => (
                  <tr key={app.id} className="hover:bg-slate-800/10 transition group">
                    {/* Company + Role */}
                    <td className="px-5 py-4">
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{app.company}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{app.position}</p>
                    </td>

                    {/* Status — inline styled select */}
                    <td className="px-4 py-4">
                      <select
                        value={app.status}
                        onChange={e => handleStatusChange(app.id, e.target.value)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border cursor-pointer outline-none transition ${statusMeta(app.status).color}`}
                        style={{ backgroundColor: 'transparent' }}
                      >
                        {STATUSES.map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.label}</option>)}
                      </select>
                    </td>

                    {/* Match % */}
                    <td className="px-4 py-4">
                      <MatchRing value={app.match_percent} />
                    </td>

                    {/* Applied Date */}
                    <td className="px-4 py-4 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {app.applied_date || '—'}
                    </td>

                    {/* Notes preview */}
                    <td className="px-4 py-4 max-w-[200px]">
                      <p className="text-xs truncate" title={app.notes} style={{ color: 'var(--text-secondary)' }}>
                        {app.notes || <span className="italic" style={{ color: 'var(--text-muted)' }}>No notes</span>}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition duration-200">
                        <button
                          onClick={() => setModal({ mode: 'edit', app })}
                          className="btn-secondary text-[10px]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          disabled={deletingId === app.id}
                          className="btn-ghost text-[10px] hover:border-rose-500/50 hover:text-rose-300"
                        >
                          {deletingId === app.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-glass)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} of {applications.length} application{applications.length !== 1 ? 's' : ''}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Click a row's Edit button to update status or add notes</p>
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
