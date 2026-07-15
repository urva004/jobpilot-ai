import React, { useState, useEffect } from 'react';

const AccountSettings = ({ userEmail, onLogout }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdError, setPwdError] = useState(null);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const [userInfo, setUserInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('http://localhost:8000/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserInfo(data);
        }
      } catch (e) {
        console.warn('Could not load user info', e);
      } finally {
        setLoadingInfo(false);
      }
    };
    fetchMe();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    setPwdError(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPwdError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setChangingPwd(true);
    try {
      const res = await fetch('http://localhost:8000/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.detail || 'Failed to change password.');
      } else {
        setPwdMsg('Password changed successfully! 🎉');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setPwdError('Network error. Please try again.');
    } finally {
      setChangingPwd(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteEmail.trim().toLowerCase() !== (userEmail || '').toLowerCase()) {
      alert('Email does not match. Account not deleted.');
      return;
    }
    setDeletingAccount(true);
    try {
      const res = await fetch('http://localhost:8000/auth/delete-account', {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('Your account has been permanently deleted.');
        onLogout(true); // force logout without confirm prompt
      } else {
        const d = await res.json();
        alert(d.detail || 'Failed to delete account.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const avatarLetter = (userEmail || 'U')[0].toUpperCase();

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Account Settings</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your profile, security, and preferences.</p>
      </div>

      {/* Profile Card */}
      <div
        className="rounded-2xl p-6 flex items-center gap-5 border"
        style={{
          background: 'var(--accent-soft)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
        >
          {avatarLetter}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{userEmail || 'User'}</p>
          {loadingInfo ? (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Loading account details...</p>
          ) : userInfo ? (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Account ID: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{userInfo.id}</span>
            </p>
          ) : null}
        </div>
        <div
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border"
          style={{
            background: 'rgba(34,197,94,0.08)',
            borderColor: 'rgba(34,197,94,0.2)',
            color: 'var(--color-success)',
          }}
        >
          ● Active
        </div>
      </div>

      {/* Change Password Card */}
      <div className="glass-card p-6 space-y-5 shadow-lg border">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Change Password</h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Keep your account secure with a strong password.</p>
        </div>

        {pwdError && (
          <div
            className="p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border animate-fadeIn"
            style={{
              background: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.25)',
              color: 'var(--color-danger)',
            }}
          >
            <span>⚠️</span> {pwdError}
          </div>
        )}
        {pwdMsg && (
          <div
            className="p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border animate-fadeIn"
            style={{
              background: 'rgba(34,197,94,0.08)',
              borderColor: 'rgba(34,197,94,0.25)',
              color: 'var(--color-success)',
            }}
          >
            <span>✅</span> {pwdMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            {
              id: 'current-pwd',
              label: 'Current Password',
              value: currentPassword,
              setter: setCurrentPassword,
              show: showCurrentPwd,
              toggleShow: () => setShowCurrentPwd(!showCurrentPwd),
              placeholder: 'Enter current password',
              autoComplete: 'current-password',
            },
            {
              id: 'new-pwd',
              label: 'New Password',
              value: newPassword,
              setter: setNewPassword,
              show: showNewPwd,
              toggleShow: () => setShowNewPwd(!showNewPwd),
              placeholder: 'At least 6 characters',
              autoComplete: 'new-password',
            },
            {
              id: 'confirm-new-pwd',
              label: 'Confirm New Password',
              value: confirmNewPassword,
              setter: setConfirmNewPassword,
              show: false,
              toggleShow: null,
              placeholder: 'Re-enter new password',
              autoComplete: 'new-password',
            },
          ].map(({ id, label, value, setter, show, toggleShow, placeholder, autoComplete }) => (
            <div key={id} className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest pl-0.5" style={{ color: 'var(--text-muted)' }}>
                {label}
              </label>
              <div className="relative">
                <input
                  id={`settings-${id}`}
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  autoComplete={autoComplete}
                  className="input-base pr-10 text-xs"
                />
                {toggleShow && (
                  <button
                    type="button"
                    onClick={toggleShow}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition p-1 cursor-pointer"
                  >
                    {show ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            id="btn-change-password"
            type="submit"
            disabled={changingPwd}
            className="w-full btn-primary text-xs py-2.5"
          >
            {changingPwd ? (
              <>
                <div className="spinner w-4 h-4 border-t-white" />
                <span>Updating...</span>
              </>
            ) : '🔑 Update Password'}
          </button>
        </form>
      </div>

      {/* Session & Security Info */}
      <div className="glass-card p-6 space-y-4 shadow-lg border">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Session & Security</h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Information about your current session.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Auth Method', value: 'JWT Bearer Token' },
            { label: 'Token Expiry', value: '24 hours' },
            { label: 'Encryption', value: 'bcrypt (rounds: 12)' },
            { label: 'Algorithm', value: 'HS256' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-3 rounded-xl space-y-0.5 border"
              style={{
                background: 'var(--bg-glass)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{value}</p>
            </div>
          ))}
        </div>

        <button
          id="btn-sign-out-settings"
          type="button"
          onClick={() => onLogout(true)}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.20)',
            color: 'var(--color-danger)',
          }}
        >
          🚪 Sign Out
        </button>
      </div>

      {/* Danger Zone */}
      <div
        className="rounded-2xl p-6 space-y-4 border"
        style={{
          background: 'rgba(239,68,68,0.04)',
          borderColor: 'rgba(239,68,68,0.2)',
        }}
      >
        <div className="space-y-0.5">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-danger)' }}>⚠️ Danger Zone</h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>

        {!showDeleteConfirm ? (
          <button
            id="btn-delete-account-show"
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              color: 'var(--color-danger)',
            }}
          >
            🗑️ Delete My Account
          </button>
        ) : (
          <div className="space-y-3 animate-fadeIn">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Type your email <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{userEmail}</span> to confirm deletion:
            </p>
            <input
              id="input-delete-confirm-email"
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder={userEmail}
              className="input-base text-xs"
            />
            <div className="flex gap-3">
              <button
                id="btn-cancel-delete"
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteEmail(''); }}
                className="flex-grow btn-secondary py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteEmail.trim().toLowerCase() !== (userEmail || '').toLowerCase()}
                className="flex-grow py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              >
                {deletingAccount ? 'Deleting...' : '🗑️ Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
