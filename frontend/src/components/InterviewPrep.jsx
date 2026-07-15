import React, { useState } from 'react';

/* ─── Difficulty badge ─────────────────────────────────────────────────── */
const DifficultyBadge = ({ level }) => {
  const map = {
    easy:   { cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', label: 'Easy' },
    medium: { cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300',     label: 'Medium' },
    hard:   { cls: 'bg-rose-500/10 border-rose-500/30 text-rose-300',         label: 'Hard' },
  };
  const config = map[level?.toLowerCase()] || map.medium;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${config.cls}`}>
      {config.label}
    </span>
  );
};

/* ─── Copy snippet ─────────────────────────────────────────────────────── */
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
      className="btn-secondary text-[10px]"
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
};

/* ─── Generic expandable question card with tip + optional sample answer ─ */
const QuestionCard = ({ question, tip, sampleAnswer, index, extra }) => {
  const [showTip, setShowTip] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Stagger animation delays up to 8 cards
  const delayClass = index < 8 ? `delay-${index * 50}` : '';

  return (
    <div className={`glass-card overflow-hidden entrance-anim ${delayClass}`}>
      {/* Question row */}
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
            {index + 1}
          </span>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{question}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {extra}
          {tip && (
            <button
              onClick={() => setShowTip(v => !v)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                showTip
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'btn-secondary'
              }`}
            >
              {showTip ? '▲ Tip' : '▼ Tip'}
            </button>
          )}
          {sampleAnswer && (
            <button
              onClick={() => setShowAnswer(v => !v)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                showAnswer
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'btn-secondary hover:text-emerald-300'
              }`}
            >
              {showAnswer ? '▲ Answer' : '▼ Full Answer'}
            </button>
          )}
        </div>
      </div>

      {/* Tip panel */}
      {showTip && tip && (
        <div className="px-4 pb-3 pt-0">
          <div className="ml-10 p-3 rounded-lg border"
               style={{
                 background: 'var(--accent-soft)',
                 borderColor: 'var(--border)'
               }}>
            <p className="text-[10px] font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-link)' }}>💡 Tip</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tip}</p>
          </div>
        </div>
      )}

      {/* Full answer panel */}
      {showAnswer && sampleAnswer && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-10 p-3 rounded-lg border"
               style={{
                 background: 'rgba(52, 211, 153, 0.05)',
                 borderColor: 'rgba(52, 211, 153, 0.2)'
               }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wide">✅ Sample Answer</p>
              <CopyBtn text={sampleAnswer} />
            </div>
            <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>"{sampleAnswer}"</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Coding question card with approach + syntax-highlighted code block ─ */
const CodingCard = ({ q, index }) => {
  const [showHint, setShowHint] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const delayClass = index < 8 ? `delay-${index * 50}` : '';

  return (
    <div className={`glass-card overflow-hidden entrance-anim ${delayClass}`}>
      {/* Question row */}
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
            {index + 1}
          </span>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <DifficultyBadge level={q.difficulty} />
          {q.hint && (
            <button
              onClick={() => setShowHint(v => !v)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                showHint
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'btn-secondary hover:text-amber-300'
              }`}
            >
              {showHint ? '▲ Hint' : '▼ Hint'}
            </button>
          )}
          {q.solution_code && (
            <button
              onClick={() => setShowCode(v => !v)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                showCode
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'btn-secondary hover:text-emerald-300'
              }`}
            >
              {showCode ? '▲ Solution' : '▼ Solution'}
            </button>
          )}
        </div>
      </div>

      {/* Hint panel */}
      {showHint && q.hint && (
        <div className="px-4 pb-3 pt-0">
          <div className="ml-10 p-3 rounded-lg border"
               style={{
                 background: 'rgba(251, 191, 36, 0.05)',
                 borderColor: 'rgba(251, 191, 36, 0.2)'
               }}>
            <p className="text-[10px] text-amber-300 font-bold mb-1 uppercase tracking-wide">💡 Hint</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{q.hint}</p>
          </div>
        </div>
      )}

      {/* Solution panel */}
      {showCode && q.solution_code && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-10 space-y-2">
            {/* Approach explanation */}
            {q.approach_explanation && (
              <div className="p-3 rounded-lg border"
                   style={{
                     background: 'var(--bg-glass)',
                     borderColor: 'var(--border-subtle)'
                   }}>
                <p className="text-xs text-violet-300 font-semibold mb-1 uppercase tracking-wide">🧠 Approach</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{q.approach_explanation}</p>
              </div>
            )}
            {/* Code block */}
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-3 py-2 border-b" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  {q.solution_language || 'code'}
                </span>
                <CopyBtn text={q.solution_code} />
              </div>
              <pre className="p-4 bg-slate-950 overflow-x-auto text-xs text-slate-300 leading-relaxed font-mono whitespace-pre">
                {q.solution_code}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── System design card with focus chips + optional sample answer ────── */
const SystemDesignCard = ({ question, index }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const delayClass = index < 8 ? `delay-${index * 50}` : '';

  return (
    <div className={`glass-card overflow-hidden entrance-anim ${delayClass}`}>
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{question.question}</p>
            {question.focus_areas?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {question.focus_areas.map((a, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 font-medium">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {question.sample_answer && (
          <button
            onClick={() => setShowAnswer(v => !v)}
            className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
              showAnswer
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'btn-secondary hover:text-emerald-300'
            }`}
          >
            {showAnswer ? '▲ Answer' : '▼ Full Answer'}
          </button>
        )}
      </div>
      {showAnswer && question.sample_answer && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-10 p-3 rounded-lg border"
               style={{
                 background: 'rgba(52, 211, 153, 0.05)',
                 borderColor: 'rgba(52, 211, 153, 0.2)'
               }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wide">✅ Sample Answer</p>
              <CopyBtn text={question.sample_answer} />
            </div>
            <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>"{question.sample_answer}"</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Tab config ──────────────────────────────────────────────────────── */
const TABS = [
  { id: 'technical',     label: 'Technical',     icon: '⚙️',  count_key: 'technical_questions' },
  { id: 'coding',        label: 'Coding',         icon: '💻',  count_key: 'coding_questions' },
  { id: 'system_design', label: 'System Design',  icon: '🏗️',  count_key: 'system_design_questions' },
  { id: 'hr',            label: 'HR',             icon: '🤝',  count_key: 'hr_questions' },
  { id: 'behavioral',    label: 'Behavioral',     icon: '🧠',  count_key: 'behavioral_questions' },
];

/* ─── Main Component ─────────────────────────────────────────────────── */
const InterviewPrep = ({ profile }) => {
  const [jobDescriptionInput, setJobDescriptionInput] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [savedJobId, setSavedJobId] = useState(null);
  const [savingJob, setSavingJob] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('technical');

  /* Save pasted JD to backend and return its ID */
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
        body: JSON.stringify({
          title: jobTitle.trim() || 'Pasted Job',
          company: '',
          description: jobDescriptionInput,
        }),
      });
      if (!res.ok) throw new Error('Failed to save job description.');
      const job = await res.json();
      setSavedJobId(job.id);
      return job.id;
    } catch (e) {
      setSaveError(e.message);
      return null;
    } finally {
      setSavingJob(false);
    }
  };

  const doFetch = async (jobId) => {
    setLoading(true);
    setError(null);
    try {
      const hasToken = !!localStorage.getItem('token');
      const reqBody = { job_id: jobId };
      if (!hasToken) {
        if (!profile) {
          throw new Error('Please upload your resume profile first on the Resume Profile tab.');
        }
        reqBody.guest_profile = {
          raw_resume_text: profile.raw_resume_text || '',
          skills: profile.skills || [],
          projects: profile.projects || [],
          education: profile.education || [],
          experience: profile.experience || [],
          certifications: profile.certifications || [],
          links: profile.links || {},
          resume_filename: profile.resume_filename || 'Guest Resume'
        };
      }

      const res = await fetch('http://localhost:8000/interview/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to generate interview prep.');
      }
      setData(await res.json());
      setActiveTab('technical');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setData(null);
    const jobId = savedJobId || (await ensureJobInDB());
    if (!jobId) return;
    await doFetch(jobId);
  };

  const handleRegenerate = async () => {
    if (!savedJobId) return;
    try {
      await fetch(`http://localhost:8000/interview/prep/${savedJobId}/cache`, { method: 'DELETE' });
    } catch (_) {}
    setData(null);
    await doFetch(savedJobId);
  };

  const totalQuestions = data
    ? (data.technical_questions?.length || 0) +
      (data.coding_questions?.length || 0) +
      (data.system_design_questions?.length || 0) +
      (data.hr_questions?.length || 0) +
      (data.behavioral_questions?.length || 0)
    : 0;

  const renderQuestions = () => {
    if (!data) return null;
    if (activeTab === 'technical')
      return data.technical_questions.map((q, i) => (
        <QuestionCard key={i} index={i} question={q.question} tip={q.tip} sampleAnswer={q.sample_answer} />
      ));
    if (activeTab === 'coding')
      return data.coding_questions.map((q, i) => (
        <CodingCard key={i} index={i} q={q} />
      ));
    if (activeTab === 'system_design')
      return data.system_design_questions.map((q, i) => (
        <SystemDesignCard key={i} question={q} index={i} />
      ));
    if (activeTab === 'hr')
      return data.hr_questions.map((q, i) => (
        <QuestionCard key={i} index={i} question={q.question} tip={q.tip} sampleAnswer={q.sample_answer} />
      ));
    if (activeTab === 'behavioral')
      return data.behavioral_questions.map((q, i) => (
        <QuestionCard key={i} index={i} question={q.question} tip={q.framework_tip} sampleAnswer={q.sample_answer} />
      ));
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 animate-fadeIn">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-2xl shadow-lg shadow-violet-500/20 flex-shrink-0">
          🎙️
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Interview Prep</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>AI-generated questions tailored to the JD & your profile. Flashcard style — tap to reveal tips.</p>
        </div>
      </div>

      {/* Input panel */}
      {!data && (
        <div className="glass-card p-6 space-y-4 shadow-lg animate-fadeIn">
          <input
            type="text"
            placeholder="Job title (optional, for context)"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            className="input-base"
          />
          <textarea
            rows={8}
            placeholder="Paste the full job description here…"
            value={jobDescriptionInput}
            onChange={e => {
              setJobDescriptionInput(e.target.value);
              setSavedJobId(null);
            }}
            className="input-base resize-none"
          />
          {saveError && <p className="text-rose-400 text-xs">{saveError}</p>}
          <button
            onClick={handleGenerate}
            disabled={loading || savingJob}
            className="w-full btn-primary"
          >
            {loading || savingJob ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-4 h-4 border-t-white" />
                {savingJob ? 'Saving job…' : 'Generating questions…'}
              </span>
            ) : '🎙️ Generate Interview Prep'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 text-sm animate-fadeIn">
          ⚠️ {error}
        </div>
      )}

      {/* Loading (when already has data — during regenerate) */}
      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="spinner w-12 h-12 border-t-violet-500" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Crafting your personalised question bank…</p>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-5">
          {/* Top bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{totalQuestions}</span> questions across 5 categories — cached for this job
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="btn-secondary text-xs"
              >
                {loading ? '…' : '🔄 Regenerate'}
              </button>
              <button
                onClick={() => { setData(null); setSavedJobId(null); setJobDescriptionInput(''); setJobTitle(''); }}
                className="btn-secondary text-xs"
              >
                ← New Job
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
            {TABS.map(tab => {
              const count = data[tab.count_key]?.length || 0;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-br from-violet-600/20 to-indigo-600/10 text-white border'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/20'
                  }`}
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'transparent',
                  }}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span className="mt-1 hidden sm:block">{tab.label}</span>
                  <span className={`text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Category label */}
          <div className="flex items-center gap-2">
            <span className="text-xl">{TABS.find(t => t.id === activeTab)?.icon}</span>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{TABS.find(t => t.id === activeTab)?.label} Questions</h3>
            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>Tap a card to reveal the tip</span>
          </div>

          {/* Cards */}
          <div className="space-y-3">{renderQuestions()}</div>
        </div>
      )}
    </div>
  );
};

export default InterviewPrep;
