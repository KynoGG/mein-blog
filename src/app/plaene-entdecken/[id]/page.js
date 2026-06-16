'use client';

import { use, useState, useEffect, useRef } from 'react';
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

// ── Static data ───────────────────────────────────────────────────────────────

const ALL_PLANS = [
  ...oeffentlicheTrainingsplaene.map(p => ({ ...p, _type: 'training' })),
  ...oeffentlicheErnaehrungsplaene.map(p => ({ ...p, _type: 'ernaehrung' })),
];

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

const MEAL_ICON = {
  'Frühstück':   '🌅',
  'Mittagessen': '☀️',
  'Abendessen':  '🌙',
  'Snack':       '🍎',
  'Pre-Workout': '⚡',
  'Post-Workout':'💪',
};

// Keyword-based muscle group inference
function getMuscleHint(name) {
  const n = name.toLowerCase();
  if (/kniebeuge|squat|lunges|ausfallschritt|beinpresse|split squat|sumo|wadenheben|beinstrecker|beinbeuger/.test(n))
    return 'Beine & Gesäß';
  if (/liegestütz|push.up|bankdrücken|fliegende|schrägbank/.test(n))
    return 'Brust';
  if (/schulterdrücken|seitheben|arnold|frontales|face pull/.test(n))
    return 'Schultern';
  if (/klimmzüge|rudern|latzug|pulldown|straight.arm|chest supported/.test(n))
    return 'Rücken';
  if (/trizeps|pushdown|overhead triz|dips/.test(n))
    return 'Trizeps';
  if (/bizeps|curl|hammer curl|konzentration|reverse curl/.test(n))
    return 'Bizeps';
  if (/kreuzheben|hip thrust|rumänisch|good morning|glute bridge/.test(n))
    return 'Gesäß & Rücken';
  if (/plank|planke|crunch|mountain|v-up|superman|core/.test(n))
    return 'Core';
  if (/burpee|jumping|high knee|tabata|sprint|jump squat|box jump/.test(n))
    return 'Ganzkörper';
  if (/dehnen|stretch|yoga|kindshaltung|taube|pigeon|hüftkreis|katzenbuckel|hip flexor|thorakal|world|drehsitz|vorwärts|schulteröffnung|mobilität/.test(n))
    return 'Mobilität';
  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AddButton({ added, onToggle }) {
  return (
    <div className="pe-add-bar">
      {added ? (
        <div className="pe-detail-added-row">
          <span className="pe-added-label">Hinzugefügt ✓</span>
          <button className="pe-remove-btn" onClick={onToggle}>Entfernen</button>
        </div>
      ) : (
        <button className="pe-detail-add-btn tracker-submit" onClick={onToggle}>
          Plan hinzufügen +
        </button>
      )}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`pe-toast pe-toast-${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'added' ? '✓' : '✕'} {toast.msg}
    </div>
  );
}

function TrainingContent({ plan }) {
  return (
    <div className="pe-days">
      {plan.tage.map((tag, ti) => (
        <div key={ti} className="pe-day">
          <div className="pe-day-head">
            <h2 className="pe-day-title">{tag.name}</h2>
            <span className="pe-day-count">{tag.uebungen.length} Übungen</span>
          </div>
          <div className="pe-exercises">
            {tag.uebungen.map((ue, ui) => {
              const muscle = getMuscleHint(ue.name);
              return (
                <div key={ui} className="pe-ex">
                  <div className="pe-ex-main">
                    <span className="pe-ex-name">{ue.name}</span>
                    <div className="pe-ex-right">
                      {muscle && <span className="pe-muscle-chip">{muscle}</span>}
                      <span className="pe-ex-sets">{ue.saetze} × {ue.wiederholungen}</span>
                    </div>
                  </div>
                  {ue.notizen && (
                    <p className="pe-ex-tip">💡 {ue.notizen}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function NutritionContent({ plan }) {
  return (
    <div className="pe-days">
      {plan.tage.map((tag, ti) => {
        const total = tag.mahlzeiten.reduce(
          (acc, m) => ({
            kcal: acc.kcal + m.kalorien,
            p:    acc.p    + m.protein,
            kh:   acc.kh   + m.kohlenhydrate,
            f:    acc.f    + m.fett,
          }),
          { kcal: 0, p: 0, kh: 0, f: 0 },
        );

        return (
          <div key={ti} className="pe-day">
            <div className="pe-day-head">
              <h2 className="pe-day-title">{tag.wochentag}</h2>
              <span className="pe-day-count">{tag.mahlzeiten.length} Mahlzeiten</span>
            </div>

            <div className="pe-day-total">
              <span className="pe-day-total-kcal">{total.kcal} kcal</span>
              <span className="pe-day-total-macros">
                P {total.p}g · KH {total.kh}g · F {total.f}g
              </span>
            </div>

            <div className="pe-meals">
              {tag.mahlzeiten.map((meal, mi) => (
                <div key={mi} className="pe-meal">
                  <div className="pe-meal-top">
                    <span className="pe-meal-type">
                      {MEAL_ICON[meal.typ] ?? '🍽️'} {meal.typ}
                    </span>
                    <span className="pe-meal-kcal">{meal.kalorien} kcal</span>
                  </div>
                  <p className="pe-meal-name">{meal.name}</p>
                  <div className="pe-meal-macros">
                    <span className="pe-macro pe-macro-p">P {meal.protein}g</span>
                    <span className="pe-macro pe-macro-kh">KH {meal.kohlenhydrate}g</span>
                    <span className="pe-macro pe-macro-f">F {meal.fett}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PlanDetailPage({ params }) {
  const { id }   = use(params);
  const plan     = ALL_PLANS.find(p => p.id === id);
  const { user } = useAuth();

  const [added,    setAdded]    = useState(false);
  const [toast,    setToast]    = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    if (!plan) return;
    try {
      const key  = plan._type === 'training' ? TRAINING_KEY : ERNAEHRUNG_KEY;
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      setAdded(saved.includes(plan.id));
    } catch {}
  }, [plan]);

  function showToast(msg, type) {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  function toggleAdded() {
    if (!plan) return;
    if (!user) { setAuthOpen(true); return; }
    const key     = plan._type === 'training' ? TRAINING_KEY : ERNAEHRUNG_KEY;
    const isAdding = !added;

    try {
      const current = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
      isAdding ? current.add(plan.id) : current.delete(plan.id);
      localStorage.setItem(key, JSON.stringify([...current]));
    } catch {}

    setAdded(isAdding);
    showToast(
      isAdding ? 'Plan wurde hinzugefügt!' : 'Plan wurde entfernt',
      isAdding ? 'added' : 'removed',
    );
  }

  // ── Not found ──
  if (!plan) {
    return (
      <main className="main-content">
        <div className="tracker-page">
          <Link href="/plaene-entdecken" className="back-link">← Zurück zur Übersicht</Link>
          <div className="tracker-empty" style={{ marginTop: '40px' }}>
            <span>🔍</span>
            <p>Plan nicht gefunden.</p>
          </div>
        </div>
      </main>
    );
  }

  const hdr         = HEADER_CFG[plan.kategorie] ?? { emoji: '📋', cls: 'pe-hdr-ki' };
  const katBadge    = KAT_BADGE[plan.kategorie];
  const niveauBadge = plan.niveau ? NIVEAU_BADGE[plan.niveau] : null;

  const metaItems = plan._type === 'training'
    ? [
        { icon: '📅', text: `${plan.trainingsTagsProWoche}× pro Woche` },
        { icon: '⏱️', text: plan.dauer },
        { icon: '✍️', text: `von ${plan.autor}` },
      ]
    : [
        { icon: '🔥', text: `${plan.kalorien} kcal/Tag` },
        { icon: '📅', text: `${plan.tage.length} Tage` },
        { icon: '✍️', text: `von ${plan.autor}` },
      ];

  return (
    <main className="main-content">
      <div className="tracker-page">

        <Link href="/plaene-entdecken" className="back-link">← Zurück zur Übersicht</Link>

        {/* ── Hero ── */}
        <div className="pe-detail-hero">
          <div className={`pe-detail-band ${hdr.cls}`}>
            <span className="pe-detail-emoji" aria-hidden="true">{hdr.emoji}</span>
            {added && <span className="pe-card-added-badge">✓</span>}
          </div>

          <div className="pe-detail-body">
            <div className="pe-card-badges">
              {niveauBadge && (
                <span className={`cat-pill small ${niveauBadge.cls}`}>{niveauBadge.label}</span>
              )}
              {katBadge && (
                <span className={`cat-pill small ${katBadge.cls}`}>{katBadge.label}</span>
              )}
            </div>

            <h1 className="pe-detail-title">{plan.titel}</h1>
            <p className="pe-detail-desc">{plan.beschreibung}</p>

            <div className="pe-detail-meta">
              {metaItems.map((item, i) => (
                <span key={i} className="pe-detail-meta-item">
                  {item.icon} {item.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Add button top ── */}
        <AddButton added={added} onToggle={toggleAdded} />

        {/* ── Content ── */}
        {plan._type === 'training'
          ? <TrainingContent plan={plan} />
          : <NutritionContent plan={plan} />
        }

        {/* ── Add button bottom ── */}
        <AddButton added={added} onToggle={toggleAdded} />

      </div>

      <Toast toast={toast} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </main>
  );
}
