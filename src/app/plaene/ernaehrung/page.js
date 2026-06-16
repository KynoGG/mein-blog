'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { oeffentlicheErnaehrungsplaene } from '@/data/oeffentlichePlaene';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const EIGENE_KEY     = 'kynogg-eigene-ernaehrungsplaene';
const TRACKER_KEY    = 'kynogg-ernaehrung';
const SUBSCRIBED_KEY = 'meine-ernaehrungsplaene';
const AKTIV_E_KEY    = 'aktiver-ernaehrungsplan';
const SESSION_KEY    = 'kynogg-demo-session';
const USER_SUB_KEY   = 'livora-user-subscribed-plans';

function publishedPlansKey(userId) { return `livora-published-plans-${userId}`; }
function readArrE(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }

const MEAL_TYPES  = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack'];
const MEAL_EMOJI  = { 'Frühstück': '🌅', 'Mittagessen': '☀️', 'Abendessen': '🌙', 'Snack': '🍎' };
const EMPTY_MEAL  = { typ: 'Frühstück', name: '', kalorien: '', protein: '', kohlenhydrate: '', fett: '' };

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDays(offset) {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      dateStr:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      label:     d.toLocaleDateString('de-DE', { weekday: 'long' }),
      shortDate: d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }),
      isToday:   d.toDateString() === new Date().toDateString(),
      idx: i,
    };
  });
}

