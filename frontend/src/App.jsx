import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ResumeUpload from './components/ResumeUpload';
import JobSearch from './components/JobSearch';
import ATSAnalyzer from './components/ATSAnalyzer';
import WritingAgent from './components/WritingAgent';
import TrackerBoard from './components/TrackerBoard';
import MatchAlerts from './components/MatchAlerts';


function App() {
  const [currentPage, setCurrentPage] = useState('resume');
  const [profile, setProfile] = useState(null);
  const [loadingActiveProfile, setLoadingActiveProfile] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread count from notifications
  const fetchUnreadCount = async () => {
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

  useEffect(() => {
    fetchUnreadCount();
  }, []);


  useEffect(() => {
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
  }, []);

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
      
      case 'match':
        return (
          <div className="max-w-4xl mx-auto py-12 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-4xl mx-auto mb-6">
              🎯
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Semantic Matching (Phase 3)</h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-8">
              Navigate to "Job Discovery" tab, search for jobs, and click "Compute Match %" on any job card to run the Phase 3 Semantic Match.
            </p>
          </div>
        );

      case 'ats':
        return <ATSAnalyzer />;

      case 'writing':
        return <WritingAgent />;

      case 'tracker':
        return <TrackerBoard />;

      case 'alerts':
        return <MatchAlerts onRefreshUnread={setUnreadCount} />;

      default:
        return <div className="text-center py-12">Page not found</div>;
    }

  };

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans">
      {/* Sidebar Nav */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        hasProfile={!!profile}
        unreadCount={unreadCount}
      />


      {/* Main Content Area */}
      <main className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20 min-h-screen overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
