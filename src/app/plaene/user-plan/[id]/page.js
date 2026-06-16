'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const USER_SUB_KEY = 'livora-user-subscribed-plans';

function readArr(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function getMuscleHint(name) {
  const n = name.toLowerCase();
  if (/kniebeuge|squat|lunges|beinpresse|wadenheben|beinstrecker/.test(n)) return 'Beine & Gesäß';
  if (/liegestütz|push.up|bankdrücken|schrägbank/.test(n)) return 'Brust';
  if (/schulterdrücken|seitheben|arnold|frontales/.test(n)) return 'Schultern';
  if (/klimmzüge|rudern|latzug|pulldown/.test(n)) return 'Rücken';
  if (/trizeps|pushdown|dips/.test(n)) return 'Trizeps';
  if (/bizeps|curl|hammer/.test(n)) return 'Bizeps';
  if (/kreuzheben|hip thrust|rumänisch|glute/.test(n)) return 'Gesäß & Rücken';
  if (/plank|crunch|core/.test(n)) return 'Core';
  return null;
}

const WEEK_ORDER = ['mo','di','mi','do','fr','sa','so'];

export default function UserPlanDetailPage({ params }) {
  const { id } = use(params);
  const { user: _au, loading: _al } = useAuth();
  const [plan,        setPlan]        = useState(null);
  const [subscribed,  setSubscribed]  = useState(true);
  const [loaded,      setLoaded]      = useState(false);

  useEffect(() => {
    const plans = readArr(USER_SUB_KEY);
    const found = plans.find(p => p.id === id);
    setPlan(found ?? null);
    setSubscribed(!!found);
    setLoaded(true);
  }, [id]);

  function handleUnsubscribe() {
    localStorage.setItem(USER_SUB_KEY, JSON.stringify(readArr(USER_SUB_KEY).filter(p => p.id !== id)));
    setSubscribed(false);
  }

  function handleResubscribe() {
    // plan is still in local state — re-add it
    const current = readArr(USER_SUB_KEY);
    if (!current.find(p => p.id === id)) {
      localStorage.setItem(USER_SUB_KEY, JSON.stringify([...current, plan]));
    }
    setSubscribed(true);
  }

  if (!loaded || _al) return null;
  if (!_au) return <AuthGate />;

  if (!plan) {
    return (
      <main className="main-content">
        <div className="tracker-page">
          <Link href="/plaene/training" className="back-link">← Zurück zu Trainingspläne</Link>
          <div className="tracker-empty" style={{ marginTop: 40 }}>
            <span>🔍</span>
            <p>Plan nicht gefunden.</p>
          </div>
        </div>
      </main>
    );
  }

  const trainingDays = (plan.days ?? []).filter(d => d.type !== 'rest');
  const totalEx = trainingDays.reduce((a, d) => a + (d.exercises?.length ?? 0), 0);

  const sortedDays = [...(plan.days ?? [])].sort((a, b) => {
    const ai = WEEK_ORDER.indexOf(a.id);
    const bi = WEEK_ORDER.indexOf(b.id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <main className="main-content">
      <div className="tracker-page">
        <Link href="/plaene/training" className="back-link">← Zurück zu Trainingspläne</Link>

        {/* Hero */}
        <div className="pe-detail-hero">
          <div className="pe-detail-band pe-hdr-fitness">
            <span className="pe-detail-emoji" aria-hidden="true">🏋️</span>
            {subscribed && <span className="pe-card-added-badge">✓</span>}
          </div>
          <div className="pe-detail-body">
            <div className="pe-card-badges">
              <span className="cat-pill small cat-fitness">Training</span>
            </div>
            <h1 className="pe-detail-title">{plan.name}</h1>
            <p className="pe-detail-desc">
              Trainingsplan von {plan.authorName || plan.authorUsername}
            </p>
            <div className="pe-detail-meta">
              <span className="pe-detail-meta-item">📅 {trainingDays.length}× pro Woche</span>
              <span className="pe-detail-meta-item">💪 {totalEx} Übungen</span>
              <span className="pe-detail-meta-item">✍️ von {plan.authorName || plan.authorUsername}</span>
            </div>
          </div>
        </div>

        {/* Subscribe toggle */}
        <div className="pe-add-bar">
          {subscribed ? (
            <div className="pe-detail-added-row">
              <span className="pe-added-label">Abonniert ✓</span>
              <button className="pe-remove-btn" onClick={handleUnsubscribe}>Abonnement beenden</button>
            </div>
          ) : (
            <button className="pe-detail-add-btn tracker-submit" onClick={handleResubscribe}>
              Plan abonnieren +
            </button>
          )}
        </div>

        {/* Plan days */}
        <div className="pe-days">
          {sortedDays.map(day => (
            <div key={day.id} className="pe-day">
              <div className="pe-day-head">
                <h2 className="pe-day-title">
                  {day.name}
                  {day.focus && <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: 8 }}>— {day.focus}</span>}
                </h2>
                {day.type === 'rest'
                  ? <span className="pe-day-count">💤 Ruhetag</span>
                  : <span className="pe-day-count">{day.exercises?.length ?? 0} Übungen</span>
                }
              </div>

              {day.type !== 'rest' && day.exercises?.length > 0 && (
                <div className="pe-exercises">
                  {day.exercises.map(ex => {
                    const muscle = getMuscleHint(ex.name);
                    return (
                      <div key={ex.id} className="pe-ex">
                        <div className="pe-ex-main">
                          <span className="pe-ex-name">{ex.name}</span>
                          <div className="pe-ex-right">
                            {muscle && <span className="pe-muscle-chip">{muscle}</span>}
                            <span className="pe-ex-sets">{ex.saetze} × {ex.wiederholungen}{ex.gewicht ? ` · ${ex.gewicht}` : ''}</span>
                          </div>
                        </div>
                        {ex.notizen && <p className="pe-ex-tip">💡 {ex.notizen}</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {day.type === 'rest' && (
                <div style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Erholung & Regeneration
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Subscribe toggle bottom */}
        <div className="pe-add-bar" style={{ marginTop: 24 }}>
          {subscribed ? (
            <div className="pe-detail-added-row">
              <span className="pe-added-label">Abonniert ✓</span>
              <button className="pe-remove-btn" onClick={handleUnsubscribe}>Abonnement beenden</button>
            </div>
          ) : (
            <button className="pe-detail-add-btn tracker-submit" onClick={handleResubscribe}>
              Plan abonnieren +
            </button>
          )}
        </div>

        {plan.authorUsername && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Link href={`/profil/${plan.authorUsername}`} className="tracker-link" style={{ fontSize: '0.875rem' }}>
              Profil von {plan.authorName || plan.authorUsername} ansehen →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
