'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { oeffentlicheErnaehrungsplaene } from '@/data/oeffentlichePlaene';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';
import { PRODUKTE, produktToZutat, calcMealMacros, zutatToListItem } from '@/lib/produkte';

const EIGENE_KEY     = 'kynogg-eigene-ernaehrungsplaene';
const TRACKER_KEY    = 'kynogg-ernaehrung';
const SUBSCRIBED_KEY = 'meine-ernaehrungsplaene';
const AKTIV_E_KEY    = 'aktiver-ernaehrungsplan';
const SESSION_KEY    = 'kynogg-demo-session';
const USER_SUB_KEY   = 'livora-user-subscribed-plans';
const EINKAUF_KEY    = 'livora-einkaufsliste';

function publishedPlansKey(userId) { return `livora-published-plans-${userId}`; }
function readArrE(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

const MEAL_TYPES = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack'];
const MEAL_EMOJI = { 'Frühstück': '🌅', 'Mittagessen': '☀️', 'Abendessen': '🌙', 'Snack': '🍎' };

const WEEK_DAYS = [
  { id: 'mo', name: 'Montag',     short: 'Mo' },
  { id: 'di', name: 'Dienstag',   short: 'Di' },
  { id: 'mi', name: 'Mittwoch',   short: 'Mi' },
  { id: 'do', name: 'Donnerstag', short: 'Do' },
  { id: 'fr', name: 'Freitag',    short: 'Fr' },
  { id: 'sa', name: 'Samstag',    short: 'Sa' },
  { id: 'so', name: 'Sonntag',    short: 'So' },
];

function isWeeklyPlan(plan) {
  return plan.days?.length === 7 && plan.days.every(d => WEEK_DAYS.some(w => w.id === d.id));
}

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
    const tag = plan.tage?.find(t => t.wochentag === dayLabel);
    return tag ? tag.mahlzeiten : [];
  }
  if (dashActive.source === 'eigene') {
    if (isWeeklyPlan(plan)) {
      const wd = WEEK_DAYS[dayIdx];
      return plan.days?.find(d => d.id === wd?.id)?.mahlzeiten ?? [];
    }
    if (!plan.tage?.length) return [];
    return plan.tage[dayIdx % plan.tage.length]?.mahlzeiten ?? [];
  }
  return [];
}

