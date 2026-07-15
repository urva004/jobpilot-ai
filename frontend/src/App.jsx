import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ResumeUpload from './components/ResumeUpload';
import JobSearch from './components/JobSearch';
import ATSAnalyzer from './components/ATSAnalyzer';
import WritingAgent from './components/WritingAgent';
import TrackerBoard from './components/TrackerBoard';
import MatchAlerts from './components/MatchAlerts';
import InterviewPrep from './components/InterviewPrep';
import ResumeVariants from './components/ResumeVariants';
import Login from './components/Login';
import AccountSettings from './components/AccountSettings';
import Navbar from './components/Navbar';
import RestrictedFeaturePrompt from './components/RestrictedFeaturePrompt';
import LandingPage from './components/LandingPage';


// Intercept all fetch requests globally to inject JWT token and dynamically translate API URLs
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const token = localStorage.getItem('token');
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  let fetchUrl = url;
  if (typeof url === 'string') {
    fetchUrl = url.replace('http://localhost:8000', apiBase);
  } else if (url instanceof URL) {
    fetchUrl = new URL(url.toString().replace('http://localhost:8000', apiBase));
  } else if (url && typeof url === 'object' && 'url' in url) {
    fetchUrl = url.url.replace('http://localhost:8000', apiBase);
  }

  const urlStr = typeof fetchUrl === 'string' ? fetchUrl : fetchUrl.toString();
  const isApiRequest = urlStr.includes(apiBase);

  if (isApiRequest) {
    options.headers = {
      ...options.headers,
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await originalFetch(fetchUrl, options);

  if (response.status === 401 && isApiRequest && !urlStr.includes('/auth/')) {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    window.location.reload();
  }

  return response;
};


let initialTokenWasExpired = false;

const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch (err) {
    return false;
  }
};

const checkAndGetInitialToken = () => {
  const stored = localStorage.getItem('token');
  if (!stored) return '';
  if (isTokenValid(stored)) return stored;
  initialTokenWasExpired = true;
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  return '';
};

const getInitialEmail = () => {
  const storedToken = localStorage.getItem('token');
  if (isTokenValid(storedToken)) return localStorage.getItem('userEmail') || '';
  return '';
};

