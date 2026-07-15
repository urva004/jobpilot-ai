import React from 'react';

const Navbar = ({ currentPage, userEmail, onLogout, onLogin, onSignUp }) => {
  const getPageTitle = () => {
    switch (currentPage) {
      case 'resume': return 'Resume Profile';
      case 'search': return 'Job Discovery';
      case 'ats': return 'ATS & Tailoring';
      case 'writing': return 'Writing Agent';
      case 'tracker': return 'Tracker Board';
      case 'alerts': return 'Match Alerts';
      case 'interview': return 'Interview Prep';
      case 'variants': return 'Resume Variants';
      case 'account': return 'Account Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <header 
      className="flex items-center justify-between px-6 py-4 border-b shrink-0 z-10 transition-colors"
      style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {getPageTitle()}
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        {userEmail ? (
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {userEmail}
            </span>
            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 rounded-lg border text-xs font-bold transition hover:opacity-85 cursor-pointer text-rose-400 hover:text-rose-300"
              style={{ borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={onLogin}
              className="px-3.5 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-slate-800/10 cursor-pointer"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              Log In
            </button>
            <button
              onClick={onSignUp}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer hover:opacity-90 text-white"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              }}
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
