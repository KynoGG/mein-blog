'use client';

import { useAuth } from './AuthProvider';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

export function AuthGate() {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <>
      <main className="main-content">
        <div className="tracker-page">
          <div className="auth-gate">
            <div className="auth-gate-icon">🔒</div>
            <h2 className="auth-gate-title">Anmeldung erforderlich</h2>
            <p className="auth-gate-sub">
              Dieser Bereich ist nur für angemeldete Nutzer zugänglich.
            </p>
            <button className="tracker-submit auth-gate-btn" onClick={() => setAuthOpen(true)}>
              Jetzt anmelden
            </button>
          </div>
        </div>
      </main>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <AuthGate />;
  return children;
}
