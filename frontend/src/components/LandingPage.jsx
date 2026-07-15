import React from 'react';
import logo from '../assets/logo.jpg';

export default function LandingPage({ onNavigate, theme, onToggleTheme, onGoToDashboard, isLoggedIn }) {
  const isDark = theme === 'dark';
  const blob1Opacity = isDark ? 0.2 : 0.06;
  const blob2Opacity = isDark ? 0.15 : 0.04;
  const blob3Opacity = isDark ? 0.05 : 0.02;
  const blobBlur = isDark ? 'blur(64px)' : 'blur(40px)';

  return (
    <div 
      style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
      className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Background decoration elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full transition-all duration-300"
          style={{
            background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
            animation: 'float 12s ease-in-out infinite',
            opacity: blob1Opacity,
            filter: blobBlur
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full transition-all duration-300"
          style={{
            background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
            animation: 'float 15s ease-in-out infinite reverse',
            opacity: blob2Opacity,
            filter: blobBlur
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full transition-all duration-300"
          style={{
            background: 'radial-gradient(circle, #6366f1 0%, #a855f7 50%, transparent 70%)',
            opacity: blob3Opacity,
            filter: blobBlur
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.03); }
        }
        .text-glow {
          text-shadow: ${isDark ? '0 0 40px rgba(99, 102, 241, 0.4)' : '0 0 30px rgba(99, 102, 241, 0.15)'};
        }
        .glass-card {
          background: var(--bg-glass);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-2px);
        }
        .btn-gradient {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.25);
          color: #ffffff !important;
        }
        .btn-gradient:hover {
          background: linear-gradient(135deg, #4338ca, #6d28d9);
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }
        .btn-outline {
          background: var(--bg-glass);
          border: 1px solid var(--border);
          color: var(--text-primary);
          transition: all 0.2s ease;
        }
        .btn-outline:hover {
          background: var(--bg-glass-hover);
          border-color: var(--border-hover);
        }
      `}</style>

      {/* Navbar */}
      <header 
        className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300"
        style={{
          background: 'var(--bg-glass)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="JobPilot AI Logo"
              className="w-10 h-10 rounded-xl object-cover object-top shadow-md border"
              style={{
                borderColor: 'var(--border)',
                width: '40px',
                height: '40px'
              }}
            />
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              JobPilot AI
            </span>
          </div>
          
          {/* Centered navigation links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>Features</a>
            <a href="#how-it-works" className="text-sm font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>How it Works</a>
            <a href="#features" className="text-sm font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>Pricing</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle (Sun/Moon) */}
            <button
              onClick={onToggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition border cursor-pointer"
              style={{
                background: 'var(--accent-soft)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>

            {isLoggedIn ? (
              <button
                onClick={onGoToDashboard || (() => {})}
                className="btn-gradient px-5 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Go to App →
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className="btn-outline px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className="btn-gradient px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center py-12 md:py-24 relative z-10">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-2 rounded-full border text-xs font-semibold"
            style={{
              background: 'var(--accent-soft)',
              borderColor: 'var(--border)',
              color: 'var(--text-link)'
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            AI-Powered Career Optimization Engine
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
            Land your next dream job <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent text-glow">
              in record time
            </span>
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            JobPilot AI parses your resume, searches real-time roles, analyzes ATS compatibility gaps, and automates tailored cover letters & outreach—all from one smart dashboard.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {isLoggedIn ? (
              <button
                onClick={onGoToDashboard || (() => {})}
                className="btn-gradient px-8 py-4 text-base font-extrabold rounded-xl transition-all cursor-pointer"
              >
                Go to App →
              </button>
            ) : (
              <>
                <button
                  onClick={onGoToDashboard || (() => {})}
                  className="btn-gradient px-8 py-4 text-base font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Start Parsing as Guest
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className="btn-outline px-6 py-4 text-base font-bold rounded-xl cursor-pointer"
                >
                  Create Account
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-6 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-2 text-emerald-500"><span className="font-bold">✓</span> 100% Free Trial</span>
            <span className="flex items-center gap-2 text-emerald-500"><span className="font-bold">✓</span> No Credit Card Required</span>
            <span className="flex items-center gap-2 text-emerald-500"><span className="font-bold">✓</span> Neon Cloud Storage Security</span>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20 md:pt-32">
          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-indigo-500/30 transition-all duration-300">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
              style={{
                background: 'var(--accent-soft)',
                borderColor: 'var(--border)'
              }}
            >
              🎯
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Semantic AI Job Matching</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Upload your resume and get immediate compatibility match percentages for any job. Highlights strengths, lists missing skills, and explains alignment.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-purple-500/30 transition-all duration-300">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
              style={{
                background: 'var(--accent-soft)',
                borderColor: 'var(--border)'
              }}
            >
              📊
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>ATS Analysis & Optimization</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Ensure you pass the initial screeners. Analyze keyword presence, receive tailoring recommendations, and dynamically create reworded experience bullet points.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-pink-500/30 transition-all duration-300">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
              style={{
                background: 'var(--accent-soft)',
                borderColor: 'var(--border)'
              }}
            >
              ✉️
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Auto Email & Outreach</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Connect your Gmail account via OAuth, generate customized cold application emails, draft cover letters, and send applications directly from the dashboard.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer 
        className="border-t py-8 text-center text-sm transition-colors duration-300"
        style={{ 
          borderColor: 'var(--border)', 
          background: 'var(--bg-glass)',
          color: 'var(--text-muted)'
        }}
      >
        <p>JobPilot AI © 2026. Made with FastAPI, React and Neon PostgreSQL.</p>
      </footer>
    </div>
  );
}
