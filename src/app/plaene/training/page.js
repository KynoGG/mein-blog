'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { oeffentlicheTrainingsplaene } from '@/data/oeffentlichePlaene';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const STORAGE_KEY       = 'kynogg-trainingsplaene';
const SUBSCRIBED_KEY    = 'meine-trainingsplaene';
const SPORT_TRACKER_KEY = 'kynogg-sport';
const AKTIV_T_KEY       = 'aktiver-trainingsplan';
const SESSION_KEY       = 'kynogg-demo-session';
const USER_SUB_KEY      = 'livora-user-subscribed-plans';
const EMPTY_EX          = { name: '', saetze: '', wiederholungen: '', gewicht: '', notizen: '' };

function publishedPlansKey(userId) { return `livora-published-plans-${userId}`; }
function readArr(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }

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
  return plan.days?.length === 7 &&
    plan.days.every(d => WEEK_DAYS.some(w => w.id === d.id));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */

export default function TrainingsplanPage() {
  const { user: _au, loading: _al } = useAuth();
  const [plans,           setPlans]           = useState([]);
  const [subscribedPlans, setSubscribedPlans] = useState([]);
  const [loaded,          setLoaded]          = useState(false);
  const [activePlanId,    setActivePlanId]    = useState(null);
  const [activeSection,   setActiveSection]   = useState('eigene');
  const [dashActive,      setDashActive]      = useState(null);
  const [showNewPlan,     setShowNewPlan]     = useState(false);
  const [newPlanName,     setNewPlanName]     = useState('');
  const [selectedDayId,   setSelectedDayId]  = useState('mo');
  const [addingEx,        setAddingEx]        = useState(false);
  const [exForm,          setExForm]          = useState(EMPTY_EX);
  const [session,         setSession]         = useState(null);
  const [sessionUser,     setSessionUser]     = useState(null);
  const [userSubPlans,    setUserSubPlans]    = useState([]);
  const [expandedSubPlan, setExpandedSubPlan] = useState(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        setPlans(parsed);
        if (parsed.length > 0) setActivePlanId(parsed[0].id);
      }
    } catch {}
    try {
      const ids = JSON.parse(localStorage.getItem(SUBSCRIBED_KEY) || '[]');
      setSubscribedPlans(ids.map(id => oeffentlicheTrainingsplaene.find(p => p.id === id)).filter(Boolean));
    } catch {}
    try {
      const raw = localStorage.getItem(AKTIV_T_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.source) setDashActive(parsed);
      }
    } catch {}
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s) setSessionUser(s);
    } catch {}
    try {
      setUserSubPlans(readArr(USER_SUB_KEY).filter(p => p.type === 'training'));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  }, [plans, loaded]);

  /* ── Dashboard helpers ── */
  function setAsDashPlan(source, id) {
    const val = { source, id };
    localStorage.setItem(AKTIV_T_KEY, JSON.stringify(val));
    setDashActive(val);
  }
  function clearDashPlan() { localStorage.removeItem(AKTIV_T_KEY); setDashActive(null); }
  function isDashActive(source, id) { return dashActive?.source === source && dashActive?.id === id; }

  /* ── Publish ── */
  function publishPlan(planId) {
    if (!sessionUser) return;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, published: true } : p));
    const key = publishedPlansKey(sessionUser.id);
    const profil = (() => { try { return JSON.parse(localStorage.getItem('nutzerprofil') || '{}'); } catch { return {}; } })();
    localStorage.setItem(key, JSON.stringify([
      ...readArr(key).filter(p => p.id !== planId),
      { id: planId, type: 'training', name: plan.name, days: plan.days, publishedAt: Date.now(),
        authorId: sessionUser.id, authorName: profil.name || sessionUser.username || sessionUser.email, authorUsername: sessionUser.username },
    ]));
  }
  function unpublishPlan(planId) {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, published: false } : p));
    if (!sessionUser) return;
    const key = publishedPlansKey(sessionUser.id);
    localStorage.setItem(key, JSON.stringify(readArr(key).filter(p => p.id !== planId)));
  }
  function unsubscribeCuratedPlan(planId) {
    const updated = subscribedPlans.filter(p => p.id !== planId);
    setSubscribedPlans(updated);
    const ids = JSON.parse(localStorage.getItem(SUBSCRIBED_KEY) || '[]');
    localStorage.setItem(SUBSCRIBED_KEY, JSON.stringify(ids.filter(id => id !== planId)));
  }

  function unsubscribeUserPlan(planId) {
    const updated = userSubPlans.filter(p => p.id !== planId);
    setUserSubPlans(updated);
    localStorage.setItem(USER_SUB_KEY, JSON.stringify(readArr(USER_SUB_KEY).filter(p => !(p.id === planId && p.type === 'training'))));
  }

  /* ── Plan CRUD ── */
  function handleAddPlan(e) {
    e.preventDefault();
    const name = newPlanName.trim();
    if (!name) return;
    const plan = {
      id: uid(), name,
      days: WEEK_DAYS.map(w => ({ id: w.id, name: w.name, type: 'rest', focus: '', exercises: [] })),
    };
    setPlans(prev => [...prev, plan]);
    setActivePlanId(plan.id);
    setSelectedDayId('mo');
    setNewPlanName('');
    setShowNewPlan(false);
  }

  function handleDeletePlan(planId) {
    const next = plans.filter(p => p.id !== planId);
    setPlans(next);
    if (activePlanId === planId) setActivePlanId(next[0]?.id ?? null);
  }

  /* ── Day actions ── */
  function toggleDayType(planId, dayId) {
    setPlans(prev => prev.map(p => p.id !== planId ? p : {
      ...p, days: p.days.map(d => d.id !== dayId ? d : {
        ...d, type: d.type === 'rest' ? 'training' : 'rest',
      }),
    }));
  }

  function updateDayFocus(planId, dayId, focus) {
    setPlans(prev => prev.map(p => p.id !== planId ? p : {
      ...p, days: p.days.map(d => d.id !== dayId ? d : { ...d, focus }),
    }));
  }

  /* ── Exercise CRUD ── */
  function handleAddEx(e) {
    e.preventDefault();
    const ex = {
      id: uid(), name: exForm.name.trim(),
      saetze: parseInt(exForm.saetze) || 0,
      wiederholungen: exForm.wiederholungen.trim(),
      gewicht: exForm.gewicht.trim(),
      notizen: exForm.notizen.trim(),
    };
    setPlans(prev => prev.map(p => p.id !== activePlanId ? p : {
      ...p, days: p.days.map(d => d.id !== selectedDayId ? d : {
        ...d, exercises: [...d.exercises, ex],
      }),
    }));
    setExForm(EMPTY_EX);
    setAddingEx(false);
  }

  function handleDeleteEx(exId) {
    setPlans(prev => prev.map(p => p.id !== activePlanId ? p : {
      ...p, days: p.days.map(d => d.id !== selectedDayId ? d : {
        ...d, exercises: d.exercises.filter(e => e.id !== exId),
      }),
    }));
  }

  /* ── Training Session ── */
  function startSession(day) {
    const plan = plans.find(p => p.id === activePlanId);
    setSession({
      planName: plan?.name ?? '',
      dayName: day.focus || day.name,
      startedAt: Date.now(),
      exercises: day.exercises.map(ex => ({
        id: ex.id, name: ex.name,
        wiederholungen: ex.wiederholungen, gewicht: ex.gewicht,
        sets: Array.from({ length: ex.saetze }, (_, i) => ({ idx: i, done: false })),
      })),
    });
  }

  function handleSessionComplete(dauer, sets) {
    const doneSets  = sets.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
    const totalSets = sets.reduce((a, ex) => a + ex.sets.length, 0);
    const kalorien  = Math.round(dauer * 6);
    const intensitaet = dauer < 30 ? 'leicht' : dauer > 60 ? 'intensiv' : 'mittel';
    const notizen = sets.map(ex => {
      const done = ex.sets.filter(s => s.done).length;
      const line = `${ex.name}: ${done}/${ex.sets.length} Sätze`;
      return ex.gewicht ? `${line} @ ${ex.gewicht}` : line;
    }).join(' · ');
    const entry = {
      id: uid(), datum: todayStr(),
      sportart: `${session.planName} – ${session.dayName}`,
      dauer, intensitaet,
      notizen: `${doneSets}/${totalSets} Sätze · ${notizen}`,
      kalorien,
    };
    try {
      const existing = JSON.parse(localStorage.getItem(SPORT_TRACKER_KEY) || '[]');
      localStorage.setItem(SPORT_TRACKER_KEY, JSON.stringify([entry, ...existing]));
    } catch {}
    setSession(null);
  }

  if (!loaded || _al) return null;
  if (!_au) return <AuthGate />;

  const activePlan   = plans.find(p => p.id === activePlanId) ?? null;
  const isWeekly     = activePlan ? isWeeklyPlan(activePlan) : false;
  const selectedDay  = isWeekly ? activePlan.days.find(d => d.id === selectedDayId) ?? activePlan.days[0] : null;
  const trainingDays = activePlan ? activePlan.days.filter(d => d.type !== 'rest') : [];

  return (
    <>
      <main className="main-content">
        <div className="tracker-page">
          <Link href="/plaene" className="back-link">← Pläne</Link>

          <div className="tracker-header">
            <span className="cat-pill small cat-fitness">🏋️ Fitness</span>
            <h1 className="kategorie-title" style={{ marginTop: '10px' }}>Trainingspläne</h1>
            <p className="tracker-sub">Plane deine Woche, lege Trainingstage fest und tracke dein Training.</p>
          </div>

          {/* ── Section toggle ── */}
          <div className="tp-section-toggle">
            <button className={`tp-section-btn ${activeSection === 'eigene' ? 'active' : ''}`} onClick={() => setActiveSection('eigene')}>
              Meine Pläne
              {plans.length > 0 && <span className="tp-section-count">{plans.length}</span>}
            </button>
            <button className={`tp-section-btn ${activeSection === 'abonniert' ? 'active' : ''}`} onClick={() => setActiveSection('abonniert')}>
              Abonnierte Pläne
              {(subscribedPlans.length + userSubPlans.length) > 0 && <span className="tp-section-count">{subscribedPlans.length + userSubPlans.length}</span>}
            </button>
          </div>

          {/* ══════ Eigene Pläne ══════ */}
          {activeSection === 'eigene' && (
            <>
              {/* Plan-Tabs */}
              <div className="tp-tab-bar">
                <div className="tp-tabs">
                  {plans.map(plan => (
                    <div key={plan.id} className={`tp-tab ${plan.id === activePlanId ? 'active' : ''}`}>
                      <button className="tp-tab-name" onClick={() => { setActivePlanId(plan.id); setSelectedDayId('mo'); setAddingEx(false); }}>
                        {plan.name}
                        {plan.published && <span className="tp-tab-pub">🌐</span>}
                      </button>
                      <button className="tp-tab-del" onClick={() => handleDeletePlan(plan.id)} aria-label="Plan löschen">×</button>
                    </div>
                  ))}
                </div>
                <button className="tp-new-btn" onClick={() => { setShowNewPlan(v => !v); setNewPlanName(''); }}>
                  + Neuer Plan
                </button>
              </div>

              {/* Neuer Plan Form */}
              {showNewPlan && (
                <form onSubmit={handleAddPlan} className="meal-form tp-new-plan-form">
                  <input
                    type="text" placeholder='Planname (z.B. "Push/Pull/Legs", "Ganzkörper")'
                    value={newPlanName} onChange={e => setNewPlanName(e.target.value)}
                    required className="tracker-input" autoFocus
                  />
                  <p className="tp-new-plan-hint">
                    💡 Dein Plan bekommt automatisch eine Wochenstruktur (Mo–So). Du bestimmst dann, welche Tage Trainingstage sind.
                  </p>
                  <div className="plan-form-actions">
                    <button type="submit" className="tracker-submit plan-save-btn">Plan erstellen</button>
                    <button type="button" className="plan-cancel-btn" onClick={() => setShowNewPlan(false)}>Abbrechen</button>
                  </div>
                </form>
              )}

              {!activePlan && !showNewPlan && (
                <div className="tracker-empty" style={{ paddingTop: 60 }}>
                  <span>📋</span>
                  <p>Noch kein Trainingsplan. Erstelle deinen ersten Plan!</p>
                </div>
              )}

              {activePlan && (
                <div className="tp-plan-content">
                  {/* Plan-Header */}
                  <div className="tp-plan-content-header">
                    <div>
                      <h2 className="tp-plan-title">{activePlan.name}</h2>
                      {isWeekly && (
                        <p className="tp-plan-summary">
                          {trainingDays.length} Trainingstag{trainingDays.length !== 1 ? 'e' : ''} · {7 - trainingDays.length} Ruhetag{7 - trainingDays.length !== 1 ? 'e' : ''} pro Woche
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {isDashActive('eigene', activePlan.id) ? (
                        <button className="tp-dash-active-btn tp-dash-active-btn--set" onClick={clearDashPlan}>📌 Aktiver Plan ✓</button>
                      ) : (
                        <button className="tp-dash-active-btn" onClick={() => setAsDashPlan('eigene', activePlan.id)}>📌 Im Dashboard anzeigen</button>
                      )}
                      {activePlan.published ? (
                        <button className="tp-publish-btn tp-publish-btn--active" onClick={() => unpublishPlan(activePlan.id)}>🌐 Veröffentlicht ✓</button>
                      ) : (
                        <button className="tp-publish-btn" onClick={() => publishPlan(activePlan.id)}>🌐 Veröffentlichen</button>
                      )}
                    </div>
                  </div>

                  {/* Wochenübersicht (nur für neue Pläne mit Wochenstruktur) */}
                  {isWeekly && (
                    <>
                      <div className="tp-week-strip">
                        {activePlan.days.map(day => {
                          const wd = WEEK_DAYS.find(w => w.id === day.id);
                          const isSelected = day.id === selectedDayId;
                          const isTraining = day.type !== 'rest';
                          return (
                            <button
                              key={day.id}
                              className={`tp-week-chip ${isTraining ? 'training' : 'rest'} ${isSelected ? 'selected' : ''}`}
                              onClick={() => { setSelectedDayId(day.id); setAddingEx(false); setExForm(EMPTY_EX); }}
                            >
                              <span className="tp-week-chip-short">{wd?.short}</span>
                              <span className="tp-week-chip-icon">{isTraining ? '🏋️' : '💤'}</span>
                              <span className="tp-week-chip-label">
                                {isTraining
                                  ? (day.focus || `${day.exercises.length} Üb.`)
                                  : 'Ruhetag'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Tag-Detail */}
                      {selectedDay && (
                        <WeekDayDetail
                          day={selectedDay}
                          planId={activePlan.id}
                          planName={activePlan.name}
                          addingEx={addingEx}
                          exForm={exForm}
                          setExForm={setExForm}
                          onToggleType={() => { toggleDayType(activePlan.id, selectedDay.id); setAddingEx(false); }}
                          onUpdateFocus={focus => updateDayFocus(activePlan.id, selectedDay.id, focus)}
                          onStartAddEx={() => { setAddingEx(true); setExForm(EMPTY_EX); }}
                          onCancelEx={() => setAddingEx(false)}
                          onAddEx={handleAddEx}
                          onDeleteEx={handleDeleteEx}
                          onStartSession={() => startSession(selectedDay)}
                        />
                      )}
                    </>
                  )}

                  {/* Alter Plan: Übersicht ohne Wochenstruktur */}
                  {!isWeekly && activePlan.days?.length > 0 && (
                    <div className="tp-days-grid">
                      {activePlan.days.map(day => (
                        <LegacyDayCard
                          key={day.id}
                          day={day}
                          planId={activePlan.id}
                          isAddingEx={addingEx && selectedDayId === day.id}
                          exForm={exForm}
                          setExForm={setExForm}
                          onStartAddEx={() => { setSelectedDayId(day.id); setAddingEx(true); setExForm(EMPTY_EX); }}
                          onCancelEx={() => setAddingEx(false)}
                          onAddEx={(e) => {
                            e.preventDefault();
                            const ex = {
                              id: uid(), name: exForm.name.trim(),
                              saetze: parseInt(exForm.saetze) || 0,
                              wiederholungen: exForm.wiederholungen.trim(),
                              gewicht: exForm.gewicht.trim(),
                              notizen: exForm.notizen.trim(),
                            };
                            setPlans(prev => prev.map(p => p.id !== activePlanId ? p : {
                              ...p, days: p.days.map(d => d.id !== day.id ? d : { ...d, exercises: [...d.exercises, ex] }),
                            }));
                            setExForm(EMPTY_EX);
                            setAddingEx(false);
                          }}
                          onDeleteEx={exId => setPlans(prev => prev.map(p => p.id !== activePlanId ? p : {
                            ...p, days: p.days.map(d => d.id !== day.id ? d : { ...d, exercises: d.exercises.filter(e => e.id !== exId) }),
                          }))}
                          onDeleteDay={() => setPlans(prev => prev.map(p => p.id !== activePlanId ? p : { ...p, days: p.days.filter(d => d.id !== day.id) }))}
                          onStartSession={() => startSession(day)}
                        />
                      ))}
                    </div>
                  )}

                  {!isWeekly && (!activePlan.days || activePlan.days.length === 0) && (
                    <div className="tracker-empty">
                      <span>🏋️</span>
                      <p>Noch keine Trainingstage. Klicke „+ Trainingstag" zum Starten.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══════ Abonnierte Pläne ══════ */}
          {activeSection === 'abonniert' && (
            <>
              {subscribedPlans.length === 0 && userSubPlans.length === 0 ? (
                <div className="tracker-empty" style={{ paddingTop: 60 }}>
                  <span>🔖</span>
                  <p>Noch keine Pläne abonniert. Entdecke Pläne unter <Link href="/plaene-entdecken" className="tracker-link">Pläne entdecken</Link>.</p>
                </div>
              ) : (
                <div className="tp-subscribed-list">
                  {subscribedPlans.map(plan => (
                    <div key={plan.id} className="tp-subscribed-card">
                      <div className="tp-subscribed-info">
                        <h3 className="tp-subscribed-title">{plan.titel}</h3>
                        <p className="tp-subscribed-desc">{plan.beschreibung}</p>
                        <div className="tp-subscribed-meta">
                          <span>📅 {plan.trainingsTagsProWoche}× pro Woche</span>
                          <span>⏱️ {plan.dauer}</span>
                          <span>✍️ von {plan.autor}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                        {isDashActive('oeffentlich', plan.id) ? (
                          <button className="tp-dash-active-btn tp-dash-active-btn--set" onClick={clearDashPlan}>📌 Aktiver Plan ✓</button>
                        ) : (
                          <button className="tp-dash-active-btn" onClick={() => setAsDashPlan('oeffentlich', plan.id)}>📌 Im Dashboard anzeigen</button>
                        )}
                        <Link href={`/plaene-entdecken/${plan.id}`} className="tp-subscribed-btn">Plan ansehen →</Link>
                        <button className="tp-unsubscribe-btn" onClick={() => unsubscribeCuratedPlan(plan.id)}>Abonnement beenden</button>
                      </div>
                    </div>
                  ))}
                  {userSubPlans.map(plan => {
                    const trainingDays = (plan.days ?? []).filter(d => d.type !== 'rest');
                    const totalEx = trainingDays.reduce((a, d) => a + (d.exercises?.length ?? 0), 0);
                    const isExpanded = expandedSubPlan === plan.id;
                    return (
                    <div key={plan.id} className="tp-subscribed-card">
                      <div className="tp-subscribed-info">
                        <h3 className="tp-subscribed-title">{plan.name}</h3>
                        <p className="tp-subscribed-desc">
                          {trainingDays.length} Trainingstag{trainingDays.length !== 1 ? 'e' : ''} · {totalEx} Übungen
                        </p>
                        <div className="tp-subscribed-meta">
                          <span>✍️ von {plan.authorName || plan.authorUsername}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                        {isDashActive('userplan', plan.id) ? (
                          <button className="tp-dash-active-btn tp-dash-active-btn--set" onClick={clearDashPlan}>📌 Aktiver Plan ✓</button>
                        ) : (
                          <button className="tp-dash-active-btn" onClick={() => setAsDashPlan('userplan', plan.id)}>📌 Im Dashboard anzeigen</button>
                        )}
                        <Link href={`/plaene/user-plan/${plan.id}`} className="tp-subscribed-btn">Plan ansehen →</Link>
                        <button className="tp-unsubscribe-btn" onClick={() => unsubscribeUserPlan(plan.id)}>Abonnement beenden</button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {session && (
        <TrainingSession
          session={session}
          onComplete={handleSessionComplete}
          onCancel={() => setSession(null)}
        />
      )}
    </>
  );
}

/* ─── Week Day Detail ─────────────────────────────────────────────────────────  */

function WeekDayDetail({ day, planId, planName, addingEx, exForm, setExForm, onToggleType, onUpdateFocus, onStartAddEx, onCancelEx, onAddEx, onDeleteEx, onStartSession }) {
  const [editingFocus, setEditingFocus] = useState(false);
  const [focusVal,     setFocusVal]     = useState(day.focus || '');

  useEffect(() => { setFocusVal(day.focus || ''); }, [day.id, day.focus]);

  function saveFocus() {
    onUpdateFocus(focusVal.trim());
    setEditingFocus(false);
  }

  return (
    <div className="tp-day-detail">
      {/* Header */}
      <div className="tp-day-detail-header">
        <div className="tp-day-detail-title-wrap">
          <h3 className="tp-day-detail-name">{day.name}</h3>
          {day.type !== 'rest' && (
            editingFocus ? (
              <div className="tp-focus-edit">
                <input
                  type="text" className="tracker-input tp-focus-input"
                  placeholder="Fokus (z.B. Brust & Trizeps, Push Day)"
                  value={focusVal} maxLength={40}
                  onChange={e => setFocusVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveFocus(); if (e.key === 'Escape') setEditingFocus(false); }}
                  autoFocus
                />
                <button className="tracker-submit" style={{ height: 34, padding: '0 12px', fontSize: '0.8rem' }} onClick={saveFocus}>OK</button>
                <button className="plan-cancel-btn" onClick={() => setEditingFocus(false)}>×</button>
              </div>
            ) : (
              <button className="tp-focus-btn" onClick={() => setEditingFocus(true)}>
                {day.focus ? <><span className="tp-focus-val">{day.focus}</span> ✏️</> : '+ Fokus hinzufügen (z.B. „Push Day")'}
              </button>
            )
          )}
        </div>

        {/* Restday / Training Toggle */}
        <div className="tp-type-toggle">
          <button
            className={`tp-type-btn ${day.type === 'rest' ? 'active' : ''}`}
            onClick={() => day.type !== 'rest' && onToggleType()}
          >
            💤 Ruhetag
          </button>
          <button
            className={`tp-type-btn ${day.type !== 'rest' ? 'active' : ''}`}
            onClick={() => day.type === 'rest' && onToggleType()}
          >
            🏋️ Trainingstag
          </button>
        </div>
      </div>

      {/* Rest Day */}
      {day.type === 'rest' && (
        <div className="tp-rest-placeholder">
          <span className="tp-rest-icon">💤</span>
          <p>Ruhetag – Zeit zur Erholung und Regeneration.</p>
          <button className="tp-type-btn" style={{ marginTop: 12 }} onClick={onToggleType}>
            Zu Trainingstag machen
          </button>
        </div>
      )}

      {/* Training Day */}
      {day.type !== 'rest' && (
        <>
          {/* Exercises Table */}
          {day.exercises.length > 0 && (
            <div className="tp-ex-table">
              <div className="tp-ex-head">
                <span className="tp-ex-col-name">Übung</span>
                <span className="tp-ex-col-num">Sätze</span>
                <span className="tp-ex-col-num">Wdh.</span>
                <span className="tp-ex-col-num">Gewicht</span>
                <span className="tp-ex-col-del" />
              </div>
              {day.exercises.map(ex => (
                <div key={ex.id} className="tp-ex-row">
                  <div className="tp-ex-col-name">
                    <span className="tp-ex-name">{ex.name}</span>
                    {ex.notizen && <span className="tp-ex-notes">{ex.notizen}</span>}
                  </div>
                  <span className="tp-ex-col-num tp-ex-val">{ex.saetze}×</span>
                  <span className="tp-ex-col-num tp-ex-val">{ex.wiederholungen}</span>
                  <span className="tp-ex-col-num tp-ex-val">{ex.gewicht || '—'}</span>
                  <span className="tp-ex-col-del">
                    <button className="plan-meal-delete" onClick={() => onDeleteEx(ex.id)} aria-label="Übung löschen">×</button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {day.exercises.length === 0 && !addingEx && (
            <div className="tp-ex-empty">
              <span>🏋️</span>
              <p>Noch keine Übungen für diesen Tag.</p>
            </div>
          )}

          {/* Add Exercise Form */}
          {addingEx ? (
            <form onSubmit={onAddEx} className="tp-ex-form">
              <input type="text" placeholder="Übungsname (z.B. Bankdrücken, Kniebeugen)" value={exForm.name} onChange={e => setExForm(p => ({ ...p, name: e.target.value }))} required className="tracker-input" autoFocus />
              <div className="tp-ex-form-row">
                <div className="plan-macro-field">
                  <label>Sätze</label>
                  <input type="number" min="1" placeholder="4" value={exForm.saetze} onChange={e => setExForm(p => ({ ...p, saetze: e.target.value }))} required className="tracker-input" />
                </div>
                <div className="plan-macro-field">
                  <label>Wdh.</label>
                  <input type="text" placeholder="8–12" value={exForm.wiederholungen} onChange={e => setExForm(p => ({ ...p, wiederholungen: e.target.value }))} required className="tracker-input" />
                </div>
                <div className="plan-macro-field">
                  <label>Gewicht</label>
                  <input type="text" placeholder="80 kg" value={exForm.gewicht} onChange={e => setExForm(p => ({ ...p, gewicht: e.target.value }))} className="tracker-input" />
                </div>
              </div>
              <input type="text" placeholder="Notizen (optional)" value={exForm.notizen} onChange={e => setExForm(p => ({ ...p, notizen: e.target.value }))} className="tracker-input" />
              <div className="plan-form-actions">
                <button type="submit" className="tracker-submit plan-save-btn">Hinzufügen</button>
                <button type="button" className="plan-cancel-btn" onClick={onCancelEx}>Abbrechen</button>
              </div>
            </form>
          ) : (
            <div className="tp-day-detail-footer">
              <button className="plan-add-btn" style={{ width: 'auto', padding: '6px 16px', borderRadius: 'var(--radius)' }} onClick={onStartAddEx}>
                + Übung hinzufügen
              </button>
              {day.exercises.length > 0 && (
                <button className="tp-start-btn" onClick={onStartSession}>
                  ▶ Training starten
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Legacy Day Card (alte Pläne ohne Wochenstruktur) ───────────────────────  */

function LegacyDayCard({ day, isAddingEx, exForm, setExForm, onStartAddEx, onCancelEx, onAddEx, onDeleteEx, onDeleteDay, onStartSession }) {
  return (
    <div className="tp-day-card">
      <div className="tp-day-header">
        <div>
          <h3 className="tp-day-name">{day.name}</h3>
          <span className="tp-day-meta">{day.exercises.length} Übung{day.exercises.length !== 1 ? 'en' : ''}</span>
        </div>
        <div className="tp-day-actions">
          <button className="plan-add-btn" onClick={onStartAddEx} title="Übung hinzufügen">+</button>
          <button className="plan-meal-delete" onClick={onDeleteDay} title="Tag löschen" style={{ width: 22, height: 22, fontSize: '0.9rem' }}>×</button>
        </div>
      </div>

      {day.exercises.length > 0 && (
        <div className="tp-ex-table">
          <div className="tp-ex-head">
            <span className="tp-ex-col-name">Übung</span>
            <span className="tp-ex-col-num">Sätze</span>
            <span className="tp-ex-col-num">Wdh.</span>
            <span className="tp-ex-col-num">Gewicht</span>
            <span className="tp-ex-col-del" />
          </div>
          {day.exercises.map(ex => (
            <div key={ex.id} className="tp-ex-row">
              <div className="tp-ex-col-name">
                <span className="tp-ex-name">{ex.name}</span>
                {ex.notizen && <span className="tp-ex-notes">{ex.notizen}</span>}
              </div>
              <span className="tp-ex-col-num tp-ex-val">{ex.saetze}×</span>
              <span className="tp-ex-col-num tp-ex-val">{ex.wiederholungen}</span>
              <span className="tp-ex-col-num tp-ex-val">{ex.gewicht || '—'}</span>
              <span className="tp-ex-col-del">
                <button className="plan-meal-delete" onClick={() => onDeleteEx(ex.id)} aria-label="Übung löschen">×</button>
              </span>
            </div>
          ))}
        </div>
      )}
      {day.exercises.length === 0 && !isAddingEx && <p className="tp-day-empty">Noch keine Übungen. Klicke + zum Hinzufügen.</p>}

      {isAddingEx && (
        <form onSubmit={onAddEx} className="tp-ex-form">
          <input type="text" placeholder="Übungsname" value={exForm.name} onChange={e => setExForm(p => ({ ...p, name: e.target.value }))} required className="tracker-input" autoFocus />
          <div className="tp-ex-form-row">
            <div className="plan-macro-field"><label>Sätze</label><input type="number" min="1" placeholder="4" value={exForm.saetze} onChange={e => setExForm(p => ({ ...p, saetze: e.target.value }))} required className="tracker-input" /></div>
            <div className="plan-macro-field"><label>Wdh.</label><input type="text" placeholder="8–12" value={exForm.wiederholungen} onChange={e => setExForm(p => ({ ...p, wiederholungen: e.target.value }))} required className="tracker-input" /></div>
            <div className="plan-macro-field"><label>Gewicht</label><input type="text" placeholder="80 kg" value={exForm.gewicht} onChange={e => setExForm(p => ({ ...p, gewicht: e.target.value }))} className="tracker-input" /></div>
          </div>
          <input type="text" placeholder="Notizen (optional)" value={exForm.notizen} onChange={e => setExForm(p => ({ ...p, notizen: e.target.value }))} className="tracker-input" />
          <div className="plan-form-actions">
            <button type="submit" className="tracker-submit plan-save-btn">Hinzufügen</button>
            <button type="button" className="plan-cancel-btn" onClick={onCancelEx}>Abbrechen</button>
          </div>
        </form>
      )}

      {day.exercises.length > 0 && (
        <div className="tp-day-footer">
          <button className="tp-start-btn" onClick={onStartSession}>▶ Training starten</button>
        </div>
      )}
    </div>
  );
}

/* ─── Training Session Overlay ───────────────────────────── */

function TrainingSession({ session, onComplete, onCancel }) {
  const [elapsed, setElapsed] = useState(0);
  const [sets,    setSets]    = useState(
    session.exercises.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })) }))
  );
  const [done,    setDone]    = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  function toggleSet(exIdx, setIdx) {
    setSets(prev => prev.map((ex, ei) => ei !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, done: !s.done }),
    }));
  }

  const totalSets = sets.reduce((a, ex) => a + ex.sets.length, 0);
  const doneSets  = sets.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
  const progress  = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const dauer     = Math.max(1, Math.round(elapsed / 60));
  const kalorien  = Math.round(dauer * 6);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  function handleComplete() {
    clearInterval(intervalRef.current);
    setDone(true);
    onComplete(dauer, sets);
  }

  return (
    <div className="session-overlay">
      <div className="session-modal">

        <div className="session-header">
          <div>
            <p className="session-plan">{session.planName}</p>
            <h2 className="session-day">{session.dayName}</h2>
          </div>
          <div className="session-timer">{mm}:{ss}</div>
        </div>

        <div className="session-progress-wrap">
          <div className="session-progress-bar" style={{ width: `${progress}%` }} />
          <span className="session-progress-label">{doneSets} / {totalSets} Sätze</span>
        </div>

        <div className="session-exercises">
          {sets.map((ex, ei) => (
            <div key={ex.id} className="session-ex">
              <div className="session-ex-header">
                <span className="session-ex-name">{ex.name}</span>
                {ex.gewicht && <span className="session-ex-weight">{ex.gewicht}</span>}
              </div>
              <div className="session-sets">
                {ex.sets.map((s, si) => (
                  <button
                    key={si}
                    className={`session-set-btn ${s.done ? 'done' : ''}`}
                    onClick={() => toggleSet(ei, si)}
                  >
                    <span className="session-set-num">Satz {si + 1}</span>
                    <span className="session-set-reps">{ex.wiederholungen}</span>
                    {s.done && <span className="session-set-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="session-footer">
          <div className="session-summary">
            <div className="session-stat">
              <span className="session-stat-val">{mm}:{ss}</span>
              <span className="session-stat-label">Dauer</span>
            </div>
            <div className="session-stat">
              <span className="session-stat-val">{doneSets}/{totalSets}</span>
              <span className="session-stat-label">Sätze</span>
            </div>
            <div className="session-stat">
              <span className="session-stat-val">~{kalorien}</span>
              <span className="session-stat-label">kcal</span>
            </div>
          </div>
          <div className="session-footer-btns">
            <button className="session-complete-btn" onClick={handleComplete}>Training abschließen → Tracker</button>
            <button className="session-cancel-btn" onClick={onCancel}>Abbrechen</button>
          </div>
        </div>

      </div>
    </div>
  );
}
