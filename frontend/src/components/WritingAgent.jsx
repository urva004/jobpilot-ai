import React, { useState } from 'react';

/* ─── Copy Button ──────────────────────────────────────────────────────────── */
const CopyButton = ({ text, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        });
      }}
      className="flex items-center space-x-1.5 text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition"
    >
      <span>{copied ? '✓' : '⎘'}</span>
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  );
};

/* ─── Email Type Config ────────────────────────────────────────────────────── */
const EMAIL_TYPES = [
  {
    id: 'apply',
    label: 'Job Application',
    icon: '📨',
    description: 'Professional email to formally apply — sent with your resume attached.',
    color: 'from-emerald-600 to-teal-600',
    badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    tip: '💡 Remember to attach your resume PDF when sending this email.',
    tipColor: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20',
  },
  {
    id: 'cold',
    label: 'Cold Outreach',
    icon: '🧊',
    description: 'Hook a recruiter or hiring manager who doesn\'t know you.',
    color: 'from-sky-600 to-cyan-600',
    badge: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
  },
  {
    id: 'referral',
    label: 'Referral Ask',
    icon: '🤝',
    description: 'Ask a mutual connection to refer you for a specific role.',
    color: 'from-violet-600 to-purple-600',
    badge: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
  },
  {
    id: 'followup',
    label: 'Follow-Up',
    icon: '🔔',
    description: 'Nudge after applying or interviewing with no response.',
    color: 'from-amber-600 to-orange-600',
    badge: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  },
  {
    id: 'thankyou',
    label: 'Thank You',
    icon: '💌',
    description: 'Send within 24 hours of an interview to stand out.',
    color: 'from-rose-600 to-pink-600',
    badge: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
  },
];

