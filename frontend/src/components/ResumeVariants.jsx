import React, { useState } from 'react';

/* ─── Copy button ────────────────────────────────────────────────────── */
const CopyButton = ({ text, label = 'Copy' }) => {
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
      className="btn-secondary text-[10px] flex items-center gap-1"
    >
      {copied ? '✓ Copied' : `📋 ${label}`}
    </button>
  );
};

/* ─── Section card ───────────────────────────────────────────────────── */
const SectionCard = ({ title, icon, children, copyText }) => (
  <div className="glass-card overflow-hidden shadow-md">
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{title}</span>
      </div>
      {copyText && <CopyButton text={copyText} />}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

/* ─── Tab config ─────────────────────────────────────────────────────── */
const VARIANT_TABS = [
  {
    id: 'backend',
    label: 'Backend / Full-Stack',
    icon: '⚙️',
    accent: 'from-blue-600/20 to-cyan-600/10',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    chip: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  },
  {
    id: 'ai_ml',
    label: 'AI / ML',
    icon: '🤖',
    accent: 'from-violet-600/20 to-purple-600/10',
    border: 'border-violet-500/30',
    badge: 'bg-violet-500/10 border-violet-500/30 text-violet-300',
    chip: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  },
  {
    id: 'data',
    label: 'Data / Analytics',
    icon: '📊',
    accent: 'from-emerald-600/20 to-teal-600/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    chip: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
  },
];

/* ─── Single variant view ────────────────────────────────────────────── */
const VariantView = ({ variant, tabConfig }) => {
  if (!variant) return null;

  const bulletsText = variant.reworded_experience_bullets
    ?.map(exp => `${exp.original_role}:\n${exp.bullets.join('\n')}`)
    .join('\n\n') || '';

  const fullVariantText = [
    `PROFESSIONAL SUMMARY\n${variant.professional_summary}`,
    `\nKEY SKILLS\n${variant.reordered_skills?.join(' • ')}`,
    `\nEXPERIENCE HIGHLIGHTS\n${bulletsText}`,
    `\nHIGHLIGHTED PROJECTS\n${variant.highlighted_projects?.join(', ')}`,
  ].join('\n');

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Summary */}
      <SectionCard title="Professional Summary" icon="📝" copyText={variant.professional_summary}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{variant.professional_summary}</p>
      </SectionCard>

      {/* Skills */}
      <SectionCard title="Key Skills (Reordered)" icon="💡" copyText={variant.reordered_skills?.join(', ')}>
        <div className="flex flex-wrap gap-1.5">
          {variant.reordered_skills?.map((skill, i) => (
            <span key={i} className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${tabConfig.chip}`}>
              {skill}
            </span>
          ))}
        </div>
      </SectionCard>

      {/* Experience bullets */}
      <SectionCard title="Experience Highlights (Reworded)" icon="🏆" copyText={bulletsText}>
        {variant.reworded_experience_bullets?.length > 0 ? (
          <div className="space-y-4">
            {variant.reworded_experience_bullets.map((exp, i) => (
              <div key={i}>
                <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>{exp.original_role}</p>
                <ul className="space-y-1.5">
                  {exp.bullets?.map((bullet, j) => (
                    <li key={j} className="text-sm leading-relaxed pl-1" style={{ color: 'var(--text-secondary)' }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No experience entries to show.</p>
        )}
      </SectionCard>

      {/* Projects */}
      <SectionCard
        title="Highlighted Projects"
        icon="🚀"
        copyText={variant.highlighted_projects?.join(', ')}
      >
        {variant.highlighted_projects?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {variant.highlighted_projects.map((proj, i) => (
              <span key={i} className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${tabConfig.badge}`}>
                {proj}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No projects highlighted for this variant.</p>
        )}
      </SectionCard>

      {/* Copy all */}
      <div className="flex justify-end pt-1">
        <CopyButton text={fullVariantText} label="Copy full variant" />
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────── */
const ResumeVariants = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('backend');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch('http://localhost:8000/resume/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to generate resume variants.');
      }
      const result = await res.json();
      setData(result);
      setActiveTab('backend');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    // Clear cache first
    try {
      await fetch('http://localhost:8000/resume/variants/cache', { method: 'DELETE' });
    } catch (_) {}
    await handleGenerate();
  };

  const getVariant = (id) => data?.variants?.find(v => v.variant === id);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 animate-fadeIn">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20 flex-shrink-0">
          📄
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Resume Variants</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Three tailored framings of your profile — Backend, AI/ML, Data. Reframes only; nothing fabricated.
          </p>
        </div>
      </div>

      {/* Generate button / idle state */}
      {!data && !loading && (
        <div className="glass-card p-12 text-center space-y-6 shadow-lg empty-state animate-fadeIn">
          <div className="flex justify-center gap-3">
            {VARIANT_TABS.map(t => (
              <div key={t.id} className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${t.accent} border ${t.border} flex items-center justify-center text-3xl shadow-md float-anim`}>
                {t.icon}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Generate 3 resume framings from your profile</p>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              One Mistral call produces a Backend, AI/ML, and Data variant — each reorders your skills, rewrites bullets, and highlights the most relevant projects.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className="btn-primary"
          >
            ✨ Generate All 3 Variants
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card p-12 flex flex-col items-center justify-center space-y-4 shadow-xl text-center">
          <div className="spinner w-14 h-14 border-t-violet-500" />
          <div className="space-y-1">
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Crafting your three resume variants…</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This takes ~10-20 seconds (one LLM call for all three)</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 text-sm animate-fadeIn">
          ⚠️ {error}
          <button
            onClick={handleGenerate}
            className="ml-4 text-xs underline text-rose-300 hover:text-white"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-5">
          {/* Top bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>3</span> variants generated — cached for your current profile
            </p>
            <button
              onClick={handleRegenerate}
              className="btn-secondary text-xs"
            >
              🔄 Regenerate
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
            {VARIANT_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-grow flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all duration-200 border ${
                    isActive
                      ? `bg-gradient-to-br ${tab.accent} text-white`
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/20'
                  }`}
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'transparent',
                  }}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active variant content */}
          <VariantView
            variant={getVariant(activeTab)}
            tabConfig={VARIANT_TABS.find(t => t.id === activeTab)}
          />
        </div>
      )}
    </div>
  );
};

export default ResumeVariants;
