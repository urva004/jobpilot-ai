import React, { useState, useEffect } from 'react';
import logo from '../assets/logo.jpg';

// Password strength calculator
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#f97316' };
  if (score === 3) return { score: 3, label: 'Good', color: '#eab308' };
  if (score >= 4) return { score: 4, label: 'Strong', color: '#22c55e' };
}

const EyeIcon = ({ show }) => show ? (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Login = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger mount animation
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const strength = mode === 'signup' ? getPasswordStrength(password) : null;

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const endpoint = mode === 'login' ? 'login' : 'signup';
    try {
      const res = await fetch(`http://localhost:8000/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Authentication failed.');
      }

      if (mode === 'login') {
        const data = await res.json();
        onLoginSuccess(data.access_token, data.user_email);
      } else {
        setSuccessMsg('Account created! You can now sign in.');
        switchMode('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
      className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{
            background: 'radial-gradient(circle, #6366f1 0%, #a855f7 50%, transparent 70%)',
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
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .card-enter {
          animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .shimmer-text {
          background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899, #a855f7, #6366f1);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .input-focus:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .strength-bar {
          transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .tab-active {
          background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15));
          border-bottom: 2px solid #6366f1;
          color: white;
        }
        .tab-inactive {
          color: #64748b;
          border-bottom: 2px solid transparent;
        }
        .btn-primary {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          transition: all 0.2s ease;
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #4338ca, #6d28d9);
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(99,102,241,0.35);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      {/* Card */}
      <div
        className={`w-full max-w-md relative z-10 ${mounted ? 'card-enter' : 'opacity-0'}`}
      >
        {/* Glow border effect */}
        <div
          className="absolute -inset-0.5 rounded-3xl opacity-40"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
            filter: 'blur(8px)',
          }}
        />

        <div
          className="relative rounded-3xl p-8 space-y-6"
          style={{
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          {/* Brand */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex">
              <img
                src={logo}
                alt="JobPilot AI Logo"
                className="w-16 h-16 rounded-2xl object-cover object-top shadow-2xl border"
                style={{
                  width: '64px',
                  height: '64px',
                  borderColor: 'rgba(99, 102, 241, 0.25)',
                  boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
                }}
              />
              <div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950"
                style={{ background: '#22c55e' }}
              />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight shimmer-text">JobPilot AI</h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Your AI-powered job search assistant
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.15)' }}
          >
            <button
              id="tab-login"
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-300 rounded-l-xl ${mode === 'login' ? 'tab-active' : 'tab-inactive hover:text-slate-300'}`}
            >
              Sign In
            </button>
            <button
              id="tab-signup"
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-300 rounded-r-xl ${mode === 'signup' ? 'tab-active' : 'tab-inactive hover:text-slate-300'}`}
            >
              Create Account
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div
              className="p-3.5 rounded-xl flex items-start gap-2.5 text-sm"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5',
              }}
            >
              <span className="text-base shrink-0">⚠️</span>
              <span className="font-medium leading-snug">{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              className="p-3.5 rounded-xl flex items-start gap-2.5 text-sm"
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.25)',
                color: '#86efac',
              }}
            >
              <span className="text-base shrink-0">✅</span>
              <span className="font-medium leading-snug">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Email Address
              </label>
              <input
                id="input-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
                className="input-focus w-full py-3 px-4 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200"
                style={{
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  className="input-focus w-full py-3 px-4 pr-12 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                />
                <button
                  type="button"
                  id="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-150 p-1"
                >
                  <EyeIcon show={showPassword} />
                </button>
              </div>

              {/* Password Strength Meter (signup only) */}
              {mode === 'signup' && password && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-all duration-400"
                        style={{
                          background: strength.score >= level ? strength.color : 'rgba(99,102,241,0.12)',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] text-slate-500">Password strength</span>
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: strength.color }}
                    >
                      {strength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="input-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="input-focus w-full py-3 px-4 pr-12 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(15,23,42,0.8)',
                      border: confirmPassword && password !== confirmPassword
                        ? '1px solid rgba(239,68,68,0.5)'
                        : confirmPassword && password === confirmPassword
                          ? '1px solid rgba(34,197,94,0.4)'
                          : '1px solid rgba(99,102,241,0.2)',
                    }}
                  />
                  <button
                    type="button"
                    id="btn-toggle-confirm"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-150 p-1"
                  >
                    <EyeIcon show={showConfirm} />
                  </button>
                  {confirmPassword && (
                    <span
                      className="absolute right-10 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: password === confirmPassword ? '#22c55e' : '#ef4444' }}
                    >
                      {password === confirmPassword ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-submit-auth"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2.5 mt-2"
            >
              {loading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin"
                  />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? '🔐 Sign In' : '🚀 Create Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Features showcase (login mode) */}
          {mode === 'login' && (
            <div
              className="grid grid-cols-3 gap-2 pt-1"
            >
              {[
                { icon: '🎯', label: 'AI Matching' },
                { icon: '📝', label: 'Auto Emails' },
                { icon: '📋', label: 'Job Tracker' },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl"
                  style={{
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.12)',
                  }}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-[11px] text-slate-600 pt-1">
            {mode === 'login'
              ? 'Your data is encrypted and stored locally.'
              : 'By signing up, you agree to our terms of use.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
