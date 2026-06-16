'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const MEAL_TYPES = [
  { key: 'fruehstueck', label: 'Frühstück',  emoji: '🌅' },
  { key: 'mittagessen', label: 'Mittagessen', emoji: '☀️' },
  { key: 'abendessen',  label: 'Abendessen',  emoji: '🌙' },
  { key: 'snacks',      label: 'Snacks',      emoji: '🍎' },
];

const DEFAULT_ZIELE = { kalorien: 2000, sport: 60 };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatToday() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getWeekDays() {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      dateStr: dateToStr(d),
      short: d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', ''),
      isToday: d.toDateString() === now.toDateString(),
      isFuture: d > endOfToday,
    };
  });
}

function calcStreak(ernaehrung, sport) {
  const activeDays = new Set([
    ...ernaehrung.map(e => e.datum),
    ...sport.map(e => e.datum),
  ]);
  const today = todayStr();
  const d = new Date(today + 'T00:00:00');
  if (!activeDays.has(today)) d.setDate(d.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if (activeDays.has(dateToStr(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function DashboardPage() {
  const { user: _au, loading: _al } = useAuth();
  const [data,        setData]        = useState(null);
  const [ziele,       setZiele]       = useState(DEFAULT_ZIELE);
  const [editingZiel, setEditingZiel] = useState(null);
  const [zielInput,   setZielInput]   = useState('');

  useEffect(() => { loadAll(); }, []);

  function loadAll() {
    try {
      const today           = todayStr();
      const wochenplan      = JSON.parse(localStorage.getItem('kynogg-wochenplan')      || '{}');
      const ernaehrung      = JSON.parse(localStorage.getItem('kynogg-ernaehrung')      || '[]');
      const sport           = JSON.parse(localStorage.getItem('kynogg-sport')           || '[]');
      const trainingsplaene = JSON.parse(localStorage.getItem('kynogg-trainingsplaene') || '[]');
      const savedZiele      = JSON.parse(localStorage.getItem('kynogg-ziele')           || 'null') || DEFAULT_ZIELE;

      setZiele(savedZiele);

      // ── Today ──────────────────────────────────────────────
      const todayPlan  = wochenplan[today] || {};
      const todayEaten = ernaehrung.filter(e => e.datum === today);
      const todaySport = sport.filter(e => e.datum === today);

      const totalKcal    = Math.round(todayEaten.reduce((a, e) => a + (e.kalorien || 0), 0));
      const totalMinuten = todaySport.reduce((a, e) => a + (e.dauer || 0), 0);

      const eatenNames = new Set(todayEaten.map(e => e.name.toLowerCase().trim()));
      const allPlannedNames = new Set(
        MEAL_TYPES.flatMap(mt => (todayPlan[mt.key] ?? []).map(m => m.name.toLowerCase().trim()))
      );

      // ── Weekly overview ────────────────────────────────────
      const weekDays = getWeekDays();
      const sportDatesSet = new Set(sport.map(e => e.datum));

      let weekPlannedTotal = 0;
      let weekEatenTotal   = 0;

      const weekDayStatus = weekDays.map(day => {
        const hasSport = sportDatesSet.has(day.dateStr);
        const dayEatenEntries = ernaehrung.filter(e => e.datum === day.dateStr);
        const hasEaten = dayEatenEntries.length > 0;

        // Count plan adherence for this day
        const dayPlan = wochenplan[day.dateStr];
        if (dayPlan) {
          const dayEatenNames = new Set(dayEatenEntries.map(e => e.name.toLowerCase().trim()));
          MEAL_TYPES.forEach(mt => {
            (dayPlan[mt.key] ?? []).forEach(meal => {
              weekPlannedTotal++;
              if (dayEatenNames.has(meal.name.toLowerCase().trim())) weekEatenTotal++;
            });
          });
        }

        return { ...day, hasSport, hasEaten, hasAnyActivity: hasSport || hasEaten };
      });

      const weekSportDays = weekDays.filter(d => sportDatesSet.has(d.dateStr)).length;
      const streak        = calcStreak(ernaehrung, sport);

      setData({
        today, todayPlan, todayEaten, todaySport,
        totalKcal, totalMinuten, eatenNames, allPlannedNames, trainingsplaene,
        weekDayStatus, weekSportDays, weekPlannedTotal, weekEatenTotal, streak,
      });
    } catch {
      setData({
        today: todayStr(), todayPlan: {}, todayEaten: [], todaySport: [],
        totalKcal: 0, totalMinuten: 0, eatenNames: new Set(), allPlannedNames: new Set(),
        trainingsplaene: [],
        weekDayStatus: getWeekDays().map(d => ({ ...d, hasSport: false, hasEaten: false, hasAnyActivity: false })),
        weekSportDays: 0, weekPlannedTotal: 0, weekEatenTotal: 0, streak: 0,
      });
    }
  }

  function startEditZiel(key) {
    setEditingZiel(key);
    setZielInput(String(ziele[key]));
  }

  function saveZiel(e) {
    e.preventDefault();
    const n = parseInt(zielInput, 10);
    if (isNaN(n) || n < 1) return;
    const updated = { ...ziele, [editingZiel]: n };
    setZiele(updated);
    localStorage.setItem('kynogg-ziele', JSON.stringify(updated));
    setEditingZiel(null);
    loadAll();
  }

  if (!data || _al) return null;
  if (!_au) return <AuthGate />;

  const kcalGoal = ziele.kalorien;
  const sportGoal = ziele.sport;
  const kcalPct  = Math.min(100, Math.round((data.totalKcal    / kcalGoal)  * 100));
  const sportPct = Math.min(100, Math.round((data.totalMinuten / sportGoal) * 100));

  const extraEaten = data.todayEaten.filter(
    e => !data.allPlannedNames.has(e.name.toLowerCase().trim())
  );

  return (
    <main className="main-content">
      <div className="tracker-page">

        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="kategorie-title">Dashboard</h1>
            <p className="tracker-sub">{formatToday()}</p>
          </div>
          <div className="dash-header-links">
            <Link href="/plaene/ernaehrung" className="dash-link">Wochenplan →</Link>
            <Link href="/plaene/training"   className="dash-link">Training →</Link>
            <Link href="/tracker"           className="dash-link">Tracker →</Link>
          </div>
        </div>

        {/* Progress bars – today */}
        <div className="dash-progress-section">
          <p className="section-label">Fortschritt heute</p>
          <div className="dash-progress-cards">

            <div className="dash-progress-card">
              <div className="dash-progress-top">
                <span className="dash-progress-label">🔥 Kalorien</span>
                <Link href="/tracker/ernaehrung" className="dash-panel-link">Tracker →</Link>
              </div>
              <div className="dash-progress-values">
                <span className="dash-progress-current" style={{ color: 'var(--accent)' }}>
                  {data.totalKcal.toLocaleString('de-DE')}
                </span>
                <span className="dash-progress-sep">/</span>
                {editingZiel === 'kalorien' ? (
                  <form onSubmit={saveZiel} className="dash-ziel-form">
                    <input type="number" min="1" value={zielInput}
                      onChange={e => setZielInput(e.target.value)}
                      className="tracker-input dash-ziel-input" autoFocus />
                    <button type="submit"  className="tracker-submit plan-save-btn">✓</button>
                    <button type="button"  className="plan-cancel-btn" onClick={() => setEditingZiel(null)}>✕</button>
                  </form>
                ) : (
                  <button className="dash-progress-goal" onClick={() => startEditZiel('kalorien')} title="Ziel anpassen">
                    {kcalGoal.toLocaleString('de-DE')} kcal
                  </button>
                )}
              </div>
              <div className="dash-bar-bg">
                <div className="dash-bar-fill" style={{ width: `${kcalPct}%`, background: 'var(--accent)' }} />
              </div>
              <span className="dash-bar-pct" style={{ color: 'var(--accent)' }}>{kcalPct}%</span>
            </div>

            <div className="dash-progress-card">
              <div className="dash-progress-top">
                <span className="dash-progress-label">⚡ Sport</span>
                <Link href="/tracker/sport" className="dash-panel-link">Tracker →</Link>
              </div>
              <div className="dash-progress-values">
                <span className="dash-progress-current" style={{ color: 'var(--cat-fitness)' }}>
                  {data.totalMinuten}
                </span>
                <span className="dash-progress-sep">/</span>
                {editingZiel === 'sport' ? (
                  <form onSubmit={saveZiel} className="dash-ziel-form">
                    <input type="number" min="1" value={zielInput}
                      onChange={e => setZielInput(e.target.value)}
                      className="tracker-input dash-ziel-input" autoFocus />
                    <button type="submit"  className="tracker-submit plan-save-btn">✓</button>
                    <button type="button"  className="plan-cancel-btn" onClick={() => setEditingZiel(null)}>✕</button>
                  </form>
                ) : (
                  <button className="dash-progress-goal" onClick={() => startEditZiel('sport')} title="Ziel anpassen">
                    {sportGoal} Min.
                  </button>
                )}
              </div>
              <div className="dash-bar-bg">
                <div className="dash-bar-fill" style={{ width: `${sportPct}%`, background: 'var(--cat-fitness)' }} />
              </div>
              <span className="dash-bar-pct" style={{ color: 'var(--cat-fitness)' }}>{sportPct}%</span>
            </div>

          </div>
        </div>

        {/* Weekly overview */}
        <div className="dash-week-section">
          <p className="section-label">Diese Woche</p>
          <div className="dash-week-card">

            {/* Day circles */}
            <div className="dash-week-days">
              {data.weekDayStatus.map(day => {
                const dotClass = day.isFuture
                  ? 'future'
                  : day.hasAnyActivity
                    ? 'done'
                    : 'missed';
                return (
                  <div key={day.dateStr} className={`dash-week-day${day.isToday ? ' today' : ''}`}>
                    <span className="dash-week-day-label">{day.short}</span>
                    <span className={`dash-week-dot ${dotClass}`}>
                      {!day.isFuture && (day.hasAnyActivity ? '✓' : '○')}
                    </span>
                    <div className="dash-week-day-icons">
                      {!day.isFuture && day.hasSport && <span title="Training">🏋️</span>}
                      {!day.isFuture && day.hasEaten && <span title="Mahlzeit">🥗</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary stats */}
            <div className="dash-week-stats">
              <div className="dash-week-stat">
                <span className="dash-week-stat-val">
                  {data.weekSportDays}
                  <span className="dash-week-stat-den">/7</span>
                </span>
                <span className="dash-week-stat-label">Trainingstage</span>
              </div>

              <div className="dash-week-stat">
                <span className="dash-week-stat-val">
                  {data.weekEatenTotal}
                  <span className="dash-week-stat-den">
                    /{data.weekPlannedTotal > 0 ? data.weekPlannedTotal : '–'}
                  </span>
                </span>
                <span className="dash-week-stat-label">Mahlzeiten eingehalten</span>
              </div>

              <div className="dash-week-stat">
                <span className="dash-week-stat-val streak-val">
                  {data.streak > 0 ? '🔥 ' : ''}{data.streak}
                </span>
                <span className="dash-week-stat-label">
                  {data.streak === 1 ? 'Tag Streak' : 'Tage Streak'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Main grid – today detail */}
        <div className="dash-grid">

          {/* ── Ernährung ── */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <span className="cat-pill small cat-ernaehrung">🥗 Ernährung</span>
              <Link href="/plaene/ernaehrung" className="dash-panel-link">Wochenplan →</Link>
            </div>
            <h3 className="dash-panel-title">Heutiger Speiseplan</h3>

            {MEAL_TYPES.map(mt => {
              const planned = data.todayPlan[mt.key] ?? [];
              return (
                <div key={mt.key} className="dash-meal-section">
                  <span className="dash-meal-type">{mt.emoji} {mt.label}</span>
                  {planned.length === 0 ? (
                    <p className="dash-empty-hint">Nicht geplant</p>
                  ) : (
                    <ul className="dash-meal-list">
                      {planned.map(meal => {
                        const eaten = data.eatenNames.has(meal.name.toLowerCase().trim());
                        return (
                          <li key={meal.id} className={`dash-meal-item${eaten ? ' eaten' : ''}`}>
                            <span className="dash-meal-check">{eaten ? '✓' : '○'}</span>
                            <span className="dash-meal-name">{meal.name}</span>
                            {meal.kalorien > 0 && (
                              <span className="dash-meal-kcal">{meal.kalorien} kcal</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}

            {extraEaten.length > 0 && (
              <div className="dash-eaten-extra">
                <span className="dash-meal-type">✅ Zusätzlich gegessen</span>
                <ul className="dash-meal-list">
                  {extraEaten.map(e => (
                    <li key={e.id} className="dash-meal-item eaten">
                      <span className="dash-meal-check">✓</span>
                      <span className="dash-meal-name">{e.name}</span>
                      {e.kalorien > 0 && <span className="dash-meal-kcal">{e.kalorien} kcal</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {MEAL_TYPES.every(mt => (data.todayPlan[mt.key] ?? []).length === 0) && extraEaten.length === 0 && (
              <div className="tracker-empty" style={{ padding: '24px 0' }}>
                <span>🍽️</span>
                <p>Noch nichts für heute geplant oder gegessen.</p>
              </div>
            )}
          </div>

          {/* ── Training ── */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <span className="cat-pill small cat-fitness">🏋️ Fitness</span>
              <Link href="/plaene/training" className="dash-panel-link">Trainingspläne →</Link>
            </div>
            <h3 className="dash-panel-title">Heutiges Training</h3>

            {data.todaySport.length > 0 && (
              <div className="dash-training-section">
                <span className="dash-meal-type">✅ Heute erledigt</span>
                <div className="dash-sport-list">
                  {data.todaySport.map(e => (
                    <div key={e.id} className="dash-sport-item">
                      <div className="dash-sport-main">
                        <span className="dash-sport-name">{e.sportart}</span>
                        {e.notizen && <span className="dash-sport-notes">{e.notizen}</span>}
                      </div>
                      <div className="dash-sport-tags">
                        {e.intensitaet && (
                          <span className={`meal-tag intensity-tag intensity-${e.intensitaet}`}>
                            {e.intensitaet}
                          </span>
                        )}
                        <span className="meal-tag">{e.dauer}&thinsp;Min.</span>
                        {e.kalorien > 0 && <span className="meal-tag meal-kcal">{e.kalorien}&thinsp;kcal</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.trainingsplaene.length > 0 && (
              <div className="dash-training-section">
                <span className="dash-meal-type">📋 Trainingspläne starten</span>
                <div className="dash-plans-list">
                  {data.trainingsplaene.flatMap(plan =>
                    plan.days.map(day => (
                      <Link key={`${plan.id}-${day.id}`} href="/plaene/training" className="dash-plan-item">
                        <div>
                          <span className="dash-plan-name">{day.name}</span>
                          <span className="dash-plan-meta">
                            {plan.name} · {day.exercises?.length ?? 0} Übungen
                          </span>
                        </div>
                        <span className="dash-plan-cta">→</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}

            {data.todaySport.length === 0 && data.trainingsplaene.length === 0 && (
              <div className="tracker-empty" style={{ padding: '24px 0' }}>
                <span>🏃</span>
                <p>Noch kein Training geplant oder absolviert.</p>
              </div>
            )}

            {data.todaySport.length === 0 && data.trainingsplaene.length > 0 && (
              <p className="dash-no-training">Noch kein Training heute — starte jetzt!</p>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