/* ─── Output Card ──────────────────────────────────────────────────────────── */
const OutputCard = ({ title, subject, body, subjectLabel = 'Subject', isLoading, error, placeholder }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 min-h-[220px]">
        <div className="w-9 h-9 rounded-full border-4 border-purple-500/20 border-t-purple-400 animate-spin" />
        <p className="text-xs text-purple-400 font-mono animate-pulse">Mistral is writing your content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 text-rose-300 text-sm">
        <p className="font-semibold mb-1">⚠️ Generation Failed</p>
        <p className="text-xs opacity-80">{error}</p>
      </div>
    );
  }

  if (!body) {
    return (
      <div className="bg-slate-900/20 border border-slate-800/50 rounded-2xl p-10 text-center min-h-[220px] flex flex-col items-center justify-center">
        <div className="text-4xl mb-3">✍️</div>
        <p className="text-slate-400 text-sm max-w-xs">{placeholder}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-950/50 border-b border-slate-800">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</span>
        <CopyButton text={subject ? `Subject: ${subject}\n\n${body}` : body} label="Copy All" />
      </div>

      {/* Subject Line */}
      {subject && (
        <div className="px-5 pt-4 pb-2 border-b border-slate-800/50">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{subjectLabel}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-indigo-300 flex-1">{subject}</p>
            <CopyButton text={subject} label="Copy" />
          </div>
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Body</p>
          <CopyButton text={body} label="Copy Body" />
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">{body}</p>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */

const WritingAgent = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [savedJobId, setSavedJobId] = useState(null);
  const [savingJob, setSavingJob] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [activeMode, setActiveMode] = useState('cover'); // 'cover' | 'email'
  const [selectedEmailType, setSelectedEmailType] = useState('apply');

  const [coverLoading, setCoverLoading] = useState(false);
  const [coverData, setCoverData] = useState(null);
  const [coverError, setCoverError] = useState(null);

  // Email results keyed by type: { cold: { loading, data, error }, ... }
  const [emailResults, setEmailResults] = useState({});

  /* ── Save JD to DB ── */
  const saveJob = async () => {
    if (!jobDescription.trim()) {
      setSaveError('Please paste a job description.');
      return null;
    }
    setSavingJob(true);
    setSaveError(null);
    try {
      const res = await fetch('http://localhost:8000/jobs/save-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobTitle || 'Untitled Role',
          company: company || '',
          description: jobDescription,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to save job.');
      const data = await res.json();
      setSavedJobId(data.id);
      return data.id;
    } catch (e) {
      setSaveError(e.message);
      return null;
    } finally {
      setSavingJob(false);
    }
  };

  const getJobId = async () => savedJobId || saveJob();

  /* ── Cover Letter ── */
  const handleGenerateCoverLetter = async () => {
    setCoverLoading(true);
    setCoverError(null);
    setCoverData(null);
    const jobId = await getJobId();
    if (!jobId) { setCoverLoading(false); return; }
    try {
      const res = await fetch('http://localhost:8000/generate/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Cover letter generation failed.');
      setCoverData(await res.json());
    } catch (e) {
      setCoverError(e.message);
    } finally {
      setCoverLoading(false);
    }
  };

  /* ── Email ── */
  const handleGenerateEmail = async (emailType) => {
    setEmailResults(prev => ({ ...prev, [emailType]: { loading: true, data: null, error: null } }));
    const jobId = await getJobId();
    if (!jobId) {
      setEmailResults(prev => ({ ...prev, [emailType]: { loading: false, data: null, error: 'Could not save job. Check job description.' } }));
      return;
    }
    try {
      const res = await fetch('http://localhost:8000/generate/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, email_type: emailType }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Email generation failed.');
      const data = await res.json();
      setEmailResults(prev => ({ ...prev, [emailType]: { loading: false, data, error: null } }));
    } catch (e) {
      setEmailResults(prev => ({ ...prev, [emailType]: { loading: false, data: null, error: e.message } }));
    }
  };

  const currentEmail = emailResults[selectedEmailType];
  const emailTypeMeta = EMAIL_TYPES.find(t => t.id === selectedEmailType);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent mb-2">
          Writing Agent
        </h2>
        <p className="text-slate-400">
          Generate personalized cover letters and targeted job-search emails — all powered by Mistral AI and tailored to the specific role.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Input Panel ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Job Details</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => { setJobTitle(e.target.value); setSavedJobId(null); }}
                  placeholder="e.g. Backend Engineer"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => { setCompany(e.target.value); setSavedJobId(null); }}
                  placeholder="e.g. Stripe"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Job Description *</label>
              <textarea
                value={jobDescription}
                onChange={(e) => { setJobDescription(e.target.value); setSavedJobId(null); }}
                rows={9}
                placeholder="Paste the full job description here..."
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl py-2.5 px-3 text-sm text-white placeholder-slate-600 outline-none transition resize-none leading-relaxed"
              />
            </div>

            {saveError && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                {saveError}
              </div>
            )}

            {/* Mode Tabs */}
            <div className="flex rounded-xl border border-slate-800 overflow-hidden">
              <button
                onClick={() => setActiveMode('cover')}
                className={`flex-1 py-2.5 text-xs font-semibold transition flex items-center justify-center space-x-1.5 ${
                  activeMode === 'cover'
                    ? 'bg-purple-500/20 text-purple-300 border-r border-slate-800'
                    : 'text-slate-500 hover:text-slate-300 border-r border-slate-800'
                }`}
              >
                <span>📄</span><span>Cover Letter</span>
              </button>
              <button
                onClick={() => setActiveMode('email')}
                className={`flex-1 py-2.5 text-xs font-semibold transition flex items-center justify-center space-x-1.5 ${
                  activeMode === 'email'
                    ? 'bg-pink-500/20 text-pink-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>✉️</span><span>Email Templates</span>
              </button>
            </div>

            {/* Generate Button */}
            {activeMode === 'cover' && (
              <button
                onClick={handleGenerateCoverLetter}
                disabled={coverLoading || savingJob || !jobDescription.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-purple-500/10 disabled:opacity-40"
              >
                {(coverLoading || savingJob) ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Writing...</span></>
                ) : (
                  <span>✨ Generate Cover Letter</span>
                )}
              </button>
            )}
          </div>

          {/* Email Type Selector (shown in email mode) */}
          {activeMode === 'email' && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Type</h3>
              <div className="space-y-2">
                {EMAIL_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedEmailType(type.id)}
                    className={`w-full text-left flex items-start space-x-3 p-3 rounded-xl border transition ${
                      selectedEmailType === type.id
                        ? 'bg-slate-800/60 border-slate-600'
                        : 'border-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl mt-0.5">{type.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{type.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{type.description}</p>
                    </div>
                    {selectedEmailType === type.id && (
                      <span className="text-indigo-400 text-sm mt-0.5">◉</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleGenerateEmail(selectedEmailType)}
                disabled={emailResults[selectedEmailType]?.loading || savingJob || !jobDescription.trim()}
                className={`w-full flex items-center justify-center space-x-2 bg-gradient-to-r ${emailTypeMeta?.color} hover:brightness-110 text-white font-semibold py-2.5 rounded-xl transition shadow-lg disabled:opacity-40`}
              >
                {(emailResults[selectedEmailType]?.loading || savingJob) ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Writing...</span></>
                ) : (
                  <span>✨ Generate {emailTypeMeta?.label}</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Output Panel ── */}
        <div className="lg:col-span-3">
          {activeMode === 'cover' && (
            <OutputCard
              title="Cover Letter"
              subject={coverData?.subject_line}
              subjectLabel="Suggested Subject Line"
              body={coverData?.body}
              isLoading={coverLoading}
              error={coverError}
              placeholder="Paste a job description and click Generate Cover Letter to produce a personalized, company-specific letter."
            />
          )}

          {activeMode === 'email' && (
            <div className="space-y-4">
              {/* Type badge header */}
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{emailTypeMeta?.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{emailTypeMeta?.label} Email</p>
                  <p className="text-xs text-slate-400">{emailTypeMeta?.description}</p>
                </div>
                {currentEmail?.data && (
                  <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full border ${emailTypeMeta?.badge}`}>
                    Ready
                  </span>
                )}
              </div>

              <OutputCard
                title={`${emailTypeMeta?.label} Email`}
                subject={currentEmail?.data?.subject}
                subjectLabel="Subject Line"
                body={currentEmail?.data?.body}
                isLoading={currentEmail?.loading}
                error={currentEmail?.error}
                placeholder={`Select an email type and click Generate to write a targeted ${emailTypeMeta?.label?.toLowerCase()} email.`}
              />

              {/* Resume attach reminder for apply type */}
              {selectedEmailType === 'apply' && currentEmail?.data && (
                <div className={`flex items-start space-x-3 text-xs px-4 py-3 rounded-xl border ${emailTypeMeta?.tipColor}`}>
                  <span className="mt-0.5 flex-shrink-0">📎</span>
                  <p>{emailTypeMeta?.tip}</p>
                </div>
              )}

              {/* Previously generated emails for other types */}
              {Object.entries(emailResults)
                .filter(([type, r]) => type !== selectedEmailType && r?.data)
                .map(([type, r]) => {
                  const meta = EMAIL_TYPES.find(t => t.id === type);
                  return (
                    <div key={type} className="bg-slate-900/20 border border-slate-800/40 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{meta?.icon}</span>
                        <span className="text-xs text-slate-400">{meta?.label} — already generated</span>
                      </div>
                      <button
                        onClick={() => setSelectedEmailType(type)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold border border-indigo-500/20 px-2.5 py-1 rounded-lg transition"
                      >
                        View
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WritingAgent;