function App() {
  const [token, setToken] = useState(checkAndGetInitialToken);
  const [userEmail, setUserEmail] = useState(getInitialEmail);
  const [currentPage, setCurrentPage] = useState('resume');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const navigateTo = (path) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [profile, setProfile] = useState(() => {
    if (!localStorage.getItem('token')) {
      const stored = sessionStorage.getItem('guest-profile');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [loadingActiveProfile, setLoadingActiveProfile] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const [pendingGuestProfile, setPendingGuestProfile] = useState(null);
  const [showCarryOverModal, setShowCarryOverModal] = useState(false);

  const updateProfile = (newProfile) => {
    setProfile(newProfile);
    const hasToken = !!localStorage.getItem('token');
    if (!hasToken) {
      if (newProfile) {
        sessionStorage.setItem('guest-profile', JSON.stringify(newProfile));
      } else {
        sessionStorage.removeItem('guest-profile');
      }
    } else {
      sessionStorage.removeItem('guest-profile');
    }
  };

  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: '' });
  const [dailyCount, setDailyCount] = useState({ count: 0, limit: 15 });

  // ── Theme management ─────────────────────────────────────────────────────
  const getInitialTheme = () => {
    const stored = localStorage.getItem('jp-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jp-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  // ─────────────────────────────────────────────────────────────────────────

  // Load unread count from notifications
  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:8000/notifications');
      if (response.ok) {
        const notifs = await response.json();
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.warn('Could not fetch notifications count.', err);
    }
  };

  const fetchGmailStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/gmail/status');
      if (res.ok) {
        const data = await res.json();
        setGmailStatus(data);
        if (data.connected) {
          const limitRes = await fetch('http://localhost:8000/gmail/daily-count');
          if (limitRes.ok) {
            const limitData = await limitRes.json();
            setDailyCount(limitData);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch Gmail status.', err);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await fetch('http://localhost:8000/gmail/auth');
      if (res.ok) {
        const data = await res.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      }
    } catch (err) {
      console.error('Error initiating Gmail auth', err);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm('Disconnect Gmail account?')) return;
    try {
      const res = await fetch('http://localhost:8000/gmail/disconnect', { method: 'POST' });
      if (res.ok) {
        setGmailStatus({ connected: false, email: '' });
        setDailyCount({ count: 0, limit: 15 });
        alert('Gmail disconnected.');
      }
    } catch (err) {
      console.error('Error disconnecting Gmail', err);
    }
  };

  const handleLoginSuccess = async (newToken, email) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userEmail', email);
    setToken(newToken);
    setUserEmail(email);
    navigateTo('/app');

    if (profile) {
      // Guest profile was uploaded during this session! Prompt to carry over.
      setPendingGuestProfile(profile);
      setShowCarryOverModal(true);
    } else {
      // Load the registered user's active profile
      try {
        const response = await fetch('http://localhost:8000/resume/active', {
          headers: { 'Authorization': `Bearer ${newToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          updateProfile(data);
        } else {
          updateProfile(null);
        }
      } catch (err) {
        updateProfile(null);
      }
    }
  };

  const handleLogout = (force = false) => {
    if (force || window.confirm('Are you sure you want to log out?')) {
      setToken('');
      setUserEmail('');
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      updateProfile(null);
      navigateTo('/');
    }
  };

  const handleCarryOverConfirm = async () => {
    setShowCarryOverModal(false);
    if (!pendingGuestProfile) return;
    try {
      const response = await fetch('http://localhost:8000/resume/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          raw_resume_text: pendingGuestProfile.raw_resume_text || '',
          skills: pendingGuestProfile.skills || [],
          projects: pendingGuestProfile.projects || [],
          education: pendingGuestProfile.education || [],
          experience: pendingGuestProfile.experience || [],
          certifications: pendingGuestProfile.certifications || [],
          links: pendingGuestProfile.links || {},
          resume_filename: pendingGuestProfile.resume_filename || 'Guest Resume',
          confidence: pendingGuestProfile.confidence ? {
            skills: pendingGuestProfile.confidence.skills || 0.0,
            experience: pendingGuestProfile.confidence.experience || 0.0,
            education: pendingGuestProfile.confidence.education || 0.0,
            overall: pendingGuestProfile.confidence.overall || 0.0
          } : null
        })
      });
      if (response.ok) {
        const savedProfile = await response.json();
        updateProfile(savedProfile);
        alert('Resume saved to your account successfully!');
      } else {
        alert('Failed to carry over resume data.');
      }
    } catch (err) {
      console.error(err);
      alert('Error carrying over resume data.');
    } finally {
      setPendingGuestProfile(null);
    }
  };

  const handleCarryOverCancel = async () => {
    setShowCarryOverModal(false);
    setPendingGuestProfile(null);
    // Fetch the logged-in user's profile if any
    try {
      const response = await fetch('http://localhost:8000/resume/active');
      if (response.ok) {
        const data = await response.json();
        updateProfile(data);
      } else {
        updateProfile(null);
      }
    } catch (err) {
      updateProfile(null);
    }
  };

  useEffect(() => {
    if (initialTokenWasExpired && window.location.pathname === '/app') {
      setAuthMode('login');
      setShowAuthForm(true);
      alert('Your session has expired. Please log in again.');
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
    fetchGmailStatus();

    // Check if redirect returned from Gmail auth success
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_auth') === 'success') {
      // Remove query param from url
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      alert('Gmail connected successfully!');
      fetchGmailStatus();
    }
  }, [token]);


  useEffect(() => {
    if (!token) {
      setLoadingActiveProfile(false);
      return;
    }
    setLoadingActiveProfile(true);
    // Attempt to load active resume profile on mount
    const fetchActiveProfile = async () => {
      try {
        const response = await fetch('http://localhost:8000/resume/active');
        if (response.ok) {
          const data = await response.json();
          updateProfile(data);
        }
      } catch (err) {
        console.warn('No active profile found or backend is offline.', err);
      } finally {
        setLoadingActiveProfile(false);
      }
    };
    fetchActiveProfile();
  }, [token]);



  const renderPage = () => {
    if (loadingActiveProfile) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading profile data...</p>
        </div>
      );
    }

    if (!token && ['tracker', 'alerts', 'variants', 'account'].includes(currentPage)) {
      return (
        <RestrictedFeaturePrompt 
          feature={currentPage} 
          onSignUp={() => {
            setAuthMode('signup');
            setShowAuthForm(true);
          }} 
        />
      );
    }

    switch (currentPage) {
      case 'resume':
        return <ResumeUpload profile={profile} onUploadSuccess={updateProfile} />;
      
      case 'search':
        return (
          <JobSearch 
            profile={profile} 
            onOpenAuth={(mode) => {
              setAuthMode(mode);
              setShowAuthForm(true);
            }} 
          />
        );

      case 'ats':
        return <ATSAnalyzer profile={profile} />;

      case 'writing':
        return <WritingAgent profile={profile} />;

      case 'tracker':
        return <TrackerBoard />;

      case 'alerts':
        return <MatchAlerts onRefreshUnread={setUnreadCount} />;

      case 'interview':
        return <InterviewPrep profile={profile} />;

      case 'variants':
        return <ResumeVariants />;

      case 'account':
        return <AccountSettings userEmail={userEmail} onLogout={handleLogout} />;

      case 'landing':
        return (
          <LandingPage 
            onNavigate={(mode) => {
              setAuthMode(mode);
              setShowAuthForm(true);
            }} 
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onGoToDashboard={() => setCurrentPage('resume')}
          />
        );

      default:
        return <div className="text-center py-12">Page not found</div>;
    }
  };

  if (currentPath === '/app') {
    return (
      <div className="h-screen overflow-hidden flex font-sans" style={{ background: 'var(--bg-base)' }}>
        {/* Sidebar Nav */}
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          hasProfile={!!profile}
          unreadCount={unreadCount}
          userEmail={userEmail}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onLogin={() => { setAuthMode('login'); setShowAuthForm(true); }}
          onSignUp={() => { setAuthMode('signup'); setShowAuthForm(true); }}
          onNavigateToHome={() => navigateTo('/')}
        />

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-hidden flex flex-col h-full"
          style={{
            background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--bg-elevated) 50%, var(--bg-base) 100%)'
          }}
        >
          <Navbar 
            currentPage={currentPage}
            userEmail={userEmail}
            onLogout={handleLogout}
            onLogin={() => { setAuthMode('login'); setShowAuthForm(true); }}
            onSignUp={() => { setAuthMode('signup'); setShowAuthForm(true); }}
          />
          <div className="flex-1 overflow-y-auto">
            {renderPage()}
          </div>
        </main>

        {/* Auth Modal overlay */}
        {showAuthForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
            <Login 
              onLoginSuccess={(tok, email) => {
                handleLoginSuccess(tok, email);
                setShowAuthForm(false);
              }} 
              initialMode={authMode}
              onBackToHome={() => setShowAuthForm(false)}
              isModal={true}
            />
          </div>
        )}

        {/* Carry Over Modal overlay */}
        {showCarryOverModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
            <div 
              className="relative rounded-3xl p-8 space-y-6 max-w-md w-full relative z-10 border text-white"
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(99,102,241,0.3)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              }}
            >
              <h3 className="text-xl font-extrabold text-center tracking-tight">Save Guest Progress?</h3>
              <p className="text-sm leading-relaxed text-center text-slate-300">
                We detected parsed resume profile details from your guest session. Would you like to carry this over and save it to your new account?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCarryOverCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer border-slate-700 hover:bg-slate-800/50"
                >
                  No, Start Fresh
                </button>
                <button
                  onClick={handleCarryOverConfirm}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition cursor-pointer hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  }}
                >
                  Yes, Import Resume
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Otherwise, render Landing Page fullscreen
  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <LandingPage 
        onNavigate={(mode) => {
          setAuthMode(mode);
          setShowAuthForm(true);
        }} 
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onGoToDashboard={() => navigateTo('/app')}
        isLoggedIn={!!token}
      />

      {/* Auth Modal overlay over Landing Page */}
      {showAuthForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <Login 
            onLoginSuccess={(tok, email) => {
              handleLoginSuccess(tok, email);
              setShowAuthForm(false);
            }} 
            initialMode={authMode}
            onBackToHome={() => setShowAuthForm(false)}
            isModal={true}
          />
        </div>
      )}
    </div>
  );
}

export default App;
