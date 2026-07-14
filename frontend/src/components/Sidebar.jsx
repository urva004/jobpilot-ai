import React from 'react';

const Sidebar = ({ currentPage, setCurrentPage, hasProfile, unreadCount = 0 }) => {
  const menuItems = [
    { id: 'resume', label: 'Resume Profile', icon: '👤', enabled: true },
    { id: 'search', label: 'Job Discovery', icon: '🔍', enabled: true, badge: 'Phase 2' },
    { id: 'match', label: 'Semantic Matching', icon: '🎯', enabled: true, badge: 'Phase 3' },
    { id: 'ats', label: 'ATS & Tailoring', icon: '⚡', enabled: true, badge: 'Phase 4' },
    { id: 'writing', label: 'Writing Agent', icon: '✍️', enabled: true, badge: 'Phase 5' },
    { id: 'tracker', label: 'Tracker Board', icon: '📋', enabled: true, badge: 'Phase 6' },
    { id: 'alerts', label: 'Match Alerts', icon: '🔔', enabled: true, badge: 'Phase 7', count: unreadCount },
  ];


  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div className="p-6">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/20">
            JP
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">JobPilot AI</h1>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Antigravity MVP</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border-l-4 border-indigo-500 pl-3'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.count > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                      {item.count}
                    </span>
                  )}
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isActive
                      ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-300'
                      : 'bg-slate-800/80 border-slate-700/50 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session Profile Card */}
      <div className="p-6 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold border border-indigo-400/30">
            {hasProfile ? 'C' : '?'}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">{hasProfile ? 'Candidate Profile' : 'No Resume'}</p>
            <p className="text-[10px] text-slate-400">{hasProfile ? 'Parsed & Loaded' : 'Upload to start'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
