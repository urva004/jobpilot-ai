import React from 'react';
import logo from '../assets/logo.jpg';

const Sidebar = ({
  currentPage,
  setCurrentPage,
  hasProfile,
  unreadCount = 0,
  userEmail,
  onLogout,
  theme,
  onToggleTheme,
  onLogin,
  onSignUp,
  onNavigateToHome
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const logoSrc = logo;

  const menuItems = [
    { id: 'resume', label: 'Resume Profile', icon: '👤', enabled: true },
    { id: 'search', label: 'Job Discovery', icon: '🔍', enabled: true },
    { id: 'ats', label: 'ATS & Tailoring', icon: '⚡', enabled: true },
    { id: 'writing', label: 'Writing Agent', icon: '✍️', enabled: true },
    { id: 'tracker', label: 'Tracker Board', icon: '📋', enabled: true },
    { id: 'alerts', label: 'Match Alerts', icon: '🔔', enabled: true, count: unreadCount },
    { id: 'interview', label: 'Interview Prep', icon: '🎙️', enabled: true },
    { id: 'variants', label: 'Resume Variants', icon: '📄', enabled: true },
  ];

  // Derive user initials from email
  const userInitial = userEmail ? userEmail[0].toUpperCase() : '?';
  const shortEmail = userEmail && userEmail.length > 22
    ? userEmail.substring(0, 20) + '…'
    : userEmail || 'Not signed in';

  return (
    <aside
      className="flex-shrink-0 flex flex-col h-screen overflow-x-hidden transition-all duration-300 border-r"
      style={{
        width: isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="p-4 flex flex-col h-full justify-between">
        <div>
          {/* Brand Logo & Collapse Toggle at the Top */}
          <div className="flex items-center justify-between mb-6 h-10 relative">
            <div 
              className={`flex items-center space-x-2.5 transition-all duration-300 cursor-pointer ${isCollapsed ? 'justify-center w-full' : ''}`}
              onClick={() => {
                if (isCollapsed) {
                  setIsCollapsed(false);
                } else {
                  if (onNavigateToHome) onNavigateToHome();
                }
              }}
            >
              <img
                src={logoSrc}
                alt="JobPilot AI Logo"
                className={`w-9 h-9 rounded-xl object-cover object-top shadow-md shadow-indigo-500/10 border shrink-0 transition-all duration-300 hover:scale-105 border-indigo-500/30`}
                style={{ borderColor: 'var(--border)' }}
              />
              <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[150px]'}`}>
                <h1 className="text-sm font-extrabold tracking-tight leading-none whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>JobPilot AI</h1>
              </div>
            </div>

            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/10 transition shrink-0 cursor-pointer animate-fadeIn"
                title="Collapse Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h16" />
                </svg>
              </button>
            )}
          </div>

          {/* Theme Switcher Row */}
          <div className="mb-6">
            {!isCollapsed ? (
              <div className="flex items-center justify-between px-1 animate-fadeIn">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Appearance</span>
                <button
                  onClick={onToggleTheme}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border cursor-pointer hover:opacity-90 whitespace-nowrap"
                  style={{
                    background: 'var(--accent-soft)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-link)',
                  }}
                >
                  {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              </div>
            ) : (
              <button
                onClick={onToggleTheme}
                className="w-9 h-9 mx-auto flex items-center justify-center rounded-xl transition border text-base cursor-pointer hover:bg-slate-800/10"
                style={{
                  background: 'var(--accent-soft)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-link)',
                }}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setCurrentPage(item.id)}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center p-2.5' : ''}`}
                  title={item.label}
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <span className={`text-lg transition-transform duration-200 shrink-0 ${isActive ? 'scale-110' : 'hover:scale-110'}`}>
                      {item.icon}
                    </span>
                    <span className={`text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-350 overflow-hidden ${
                      isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[150px]'
                    }`}>
                      {item.label}
                    </span>
                    {!isCollapsed && item.count > 0 && (
                      <span className="text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none badge-pulse ml-auto"
                            style={{ background: 'var(--accent)' }}>
                        {item.count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* User Session Profile Card */}
          <div
            className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 hover-lift flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}
            style={{
              background: 'var(--bg-glass)',
              borderColor: 'var(--border)',
            }}
            onClick={() => {
              if (userEmail) {
                setCurrentPage('account');
              } else {
                if (onLogin) onLogin();
              }
            }}
            title="Account Settings"
            id="nav-account-card"
          >
            <div className="flex items-center gap-2.5 min-w-0 w-full">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                }}
              >
                {userInitial}
              </div>
              <div className={`transition-all duration-300 overflow-hidden min-w-0 flex-grow ${
                isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[150px]'
              }`}>
                <p className="text-[11px] font-bold leading-none mb-1 truncate whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{shortEmail}</p>
                <p className="text-[9px] text-indigo-400 font-bold whitespace-nowrap">
                  {hasProfile ? '✓ Resume loaded' : 'No resume yet'}
                </p>
              </div>
              {!isCollapsed && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-slate-500 shrink-0 ml-auto"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
