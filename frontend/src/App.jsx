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


function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [currentPage, setCurrentPage] = useState('resume');
  const [profile, setProfile] = useState(null);
  const [loadingActiveProfile, setLoadingActiveProfile] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState('login');

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

  const handleLoginSuccess = (newToken, email) => {
    setToken(newToken);
    setUserEmail(email);
    localStorage.setItem('token', newToken);
    localStorage.setItem('userEmail', email);
  };


  const handleLogout = (force = false) => {
    if (force || window.confirm('Are you sure you want to log out?')) {
      setToken('');
      setUserEmail('');
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      setProfile(null);
    }
  };

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
          setProfile(data);
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

    switch (currentPage) {
      case 'resume':
        return <ResumeUpload profile={profile} onUploadSuccess={setProfile} />;
      
      case 'search':
        return <JobSearch />;
      


      case 'ats':
        return <ATSAnalyzer />;

      case 'writing':
        return <WritingAgent />;

      case 'tracker':
        return <TrackerBoard />;

      case 'alerts':
        return <MatchAlerts onRefreshUnread={setUnreadCount} />;

      case 'interview':
        return <InterviewPrep />;

      case 'variants':
        return <ResumeVariants />;

      case 'account':
        return <AccountSettings userEmail={userEmail} onLogout={handleLogout} />;

      default:
        return <div className="text-center py-12">Page not found</div>;
    }

  };

  if (!token) {
    if (!showAuthForm) {
      return (
        <LandingPage 
          onNavigate={(mode) => {
            setAuthMode(mode);
            setShowAuthForm(true);
          }} 
        />
      );
    }
    return (
      <Login 
        onLoginSuccess={(tok, email) => {
          handleLoginSuccess(tok, email);
          setShowAuthForm(false);
        }} 
        initialMode={authMode}
        onBackToHome={() => setShowAuthForm(false)}
      />
    );
  }

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
      />

      {/* Main Content Area — independently scrollable */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--bg-elevated) 50%, var(--bg-base) 100%)'
        }}
      >
        {renderPage()}
      </main>
    </div>

  );
}

export default App;
