'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { gateVerify, gateReadSession, gateWriteSession } from '@/lib/gateUsers';

const GateContext = createContext(null);

export function useGate() {
  return useContext(GateContext);
}

export function GateProvider({ children }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady]   = useState(false);
  const [username, setUsername] = useState('');
  const [code, setCode]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const saved = gateReadSession();
    if (saved) setAuthed(true);
    setReady(true);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (gateVerify(username, code)) {
        gateWriteSession(username.trim().toLowerCase());
        setAuthed(true);
      } else {
        setError('Ungültiger Nutzername oder Login-Code.');
      }
      setLoading(false);
    }, 400);
  }

  if (!ready) return null;
  if (authed) return (
    <GateContext.Provider value={{ authed }}>
      {children}
    </GateContext.Provider>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F1113',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#1A1D1F',
        borderRadius: '20px',
        padding: '48px 40px',
        border: '1px solid #2C3135',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6BAF7E 0%, #A788FA 100%)',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>L</span>
          </div>
          <h1 style={{
            color: '#F7F8F6',
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            margin: '0 0 6px',
          }}>LIVORA</h1>
          <p style={{ color: '#8A9BA5', fontSize: '13px', margin: 0 }}>
            Bitte melde dich mit deinem Login-Code an.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: '#8A9BA5', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Nutzername
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="dein-nutzername"
              autoComplete="username"
              required
              style={{
                width: '100%',
                background: '#0F1113',
                border: '1px solid #2C3135',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#F7F8F6',
                fontSize: '15px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#6BAF7E'}
              onBlur={e => e.target.style.borderColor = '#2C3135'}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#8A9BA5', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Login-Code
            </label>
            <input
              type="password"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                background: '#0F1113',
                border: '1px solid #2C3135',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#F7F8F6',
                fontSize: '15px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#6BAF7E'}
              onBlur={e => e.target.style.borderColor = '#2C3135'}
            />
          </div>

          {error && (
            <p style={{
              color: '#f87171',
              fontSize: '13px',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '8px',
              padding: '10px 14px',
              margin: 0,
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              width: '100%',
              background: loading ? '#2C3135' : 'linear-gradient(135deg, #6BAF7E 0%, #5a9b6d 100%)',
              color: loading ? '#8A9BA5' : '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              letterSpacing: '0.2px',
            }}
          >
            {loading ? 'Wird geprüft…' : 'Anmelden'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#3C4549', fontSize: '12px', marginTop: '32px' }}>
          LIVE. BETTER. EVERY DAY.
        </p>
      </div>
    </div>
  );
}
