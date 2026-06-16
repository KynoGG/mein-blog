'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  oeffentlicheTrainingsplaene,
  oeffentlicheErnaehrungsplaene,
} from '@/data/oeffentlichePlaene';
import { useAuth } from '@/components/AuthProvider';
import dynamic from 'next/dynamic';

const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false });

const TRAINING_KEY   = 'meine-trainingsplaene';
const ERNAEHRUNG_KEY = 'meine-ernaehrungsplaene';

const NIVEAU_BADGE = {
  einsteiger:      { label: 'Einsteiger',     cls: 'cat-fitness'    },
  mittel:          { label: 'Mittel',          cls: 'cat-ernaehrung' },
  fortgeschritten: { label: 'Fortgeschritten', cls: 'cat-lifestyle'  },
};

const KAT_BADGE = {
  kraft:        { label: 'Kraft',        cls: 'cat-fitness'    },
  ausdauer:     { label: 'Ausdauer',     cls: 'cat-gaming'     },
  mobilitaet:   { label: 'Mobilität',    cls: 'cat-ki'         },
  abnehmen:     { label: 'Abnehmen',     cls: 'cat-ernaehrung' },
  muskelaufbau: { label: 'Muskelaufbau', cls: 'cat-lifestyle'  },
  vegetarisch:  { label: 'Vegetarisch',  cls: 'cat-fitness'    },
};

const HEADER_CFG = {
  kraft:        { emoji: '🏋️', cls: 'pe-hdr-fitness'    },
  ausdauer:     { emoji: '🏃', cls: 'pe-hdr-gaming'     },
  mobilitaet:   { emoji: '🧘', cls: 'pe-hdr-ki'         },
  abnehmen:     { emoji: '🥗', cls: 'pe-hdr-ernaehrung' },
  muskelaufbau: { emoji: '💪', cls: 'pe-hdr-lifestyle'  },
  vegetarisch:  { emoji: '🌱', cls: 'pe-hdr-fitness'    },
};

const ALL_PLANS = [
  ...oeffentlicheTrainingsplaene.map(p => ({ ...p, _type: 'training' })),
  ...oeffentlicheErnaehrungsplaene.map(p => ({ ...p, _type: 'ernaehrung' })),
];

const TYPE_FILTERS = [
  { key: 'alle',       label: 'Alle' },
  { key: 'training',   label: 'Trainingspläne' },
  { key: 'ernaehrung', label: 'Ernährungspläne' },
];

const NIVEAU_FILTERS = [
  { key: 'alle',            label: 'Alle Niveaus'   },
  { key: 'einsteiger',      label: 'Einsteiger'     },
  { key: 'mittel',          label: 'Mittel'         },
  { key: 'fortgeschritten', label: 'Fortgeschritten' },
];

