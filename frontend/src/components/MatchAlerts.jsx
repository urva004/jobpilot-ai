import React, { useState, useEffect } from 'react';

const MatchAlerts = ({ onRefreshUnread }) => {
  const [settings, setSettings] = useState({
    keywords: '',
    location: '',
    remote_only: false,
    match_threshold: 70,
    interval_hours: 24,
    is_enabled: true,
    last_run: null,
  });

  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState(null);
  const [simulatedEmail, setSimulatedEmail] = useState(false);

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

  const formattedLastRun = settings.last_run
    ? new Date(settings.last_run).toLocaleString()
    : 'Never';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent mb-2">
            Match Alerts & Cron Scheduler
          </h2>
          <p className="text-slate-400">
            Set up daily background sweeps for high-matching job opportunities. Receive simulated alerts when matches hit your threshold.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Settings Panel (Col span 2) ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduler Config</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_enabled}
                  onChange={(e) => handleSaveSettings({ is_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                <span className="ml-2 text-xs font-medium text-slate-300">
                  {settings.is_enabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            <hr className="border-slate-800" />

            <div className="space-y-4 opacity-100 transition-opacity">
              {/* Keywords */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search Keywords (comma separated)</label>
                <input
                  type="text"
                  value={settings.keywords}
                  onChange={(e) => setSettings({ ...settings, keywords: e.target.value })}
                  onBlur={() => handleSaveSettings({ keywords: settings.keywords })}
                  placeholder="e.g. Python, React, Remote"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition"
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Location</label>
                  <input
                    type="text"
                    value={settings.location}
                    onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                    onBlur={() => handleSaveSettings({ location: settings.location })}
                    placeholder="e.g. India"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interval Hours</label>
                  <select
                    value={settings.interval_hours}
                    onChange={(e) => handleSaveSettings({ interval_hours: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 rounded-xl py-2 px-3 text-sm text-white outline-none transition"
                  >
                    <option value="1">1 hour (Testing)</option>
                    <option value="6">6 hours</option>
                    <option value="12">12 hours</option>
                    <option value="24">24 hours (Daily)</option>
                  </select>
                </div>
              </div>

              {/* Slider for match score threshold */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Min Match Threshold</label>
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
                <label className="flex items-center space-x-3 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.remote_only}
                    onChange={(e) => handleSaveSettings({ remote_only: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Remote Jobs Only</span>
                </label>

                <label className="flex items-center space-x-3 text-xs text-slate-300 cursor-pointer">
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
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2 font-mono text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>Last run check:</span>
                  <span className="text-slate-300">{formattedLastRun}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frequency:</span>
                  <span className="text-slate-300">Every {settings.interval_hours} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Saving status:</span>
                  <span className={savingSettings ? 'text-amber-400' : 'text-emerald-400'}>
                    {savingSettings ? 'Saving settings...' : 'All changes saved.'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleTriggerScheduler}
                  disabled={triggeringScheduler}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold py-2.5 rounded-xl transition shadow-lg disabled:opacity-40"
                >
                  {triggeringScheduler ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Scanning Jobs...</span>
                    </>
                  ) : (
                    <span>⚡ Trigger Sync Now</span>
                  )}
                </button>

                {simulatedEmail && (
                  <div className="bg-teal-500/5 border border-teal-500/20 text-teal-300 rounded-xl p-3 text-xs leading-relaxed animate-fade-in">
                    📧 Mock Alert configured. Emails will be logged to dashboard notifications and terminal stdout.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trigger Result Card */}
          {schedulerResult && (
            <div className={`border rounded-2xl p-4 space-y-2 text-xs ${
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
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-950/50 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Alert Center</span>
                <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {notifications.filter(n => !n.is_read).length} new
                </span>
              </div>
              {notifications.some(n => !n.is_read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-slate-500 hover:text-white transition font-semibold"
                >
                  ✓ Mark all as read
                </button>
              )}
            </div>

            {/* Notification List */}
            {loadingNotifs ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-8 h-8 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
                <p className="text-xs text-slate-400 font-mono">Loading alerts...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-14 text-center">
                <div className="text-4xl mb-4">📭</div>
                <h4 className="text-sm font-bold text-white mb-1">No alerts recorded</h4>
                <p className="text-slate-400 text-xs max-w-xs mx-auto">
                  Trigger a sync manually or configure your keywords to begin generating automatic match notifications.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-[580px] overflow-y-auto">
                {notifications.map((notif) => {
                  const notifDate = new Date(notif.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 transition flex items-start space-x-3.5 group relative ${
                        notif.is_read ? 'opacity-65 hover:opacity-100' : 'bg-teal-500/[0.02]'
                      }`}
                    >
                      {/* Left Badge/Icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                        notif.is_read
                          ? 'bg-slate-800 border border-slate-700/50 text-slate-500'
                          : 'bg-teal-500/10 border border-teal-500/30 text-teal-400'
                      }`}>
                        {notif.is_read ? '✓' : '🔔'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-12">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <p className={`text-xs font-semibold ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                            {notif.title}
                          </p>
                          {notif.match_percent && (
                            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              {Math.round(notif.match_percent)}% Match
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                        <p className="text-[9px] text-slate-500 mt-1.5 font-mono">{notifDate}</p>
                      </div>

                      {/* Right Read Button */}
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="absolute right-4 top-4 text-[9px] font-bold px-2 py-0.8 rounded bg-slate-800 hover:bg-teal-600 border border-slate-700 hover:border-teal-500 text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchAlerts;
