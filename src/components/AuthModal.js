'use client';

import { useEffect, useState, useCallback } from 'react';
import { auth, isDemoMode } from '@/lib/supabase';
import { isUsernameTaken, isValidUsername } from '@/lib/userRegistry';

export default function AuthModal({ onClose }) {
  const [tab,      setTab]      = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [unStatus, setUnStatus] = useState('idle'); // idle | checking | ok | taken | invalid
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function switchTab(next) {
    setTab(next);
    setError('');
    setSuccess('');
    setUsername('');
    setUnStatus('idle');
  }

  // Debounced username check
  useEffect(() => {
    if (tab !== 'register') return;
    const val = username.trim();
    if (!val) { setUnStatus('idle'); return; }
    if (!isValidUsername(val)) { setUnStatus('invalid'); return; }
    setUnStatus('checking');
    const timer = setTimeout(() => {
      setUnStatus(isUsernameTaken(val) ? 'taken' : 'ok');
    }, 350);
    return () => clearTimeout(timer);
  }, [username, tab]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (tab === 'login') {
      const { error } = await auth.signInWithPassword({ email, password });
      if (error) setError(translateError(error.message));
      else onClose();
    } else {
      if (unStatus === 'taken')   { setError('Dieser Benutzername ist bereits vergeben.'); setLoading(false); return; }
      if (unStatus === 'invalid') { setError('Ungültiger Benutzername.'); setLoading(false); return; }
      if (unStatus !== 'ok')      { setError('Bitte wähle einen gültigen Benutzernamen.'); setLoading(false); return; }

      const { error } = await auth.signUp({ email, password, username: username.trim() });
      if (error) {
        if (error.message === 'USERNAME_TAKEN') setError('Dieser Benutzername ist bereits vergeben.');
        else setError(translateError(error.message));
      } else if (isDemoMode) {
        onClose();
      } else {
        setSuccess('Bestätigungs-E-Mail wurde gesendet. Bitte prüfe dein Postfach.');
      }
    }

    setLoading(false);
  }

  const unHint = {
    idle:     null,
    checking: { cls: 'un-hint-checking', text: 'Prüfe…' },
    ok:       { cls: 'un-hint-ok',       text: `@${username.trim()} ist verfügbar ✓` },
    taken:    { cls: 'un-hint-taken',    text: 'Dieser Benutzername ist bereits vergeben.' },
    invalid:  { cls: 'un-hint-invalid',  text: 'Nur a–z, 0–9 und _ erlaubt (3–20 Zeichen).' },
  }[unStatus];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Schließen">
          <CloseIcon />
        </button>

        {isDemoMode && (
          <div className="demo-banner">
            <strong>Demo-Modus</strong> – Supabase noch nicht verbunden.
            Beliebige E-Mail und Passwort (min. 6 Zeichen) eingeben.
          </div>
        )}

        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
            Anmelden
          </button>
          <button className={`modal-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>
            Registrieren
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">

          {tab === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-username">Benutzername</label>
              <div className="un-input-wrap">
                <span className="un-at">@</span>
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="dein_name"
                  required
                  autoComplete="username"
                  maxLength={20}
                />
              </div>
              {unHint && <span className={`un-hint ${unHint.cls}`}>{unHint.text}</span>}
              {!unHint && (
                <span className="form-hint">Einzigartig · nur a–z, 0–9 und _ · 3–20 Zeichen</span>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">E-Mail</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="deine@email.de"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Passwort</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
            {tab === 'register' && <span className="form-hint">Mindestens 6 Zeichen</span>}
          </div>

          {error   && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || (tab === 'register' && unStatus !== 'ok')}
          >
            {loading ? 'Bitte warten…' : tab === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>
      </div>
    </div>
  );
}

function translateError(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-Mail oder Passwort falsch.';
  if (msg.includes('Email not confirmed')) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  if (msg.includes('User already registered')) return 'Diese E-Mail-Adresse ist bereits registriert.';
  if (msg.includes('Password should be')) return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
  return msg;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  );
}