const ORT_FILTERS = [
  { key: 'alle',    label: 'Alle Orte'      },
  { key: 'studio',  label: '🏋️ Fitnessstudio' },
  { key: 'home',    label: '🏠 Home Workout'  },
];

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`pe-toast pe-toast-${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'added' ? '✓' : '✕'} {toast.msg}
    </div>
  );
}

// ── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, added, onToggle }) {
  const hdr        = HEADER_CFG[plan.kategorie] ?? { emoji: '📋', cls: 'pe-hdr-ki' };
  const katBadge   = KAT_BADGE[plan.kategorie];
  const niveauBadge = plan.niveau ? NIVEAU_BADGE[plan.niveau] : null;

  const meta = plan._type === 'training'
    ? `${plan.trainingsTagsProWoche}× pro Woche · ${plan.dauer}`
    : `${plan.kalorien} kcal/Tag`;

  return (
    <article className={`pe-card${added ? ' pe-card-added' : ''}`}>
      <div className={`pe-card-header ${hdr.cls}`}>
        <span className="pe-card-emoji" aria-hidden="true">{hdr.emoji}</span>
        {added && <span className="pe-card-added-badge" aria-hidden="true">✓</span>}
      </div>

      <Link href={`/plaene-entdecken/${plan.id}`} className="pe-card-link" aria-label={`Details zu ${plan.titel}`} />
      <div className="pe-card-body">
        <div className="pe-card-badges">
          {niveauBadge && (
            <span className={`cat-pill small ${niveauBadge.cls}`}>{niveauBadge.label}</span>
          )}
          {katBadge && (
            <span className={`cat-pill small ${katBadge.cls}`}>{katBadge.label}</span>
          )}
        </div>

        <h3 className="pe-card-title">{plan.titel}</h3>
        <p className="pe-card-desc">{plan.beschreibung}</p>

        <div className="pe-card-meta">
          <span className="pe-card-info">{meta}</span>
          <span className="pe-card-autor">von {plan.autor}</span>
        </div>
      </div>

      <div className="pe-card-footer">
        {added ? (
          <div className="pe-footer-added">
            <span className="pe-added-label">Hinzugefügt ✓</span>
            <button className="pe-remove-btn" onClick={onToggle}>Entfernen</button>
          </div>
        ) : (
          <button className="pe-add-btn tracker-submit" onClick={onToggle}>
            Plan hinzufügen +
          </button>
        )}
      </div>
    </article>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PlaeneEntdeckenPage() {
  const { user } = useAuth();
  const [typeFilter,   setTypeFilter]   = useState('alle');
  const [niveauFilter, setNiveauFilter] = useState('alle');
  const [ortFilter,    setOrtFilter]    = useState('alle');
  const [hinzugefuegt, setHinzugefuegt] = useState(new Set());
  const [toast,        setToast]        = useState(null);
  const [authOpen,     setAuthOpen]     = useState(false);
  const toastTimer = useRef(null);

  // Load saved plan IDs only when logged in
  useEffect(() => {
    if (!user) { setHinzugefuegt(new Set()); return; }
    try {
      const training   = JSON.parse(localStorage.getItem(TRAINING_KEY)   || '[]');
      const ernaehrung = JSON.parse(localStorage.getItem(ERNAEHRUNG_KEY) || '[]');
      setHinzugefuegt(new Set([...training, ...ernaehrung]));
    } catch {}
  }, [user]);

  function showToast(msg, type) {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  function togglePlan(plan) {
    if (!user) { setAuthOpen(true); return; }
    const isAdding = !hinzugefuegt.has(plan.id);
    const key      = plan._type === 'training' ? TRAINING_KEY : ERNAEHRUNG_KEY;

    // Update the correct localStorage key
    try {
      const existing = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
      isAdding ? existing.add(plan.id) : existing.delete(plan.id);
      localStorage.setItem(key, JSON.stringify([...existing]));
    } catch {}

    // Update UI state
    setHinzugefuegt(prev => {
      const next = new Set(prev);
      isAdding ? next.add(plan.id) : next.delete(plan.id);
      return next;
    });

    showToast(
      isAdding ? 'Plan wurde hinzugefügt!' : 'Plan wurde entfernt',
      isAdding ? 'added' : 'removed',
    );
  }

  const filtered = ALL_PLANS.filter(p => {
    if (typeFilter !== 'alle' && p._type !== typeFilter) return false;
    if (niveauFilter !== 'alle' && p._type === 'training' && p.niveau !== niveauFilter) return false;
    if (ortFilter !== 'alle' && p._type === 'training' && p.ort !== ortFilter) return false;
    return true;
  });

  const showNiveauFilter = typeFilter !== 'ernaehrung';
  const showOrtFilter    = typeFilter !== 'ernaehrung';
  const totalAdded       = hinzugefuegt.size;

  return (
    <main className="main-content">
      <div className="tracker-page">

        <header className="dash-header" style={{ marginBottom: '8px' }}>
          <div>
            <h1 className="kategorie-title">Pläne entdecken</h1>
            <p className="tracker-sub">
              Kuratierte Trainings- und Ernährungspläne von KynoGG — kostenlos speicherbar.
            </p>
          </div>
          {totalAdded > 0 && (
            <span className="cat-pill small cat-fitness">
              {totalAdded} {totalAdded === 1 ? 'Plan' : 'Pläne'} hinzugefügt
            </span>
          )}
        </header>

        <div className="pe-filters">
          <div className="pe-filter-row">
            <span className="pe-filter-label">Typ</span>
            {TYPE_FILTERS.map(f => (
              <button
                key={f.key}
                className={`pe-filter-btn${typeFilter === f.key ? ' active' : ''}`}
                onClick={() => { setTypeFilter(f.key); setNiveauFilter('alle'); setOrtFilter('alle'); }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {showNiveauFilter && (
            <div className="pe-filter-row">
              <span className="pe-filter-label">Niveau</span>
              {NIVEAU_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`pe-filter-btn${niveauFilter === f.key ? ' active' : ''}`}
                  onClick={() => setNiveauFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {showOrtFilter && (
            <div className="pe-filter-row">
              <span className="pe-filter-label">Ort</span>
              {ORT_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`pe-filter-btn${ortFilter === f.key ? ' active' : ''}`}
                  onClick={() => setOrtFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="pe-count">
          {filtered.length} {filtered.length === 1 ? 'Plan' : 'Pläne'}
        </p>

        {filtered.length === 0 ? (
          <div className="tracker-empty">
            <span>🔍</span>
            <p>Keine Pläne für diese Filter.</p>
          </div>
        ) : (
          <div className="pe-grid">
            {filtered.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                added={hinzugefuegt.has(plan.id)}
                onToggle={() => togglePlan(plan)}
              />
            ))}
          </div>
        )}

      </div>

      <Toast toast={toast} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </main>
  );
}