// ── Shopping list helper ──────────────────────────────────────────────────────
function addMealToShoppingList(meal) {
  try {
    const existing = JSON.parse(localStorage.getItem(EINKAUF_KEY) || '[]');
    let newItems = [];
    if (meal.zutaten?.length > 0) {
      newItems = meal.zutaten.map(z => ({ ...zutatToListItem(z), id: uid() }));
    } else {
      newItems = [{
        id: uid(), produktId: null, emoji: MEAL_EMOJI[meal.typ] ?? '🍽️',
        name: meal.name, kat: 'Aus Ernährungsplan', menge: 1, einheit: 'Portion',
        kcalPro: meal.kalorien || 0, proPro: meal.protein || 0,
        khPro: meal.kohlenhydrate || 0, fettPro: meal.fett || 0,
        erledigt: false, vonPlan: 'Ernährungsplan',
      }];
    }
    localStorage.setItem(EINKAUF_KEY, JSON.stringify([...newItems, ...existing]));
    return newItems.length;
  } catch { return 0; }
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function ErnaehrungsplanPage() {
  const { user: _au, loading: _al } = useAuth();
  const [loaded,           setLoaded]        = useState(false);
  const [activeSection,    setActiveSection] = useState('eigene');

  const [eigenePlaene,    setEigenePlaene]  = useState([]);
  const [activePlanId,    setActivePlanId]  = useState(null);
  const [showNewPlan,     setShowNewPlan]   = useState(false);
  const [newPlanName,     setNewPlanName]   = useState('');

  // Weekly plan day selection
  const [selectedDayId,   setSelectedDayId] = useState('mo');
  // Modal state
  const [mealModal,       setMealModal]     = useState(null); // { planId, dayId } or null

  // Legacy plan day/meal adding
  const [addingDayFor,    setAddingDayFor]  = useState(null);
  const [newDayName,      setNewDayName]    = useState('');

  const [subscribedPlans, setSubscribedPlans] = useState([]);
  const [sessionUser,     setSessionUser]     = useState(null);
  const [userSubPlans,    setUserSubPlans]    = useState([]);
  const [dashActive,      setDashActive]      = useState(null);

  const [weekOffset,      setWeekOffset]      = useState(0);
  const [trackedToday,    setTrackedToday]    = useState(new Set());
  const [confirmedMeals,  setConfirmedMeals]  = useState(new Set());
  const [toastMsg,        setToastMsg]        = useState('');

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
      if (raw) { const p = JSON.parse(raw); if (p?.source) setDashActive(p); }
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
      setUserSubPlans(readArrE(USER_SUB_KEY).filter(p => p.type === 'ernaehrung'));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(EIGENE_KEY, JSON.stringify(eigenePlaene));
  }, [eigenePlaene, loaded]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  /* ── Dashboard helpers ── */
  function setAsDashPlan(source, id) {
    const val = { source, id };
    localStorage.setItem(AKTIV_E_KEY, JSON.stringify(val));
    setDashActive(val);
  }
  function clearDashPlan() { localStorage.removeItem(AKTIV_E_KEY); setDashActive(null); }
  function isDashActive(source, id) { return dashActive?.source === source && dashActive?.id === id; }

  /* ── Publish ── */
  function publishPlan(planId) {
    if (!sessionUser) return;
    const plan = eigenePlaene.find(p => p.id === planId);
    if (!plan) return;
    setEigenePlaene(prev => prev.map(p => p.id === planId ? { ...p, published: true } : p));
    const key = publishedPlansKey(sessionUser.id);
    const profil = (() => { try { return JSON.parse(localStorage.getItem('nutzerprofil') || '{}'); } catch { return {}; } })();
    const tage = isWeeklyPlan(plan)
      ? plan.days.map(d => ({ id: d.id, name: d.name, mahlzeiten: d.mahlzeiten }))
      : plan.tage ?? [];
    localStorage.setItem(key, JSON.stringify([
      ...readArrE(key).filter(p => p.id !== planId),
      { id: planId, type: 'ernaehrung', name: plan.name, tage, publishedAt: Date.now(),
        authorId: sessionUser.id, authorName: profil.name || sessionUser.username || sessionUser.email, authorUsername: sessionUser.username },
    ]));
  }
  function unpublishPlan(planId) {
    setEigenePlaene(prev => prev.map(p => p.id === planId ? { ...p, published: false } : p));
    if (!sessionUser) return;
    const key = publishedPlansKey(sessionUser.id);
    localStorage.setItem(key, JSON.stringify(readArrE(key).filter(p => p.id !== planId)));
  }
  function unsubscribeUserPlan(planId) {
    setUserSubPlans(prev => prev.filter(p => p.id !== planId));
    localStorage.setItem(USER_SUB_KEY, JSON.stringify(readArrE(USER_SUB_KEY).filter(p => !(p.id === planId && p.type === 'ernaehrung'))));
  }

  /* ── Plan CRUD ── */
  function handleAddPlan(e) {
    e.preventDefault();
    const name = newPlanName.trim();
    if (!name) return;
    const plan = {
      id: uid(), name, published: false,
      days: WEEK_DAYS.map(w => ({ id: w.id, name: w.name, mahlzeiten: [] })),
    };
    setEigenePlaene(prev => [...prev, plan]);
    setActivePlanId(plan.id);
    setSelectedDayId('mo');
    setNewPlanName('');
    setShowNewPlan(false);
  }

  function handleDeletePlan(planId) {
    const next = eigenePlaene.filter(p => p.id !== planId);
    setEigenePlaene(next);
    if (activePlanId === planId) setActivePlanId(next[0]?.id ?? null);
    if (isDashActive('eigene', planId)) clearDashPlan();
  }

  /* ── Meal CRUD (weekly plans) ── */
  function handleAddMeal(planId, dayId, meal) {
    setEigenePlaene(prev => prev.map(p => p.id !== planId ? p : {
      ...p,
      days: p.days.map(d => d.id !== dayId ? d : {
        ...d, mahlzeiten: [...(d.mahlzeiten || []), { id: uid(), ...meal }],
      }),
    }));
    setMealModal(null);
  }

  function handleDeleteMealWeekly(planId, dayId, mealId) {
    setEigenePlaene(prev => prev.map(p => p.id !== planId ? p : {
      ...p,
      days: p.days.map(d => d.id !== dayId ? d : {
        ...d, mahlzeiten: d.mahlzeiten.filter(m => m.id !== mealId),
      }),
    }));
  }

  /* ── Legacy plan CRUD ── */
  function handleAddDay(e) {
    e.preventDefault();
    const name = newDayName.trim();
    if (!name) return;
    setEigenePlaene(prev => prev.map(p => p.id === addingDayFor
      ? { ...p, tage: [...(p.tage || []), { id: uid(), name, mahlzeiten: [] }] }
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

  function handleAddMealLegacy(planId, dayId, meal) {
    setEigenePlaene(prev => prev.map(p => p.id !== planId ? p : {
      ...p, tage: p.tage.map(d => d.id !== dayId ? d : {
        ...d, mahlzeiten: [...d.mahlzeiten, { id: uid(), ...meal }],
      }),
    }));
  }

  function handleDeleteMealLegacy(planId, dayId, mealId) {
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

  const weekDays    = getWeekDays(weekOffset);
  const weekLabel   = getWeekLabel(weekOffset);
  const activePlan  = eigenePlaene.find(p => p.id === activePlanId) ?? null;
  const isWeekly    = activePlan ? isWeeklyPlan(activePlan) : false;
  const selectedDay = isWeekly ? activePlan.days.find(d => d.id === selectedDayId) ?? activePlan.days[0] : null;

  let resolvedActivePlan = null;
  if (dashActive?.source === 'oeffentlich') resolvedActivePlan = oeffentlicheErnaehrungsplaene.find(p => p.id === dashActive.id) ?? null;
  else if (dashActive?.source === 'eigene') resolvedActivePlan = eigenePlaene.find(p => p.id === dashActive.id) ?? null;
  const activePlanLabel = resolvedActivePlan
    ? (dashActive.source === 'eigene' ? resolvedActivePlan.name : resolvedActivePlan.titel)
    : null;

  return (
    <main className="main-content">
      <div className="tracker-page">
        <Link href="/plaene" className="back-link">← Pläne</Link>

        <div className="tracker-header">
          <span className="cat-pill small cat-ernaehrung">🥗 Ernährung</span>
          <h1 className="kategorie-title" style={{ marginTop: 10 }}>Ernährungspläne</h1>
          <p className="tracker-sub">Erstelle eigene Pläne, abonniere öffentliche und sieh deine Wochenübersicht.</p>
        </div>

        {/* Section Toggle */}
        <div className="tp-section-toggle">
          {[
            ['eigene', 'Eigene Pläne', eigenePlaene.length],
            ['abonniert', 'Abonnierte Pläne', subscribedPlans.length + userSubPlans.length],
            ['woche', 'Wochenübersicht', dashActive ? 'aktiv' : 0],
          ].map(([key, label, count]) => (
            <button key={key} className={`tp-section-btn ${activeSection === key ? 'active' : ''}`} onClick={() => setActiveSection(key)}>
              {label}
              {count ? <span className="tp-section-count">{count}</span> : null}
            </button>
          ))}
        </div>

        {/* ════ Eigene Pläne ════ */}
        {activeSection === 'eigene' && (
          <>
            <div className="tp-tab-bar">
              <div className="tp-tabs">
                {eigenePlaene.map(p => (
                  <div key={p.id} className={`tp-tab ${p.id === activePlanId ? 'active' : ''}`}>
                    <button className="tp-tab-name" onClick={() => { setActivePlanId(p.id); setSelectedDayId('mo'); }}>
                      {p.name}
                      {p.published && <span className="tp-tab-pub">🌐</span>}
                    </button>
                    <button className="tp-tab-del" onClick={() => handleDeletePlan(p.id)}>×</button>
                  </div>
                ))}
              </div>
              <button className="tp-new-btn" onClick={() => { setShowNewPlan(v => !v); setNewPlanName(''); }}>+ Neuer Plan</button>
            </div>

            {showNewPlan && (
              <form onSubmit={handleAddPlan} className="meal-form tp-new-plan-form">
                <input type="text" placeholder='Planname (z.B. "Aufbauphase", "Diät")' value={newPlanName}
                  onChange={e => setNewPlanName(e.target.value)} required className="tracker-input" autoFocus />
                <p className="tp-new-plan-hint">💡 Dein Plan bekommt automatisch eine Wochenstruktur (Mo–So).</p>
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
                  <div>
                    <h2 className="tp-plan-title">{activePlan.name}</h2>
                    {isWeekly && (
                      <p className="tp-plan-summary">
                        {activePlan.days.reduce((s, d) => s + (d.mahlzeiten?.length || 0), 0)} Mahlzeiten diese Woche
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isDashActive('eigene', activePlan.id)
                      ? <button className="tp-dash-active-btn tp-dash-active-btn--set" onClick={clearDashPlan}>📌 Aktiver Plan ✓</button>
                      : <button className="tp-dash-active-btn" onClick={() => setAsDashPlan('eigene', activePlan.id)}>📌 Im Dashboard anzeigen</button>
                    }
                    {activePlan.published
                      ? <button className="tp-publish-btn tp-publish-btn--active" onClick={() => unpublishPlan(activePlan.id)}>🌐 Veröffentlicht ✓</button>
                      : <button className="tp-publish-btn" onClick={() => publishPlan(activePlan.id)}>🌐 Veröffentlichen</button>
                    }
                    {/* Legacy: add day button */}
                    {!isWeekly && (
                      <button className="tracker-submit" style={{ height: 36, padding: '0 16px', fontSize: '0.875rem' }}
                        onClick={() => { setAddingDayFor(activePlan.id); setNewDayName(''); }}>
                        + Tag hinzufügen
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Weekly plan view ── */}
                {isWeekly && (
                  <>
                    <div className="tp-week-strip">
                      {activePlan.days.map(day => {
                        const wd = WEEK_DAYS.find(w => w.id === day.id);
                        const isSelected = day.id === selectedDayId;
                        const kcal = Math.round((day.mahlzeiten || []).reduce((s, m) => s + (m.kalorien || 0), 0));
                        return (
                          <button key={day.id}
                            className={`tp-week-chip ${isSelected ? 'selected' : ''} ep-week-chip`}
                            onClick={() => setSelectedDayId(day.id)}
                          >
                            <span className="tp-week-chip-short">{wd?.short}</span>
                            <span className="tp-week-chip-icon">
                              {(day.mahlzeiten?.length || 0) > 0 ? '🥗' : '—'}
                            </span>
                            <span className="tp-week-chip-label">
                              {kcal > 0 ? `${kcal} kcal` : `${day.mahlzeiten?.length || 0} Mhz.`}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedDay && (
                      <NutritionDayDetail
                        day={selectedDay}
                        planId={activePlan.id}
                        onAddMeal={meal => handleAddMeal(activePlan.id, selectedDay.id, meal)}
                        onDeleteMeal={mealId => handleDeleteMealWeekly(activePlan.id, selectedDay.id, mealId)}
                        onToCart={meal => {
                          const n = addMealToShoppingList(meal);
                          showToast(`🛒 ${n} Zutat${n !== 1 ? 'en' : ''} zur Einkaufsliste hinzugefügt!`);
                        }}
                      />
                    )}
                  </>
                )}

                {/* ── Legacy plan view (free-form days) ── */}
                {!isWeekly && (
                  <>
                    {addingDayFor === activePlan.id && (
                      <form onSubmit={handleAddDay} className="meal-form" style={{ marginBottom: 16 }}>
                        <input type="text" placeholder='Name des Tages (z.B. "Montag")' value={newDayName}
                          onChange={e => setNewDayName(e.target.value)} required className="tracker-input" autoFocus />
                        <div className="plan-form-actions">
                          <button type="submit" className="tracker-submit plan-save-btn">Hinzufügen</button>
                          <button type="button" className="plan-cancel-btn" onClick={() => setAddingDayFor(null)}>Abbrechen</button>
                        </div>
                      </form>
                    )}
                    {(!activePlan.tage || activePlan.tage.length === 0) && addingDayFor !== activePlan.id && (
                      <div className="tracker-empty"><span>🥗</span><p>Noch kein Tag. Klicke „+ Tag hinzufügen".</p></div>
                    )}
                    <div className="ep-days-grid">
                      {(activePlan.tage || []).map(tag => (
                        <LegacyDayCard
                          key={tag.id}
                          tag={tag}
                          onAddMeal={meal => handleAddMealLegacy(activePlan.id, tag.id, meal)}
                          onDeleteMeal={mealId => handleDeleteMealLegacy(activePlan.id, tag.id, mealId)}
                          onDeleteDay={() => handleDeleteDay(activePlan.id, tag.id)}
                          onToCart={meal => {
                            const n = addMealToShoppingList(meal);
                            showToast(`🛒 ${n} Zutat${n !== 1 ? 'en' : ''} zur Einkaufsliste hinzugefügt!`);
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ════ Abonnierte Pläne ════ */}
        {activeSection === 'abonniert' && (
          subscribedPlans.length === 0 && userSubPlans.length === 0
            ? <div className="tracker-empty" style={{ paddingTop: 60 }}><span>🔖</span><p>Noch keine Pläne abonniert. <Link href="/plaene-entdecken" className="tracker-link">Pläne entdecken</Link></p></div>
            : (
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
                      {isDashActive('oeffentlich', p.id)
                        ? <button className="tp-dash-active-btn tp-dash-active-btn--set" onClick={clearDashPlan}>📌 Aktiver Plan ✓</button>
                        : <button className="tp-dash-active-btn" onClick={() => setAsDashPlan('oeffentlich', p.id)}>📌 Im Dashboard anzeigen</button>
                      }
                      <Link href={`/plaene-entdecken/${p.id}`} className="tp-subscribed-btn">Plan ansehen →</Link>
                    </div>
                  </div>
                ))}
                {userSubPlans.map(plan => (
                  <div key={plan.id} className="tp-subscribed-card">
                    <div className="tp-subscribed-info">
                      <h3 className="tp-subscribed-title">{plan.name}</h3>
                      <div className="tp-subscribed-meta">
                        <span>📅 {plan.tage?.length ?? 0} Tage</span>
                        <span>👤 von {plan.authorName || plan.authorUsername}</span>
                      </div>
                    </div>
                    <button className="tp-unsubscribe-btn" onClick={() => unsubscribeUserPlan(plan.id)}>Abonnement beenden</button>
                  </div>
                ))}
              </div>
            )
        )}

        {/* ════ Wochenübersicht ════ */}
        {activeSection === 'woche' && (
          !dashActive || !resolvedActivePlan
            ? <div className="tracker-empty" style={{ paddingTop: 60 }}><span>📅</span><p>Kein aktiver Plan. Wähle einen Plan unter „Eigene Pläne" und klicke <strong>„📌 Im Dashboard anzeigen"</strong>.</p></div>
            : (
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
                    const meals = getMealsForDay(resolvedActivePlan, dashActive, day.idx, day.label);
                    return (
                      <div key={day.dateStr} className={`plan-day-card${day.isToday ? ' plan-day-today' : ''}`}>
                        <div className="plan-day-header">
                          <div className="plan-day-title">
                            <span className="plan-day-name">{day.label}</span>
                            <span className="plan-day-date">{day.shortDate}</span>
                          </div>
                          {meals.length > 0 && (
                            <div className="plan-day-totals">
                              <span className="plan-total-kcal">{sumMeals(meals, 'kalorien')} kcal</span>
                              <span>P {sumMeals(meals, 'protein')}g · K {sumMeals(meals, 'kohlenhydrate')}g · F {sumMeals(meals, 'fett')}g</span>
                            </div>
                          )}
                        </div>
                        {meals.length === 0
                          ? <p className="ep-day-empty">Kein Plan für diesen Tag.</p>
                          : (
                            <ul className="plan-meal-list">
                              {meals.map((meal, mi) => {
                                const mealKey = meal.id || `${day.dateStr}-${mi}`;
                                const alreadyTracked = day.isToday && trackedToday.has(meal.name.toLowerCase().trim());
                                const justConfirmed = confirmedMeals.has(mealKey);
                                return (
                                  <li key={mealKey} className="plan-meal-item">
                                    <div className="plan-meal-row">
                                      <span className="plan-meal-name">{MEAL_EMOJI[meal.typ] ?? '🍽️'} {meal.name}</span>
                                      <span className="plan-meal-kcal">{meal.kalorien} kcal</span>
                                    </div>
                                    {day.isToday && (
                                      <div className="plan-meal-actions">
                                        {alreadyTracked ? <span className="plan-tracker-done">✓ Bereits eingetragen</span>
                                          : justConfirmed ? <span className="plan-tracker-confirm">✓ Zum Tracker hinzugefügt!</span>
                                          : <button className="plan-tracker-btn" onClick={() => addToTracker(meal, mealKey)}>Heute gegessen ✓</button>
                                        }
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )
                        }
                      </div>
                    );
                  })}
                </div>
              </>
            )
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff', padding: '10px 20px',
          borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '0.875rem',
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toastMsg}
        </div>
      )}

      <style>{epCSS}</style>
    </main>
  );
}

/* ─── NutritionDayDetail (weekly plan) ──────────────────────────────────────── */

function NutritionDayDetail({ day, planId, onAddMeal, onDeleteMeal, onToCart }) {
  const [showForm, setShowForm] = useState(false);
  const mahlzeiten = day.mahlzeiten || [];

  const totalKcal = Math.round(mahlzeiten.reduce((s, m) => s + (m.kalorien || 0), 0));
  const totalPro  = Math.round(mahlzeiten.reduce((s, m) => s + (m.protein || 0), 0) * 10) / 10;
  const totalKh   = Math.round(mahlzeiten.reduce((s, m) => s + (m.kohlenhydrate || 0), 0) * 10) / 10;
  const totalFett = Math.round(mahlzeiten.reduce((s, m) => s + (m.fett || 0), 0) * 10) / 10;

  // Group by meal type
  const grouped = MEAL_TYPES.map(typ => ({
    typ,
    meals: mahlzeiten.filter(m => m.typ === typ),
  })).filter(g => g.meals.length > 0 || false);

  return (
    <div className="tp-day-detail ep-day-detail">
      <div className="tp-day-detail-header">
        <div className="tp-day-detail-title-wrap">
          <h3 className="tp-day-detail-name">{day.name}</h3>
          {totalKcal > 0 && (
            <div className="ep-day-totals-row">
              <span className="ep-day-total-kcal">{totalKcal} kcal</span>
              <span className="ep-day-total-macros">P {totalPro}g · KH {totalKh}g · F {totalFett}g</span>
            </div>
          )}
        </div>
        <button className="tracker-submit" style={{ height: 36, padding: '0 16px', fontSize: '0.875rem' }}
          onClick={() => setShowForm(true)}>
          + Mahlzeit hinzufügen
        </button>
      </div>

      {mahlzeiten.length === 0 && !showForm && (
        <div className="tp-ex-empty"><span>🥗</span><p>Noch keine Mahlzeiten für diesen Tag.</p></div>
      )}

      {/* Meals grouped by type */}
      {MEAL_TYPES.map(typ => {
        const meals = mahlzeiten.filter(m => m.typ === typ);
        if (meals.length === 0) return null;
        return (
          <div key={typ} className="ep-meal-type-group">
            <div className="ep-meal-type-label">{MEAL_EMOJI[typ]} {typ}</div>
            {meals.map(meal => (
              <MealCard
                key={meal.id}
                meal={meal}
                onDelete={() => onDeleteMeal(meal.id)}
                onToCart={() => onToCart(meal)}
              />
            ))}
          </div>
        );
      })}

      {showForm && (
        <MealForm
          onSave={meal => { onAddMeal(meal); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

/* ─── MealCard ───────────────────────────────────────────────────────────────── */

function MealCard({ meal, onDelete, onToCart }) {
  const [expanded, setExpanded] = useState(false);
  const hasZutaten = meal.zutaten?.length > 0;

  return (
    <div className="ep-meal-card">
      <div className="ep-meal-card-row">
        <button className="ep-meal-expand-btn" onClick={() => setExpanded(v => !v)}>
          {expanded ? '▾' : '▸'}
        </button>
        <div className="ep-meal-card-body">
          <span className="ep-meal-card-name">{meal.name}</span>
          <div className="ep-meal-card-macros">
            <span className="ep-macro-kcal">{meal.kalorien || 0} kcal</span>
            <span>P {meal.protein || 0}g</span>
            <span>KH {meal.kohlenhydrate || 0}g</span>
            <span>F {meal.fett || 0}g</span>
          </div>
        </div>
        <div className="ep-meal-card-actions">
          <button className="ep-cart-btn" onClick={onToCart} title="Zur Einkaufsliste">🛒</button>
          <button className="plan-meal-delete" onClick={onDelete} title="Mahlzeit löschen">×</button>
        </div>
      </div>

      {expanded && hasZutaten && (
        <div className="ep-zutaten-list">
          {meal.zutaten.map(z => (
            <div key={z.id} className="ep-zutat-row">
              <span className="ep-zutat-emoji">{z.emoji}</span>
              <span className="ep-zutat-name">{z.name}</span>
              <span className="ep-zutat-menge">{z.menge} {z.einheit}</span>
              <span className="ep-zutat-kcal">{Math.round((z.kcalPro || 0) * z.menge)} kcal</span>
            </div>
          ))}
        </div>
      )}
      {expanded && !hasZutaten && (
        <div className="ep-zutaten-list" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '8px 12px' }}>
          Keine Zutaten eingetragen.
        </div>
      )}
    </div>
  );
}

/* ─── MealForm (with ingredient search) ─────────────────────────────────────── */

function MealForm({ onSave, onCancel }) {
  const [typ,     setTyp]     = useState('Frühstück');
  const [name,    setName]    = useState('');
  const [zutaten, setZutaten] = useState([]);
  const [search,  setSearch]  = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({ kalorien: '', protein: '', kohlenhydrate: '', fett: '' });

  const macros = calcMealMacros(zutaten);
  const useManual = manualMode || zutaten.length === 0;

  const finalKcal = zutaten.length > 0 ? macros.kalorien : parseFloat(manualForm.kalorien) || 0;
  const finalPro  = zutaten.length > 0 ? macros.protein       : parseFloat(manualForm.protein) || 0;
  const finalKh   = zutaten.length > 0 ? macros.kohlenhydrate : parseFloat(manualForm.kohlenhydrate) || 0;
  const finalFett = zutaten.length > 0 ? macros.fett          : parseFloat(manualForm.fett) || 0;

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const lc = search.toLowerCase();
    return PRODUKTE.filter(p => p.name.toLowerCase().includes(lc)).slice(0, 8);
  }, [search]);

  function addZutat(p) {
    setZutaten(prev => {
      const existing = prev.find(z => z.produktId === p.id);
      if (existing) return prev.map(z => z.produktId === p.id ? { ...z, menge: z.menge + 1 } : z);
      return [...prev, produktToZutat(p, 1)];
    });
    setSearch('');
  }

  function updateMenge(id, menge) {
    const m = parseFloat(menge);
    if (isNaN(m) || m <= 0) return;
    setZutaten(prev => prev.map(z => z.id === id ? { ...z, menge: m } : z));
  }

  function removeZutat(id) {
    setZutaten(prev => prev.filter(z => z.id !== id));
  }

  function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      typ, name: name.trim(), zutaten,
      kalorien: finalKcal, protein: finalPro,
      kohlenhydrate: finalKh, fett: finalFett,
    });
  }

  return (
    <div className="ep-meal-form">
      <div className="ep-meal-form-header">
        <h4>Neue Mahlzeit</h4>
        <button className="todo-modal-close" onClick={onCancel}>✕</button>
      </div>

      <form onSubmit={handleSave}>
        {/* Type + Name */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={typ} onChange={e => setTyp(e.target.value)} className="tracker-input" style={{ maxWidth: 150 }}>
            {MEAL_TYPES.map(t => <option key={t} value={t}>{MEAL_EMOJI[t]} {t}</option>)}
          </select>
          <input type="text" placeholder="Name der Mahlzeit (z.B. Haferbrei)" value={name}
            onChange={e => setName(e.target.value)} required className="tracker-input" autoFocus />
        </div>

        {/* Ingredient search */}
        <div className="ep-ingredient-section">
          <div className="ep-ingredient-label">Zutaten <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional – Makros werden automatisch berechnet)</span></div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Zutat suchen (z.B. Haferflocken, Ei, Lachs…)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="tracker-input"
            />
            {searchResults.length > 0 && (
              <div className="ep-search-dropdown">
                {searchResults.map(p => (
                  <button key={p.id} type="button" className="ep-search-result" onClick={() => addZutat(p)}>
                    <span>{p.emoji} {p.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.kat} · {Math.round(p.kcal * p.g / 100)} kcal/{p.einheit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {zutaten.length > 0 && (
            <div className="ep-zutaten-list" style={{ marginTop: 8 }}>
              {zutaten.map(z => (
                <div key={z.id} className="ep-zutat-row ep-zutat-edit">
                  <span className="ep-zutat-emoji">{z.emoji}</span>
                  <span className="ep-zutat-name">{z.name}</span>
                  <input
                    type="number" min="0.1" step="0.1"
                    value={z.menge}
                    onChange={e => updateMenge(z.id, e.target.value)}
                    className="tracker-input ep-zutat-menge-input"
                  />
                  <span className="ep-zutat-einheit">{z.einheit}</span>
                  <span className="ep-zutat-kcal">{Math.round((z.kcalPro || 0) * z.menge)} kcal</span>
                  <button type="button" className="plan-meal-delete" onClick={() => removeZutat(z.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual macro input (shown when no ingredients) */}
        {zutaten.length === 0 && (
          <div className="ep-manual-macros">
            <div className="ep-ingredient-label">Nährwerte manuell eingeben</div>
            <div className="tp-ex-form-row">
              {[['kalorien','kcal'],['protein','Protein'],['kohlenhydrate','KH'],['fett','Fett']].map(([k,l]) => (
                <div key={k} className="plan-macro-field">
                  <label>{l}</label>
                  <input type="number" min="0" placeholder="0" value={manualForm[k]}
                    onChange={e => setManualForm(p => ({ ...p, [k]: e.target.value }))}
                    className="tracker-input" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Macro summary */}
        {(zutaten.length > 0 || Object.values(manualForm).some(v => v)) && (
          <div className="ep-macro-summary">
            <span>Gesamt:</span>
            <span className="ep-macro-kcal">{finalKcal} kcal</span>
            <span>Protein {finalPro}g</span>
            <span>KH {finalKh}g</span>
            <span>Fett {finalFett}g</span>
          </div>
        )}

        <div className="plan-form-actions" style={{ marginTop: 16 }}>
          <button type="submit" className="tracker-submit plan-save-btn" disabled={!name.trim()}>Mahlzeit speichern</button>
          <button type="button" className="plan-cancel-btn" onClick={onCancel}>Abbrechen</button>
        </div>
      </form>
    </div>
  );
}

/* ─── LegacyDayCard (old free-form plans) ───────────────────────────────────── */

function LegacyDayCard({ tag, onAddMeal, onDeleteMeal, onDeleteDay, onToCart }) {
  const [showForm, setShowForm] = useState(false);
  const totalKcal = Math.round((tag.mahlzeiten || []).reduce((s, m) => s + (m.kalorien || 0), 0));

  return (
    <div className="tp-day-card">
      <div className="tp-day-header">
        <div>
          <h3 className="tp-day-name">{tag.name}</h3>
          <span className="tp-day-meta">
            {tag.mahlzeiten?.length || 0} Mahlzeit{(tag.mahlzeiten?.length || 0) !== 1 ? 'en' : ''}
            {totalKcal > 0 && ` · ${totalKcal} kcal`}
          </span>
        </div>
        <div className="tp-day-actions">
          <button className="plan-add-btn" onClick={() => setShowForm(true)} title="Mahlzeit hinzufügen">+</button>
          <button className="plan-meal-delete" onClick={onDeleteDay} title="Tag löschen" style={{ width: 22, height: 22, fontSize: '0.9rem' }}>×</button>
        </div>
      </div>

      {(tag.mahlzeiten || []).map(meal => (
        <MealCard key={meal.id} meal={meal} onDelete={() => onDeleteMeal(meal.id)} onToCart={() => onToCart(meal)} />
      ))}

      {(!tag.mahlzeiten || tag.mahlzeiten.length === 0) && !showForm && (
        <p className="tp-day-empty">Noch keine Mahlzeiten. Klicke + zum Hinzufügen.</p>
      )}

      {showForm && (
        <MealForm onSave={meal => { onAddMeal(meal); setShowForm(false); }} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
}

/* ─── CSS ────────────────────────────────────────────────────────────────────── */

const epCSS = `
.ep-week-chip { background: var(--bg-card); }
.ep-week-chip.selected { background: color-mix(in srgb, var(--accent) 12%, var(--bg-card)); border-color: var(--accent); }

.ep-day-detail { margin-top: 16px; }
.ep-day-totals-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; flex-wrap: wrap; }
.ep-day-total-kcal { font-size: 1.1rem; font-weight: 700; color: var(--accent); }
.ep-day-total-macros { font-size: 0.8rem; color: var(--text-muted); }

.ep-meal-type-group { margin-bottom: 16px; }
.ep-meal-type-label {
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-muted);
  margin-bottom: 6px; padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.ep-meal-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  margin-bottom: 6px;
  overflow: hidden;
}
.ep-meal-card-row {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
}
.ep-meal-expand-btn {
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); font-size: 0.9rem; flex-shrink: 0;
  width: 20px; text-align: center;
}
.ep-meal-card-body { flex: 1; min-width: 0; }
.ep-meal-card-name { font-size: 0.875rem; font-weight: 600; display: block; }
.ep-meal-card-macros { display: flex; gap: 10px; font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; flex-wrap: wrap; }
.ep-macro-kcal { color: var(--accent); font-weight: 600; }
.ep-meal-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
.ep-cart-btn {
  background: none; border: 1px solid var(--border); cursor: pointer;
  font-size: 0.85rem; padding: 3px 6px; border-radius: var(--radius-sm);
  transition: background 0.1s;
}
.ep-cart-btn:hover { background: var(--bg-card-hover); }

.ep-zutaten-list { border-top: 1px solid var(--border); padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
.ep-zutat-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; }
.ep-zutat-emoji { flex-shrink: 0; }
.ep-zutat-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ep-zutat-menge { color: var(--text-muted); flex-shrink: 0; }
.ep-zutat-kcal { color: var(--accent); font-weight: 600; flex-shrink: 0; margin-left: auto; }
.ep-zutat-edit .ep-zutat-name { max-width: 140px; }
.ep-zutat-menge-input { width: 60px !important; padding: 3px 6px !important; font-size: 0.8rem !important; flex-shrink: 0; }
.ep-zutat-einheit { color: var(--text-muted); font-size: 0.75rem; flex-shrink: 0; }

.ep-meal-form {
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--bg-card); padding: 20px; margin-top: 12px;
}
.ep-meal-form-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
}
.ep-meal-form-header h4 { font-family: 'Space Grotesk',sans-serif; font-size: 1rem; font-weight: 700; }

.ep-ingredient-section { margin-bottom: 12px; position: relative; }
.ep-ingredient-label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }

.ep-search-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-hover);
  z-index: 100; overflow: hidden;
}
.ep-search-result {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 8px 12px; border: none; background: transparent;
  color: var(--text); cursor: pointer; font-size: 0.85rem; text-align: left;
  transition: background 0.1s;
}
.ep-search-result:hover { background: var(--bg-card-hover); }

.ep-manual-macros { margin-bottom: 12px; }
.ep-macro-summary {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; background: color-mix(in srgb, var(--accent) 8%, var(--bg-card));
  border-radius: var(--radius-sm); font-size: 0.8rem; border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
}
.ep-macro-summary .ep-macro-kcal { font-size: 1rem; font-weight: 700; color: var(--accent); }

@media (max-width: 640px) {
  .ep-meal-card-macros { gap: 6px; }
  .ep-macro-summary { gap: 8px; }
  .ep-zutat-edit .ep-zutat-name { max-width: 80px; }
}
`;
