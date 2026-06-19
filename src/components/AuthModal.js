'use client';

import { useEffect, useState } from 'react';
import { auth, isDemoMode } from '@/lib/supabase';

export default function AuthModal({ onClose }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await auth.signInWithPassword({ email, password });
    if (error) setError(translateError(error.message));
    else onClose();
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Schließen">
          <CloseIcon />
        </button>

        {isDemoMode && (
          <div className="demo-banner">
            <strong>Demo-Modus</strong> – Supabase noch nicht verbunden.
          </div>
        )}

        <div className="modal-tabs">
          <button className="modal-tab active">Anmelden</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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
              autoComplete="current-password"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Bitte warten…' : 'Anmelden'}
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
