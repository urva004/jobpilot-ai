import React, { useState } from 'react';

/* ─── Helper sub-components ─────────────────────────────────────────────── */

const ScoreRing = ({ score }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;

  const color =
    score >= 75
      ? { stroke: '#34d399', text: 'text-emerald-400', label: 'Good ATS Fit', badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' }
      : score >= 50
      ? { stroke: '#fbbf24', text: 'text-amber-400', label: 'Needs Work', badge: 'bg-amber-500/10 border-amber-500/30 text-amber-300' }
      : { stroke: '#f87171', text: 'text-rose-400', label: 'Poor ATS Fit', badge: 'bg-rose-500/10 border-rose-500/30 text-rose-300' };

  return (
    <div className="flex items-center space-x-5">
      <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} className="fill-none" stroke="var(--border-subtle)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius}
            className="fill-none"
            stroke={color.stroke}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center leading-none">
          <span className={`text-2xl font-extrabold font-mono ${color.text}`}>{score}</span>
          <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest">/ 100</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>ATS Compatibility Score</p>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded border ${color.badge}`}>
          {color.label}
        </span>
        <p className="text-xs mt-2 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          Based on keyword density, section structure, and JD alignment. Higher is better for automated screening.
        </p>
      </div>
    </div>
  );
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="btn-secondary text-[10px]"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */

const ATSAnalyzer = () => {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobDescriptionInput, setJobDescriptionInput] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [activeTab, setActiveTab] = useState('ats'); // 'ats' | 'tailor'

  const [atsLoading, setAtsLoading] = useState(false);
  const [atsData, setAtsData] = useState(null);
  const [atsError, setAtsError] = useState(null);

  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorData, setTailorData] = useState(null);
  const [tailorError, setTailorError] = useState(null);

  // We store a temporary job in DB for paste mode
  const [savedJobId, setSavedJobId] = useState(null);
  const [savingJob, setSavingJob] = useState(false);
  const [saveError, setSaveError] = useState(null);

  /* Save pasted JD to backend first, then return its ID */
  const ensureJobInDB = async () => {
    if (!jobDescriptionInput.trim()) {
      setSaveError('Please paste a job description.');
      return null;
    }
    setSavingJob(true);
    setSaveError(null);
    try {
      const res = await fetch('http://localhost:8000/jobs/save-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: jobTitle || 'Pasted Job', description: jobDescriptionInput }),
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

  const resolveJobId = async () => {
    if (selectedJobId) return selectedJobId;
    return ensureJobInDB();
  };

  const handleATSScore = async () => {
    setAtsLoading(true);
    setAtsError(null);
    setAtsData(null);
    const jobId = await resolveJobId();
    if (!jobId) { setAtsLoading(false); return; }
    try {
      const res = await fetch('http://localhost:8000/ats/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'ATS scoring failed.');
      setAtsData(await res.json());
    } catch (e) {
      setAtsError(e.message);
    } finally {
      setAtsLoading(false);
    }
  };

  const handleTailorResume = async () => {
    setTailorLoading(true);
    setTailorError(null);
    setTailorData(null);
    const jobId = await resolveJobId();
    if (!jobId) { setTailorLoading(false); return; }
    try {
      const res = await fetch('http://localhost:8000/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Resume tailoring failed.');
      setTailorData(await res.json());
    } catch (e) {
      setTailorError(e.message);
    } finally {
      setTailorLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-10 text-left animate-fadeIn">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent mb-2">
          ATS Analyzer & Resume Tailoring
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Score your resume against any job description like a real ATS, then generate tailored bullets that pass the filter.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-5 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Paste Job Description</h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Job Title (optional)</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Python Engineer"
                className="input-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Job Description *</label>
              <textarea
                value={jobDescriptionInput}
                onChange={(e) => setJobDescriptionInput(e.target.value)}
                rows={10}
                placeholder="Paste the full job description here..."
                className="input-base resize-none"
              />
            </div>

            {saveError && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                {saveError}
              </div>
            )}

            {/* Action Tabs with animated active line class wrapper */}
            <div className="flex rounded-xl overflow-hidden border p-1" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
              <button
                onClick={() => setActiveTab('ats')}
                className={`flex-grow py-2 text-xs font-bold transition rounded-lg ${
                  activeTab === 'ats'
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                📊 ATS Score
              </button>
              <button
                onClick={() => setActiveTab('tailor')}
                className={`flex-grow py-2 text-xs font-bold transition rounded-lg ${
                  activeTab === 'tailor'
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                ✍️ Tailor Resume
              </button>
            </div>

            {activeTab === 'ats' && (
              <button
                onClick={handleATSScore}
                disabled={atsLoading || savingJob}
                className="w-full btn-primary bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-500/15"
              >
                {(atsLoading || savingJob) ? (
                  <>
                    <div className="spinner w-4 h-4 border-t-white" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Run ATS Score</span>
                )}
              </button>
            )}

            {activeTab === 'tailor' && (
              <button
                onClick={handleTailorResume}
                disabled={tailorLoading || savingJob}
                className="w-full btn-primary bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/15"
              >
                {(tailorLoading || savingJob) ? (
                  <>
                    <div className="spinner w-4 h-4 border-t-white" />
                    <span>Tailoring...</span>
                  </>
                ) : (
                  <span>Generate Tailored Resume</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right: Results Panel */}
        <div className="lg:col-span-3 space-y-4">

          {/* ATS Results */}
          {activeTab === 'ats' && (
            <div className="space-y-4">
              {atsLoading && (
                <div className="glass-card p-8 flex flex-col items-center justify-center space-y-4 min-h-[220px]">
                  <div className="spinner w-10 h-10 border-t-amber-500" />
                  <p className="text-xs font-mono animate-pulse" style={{ color: 'var(--text-link)' }}>Running ATS keyword analysis...</p>
                </div>
              )}

              {atsError && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 text-rose-300 text-sm animate-fadeIn">
                  <p className="font-bold mb-1">⚠️ Analysis Failed</p>
                  <p className="text-xs opacity-80">{atsError}</p>
                </div>
              )}

              {atsData && !atsLoading && (
                <div className="space-y-4">
                  {/* Score Ring Card */}
                  <div className="glass-card p-6 entrance-anim">
                    <ScoreRing score={atsData.score} />
                  </div>

                  {/* Missing Keywords */}
                  {atsData.missing_keywords?.length > 0 && (
                    <div className="glass-card p-5 space-y-3 entrance-anim delay-100">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider flex items-center" style={{ color: 'var(--text-secondary)' }}>
                        <span className="mr-2">🔴</span> Missing Keywords ({atsData.missing_keywords.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {atsData.missing_keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {atsData.suggestions?.length > 0 && (
                    <div className="glass-card p-5 space-y-3 entrance-anim delay-150">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider flex items-center" style={{ color: 'var(--text-secondary)' }}>
                        <span className="mr-2">💡</span> Improvement Suggestions
                      </h4>
                      <ol className="space-y-2">
                        {atsData.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start space-x-2.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {!atsLoading && !atsData && !atsError && (
                <div className="glass-card p-12 text-center empty-state animate-fadeIn">
                  <div className="empty-state-icon">📊</div>
                  <p className="empty-state-title">Awaiting ATS Assessment</p>
                  <p className="empty-state-body">Paste a job description and click <strong className="text-amber-500">Run ATS Score</strong> to see how well your resume matches.</p>
                </div>
              )}
            </div>
          )}

          {/* Tailor Resume Results */}
          {activeTab === 'tailor' && (
            <div className="space-y-4">
              {tailorLoading && (
                <div className="glass-card p-8 flex flex-col items-center justify-center space-y-4 min-h-[220px]">
                  <div className="spinner w-10 h-10 border-t-indigo-500" />
                  <p className="text-xs font-mono animate-pulse" style={{ color: 'var(--text-link)' }}>Generating tailored resume content...</p>
                </div>
              )}

              {tailorError && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 text-rose-300 text-sm animate-fadeIn">
                  <p className="font-bold mb-1">⚠️ Tailoring Failed</p>
                  <p className="text-xs opacity-80">{tailorError}</p>
                </div>
              )}

              {tailorData && !tailorLoading && (
                <div className="space-y-4">
                  {/* Professional Summary */}
                  {tailorData.summary && (
                    <div className="glass-card p-5 space-y-3 entrance-anim border-indigo-500/25">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider flex items-center" style={{ color: 'var(--text-secondary)' }}>
                          <span className="mr-2">🎯</span> Tailored Professional Summary
                        </h4>
                        <CopyButton text={tailorData.summary} />
                      </div>
                      <p className="text-sm leading-relaxed border-l-2 border-indigo-500/40 pl-4 italic" style={{ color: 'var(--text-primary)' }}>
                        {tailorData.summary}
                      </p>
                    </div>
                  )}

                  {/* Experience Bullets */}
                  {tailorData.experience_bullets?.length > 0 && (
                    <div className="glass-card p-5 space-y-3 entrance-anim delay-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider flex items-center" style={{ color: 'var(--text-secondary)' }}>
                          <span className="mr-2">✏️</span> Tailored Experience Bullets
                        </h4>
                        <CopyButton text={tailorData.experience_bullets.join('\n')} />
                      </div>
                      <ul className="space-y-2.5">
                        {tailorData.experience_bullets.map((bullet, i) => (
                          <li key={i} className="text-sm leading-relaxed flex items-start space-x-2 p-2.5 rounded-lg border"
                              style={{
                                background: 'var(--bg-glass)',
                                borderColor: 'var(--border)'
                              }}>
                            <span className="text-indigo-400 mt-0.5 flex-shrink-0">▸</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{bullet.replace(/^[•▸\-]\s*/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills & Keywords grid */}
                  <div className="grid grid-cols-2 gap-4 entrance-anim delay-150">
                    {tailorData.skills_to_highlight?.length > 0 && (
                      <div className="glass-card p-4 space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          ✅ Skills to Highlight
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {tailorData.skills_to_highlight.map((s, i) => (
                            <span key={i} className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {tailorData.keywords_added?.length > 0 && (
                      <div className="glass-card p-4 space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          🔑 Keywords Woven In
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {tailorData.keywords_added.map((k, i) => (
                            <span key={i} className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!tailorLoading && !tailorData && !tailorError && (
                <div className="glass-card p-12 text-center empty-state animate-fadeIn">
                  <div className="empty-state-icon">✍️</div>
                  <p className="empty-state-title">Awaiting Resume Tailoring</p>
                  <p className="empty-state-body">Paste a job description and click <strong className="text-indigo-400">Generate Tailored Resume</strong> to create JD-specific bullets and a summary.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ATSAnalyzer;