function getWeekLabel(offset) {
  const days = getWeekDays(offset);
  const mon = new Date(days[0].dateStr + 'T00:00:00');
  const sun = new Date(days[6].dateStr + 'T00:00:00');
  const fmt = d => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  const d2 = new Date(mon);
  d2.setDate(d2.getDate() + 3 - (d2.getDay() + 6) % 7);
  const w1 = new Date(d2.getFullYear(), 0, 4);
  const kw = 1 + Math.round(((d2 - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
  return `KW ${kw} · ${fmt(mon)} – ${fmt(sun)} ${sun.getFullYear()}`;
}

function sumMeals(meals, key) {
  return Math.round(meals.reduce((a, m) => a + (parseFloat(m[key]) || 0), 0) * 10) / 10;
}

function getMealsForDay(plan, dashActive, dayIdx, dayLabel) {
  if (!plan || !dashActive) return [];
  if (dashActive.source === 'oeffentlich') {
    const tag = plan.tage.find(t => t.wochentag === dayLabel);
    return tag ? tag.mahlzeiten : [];
  }
  if (dashActive.source === 'eigene') {
    if (!plan.tage.length) return [];
    return plan.tage[dayIdx % plan.tage.length]?.mahlzeiten ?? [];
  }
  return [];
}

/* ─── Page ───────────────────────────────────────────────── */

export default function ErnaehrungsplanPage() {
  const { user: _au, loading: _al } = useAuth();
  const [loaded,           setLoaded]           = useState(false);
  const [activeSection,    setActiveSection]    = useState('eigene');

  // Own plans
  const [eigenePlaene,     setEigenePlaene]     = useState([]);
  const [activePlanId,     setActivePlanId]     = useState(null);
  const [showNewPlan,      setShowNewPlan]       = useState(false);
  const [newPlanName,      setNewPlanName]       = useState('');
  const [addingDayFor,     setAddingDayFor]     = useState(null);
  const [newDayName,       setNewDayName]       = useState('');
  const [addingMealFor,    setAddingMealFor]    = useState(null);
  const [mealForm,         setMealForm]         = useState(EMPTY_MEAL);

  // Subscribed plans
  const [subscribedPlans,  setSubscribedPlans]  = useState([]);
  const [sessionUser,      setSessionUser]      = useState(null);
  const [userSubPlans,     setUserSubPlans]     = useState([]);

  // Dashboard active plan ref
  const [dashActive,       setDashActive]       = useState(null);

  // Wochenübersicht
  const [weekOffset,       setWeekOffset]       = useState(0);
  const [trackedToday,     setTrackedToday]     = useState(new Set());
  const [confirmedMeals,   setConfirmedMeals]   = useState(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EIGENE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setEigenePlaene(parsed);
        if (parsed.length > 0) setActivePlanId(parsed[0].id);
      }
    } catch {}
    try {
      const ids = JSON.parse(localStorage.getItem(SUBSCRIBED_KEY) || '[]');
      setSubscribedPlans(ids.map(id => oeffentlicheErnaehrungsplaene.find(p => p.id === id)).filter(Boolean));
    } catch {}
    try {
      const raw = localStorage.getItem(AKTIV_E_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.source) setDashActive(parsed);
      }
    } catch {}
    try {
      const today = todayStr();
      const tracker = JSON.parse(localStorage.getItem(TRACKER_KEY) || '[]');
      setTrackedToday(new Set(tracker.filter(e => e.datum === today).map(e => e.name.toLowerCase().trim())));
    } catch {}
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s) setSessionUser(s);
    } catch {}
    try {
      const sub = readArrE(USER_SUB_KEY).filter(p => p.type === 'ernaehrung');
      setUserSubPlans(sub);
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(EIGENE_KEY, JSON.stringify(eigenePlaene));
  }, [eigenePlaene, loaded]);

  /* ── Dashboard active helpers ── */
  function setAsDashPlan(source, id) {
    const val = { source, id };
    localStorage.setItem(AKTIV_E_KEY, JSON.stringify(val));
    setDashActive(val);
  }
  function clearDashPlan() {
    localStorage.removeItem(AKTIV_E_KEY);
    setDashActive(null);
  }
  function isDashActive(source, id) {
    return dashActive?.source === source && dashActive?.id === id;
  }

  function publishPlan(planId) {
    if (!sessionUser) return;
    const plan = eigenePlaene.find(p => p.id === planId);
    if (!plan) return;
    setEigenePlaene(prev => prev.map(p => p.id === planId ? { ...p, published: true } : p));
    const key = publishedPlansKey(sessionUser.id);
    const existing = readArrE(key).filter(p => p.id !== planId);
    const profil = (() => { try { return JSON.parse(localStorage.getItem('nutzerprofil') || '{}'); } catch { return {}; } })();
    localStorage.setItem(key, JSON.stringify([...existing, {
      id: planId, type: 'ernaehrung', name: plan.name, tage: plan.tage,
      publishedAt: Date.now(),
      authorId: sessionUser.id,
      authorName: profil.name || sessionUser.username || sessionUser.email,
      authorUsername: sessionUser.username,
    }]));
  }

  function unpublishPlan(planId) {
    setEigenePlaene(prev => prev.map(p => p.id === planId ? { ...p, published: false } : p));
    if (!sessionUser) return;
    const key = publishedPlansKey(sessionUser.id);
    localStorage.setItem(key, JSON.stringify(readArrE(key).filter(p => p.id !== planId)));
  }

  function unsubscribeUserPlan(planId) {
    const updated = userSubPlans.filter(p => p.id !== planId);
    setUserSubPlans(updated);
    const all = readArrE(USER_SUB_KEY).filter(p => !(p.id === planId && p.type === 'ernaehrung'));
    localStorage.setItem(USER_SUB_KEY, JSON.stringify(all));
  }

  /* ── Own plan CRUD ── */
  function handleAddPlan(e) {
    e.preventDefault();
    const name = newPlanName.trim();
    if (!name) return;
    const plan = { id: uid(), name, tage: [] };
    setEigenePlaene(prev => [...prev, plan]);
    setActivePlanId(plan.id);
    setNewPlanName('');
    setShowNewPlan(false);
  }

  function handleDeletePlan(planId) {
    const next = eigenePlaene.filter(p => p.id !== planId);
    setEigenePlaene(next);
    if (activePlanId === planId) setActivePlanId(next[0]?.id ?? null);
    if (isDashActive('eigene', planId)) clearDashPlan();
  }

  function handleAddDay(e) {
    e.preventDefault();
    const name = newDayName.trim();
    if (!name) return;
    setEigenePlaene(prev => prev.map(p => p.id === addingDayFor
      ? { ...p, tage: [...p.tage, { id: uid(), name, mahlzeiten: [] }] }
      : p
    ));
    setNewDayName('');
    setAddingDayFor(null);
  }

  function handleDeleteDay(planId, dayId) {
    setEigenePlaene(prev => prev.map(p => p.id === planId
      ? { ...p, tage: p.tage.filter(d => d.id !== dayId) }
      : p
    ));
  }

  function handleAddMeal(e) {
    e.preventDefault();
    const { planId, dayId } = addingMealFor;
    const meal = {
      id:            uid(),
      typ:           mealForm.typ,
      name:          mealForm.name.trim(),
      kalorien:      parseFloat(mealForm.kalorien)      || 0,
      protein:       parseFloat(mealForm.protein)       || 0,
      kohlenhydrate: parseFloat(mealForm.kohlenhydrate) || 0,
      fett:          parseFloat(mealForm.fett)          || 0,
    };
    setEigenePlaene(prev => prev.map(p => p.id !== planId ? p : {
      ...p, tage: p.tage.map(d => d.id !== dayId ? d : {
        ...d, mahlzeiten: [...d.mahlzeiten, meal],
      }),
    }));
    setMealForm(EMPTY_MEAL);
    setAddingMealFor(null);
  }

  function handleDeleteMeal(planId, dayId, mealId) {
    setEigenePlaene(prev => prev.map(p => p.id !== planId ? p : {
      ...p, tage: p.tage.map(d => d.id !== dayId ? d : {
        ...d, mahlzeiten: d.mahlzeiten.filter(m => m.id !== mealId),
      }),
    }));
  }

  /* ── Tracker ── */
  function addToTracker(meal, mealKey) {
    const today = todayStr();
    try {
      const existing = JSON.parse(localStorage.getItem(TRACKER_KEY) || '[]');
      existing.unshift({ id: uid(), datum: today, name: meal.name, kalorien: meal.kalorien, protein: meal.protein, kohlenhydrate: meal.kohlenhydrate, fett: meal.fett });
      localStorage.setItem(TRACKER_KEY, JSON.stringify(existing));
    } catch {}
    setTrackedToday(prev => new Set([...prev, meal.name.toLowerCase().trim()]));
    setConfirmedMeals(prev => {
      const n = new Set([...prev, mealKey]);
      setTimeout(() => setConfirmedMeals(p => { const x = new Set(p); x.delete(mealKey); return x; }), 2000);
      return n;
    });
  }

  if (!loaded || _al) return null;
  if (!_au) return <AuthGate />;

  const weekDays  = getWeekDays(weekOffset);
  const weekLabel = getWeekLabel(weekOffset);
  const activePlan = eigenePlaene.find(p => p.id === activePlanId) ?? null;

  // Resolve the active plan object for Wochenübersicht
  let resolvedActivePlan = null;
  if (dashActive?.source === 'oeffentlich') {
    resolvedActivePlan = oeffentlicheErnaehrungsplaene.find(p => p.id === dashActive.id) ?? null;
  } else if (dashActive?.source === 'eigene') {
    resolvedActivePlan = eigenePlaene.find(p => p.id === dashActive.id) ?? null;
  }
  const activePlanLabel = resolvedActivePlan
    ? (dashActive.source === 'eigene' ? resolvedActivePlan.name : resolvedActivePlan.titel)
    : null;

  return (
    <main className="main-content">
      <div className="tracker-page">
        <Link href="/plaene" className="back-link">← Pläne</Link>

        <div className="tracker-header">
          <span className="cat-pill small cat-ernaehrung">🥗 Ernährung</span>
          <h1 className="kategorie-title" style={{ marginTop: '10px' }}>Ernährungspläne</h1>
          <p className="tracker-sub">Erstelle eigene Pläne, abonniere öffentliche und sieh deine Wochenübersicht.</p>
        </div>

        {/* ── Section toggle ── */}
        <div className="tp-section-toggle">
          <button
            className={`tp-section-btn ${activeSection === 'eigene' ? 'active' : ''}`}
            onClick={() => setActiveSection('eigene')}
          >
            Eigene Pläne
            {eigenePlaene.length > 0 && <span className="tp-section-count">{eigenePlaene.length}</span>}
          </button>
          <button
            className={`tp-section-btn ${activeSection === 'abonniert' ? 'active' : ''}`}
            onClick={() => setActiveSection('abonniert')}
          >
            Abonnierte Pläne
            {subscribedPlans.length > 0 && <span className="tp-section-count">{subscribedPlans.length}</span>}
          </button>
          <button
            className={`tp-section-btn ${activeSection === 'woche' ? 'active' : ''}`}
            onClick={() => setActiveSection('woche')}
          >
            Wochenübersicht
            {dashActive && <span className="tp-section-count">aktiv</span>}
          </button>
        </div>

        {/* ════ Eigene Pläne ════ */}
        {activeSection === 'eigene' && (
          <>
            <div className="tp-tab-bar">
              <div className="tp-tabs">
                {eigenePlaene.map(p => (
                  <div key={p.id} className={`tp-tab ${p.id === activePlanId ? 'active' : ''}`}>
                    <button className="tp-tab-name" onClick={() => setActivePlanId(p.id)}>{p.name}</button>
                    <button className="tp-tab-del" onClick={() => handleDeletePlan(p.id)} aria-label="Plan löschen">×</button>
                  </div>
                ))}
              </div>
              <button className="tp-new-btn" onClick={() => { setShowNewPlan(v => !v); setNewPlanName(''); }}>
                + Neuer Plan
              </button>
            </div>

            {showNewPlan && (
              <form onSubmit={handleAddPlan} className="meal-form tp-new-plan-form">
                <input
                  type="text"
                  placeholder='Name des Plans (z.B. "Abnehm-Plan", "Aufbauphase")'
                  value={newPlanName}
                  onChange={e => setNewPlanName(e.target.value)}
                  required className="tracker-input" autoFocus
                />
                <div className="plan-form-actions">
                  <button type="submit" className="tracker-submit plan-save-btn">Erstellen</button>
                  <button type="button" className="plan-cancel-btn" onClick={() => setShowNewPlan(false)}>Abbrechen</button>
                </div>
              </form>
            )}

            {!activePlan && !showNewPlan && (
              <div className="tracker-empty" style={{ paddingTop: 60 }}>
                <span>📋</span>
                <p>Noch kein eigener Ernährungsplan. Erstelle deinen ersten Plan.</p>
              </div>
            )}

            {activePlan && (
              <div className="tp-plan-content">
                <div className="tp-plan-content-header">
                  <h2 className="tp-plan-title">{activePlan.name}</h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isDashActive('eigene', activePlan.id) ? (
                      <button className="tp-dash-active-btn tp-dash-active-btn--set" onClick={clearDashPlan}>
                        📌 Aktiver Plan ✓
                      </button>
                    ) : (
                      <button className="tp-dash-active-btn" onClick={() => setAsDashPlan('eigene', activePlan.id)}>
                        📌 Im Dashboard anzeigen
                      </button>
                    )}
                    {activePlan.published ? (
                      <button className="tp-publish-btn tp-publish-btn--active" onClick={() => unpublishPlan(activePlan.id)}>
                        🌐 Veröffentlicht ✓
                      </button>
                    ) : (
                      <button className="tp-publish-btn" onClick={() => publishPlan(activePlan.id)}>
                        🌐 Veröffentlichen
                      </button>
                    )}
                    <button
                      className="tracker-submit"
                      style={{ height: 36, padding: '0 16px', fontSize: '0.875rem' }}
                      onClick={() => { setAddingDayFor(activePlan.id); setNewDayName(''); }}
                    >
                      + Tag hinzufügen
                    </button>
                  </div>
                </div>

                {addingDayFor === activePlan.id && (
                  <form onSubmit={handleAddDay} className="meal-form" style={{ marginBottom: 16 }}>
                    <input
                      type="text"
                      placeholder='Name des Tages (z.B. "Montag", "Tag 1")'
                      value={newDayName}
                      onChange={e => setNewDayName(e.target.value)}
                      required className="tracker-input" autoFocus
                    />
                    <div className="plan-form-actions">
                      <button type="submit" className="tracker-submit plan-save-btn">Hinzufügen</button>
                      <button type="button" className="plan-cancel-btn" onClick={() => setAddingDayFor(null)}>Abbrechen</button>
                    </div>
                  </form>
                )}

                {activePlan.tage.length === 0 && addingDayFor !== activePlan.id && (
                  <div className="tracker-empty">
                    <span>🥗</span>
                    <p>Noch kein Tag. Klicke „+ Tag hinzufügen" zum Starten.</p>
                  </div>
                )}

                <div className="ep-days-grid">
                  {activePlan.tage.map(tag => (
                    <EigeneDayCard
                      key={tag.id}
                      tag={tag}
                      isAddingMeal={addingMealFor?.planId === activePlan.id && addingMealFor?.dayId === tag.id}
                      mealForm={mealForm}
                      setMealForm={setMealForm}
                      onStartAddMeal={() => { setAddingMealFor({ planId: activePlan.id, dayId: tag.id }); setMealForm(EMPTY_MEAL); }}
                      onCancelMeal={() => setAddingMealFor(null)}
                      onAddMeal={handleAddMeal}
                      onDeleteMeal={mealId => handleDeleteMeal(activePlan.id, tag.id, mealId)}
                      onDeleteDay={() => handleDeleteDay(activePlan.id, tag.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ════ Abonnierte Pläne ════ */}
        {activeSection === 'abonniert' && (
          subscribedPlans.length === 0 && userSubPlans.length === 0 ? (
            <div className="tracker-empty" style={{ paddingTop: 60 }}>
              <span>🔖</span>
              <p>Noch keine Pläne abonniert. Entdecke Pläne unter{' '}
                <Link href="/plaene-entdecken" className="tracker-link">Pläne entdecken</Link>.
              </p>
            </div>
          ) : (
            <div className="tp-subscribed-list">
              {subscribedPlans.map(p => (
                <div key={p.id} className="tp-subscribed-card">
                  <div className="tp-subscribed-info">
                    <h3 className="tp-subscribed-title">{p.titel}</h3>
                    <p className="tp-subscribed-desc">{p.beschreibung}</p>
                    <div className="tp-subscribed-meta">
                      <span>🔥 {p.kalorien} kcal/Tag</span>
                      <span>📅 {p.tage.length} Tage</span>
                      <span>✍️ von {p.autor}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    {isDashActive('oeffentlich', p.id) ? (
                      <button className="tp-dash-active-btn tp-dash-active-btn--set" onClick={clearDashPlan}>📌 Aktiver Plan ✓</button>
                    ) : (
                      <button className="tp-dash-active-btn" onClick={() => setAsDashPlan('oeffentlich', p.id)}>📌 Im Dashboard anzeigen</button>
                    )}
                    <Link href={`/plaene-entdecken/${p.id}`} className="tp-subscribed-btn">Plan ansehen →</Link>
                  </div>
                </div>
              ))}
              {userSubPlans.map(plan => (
                <div key={plan.id} className="tp-subscribed-card">
                  <div className="tp-subscribed-info">
                    <h3 className="tp-subscribed-title">{plan.name}</h3>
                    <div className="tp-subscribed-meta">
                      <span>📅 {plan.tage?.length ?? 0} Tag{plan.tage?.length !== 1 ? 'e' : ''}</span>
                      <span>👤 von {plan.authorName || plan.authorUsername}</span>
                      {plan.authorUsername && (
                        <Link href={`/profil/${plan.authorUsername}`} className="tracker-link">Profil ansehen</Link>
                      )}
                    </div>
                    {plan.tage?.length > 0 && (
                      <ul className="tp-userplan-days">
                        {plan.tage.map(t => (
                          <li key={t.id}><strong>{t.name}</strong> · {t.mahlzeiten?.length ?? 0} Mahlzeiten</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button className="tp-unsubscribe-btn" onClick={() => unsubscribeUserPlan(plan.id)}>
                    Abonnement beenden
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* ════ Wochenübersicht ════ */}
        {activeSection === 'woche' && (
          !dashActive || !resolvedActivePlan ? (
            <div className="tracker-empty" style={{ paddingTop: 60 }}>
              <span>📅</span>
              <p>Kein aktiver Plan ausgewählt.<br />Wähle unter „Eigene Pläne" oder „Abonnierte Pläne" einen Plan aus und klicke <strong>„📌 Im Dashboard anzeigen"</strong>.</p>
            </div>
          ) : (
            <>
              <div className="ep-week-active-hint">
                Aktiver Plan: <strong>{activePlanLabel}</strong>
                <span className={`cat-pill small ${dashActive.source === 'eigene' ? 'cat-lifestyle' : 'cat-ernaehrung'}`} style={{ marginLeft: 8 }}>
                  {dashActive.source === 'eigene' ? 'Eigener Plan' : 'Abonniert'}
                </span>
              </div>

              <div className="week-nav">
                <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)}>← Vorwoche</button>
                <span className="week-nav-label">{weekLabel}</span>
                <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)}>Nächste →</button>
              </div>

              <div className="plan-grid">
                {weekDays.map(day => {
                  const meals        = getMealsForDay(resolvedActivePlan, dashActive, day.idx, day.label);
                  const totalKcal    = sumMeals(meals, 'kalorien');
                  const totalProtein = sumMeals(meals, 'protein');
                  const totalKh      = sumMeals(meals, 'kohlenhydrate');
                  const totalFett    = sumMeals(meals, 'fett');

                  return (
                    <div key={day.dateStr} className={`plan-day-card${day.isToday ? ' plan-day-today' : ''}`}>
                      <div className="plan-day-header">
                        <div className="plan-day-title">
                          <span className="plan-day-name">{day.label}</span>
                          <span className="plan-day-date">{day.shortDate}</span>
                        </div>
                        {totalKcal > 0 && (
                          <div className="plan-day-totals">
                            <span className="plan-total-kcal">{totalKcal} kcal</span>
                            <span>P {totalProtein}g · K {totalKh}g · F {totalFett}g</span>
                          </div>
                        )}
                      </div>

                      {meals.length === 0 ? (
                        <p className="ep-day-empty">Kein Plan für diesen Tag.</p>
                      ) : (
                        <ul className="plan-meal-list">
                          {meals.map((meal, mi) => {
                            const mealKey       = meal.id || `${day.dateStr}-${mi}`;
                            const alreadyTracked = day.isToday && trackedToday.has(meal.name.toLowerCase().trim());
                            const justConfirmed  = confirmedMeals.has(mealKey);
                            return (
                              <li key={mealKey} className="plan-meal-item">
                                <div className="plan-meal-row">
                                  <span className="plan-meal-name">
                                    {MEAL_EMOJI[meal.typ] ?? '🍽️'} {meal.name}
                                  </span>
                                  <span className="plan-meal-kcal">{meal.kalorien} kcal</span>
                                </div>
                                {day.isToday && (
                                  <div className="plan-meal-actions">
                                    {alreadyTracked ? (
                                      <span className="plan-tracker-done">✓ Bereits eingetragen</span>
                                    ) : justConfirmed ? (
                                      <span className="plan-tracker-confirm">✓ Zum Tracker hinzugefügt!</span>
                                    ) : (
                                      <button className="plan-tracker-btn" onClick={() => addToTracker(meal, mealKey)}>
                                        Heute gegessen ✓
                                      </button>
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}

      </div>
    </main>
  );
}

/* ─── Day Card for own plans ─────────────────────────────── */

function EigeneDayCard({ tag, isAddingMeal, mealForm, setMealForm, onStartAddMeal, onCancelMeal, onAddMeal, onDeleteMeal, onDeleteDay }) {
  const EMOJI = { 'Frühstück': '🌅', 'Mittagessen': '☀️', 'Abendessen': '🌙', 'Snack': '🍎' };
  const totalKcal = Math.round(tag.mahlzeiten.reduce((a, m) => a + (parseFloat(m.kalorien) || 0), 0));

  return (
    <div className="tp-day-card">
      <div className="tp-day-header">
        <div>
          <h3 className="tp-day-name">{tag.name}</h3>
          <span className="tp-day-meta">
            {tag.mahlzeiten.length} Mahlzeit{tag.mahlzeiten.length !== 1 ? 'en' : ''}
            {totalKcal > 0 && ` · ${totalKcal} kcal`}
          </span>
        </div>
        <div className="tp-day-actions">
          <button className="plan-add-btn" onClick={onStartAddMeal} title="Mahlzeit hinzufügen">+</button>
          <button className="plan-meal-delete" onClick={onDeleteDay} title="Tag löschen" style={{ width: 22, height: 22, fontSize: '0.9rem' }}>×</button>
        </div>
      </div>

      {tag.mahlzeiten.length > 0 && (
        <div className="ep-meal-list">
          {tag.mahlzeiten.map(meal => (
            <div key={meal.id} className="ep-meal-row">
              <span className="ep-meal-typ">{EMOJI[meal.typ] ?? '🍽️'} {meal.typ}</span>
              <span className="ep-meal-name">{meal.name}</span>
              <span className="ep-meal-kcal">{meal.kalorien} kcal</span>
              <button className="plan-meal-delete" onClick={() => onDeleteMeal(meal.id)} aria-label="Mahlzeit löschen">×</button>
            </div>
          ))}
        </div>
      )}

      {tag.mahlzeiten.length === 0 && !isAddingMeal && (
        <p className="tp-day-empty">Noch keine Mahlzeiten. Klicke + zum Hinzufügen.</p>
      )}

      {isAddingMeal && (
        <form onSubmit={onAddMeal} className="tp-ex-form">
          <select value={mealForm.typ} onChange={e => setMealForm(p => ({ ...p, typ: e.target.value }))} className="tracker-input">
            {['Frühstück', 'Mittagessen', 'Abendessen', 'Snack'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Mahlzeit (z.B. Haferflocken mit Beeren)"
            value={mealForm.name}
            onChange={e => setMealForm(p => ({ ...p, name: e.target.value }))}
            required className="tracker-input" autoFocus
          />
          <div className="tp-ex-form-row">
            <div className="plan-macro-field">
              <label>kcal</label>
              <input type="number" min="0" placeholder="0" value={mealForm.kalorien} onChange={e => setMealForm(p => ({ ...p, kalorien: e.target.value }))} className="tracker-input" />
            </div>
            <div className="plan-macro-field">
              <label>Protein</label>
              <input type="number" min="0" placeholder="0g" value={mealForm.protein} onChange={e => setMealForm(p => ({ ...p, protein: e.target.value }))} className="tracker-input" />
            </div>
            <div className="plan-macro-field">
              <label>KH</label>
              <input type="number" min="0" placeholder="0g" value={mealForm.kohlenhydrate} onChange={e => setMealForm(p => ({ ...p, kohlenhydrate: e.target.value }))} className="tracker-input" />
            </div>
            <div className="plan-macro-field">
              <label>Fett</label>
              <input type="number" min="0" placeholder="0g" value={mealForm.fett} onChange={e => setMealForm(p => ({ ...p, fett: e.target.value }))} className="tracker-input" />
            </div>
          </div>
          <div className="plan-form-actions">
            <button type="submit" className="tracker-submit plan-save-btn">Hinzufügen</button>
            <button type="button" className="plan-cancel-btn" onClick={onCancelMeal}>Abbrechen</button>
          </div>
        </form>
      )}
    </div>
  );
}
