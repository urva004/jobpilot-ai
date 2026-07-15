import React, { useState, useEffect } from 'react';

const EmailApply = ({ job, onClose, onSuccess, preloadedDraft = null }) => {
  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: '' });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [dailyCount, setDailyCount] = useState({ count: 0, limit: 15 });

  // Draft fields
  const [toEmail, setToEmail] = useState('');
  const [contactEmails, setContactEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [baseAttachmentName, setBaseAttachmentName] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('none'); // none | backend | ai_ml | data

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Fetch Gmail connection status & daily limit count
  const fetchGmailStatusAndLimit = async () => {
    try {
      const statusRes = await fetch('http://localhost:8000/gmail/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setGmailStatus(statusData);

        if (statusData.connected) {
          // Fetch daily limit
          const limitRes = await fetch('http://localhost:8000/gmail/daily-count');
          if (limitRes.ok) {
            const limitData = await limitRes.json();
            setDailyCount(limitData);
          }
          // Fetch draft or use preloaded
          if (preloadedDraft) {
            setToEmail(preloadedDraft.to_email || '');
            setSubject(preloadedDraft.subject || '');
            setBody(preloadedDraft.body || '');
            setContactEmails(preloadedDraft.contact_emails || (preloadedDraft.to_email ? [preloadedDraft.to_email] : []));
            if (preloadedDraft.suggested_variant) {
              setSelectedVariant(preloadedDraft.suggested_variant);
            }
          } else {
            fetchDraft();
          }
        }
      }
    } catch (err) {
      console.error('Error fetching Gmail status', err);
      setError('Could not connect to backend server.');
    } finally {
      setLoadingStatus(false);
    }
  };

  // 2. Fetch email draft from backend
  const fetchDraft = async () => {
    setLoadingDraft(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/jobs/${job.id}/draft-application-email`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to generate email draft.');
      }
      const data = await res.json();
      setToEmail(data.to_email || '');
      setContactEmails(data.contact_emails || []);
      setSubject(data.subject || '');
      setBody(data.body || '');
      setBaseAttachmentName(data.attachment_name || 'Resume.pdf');
      if (data.suggested_variant) {
        setSelectedVariant(data.suggested_variant);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDraft(false);
    }
  };

  useEffect(() => {
    fetchGmailStatusAndLimit();
  }, [job.id]);

  // 3. Initiate Google OAuth Flow
  const handleConnectGmail = async () => {
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/gmail/auth');
      if (!res.ok) throw new Error('Failed to get authorization URL.');
      const data = await res.json();
      if (data.auth_url) {
        // Redirect the parent window to Google auth page
        window.location.href = data.auth_url;
      } else {
        throw new Error('No authorization URL returned.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // 4. Disconnect Gmail account
  const handleDisconnectGmail = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Gmail account?')) return;
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/gmail/disconnect', { method: 'POST' });
      if (res.ok) {
        setGmailStatus({ connected: false, email: '' });
        setBody('');
        setSubject('');
        setToEmail('');
      } else {
        throw new Error('Failed to disconnect Gmail.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // 5. Send application email
  const handleSendEmail = async () => {
    if (!toEmail.trim()) {
      setError('Recruiter email (To) is required.');
      return;
    }
    setSending(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/jobs/${job.id}/send-application-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: toEmail.trim(),
          subject: subject.trim(),
          body: body,
          variant: selectedVariant === 'none' ? null : selectedVariant,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to send application email.');
      }

      const data = await res.json();
      setSuccessMsg(data.message);
      
      // Update daily count locally
      setDailyCount(prev => ({ ...prev, count: prev.count + 1 }));

      if (onSuccess) {
        onSuccess();
      }

      // Close modal after brief success presentation
      setTimeout(() => {
        onClose();
      }, 2500);

    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // Determine actual attachment name shown in UI
  const getResolvedAttachmentName = () => {
    if (selectedVariant === 'none') {
      return baseAttachmentName || 'Resume.pdf';
    }
    return `Resume_Tailored_${selectedVariant}.docx`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] glass-card animate-fadeIn"
           style={{
             background: 'var(--bg-elevated)',
             borderColor: 'var(--border)'
           }}>
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-glass)' }}>
          <div className="flex items-center space-x-3">
            <span className="text-xl">✉️</span>
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Apply via Email</h3>
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {job.title} — <span className="text-indigo-400 font-semibold">{job.company}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex flex-col space-y-2 animate-fadeIn">
              <div className="flex items-start space-x-2">
                <span className="text-sm">⚠️</span>
                <span className="flex-1">{error}</span>
              </div>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={sending}
                className="self-start text-[10px] bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/30 text-rose-200 font-bold py-1 px-3 rounded-lg transition disabled:opacity-40"
              >
                🔁 Retry Sending
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start space-x-2 animate-fadeIn">
              <span className="text-sm">✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {loadingStatus ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="spinner w-8 h-8 border-t-indigo-500"></div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Checking Gmail configuration...</p>
            </div>
          ) : !gmailStatus.connected ? (
            /* Disconnected state */
            <div className="py-8 px-4 text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl mx-auto float-anim">
                🔌
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Gmail Connection Required</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Connect your Gmail account via secure OAuth to draft and send applications directly to recruiters. 
                  JobPilot AI only requests the permission to send emails on your behalf (`gmail.send`), and will never read your inbox.
                </p>
              </div>
              <button
                onClick={handleConnectGmail}
                className="btn-primary"
              >
                🔗 Connect My Gmail Account
              </button>
            </div>
          ) : loadingDraft ? (
            /* Loading draft state */
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="spinner w-8 h-8 border-t-indigo-500"></div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>AI is drafting a personalized application email...</p>
            </div>
          ) : (
            /* Connected & Draft Ready state */
            <div className="space-y-4 animate-fadeIn">
              
              {/* Connected account indicator */}
              <div className="flex justify-between items-center border p-3 rounded-xl" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span style={{ color: 'var(--text-muted)' }}>Sending as:</span>
                  <span style={{ color: 'var(--text-primary)' }} className="font-bold">{gmailStatus.email}</span>
                </div>
                <button
                  onClick={handleDisconnectGmail}
                  className="text-[10px] font-bold text-rose-450 hover:text-rose-350 transition"
                >
                  Disconnect Account
                </button>
              </div>

              {/* Draft input fields */}
              <div className="space-y-3">
                
                {/* To Recruiter field */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>To (Recruiter Email)</label>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={e => setToEmail(e.target.value)}
                    placeholder="recruiter@company.com"
                    className="input-base text-xs"
                  />
                  {contactEmails.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 animate-fadeIn">
                      <span className="text-[10px] font-semibold mr-1" style={{ color: 'var(--text-muted)' }}>Found multiple emails:</span>
                      {contactEmails.map(email => (
                        <button
                          key={email}
                          type="button"
                          onClick={() => setToEmail(email)}
                          className={`text-[9px] px-2 py-0.5 rounded-full border transition ${
                            toEmail === email
                              ? 'bg-indigo-500/10 border-indigo-400 text-indigo-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {email}
                        </button>
                      ))}
                    </div>
                  )}
                  {!toEmail && (
                    <span className="text-[10px] text-amber-400 font-semibold">
                      ⚠️ No contact email could be extracted. Please enter it manually if found in the posting.
                    </span>
                  )}
                </div>

                {/* Subject field */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Job Application: Position Name"
                    className="input-base text-xs"
                  />
                </div>

                {/* Body textarea */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email Body</label>
                  <textarea
                    rows={8}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Dear Hiring Manager..."
                    className="input-base text-xs font-mono leading-relaxed"
                  />
                </div>

                {/* Resume Variant Attachment selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Resume Attachment</label>
                    <select
                      value={selectedVariant}
                      onChange={e => setSelectedVariant(e.target.value)}
                      className="input-base text-xs cursor-pointer"
                    >
                      <option value="none" style={{ color: 'black' }}>Base Resume (Original Uploaded File)</option>
                      <option value="backend" style={{ color: 'black' }}>Backend / Full-Stack Variant</option>
                      <option value="ai_ml" style={{ color: 'black' }}>AI / ML Variant</option>
                      <option value="data" style={{ color: 'black' }}>Data / Analytics Variant</option>
                    </select>
                  </div>
                  <div className="border p-2.5 rounded-xl flex items-center justify-between text-xs min-h-[38px]" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center space-x-2 text-slate-400 truncate">
                      <span>📎</span>
                      <span className="font-semibold text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {getResolvedAttachmentName()}
                      </span>
                    </div>
                    {selectedVariant !== 'none' && (
                      <span className="text-[9px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Docx
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        {gmailStatus.connected && !loadingDraft && (
          <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-glass)' }}>
            {/* Daily rate limit indicator */}
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Daily quota: <span className="font-bold text-slate-200" style={{ color: 'var(--text-primary)' }}>{dailyCount.count}</span> of{' '}
              <span className="font-bold text-slate-200" style={{ color: 'var(--text-primary)' }}>{dailyCount.limit}</span> sent today
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-ghost py-2 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || successMsg !== null}
                className="btn-primary py-2 px-5 text-xs font-semibold"
              >
                {sending ? (
                  <>
                    <div className="spinner w-3.5 h-3.5 border-t-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>🚀 Send Application</span>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmailApply;
