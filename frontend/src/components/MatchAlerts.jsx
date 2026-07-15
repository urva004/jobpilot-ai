import React, { useState, useEffect } from 'react';
import EmailApply from './EmailApply';

const MatchAlerts = ({ onRefreshUnread }) => {
  const [settings, setSettings] = useState({
    keywords: '',
    location: '',
    remote_only: false,
    match_threshold: 70,
    interval_hours: 24,
    experience_level: 'any',
    is_enabled: true,
    last_run: null,
  });

  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState(null);
  const [simulatedEmail, setSimulatedEmail] = useState(false);
  const [viewingJob, setViewingJob] = useState(null);
  const [viewingJobLoading, setViewingJobLoading] = useState(false);
  const [activeEmailJob, setActiveEmailJob] = useState(null);
  const [customDraft, setCustomDraft] = useState(null);
  const [generatingFollowUp, setGeneratingFollowUp] = useState({});

  // Fetch settings & notifications
  const fetchData = async () => {
    try {
      const sRes = await fetch('http://localhost:8000/scheduler/settings');
      if (sRes.ok) {
        setSettings(await sRes.json());
      }
      
      const nRes = await fetch('http://localhost:8000/notifications');
      if (nRes.ok) {
        const notifs = await nRes.json();
        setNotifications(notifs);
        if (onRefreshUnread) {
          const unread = notifs.filter(n => !n.is_read).length;
          onRefreshUnread(unread);
        }
      }
    } catch (e) {
      console.error('Error fetching alerts data:', e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save scheduler settings
  const handleSaveSettings = async (updatedFields) => {
    setSavingSettings(true);
    const newSettings = { ...settings, ...updatedFields };
    try {
      const res = await fetch('http://localhost:8000/scheduler/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (e) {
      console.error('Error saving settings:', e);
    } finally {
      setSavingSettings(false);
    }
  };

  // Trigger scheduler manually
  const handleTriggerScheduler = async () => {
    setTriggeringScheduler(true);
    setSchedulerResult(null);
    try {
      const res = await fetch('http://localhost:8000/scheduler/trigger', {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        setSchedulerResult(result);
        fetchData(); // reload notifications
      } else {
        const err = await res.json();
        setSchedulerResult({ status: 'error', reason: err.detail || 'Failed to trigger matching.' });
      }
    } catch (e) {
      setSchedulerResult({ status: 'error', reason: e.message });
    } finally {
      setTriggeringScheduler(false);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/notifications/${id}/read`, {
        method: 'POST',
      });
      if (res.ok) {
        // Update local list
        const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
        setNotifications(updated);
        if (onRefreshUnread) {
          onRefreshUnread(updated.filter(n => !n.is_read).length);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('http://localhost:8000/notifications/read-all', {
        method: 'POST',
      });
      if (res.ok) {
        const updated = notifications.map(n => ({ ...n, is_read: true }));
        setNotifications(updated);
        if (onRefreshUnread) {
          onRefreshUnread(0);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewJob = async (jobId) => {
    setViewingJobLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingJob(data);
      } else {
        alert("Failed to load job details.");
      }
    } catch (e) {
      console.error("Error viewing job:", e);
      alert("Error loading job details.");
    } finally {
      setViewingJobLoading(false);
    }
  };

  const handleGenerateFollowUp = async (jobId, notifId) => {
    setGeneratingFollowUp(prev => ({ ...prev, [notifId]: true }));
    try {
      // 1. Fetch job details first to pass to EmailApply
      const jobRes = await fetch(`http://localhost:8000/jobs/${jobId}`);
      if (!jobRes.ok) throw new Error("Failed to fetch job details");
      const jobData = await jobRes.json();

      // 2. Fetch the follow-up email draft
      const emailRes = await fetch('http://localhost:8000/generate/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          email_type: 'followup'
        })
      });
      if (!emailRes.ok) throw new Error("Failed to generate follow-up draft");
      const emailData = await emailRes.json();

      // 3. Extract recruiter email candidate if available
      let toEmail = '';
      if (jobData.description) {
        // Simple client-side regex check or default to first email found
        const emailPattern = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
        const matches = jobData.description.match(emailPattern);
        if (matches && matches.length > 0) {
          toEmail = matches[0];
        }
      }

      // 4. Set states to open EmailApply modal with preloaded text
      setCustomDraft({
        to_email: toEmail,
        subject: emailData.subject,
        body: emailData.body,
        suggested_variant: 'none', // Base resume for follow-ups by default
      });
      setActiveEmailJob(jobData);
    } catch (err) {
      alert("Error generating follow-up email: " + err.message);
    } finally {
      setGeneratingFollowUp(prev => ({ ...prev, [notifId]: false }));
    }
  };

  const formattedLastRun = settings.last_run
    ? new Date(settings.last_run).toLocaleString()
    : 'Never';

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      {/* Page Header */}
      <div className="mb-10 text-left animate-fadeIn">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent mb-2">
          Match Alerts & Cron Scheduler
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Set up daily background sweeps for high-matching job opportunities. Receive simulated alerts when matches hit your threshold.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Settings Panel (Col span 2) ── */}
        <div className="lg:col-span-2 space-y-4 animate-fadeIn">
          <div className="glass-card p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Scheduler Config</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_enabled}
                  onChange={(e) => handleSaveSettings({ is_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {settings.is_enabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            <hr style={{ borderColor: 'var(--border-subtle)' }} />

            <div className="space-y-4 opacity-100 transition-opacity">
              {/* Keywords */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Search Keywords (comma separated)</label>
                <input
                  type="text"
                  value={settings.keywords}
                  onChange={(e) => setSettings({ ...settings, keywords: e.target.value })}
                  onBlur={() => handleSaveSettings({ keywords: settings.keywords })}
                  placeholder="e.g. Python, React, Remote"
                  className="input-base"
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Target Location</label>
                  <input
                    type="text"
                    value={settings.location}
                    onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                    onBlur={() => handleSaveSettings({ location: settings.location })}
                    placeholder="e.g. India"
                    className="input-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Interval Hours</label>
                  <select
                    value={settings.interval_hours}
                    onChange={(e) => handleSaveSettings({ interval_hours: parseFloat(e.target.value) })}
                    className="input-base cursor-pointer"
                  >
                    <option value="1" style={{ color: 'black' }}>1 hour (Testing)</option>
                    <option value="6" style={{ color: 'black' }}>6 hours</option>
                    <option value="12" style={{ color: 'black' }}>12 hours</option>
                    <option value="24" style={{ color: 'black' }}>24 hours (Daily)</option>
                  </select>
                </div>
              </div>

              {/* Slider for match score threshold */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Min Match Threshold</label>
                  <span className="text-xs font-mono font-bold text-teal-400">{settings.match_threshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={settings.match_threshold}
                  onChange={(e) => setSettings({ ...settings, match_threshold: parseInt(e.target.value) })}
                  onMouseUp={() => handleSaveSettings({ match_threshold: settings.match_threshold })}
                  onTouchEnd={() => handleSaveSettings({ match_threshold: settings.match_threshold })}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-500 outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center space-x-3 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={settings.remote_only}
                    onChange={(e) => handleSaveSettings({ remote_only: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Remote Jobs Only</span>
                </label>

                {/* Experience Level filter */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Experience Level Filter</label>
                  <select
                    value={settings.experience_level || 'any'}
                    onChange={(e) => handleSaveSettings({ experience_level: e.target.value })}
                    className="input-base cursor-pointer"
                  >
                    <option value="any" style={{ color: 'black' }}>Any Experience Level</option>
                    <option value="fresher" style={{ color: 'black' }}>Fresher (0-1 yrs)</option>
                    <option value="1_2_years" style={{ color: 'black' }}>1-2 Years</option>
                    <option value="3_5_years" style={{ color: 'black' }}>3-5 Years</option>
                    <option value="5_plus_years" style={{ color: 'black' }}>5+ Years (Senior)</option>
                  </select>
                </div>

                <label className="flex items-center space-x-3 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={simulatedEmail}
                    onChange={(e) => setSimulatedEmail(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Simulate email/push matching alerts</span>
                </label>
              </div>

              {/* Save Status / Last Run */}
              <div className="border rounded-xl p-3.5 space-y-2 font-mono text-[10px]" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <div className="flex justify-between">
                  <span>Last run check:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{formattedLastRun}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frequency:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Every {settings.interval_hours} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Saving status:</span>
                  <span className={savingSettings ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {savingSettings ? 'Saving settings...' : 'All changes saved.'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleTriggerScheduler}
                  disabled={triggeringScheduler}
                  className="w-full btn-primary bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-lg"
                >
                  {triggeringScheduler ? (
                    <>
                      <div className="spinner w-4 h-4 border-t-white" />
                      <span>Scanning Jobs...</span>
                    </>
                  ) : (
                    <span>⚡ Trigger Sync Now</span>
                  )}
                </button>

                {simulatedEmail && (
                  <div className="bg-teal-500/5 border border-teal-500/20 text-teal-300 rounded-xl p-3 text-xs leading-relaxed animate-fadeIn">
                    📧 Mock Alert configured. Emails will be logged to dashboard notifications and terminal stdout.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trigger Result Card */}
          {schedulerResult && (
            <div className={`border rounded-2xl p-4 space-y-2 text-xs entrance-anim ${
              schedulerResult.status === 'success'
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
            }`}>
              <h4 className="font-bold uppercase tracking-wider">Run Summary</h4>
              {schedulerResult.status === 'success' ? (
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span>New jobs scanned:</span>
                    <span>{schedulerResult.jobs_scanned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High matches found:</span>
                    <span>{schedulerResult.high_matches_found}</span>
                  </div>
                  {schedulerResult.notifications_created.length > 0 ? (
                    <div className="pt-2 border-t border-emerald-500/20 space-y-1">
                      <p className="font-semibold text-emerald-400">Created Alerts:</p>
                      {schedulerResult.notifications_created.map((item, idx) => (
                        <p key={idx} className="truncate">
                          🔔 {item.company} — {item.match}%
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic mt-1.5">No new jobs exceeded the match threshold.</p>
                  )}
                </div>
              ) : (
                <p className="font-mono">{schedulerResult.reason}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Notification Feed (Col span 3) ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card overflow-hidden shadow-lg border">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-950/20" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Alert Center</span>
                <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {notifications.filter(n => !n.is_read).length} new
                </span>
              </div>
              {notifications.some(n => !n.is_read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] transition font-bold"
                  style={{ color: 'var(--text-link)' }}
                >
                  ✓ Mark all as read
                </button>
              )}
            </div>

            {/* Notification List */}
            {loadingNotifs ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="spinner w-8 h-8 border-t-teal-400" />
                <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>Loading alerts...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-14 text-center empty-state animate-fadeIn">
                <div className="empty-state-icon">📭</div>
                <h4 className="empty-state-title">No alerts recorded</h4>
                <p className="empty-state-body">
                  Trigger a sync manually or configure your keywords to begin generating automatic match notifications.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[580px] overflow-y-auto">
                {notifications.map((notif, idx) => {
                  const notifDate = new Date(notif.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const delayClass = idx < 10 ? `delay-${idx * 50}` : '';
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 transition flex items-start space-x-3.5 group relative entrance-anim ${delayClass} ${
                        notif.is_read ? 'opacity-65 hover:opacity-100' : 'bg-teal-500/[0.02]'
                      }`}
                    >
                      {/* Left Badge/Icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border ${
                        notif.is_read
                          ? 'bg-slate-800 border-slate-700/50 text-slate-500'
                          : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                      }`}>
                        {notif.is_read ? '✓' : '🔔'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <p className={`text-xs font-bold ${notif.is_read ? 'text-slate-300' : 'text-white'}`}
                             style={{ color: notif.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                            {notif.title}
                          </p>
                          {notif.match_percent && (
                            <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              {Math.round(notif.match_percent)}% Match
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{notif.message}</p>
                        {/* Company / Location row */}
                        {(notif.company || notif.location) && (
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {notif.company && <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{notif.company}</span>}
                            {notif.company && notif.location && <span className="mx-1">·</span>}
                            {notif.location && <span>{notif.location}</span>}
                          </p>
                        )}
                        <p className="text-[9px] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>{notifDate}</p>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {notif.apply_url && (
                            <a
                              href={notif.apply_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary text-[10px] py-1 px-3 shadow"
                            >
                              Apply →
                            </a>
                          )}
                          {notif.job_id && (
                            <button
                              onClick={() => handleViewJob(notif.job_id)}
                              className="btn-secondary text-[10px]"
                            >
                              🔎 View Job
                            </button>
                          )}
                          {notif.title?.startsWith("Follow-Up Reminder") && notif.job_id && (
                            <button
                              onClick={() => handleGenerateFollowUp(notif.job_id, notif.id)}
                              disabled={generatingFollowUp[notif.id]}
                              className="btn-primary text-[10px] py-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow"
                            >
                              {generatingFollowUp[notif.id] ? "⏳ Generating..." : "✉️ Generate Follow-Up"}
                            </button>
                          )}
                          {!notif.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="btn-secondary text-[10px] hover:border-teal-600 hover:text-white"
                            >
                              ✓ Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Job Detail Drawer (Steps 3) ── */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setViewingJob(null)} />
          {/* Panel */}
          <div className="w-full max-w-2xl bg-slate-950 flex flex-col shadow-2xl overflow-hidden animate-fadeIn border-l"
               style={{
                 background: 'var(--bg-elevated)',
                 borderColor: 'var(--border)'
               }}>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-900/20" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{viewingJob.title}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{viewingJob.company} · {viewingJob.location}</p>
              </div>
              <button
                onClick={() => setViewingJob(null)}
                className="text-slate-500 hover:text-white text-xl transition"
              >×</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Match badge if available */}
              {viewingJob.match_data?.match_percent != null && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="24" cy="24" r="20" className="fill-none" stroke="var(--border-subtle)" strokeWidth="3" />
                      <circle cx="24" cy="24" r="20" className="fill-none stroke-emerald-400" strokeWidth="3"
                        strokeDasharray="126" strokeDashoffset={126 - (126 * viewingJob.match_data.match_percent) / 100}
                        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                      {Math.round(viewingJob.match_data.match_percent)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-300">Cached match score</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Based on vector similarity computed during last scheduler run</p>
                  </div>
                </div>
              )}

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                {viewingJob.salary_range && viewingJob.salary_range !== 'Not Specified' && (
                  <span className="px-2.5 py-1 rounded-lg border text-slate-300" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>💰 {viewingJob.salary_range}</span>
                )}
                {viewingJob.remote && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">🌐 Remote</span>
                )}
                {viewingJob.source && (
                  <span className="px-2.5 py-1 rounded-lg border uppercase font-bold text-slate-400" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>{viewingJob.source}</span>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Job Description</h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {viewingJob.description || 'No description available.'}
                </p>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-glass)' }}>
              {viewingJob.apply_url && (
                <a
                  href={viewingJob.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-grow btn-primary text-center text-sm py-2.5 shadow"
                >
                  Apply Directly →
                </a>
              )}
              <button
                onClick={() => setViewingJob(null)}
                className="flex-grow btn-secondary text-center text-sm py-2.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {activeEmailJob && (
        <EmailApply
          job={activeEmailJob}
          preloadedDraft={customDraft}
          onClose={() => {
            setActiveEmailJob(null);
            setCustomDraft(null);
          }}
          onSuccess={() => {
            // Reload alerts/notifications count
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default MatchAlerts;
