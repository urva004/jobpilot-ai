import React from 'react';

const RestrictedFeaturePrompt = ({ feature, onSignUp }) => {
  const getFeatureDetails = () => {
    switch (feature) {
      case 'tracker':
        return {
          title: 'Application Tracker Board',
          description: 'Organize your job search visually with an interactive Kanban board. Move applications from applied to interviews, offers, and rejections.',
          icon: '📋',
          bullets: [
            'Drag-and-drop applications between recruitment stages',
            'Save personalized notes, contact details, and logs per application',
            'Keep your historical job applications saved securely across visits'
          ]
        };
      case 'alerts':
        return {
          title: 'Match Alerts & Scheduled Scans',
          description: 'Get automated match notifications. Let JobPilot scan the web in the background and notify you when matching jobs are found.',
          icon: '🔔',
          bullets: [
            'Set your matching thresholds and desired job keywords',
            'Configure background scanners that check daily for matching roles',
            'Receive email notifications and match digests directly in your inbox'
          ]
        };
      case 'variants':
        return {
          title: 'Resume Variants (A/B/C)',
          description: 'Create and persist tailored variations of your resume optimized for different roles (e.g. Frontend vs Backend vs AI-ML engineering).',
          icon: '📄',
          bullets: [
            'Maintain multiple variant drafts for specific application profiles',
            'Export tailored documents to docx/pdf formats instantly',
            'Track alignment and customized summaries per role'
          ]
        };
      default:
        return {
          title: 'Registered Account Required',
          description: 'This premium feature requires a free JobPilot AI account to persist data and sync profiles.',
          icon: '🔒',
          bullets: [
            'Save search history and application metrics',
            'Receive email alerts and cron digests',
            'Sync resumes and data across devices'
          ]
        };
    }
  };

  const details = getFeatureDetails();

  return (
    <div className="max-w-xl mx-auto py-16 px-6 text-center animate-fadeIn">
      <div 
        className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center text-3xl shadow-lg border"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)',
          borderColor: 'var(--border)',
        }}
      >
        {details.icon}
      </div>

      <h2 className="text-2xl font-extrabold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
        {details.title}
      </h2>

      <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
        {details.description}
      </p>

      <div 
        className="glass-card p-6 text-left mb-8 rounded-2xl border"
        style={{
          background: 'var(--bg-glass)',
          borderColor: 'var(--border)',
        }}
      >
        <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          What you get by signing up:
        </h4>
        <ul className="space-y-3.5">
          {details.bullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              <span className="text-indigo-400 mr-2.5 shrink-0">✓</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onSignUp}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer shadow-lg hover:shadow-indigo-500/25 transition hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          }}
        >
          Create Free Account
        </button>
      </div>
    </div>
  );
};

export default RestrictedFeaturePrompt;
