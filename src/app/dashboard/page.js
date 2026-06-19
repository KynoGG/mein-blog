'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';
import {
  oeffentlicheTrainingsplaene,
  oeffentlicheErnaehrungsplaene,
} from '@/data/oeffentlichePlaene';

const WeightChart = dynamic(() => import('@/components/WeightChart'), { ssr: false });

const ZIELE_KEY      = 'nutzerziele';
const ERNAEHRUNG_KEY = 'kynogg-ernaehrung';
const SPORT_KEY      = 'kynogg-sport';
const PROFIL_KEY     = 'nutzerprofil';
const VERLAUF_KEY    = 'gewichtsverlauf';
const AKTIV_T_KEY    = 'aktiver-trainingsplan';
const AKTIV_E_KEY    = 'aktiver-ernaehrungsplan';
const TRAINING_HEUTE = 'db-training-heute';
const GEGESSEN_HEUTE = 'db-gegessen-heute';

const WOCHENTAG_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MEAL_ICON    = { 'Frühstück': '🌅', 'Mittagessen': '☀️', 'Abendessen': '🌙', 'Snack': '🍎', 'Pre-Workout': '⚡', 'Post-Workout': '💪' };

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

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Guten Morgen';
  if (h >= 12 && h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function motivSatz(overallPct) {
  if (overallPct >= 100) return { text: 'Heute alles im grünen Bereich!', emoji: '💪' };
  if (overallPct >= 70)  return { text: 'Fast geschafft für heute!',       emoji: '🔥' };
  return                         { text: 'Fang stark an heute!',            emoji: '🚀' };
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
      isToday:  d.toDateString() === now.toDateString(),
      isFuture: d > endOfToday,
    };
  });
}

function calcKcalStreak(ernaehrung, zKal) {
  if (!zKal) return 0;
  const byDate = {};
  ernaehrung.forEach(e => { byDate[e.datum] = (byDate[e.datum] || 0) + (e.kalorien || 0); });
  const today = todayStr();
  const d = new Date(today + 'T00:00:00');
  if ((byDate[today] || 0) < zKal * 0.9) d.setDate(d.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if ((byDate[dateToStr(d)] || 0) >= zKal * 0.9) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function barColor(pct) {
  if (pct >= 100) return 'var(--cat-fitness)';
  if (pct >= 70)  return 'var(--cat-ernaehrung)';
  return 'var(--cat-lifestyle)';
}

function statusClass(pct) {
  if (pct >= 100) return 'done';
  if (pct >= 70)  return 'mid';
  return 'low';
}

function statusLabel(pct) {
  if (pct >= 100) return '✓ Ziel erreicht';
  if (pct >= 70)  return '~ Fast da';
  return '↓ Noch weit';
}

function MacroBar({ label, emoji, current, goal, unit, accentColor }) {
  if (!goal || goal <= 0) return null;
  const pct   = Math.min(100, Math.round((current / goal) * 100));
  const color = accentColor ?? barColor(pct);
  const cls   = statusClass(pct);
  return (
    <div className="db-bar-row">
      <div className="db-bar-meta">
        <span className="db-bar-label">{emoji} {label}</span>
        <div className="db-bar-values">
          <span className="db-bar-current" style={{ color }}>
            {Number.isInteger(current) ? current.toLocaleString('de-DE') : current.toFixed(1)}
          </span>
          <span className="db-bar-sep">/</span>
          <span className="db-bar-goal">{goal.toLocaleString('de-DE')} {unit}</span>
          <span className="db-bar-pct" style={{ color }}>{pct}%</span>
          <span className={`db-bar-status db-status-${cls}`}>{statusLabel(pct)}</span>
        </div>
      </div>
      <div className="db-bar-track">
        <div className="db-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function computeDashData() {
  try {
    const today      = todayStr();
    const ziele      = JSON.parse(localStorage.getItem(ZIELE_KEY)      || '{}');
    const profil     = JSON.parse(localStorage.getItem(PROFIL_KEY)     || '{}');
    const ernaehrung = JSON.parse(localStorage.getItem(ERNAEHRUNG_KEY) || '[]');
    const sport      = JSON.parse(localStorage.getItem(SPORT_KEY)      || '[]');
    const verlauf    = JSON.parse(localStorage.getItem(VERLAUF_KEY)    || '[]');

    const todayFood  = ernaehrung.filter(e => e.datum === today);
    const todaySport = sport.filter(e => e.datum === today);

    const weekDays        = getWeekDays();
    const trainedDates    = new Set(sport.map(e => e.datum));
    const weekTrainingSessions = sport.filter(
      e => weekDays.some(d => d.dateStr === e.datum)
    ).length;

    let weekKcalSum = 0;
    let weekDaysLogged = 0;
    weekDays.filter(d => !d.isFuture).forEach(d => {
      const dayKcal = ernaehrung
        .filter(e => e.datum === d.dateStr)
        .reduce((a, e) => a + (e.kalorien || 0), 0);
      if (dayKcal > 0) { weekKcalSum += dayKcal; weekDaysLogged++; }
    });
    const weekAvgKcal = weekDaysLogged > 0 ? Math.round(weekKcalSum / weekDaysLogged) : 0;

    const weekDayStatus = weekDays.map(d => ({
      ...d,
      trained: trainedDates.has(d.dateStr),
    }));

    const kcalStreak = calcKcalStreak(ernaehrung, parseInt(ziele.kalorien) || 0);

    // ── Gewichtsverlauf ──────────────────────────────────────────────
    // verlauf is sorted descending (newest first); take last 7, reverse to ascending
    const verlauf7asc  = verlauf.slice(0, 7).reverse();
    const verlaufNeu   = verlauf.length > 0 ? verlauf[0].gewicht : null;
    const verlaufAlt   = verlauf.length > 1
      ? verlauf[verlauf.length - 1].gewicht
      : (parseFloat(profil.gewicht) || null);
    const verlaufZiel  = parseFloat(profil.zielgewicht) || null;

    let verlaufTrend = 'stabil';
    if (verlauf7asc.length >= 2) {
      const diff = verlauf7asc[verlauf7asc.length - 1].gewicht - verlauf7asc[0].gewicht;
      if (diff < -0.2)     verlaufTrend = 'sinkend';
      else if (diff > 0.2) verlaufTrend = 'steigend';
    }

    return {
      ziele,
      profil,
      kalorien:      Math.round(todayFood.reduce((a, e) => a + (e.kalorien      || 0), 0)),
      protein:       Math.round(todayFood.reduce((a, e) => a + (e.protein       || 0), 0) * 10) / 10,
      kohlenhydrate: Math.round(todayFood.reduce((a, e) => a + (e.kohlenhydrate || 0), 0) * 10) / 10,
      fett:          Math.round(todayFood.reduce((a, e) => a + (e.fett          || 0), 0) * 10) / 10,
      sportMinuten:  todaySport.reduce((a, e) => a + (e.dauer || 0), 0),
      mahlzeiten:    todayFood.length,
      einheiten:     todaySport.length,
      weekDayStatus, weekTrainingSessions, weekAvgKcal, weekDaysLogged, kcalStreak,
      verlauf7asc, verlaufNeu, verlaufAlt, verlaufZiel, verlaufTrend,
    };
  } catch {
    return {
      ziele: {}, profil: {},
      kalorien: 0, protein: 0, kohlenhydrate: 0, fett: 0,
      sportMinuten: 0, mahlzeiten: 0, einheiten: 0,
      weekDayStatus: getWeekDays().map(d => ({ ...d, trained: false })),
      weekTrainingSessions: 0, weekAvgKcal: 0, weekDaysLogged: 0, kcalStreak: 0,
      verlauf7asc: [], verlaufNeu: null, verlaufAlt: null, verlaufZiel: null, verlaufTrend: 'stabil',
    };
  }
}

const EMPTY_FOOD  = { name: '', kalorien: '' };
const EMPTY_SPORT = { sportart: '', dauer: '' };

export default function DashboardPage() {
  const { user: _au, loading: _al } = useAuth();
  const [data,         setData]        = useState(null);
  const [foodForm,     setFoodForm]    = useState(EMPTY_FOOD);
  const [sportForm,    setSportForm]   = useState(EMPTY_SPORT);
  const [aktivTP,      setAktivTP]     = useState(null);   // active training plan object
  const [aktivEP,      setAktivEP]     = useState(null);   // active nutrition plan object
  const [selectedDay,  setSelectedDay] = useState(0);      // training day index
  const [checkedEx,    setCheckedEx]   = useState(new Set());
  const [trainingDone, setTrainingDone]= useState(false);
  const [gegessenMeals,setGegessenMeals]=useState(new Set());

  const loadData = useCallback(() => { setData(computeDashData()); }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load active plans and today's progress once on mount
  useEffect(() => {
    try {
      const today = todayStr();

      const raw = localStorage.getItem(AKTIV_T_KEY);
      if (raw) {
        let ref = null;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && parsed.source) {
            ref = parsed;
          }
        } catch {}

        let plan = null;
        if (ref?.source === 'oeffentlich') {
          plan = oeffentlicheTrainingsplaene.find(p => p.id === ref.id) ?? null;
        } else if (ref?.source === 'eigene') {
          const eigene = JSON.parse(localStorage.getItem('kynogg-trainingsplaene') || '[]');
          const eigenerPlan = eigene.find(p => p.id === ref.id);
          if (eigenerPlan) {
            // Normalize to public plan structure
            plan = {
              id:    eigenerPlan.id,
              titel: eigenerPlan.name,
              tage:  (eigenerPlan.days || []).map(d => ({
                name:     d.name,
                uebungen: (d.exercises || []).map(e => ({
                  name:           e.name,
                  saetze:         e.saetze,
                  wiederholungen: e.wiederholungen,
                  notizen:        e.notizen || '',
                })),
              })),
            };
          }
        }

        if (plan) {
          setAktivTP(plan);
          const defaultDay = (new Date().getDay() + 6) % 7 % plan.tage.length;
          setSelectedDay(defaultDay);
          const tId = ref.id;
          const th = JSON.parse(localStorage.getItem(TRAINING_HEUTE) || 'null');
          if (th?.datum === today && th?.planId === tId) setTrainingDone(true);
        }
      }

      const eRaw = localStorage.getItem(AKTIV_E_KEY);
      if (eRaw) {
        let ref = null;
        try {
          const parsed = JSON.parse(eRaw);
          if (parsed && typeof parsed === 'object' && parsed.source) ref = parsed;
        } catch {}

        let plan = null;
        if (ref?.source === 'oeffentlich') {
          plan = oeffentlicheErnaehrungsplaene.find(p => p.id === ref.id) ?? null;
        } else if (ref?.source === 'eigene') {
          const eigene = JSON.parse(localStorage.getItem('kynogg-eigene-ernaehrungsplaene') || '[]');
          const ep = eigene.find(p => p.id === ref.id);
          if (ep) {
            // Normalize to public plan structure so dashboard rendering works unchanged
            plan = {
              id:    ep.id,
              titel: ep.name,
              tage:  (ep.tage || []).map(t => ({
                wochentag:  t.name,
                mahlzeiten: (t.mahlzeiten || []).map(m => ({
                  typ:           m.typ,
                  name:          m.name,
                  kalorien:      m.kalorien,
                  protein:       m.protein,
                  kohlenhydrate: m.kohlenhydrate,
                  fett:          m.fett,
                })),
              })),
            };
          }
        }

        if (plan) {
          setAktivEP(plan);
          const g = JSON.parse(localStorage.getItem(GEGESSEN_HEUTE) || 'null');
          if (g?.datum === today) setGegessenMeals(new Set(g.mealKeys));
        }
      }
    } catch {}
  }, []);

  function handleFoodSubmit(e) {
    e.preventDefault();
    const today   = todayStr();
    const stored  = JSON.parse(localStorage.getItem(ERNAEHRUNG_KEY) || '[]');
    stored.unshift({
      id: Date.now().toString(),
      datum: today,
      name: foodForm.name.trim(),
      kalorien: parseFloat(foodForm.kalorien) || 0,
      protein: 0, kohlenhydrate: 0, fett: 0,
    });
    localStorage.setItem(ERNAEHRUNG_KEY, JSON.stringify(stored));
    setFoodForm(EMPTY_FOOD);
    loadData();
  }

  function handleSportSubmit(e) {
    e.preventDefault();
    const today  = todayStr();
    const stored = JSON.parse(localStorage.getItem(SPORT_KEY) || '[]');
    stored.unshift({
      id: Date.now().toString(),
      datum: today,
      sportart: sportForm.sportart.trim(),
      dauer: parseInt(sportForm.dauer) || 0,
      intensitaet: 'mittel',
      notizen: '',
    });
    localStorage.setItem(SPORT_KEY, JSON.stringify(stored));
    setSportForm(EMPTY_SPORT);
    loadData();
  }

  function changeDay(i) {
    setSelectedDay(i);
    setCheckedEx(new Set());
  }

  function toggleExercise(i) {
    setCheckedEx(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function handleTrainingAbschliessen() {
    if (!aktivTP) return;
    const today  = todayStr();
    const tag    = aktivTP.tage[selectedDay];
    const totalSaetze = tag.uebungen.reduce((a, u) => a + u.saetze, 0);
    const estMin = Math.min(90, Math.max(15, totalSaetze * 3));

    const stored = JSON.parse(localStorage.getItem(SPORT_KEY) || '[]');
    stored.unshift({
      id: Date.now().toString(),
      datum: today,
      sportart: `${aktivTP.titel} – ${tag.name}`,
      dauer: estMin,
      intensitaet: 'mittel',
      notizen: '',
    });
    localStorage.setItem(SPORT_KEY, JSON.stringify(stored));
    localStorage.setItem(TRAINING_HEUTE, JSON.stringify({ datum: today, planId: aktivTP.id, dayIndex: selectedDay }));
    setTrainingDone(true);
    loadData();
  }

  function handleGegessen(meal, key) {
    const today = todayStr();
    const next  = new Set(gegessenMeals);

    if (next.has(key)) {
      // Uncheck: remove from tracker entries for today matching this meal name
      const stored = JSON.parse(localStorage.getItem(ERNAEHRUNG_KEY) || '[]');
      let removed = false;
      const updated = stored.filter(e => {
        if (!removed && e.datum === today && e.name === meal.name) { removed = true; return false; }
        return true;
      });
      localStorage.setItem(ERNAEHRUNG_KEY, JSON.stringify(updated));
      next.delete(key);
    } else {
      // Check: add to tracker
      const stored = JSON.parse(localStorage.getItem(ERNAEHRUNG_KEY) || '[]');
      stored.unshift({
        id: Date.now().toString(),
        datum: today,
        name: meal.name,
        kalorien: meal.kalorien,
        protein: meal.protein,
        kohlenhydrate: meal.kohlenhydrate,
        fett: meal.fett,
      });
      localStorage.setItem(ERNAEHRUNG_KEY, JSON.stringify(stored));
      next.add(key);
    }

    setGegessenMeals(next);
    localStorage.setItem(GEGESSEN_HEUTE, JSON.stringify({ datum: today, planId: aktivEP?.id, mealKeys: [...next] }));
    loadData();
  }

  if (!data) return null;

  const { ziele } = data;
  const zKal      = parseInt(ziele.kalorien)          || 0;
  const zPro      = parseInt(ziele.protein)           || 0;
  const zKh       = parseInt(ziele.kohlenhydrate)     || 0;
  const zFett     = parseInt(ziele.fett)              || 0;
  const zMin      = parseInt(ziele.minutenProEinheit) || 0;
  const zEinheiten = parseInt(ziele.einheitenProWoche) || 0;

  const hasNutritionGoals = zKal || zPro || zKh || zFett;
  const hasSportGoal      = zMin > 0;
  const hasAnyGoal        = hasNutritionGoals || hasSportGoal || zEinheiten > 0;

  const profil     = data.profil || {};
  const greeting   = getGreeting();
  const userName   = profil.name || '';
  const daysLeft   = daysUntil(profil.zieldatum);
  const overallPct = zKal > 0
    ? Math.min(100, Math.round((data.kalorien / zKal) * 100))
    : zMin > 0 ? Math.min(100, Math.round((data.sportMinuten / zMin) * 100)) : 0;
  const motiv = motivSatz(overallPct);

  // ── Active plan helpers ──
  const todayWT        = WOCHENTAG_DE[new Date().getDay()];
  const todaysMealsDay = aktivEP
    ? (aktivEP.tage.find(t => t.wochentag === todayWT)
        ?? aktivEP.tage[(new Date().getDay() + 6) % 7 % aktivEP.tage.length])
    : null;
  const currentDayExs  = aktivTP?.tage[selectedDay]?.uebungen ?? [];
  const allChecked     = currentDayExs.length > 0 && currentDayExs.every((_, i) => checkedEx.has(i));

  const trainPct = zEinheiten > 0
    ? Math.min(100, Math.round((data.weekTrainingSessions / zEinheiten) * 100))
    : 0;
  const avgKcalPct = zKal > 0 && data.weekAvgKcal > 0
    ? Math.min(100, Math.round((data.weekAvgKcal / zKal) * 100))
    : 0;

  if (_al) return null;
  if (!_au) return <AuthGate />;

  return (
    <main className="main-content">
      <div className="tracker-page">

        {/* Page header */}
        <div className="dash-header">
          <div>
            <h1 className="kategorie-title">Mein Dashboard</h1>
            <p className="tracker-sub">{formatToday()}</p>
          </div>
          <div className="dash-header-links">
            <Link href="/tracker/ernaehrung" className="dash-link">Ernährung →</Link>
            <Link href="/tracker/sport"      className="dash-link">Sport →</Link>
            <Link href="/profil"             className="dash-link">Ziele →</Link>
          </div>
        </div>

        {!hasAnyGoal && (
          <div className="db-empty">
            <span>🎯</span>
            <p>Noch keine Ziele festgelegt.</p>
            <Link href="/profil" className="tracker-submit db-empty-btn">
              Ziele im Profil einrichten →
            </Link>
          </div>
        )}

        {hasAnyGoal && (
          <>
            {/* ── Personalized greeting ── */}
            <div className="db-greeting-card">
              <div className="db-greeting-title">
                {greeting}{userName ? `, ${userName}` : ''}! 👋
              </div>
              <div className="db-greeting-motiv">
                {motiv.emoji} {motiv.text}
              </div>
              {(profil.gewicht || daysLeft !== null) && (
                <div className="db-greeting-meta">
                  {profil.gewicht && profil.zielgewicht && (
                    <span className="db-greeting-weight">
                      ⚖️ {profil.gewicht} kg → {profil.zielgewicht} kg
                    </span>
                  )}
                  {daysLeft !== null && daysLeft >= 0 && (
                    <span className="db-greeting-days">
                      📅 Noch {daysLeft === 0 ? 'heute' : `${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'}`} bis zum Zieldatum
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Ernährung & Sport heute (nebeneinander) ── */}
            {(hasNutritionGoals || hasSportGoal) && (
              <div className="db-section">
                <div className="db-today-progress-grid">
                  {hasNutritionGoals && (
                    <div className="db-bars-card db-today-col">
                      <p className="section-label" style={{ marginBottom: 10 }}>🥗 Ernährung heute</p>
                      <MacroBar label="Kalorien"      emoji="🔥" current={data.kalorien}      goal={zKal}  unit="kcal" accentColor="var(--cat-gaming)" />
                      <MacroBar label="Protein"       emoji="💪" current={data.protein}       goal={zPro}  unit="g" />
                      <MacroBar label="Kohlenhydrate" emoji="🌾" current={data.kohlenhydrate} goal={zKh}   unit="g" />
                      <MacroBar label="Fett"          emoji="🫒" current={data.fett}          goal={zFett} unit="g" />
                      {data.mahlzeiten === 0 && (
                        <p className="db-hint" style={{ marginTop: 8 }}>
                          Noch keine Mahlzeiten eingetragen.{' '}
                          <Link href="/tracker/ernaehrung" className="db-hint-link">Jetzt eintragen →</Link>
                        </p>
                      )}
                    </div>
                  )}
                  {hasSportGoal && (() => {
                    // Plan-basierte Berechnung
                    const planTag        = aktivTP?.tage[selectedDay];
                    const uebungen       = planTag?.uebungen ?? [];
                    const doneSaetze     = trainingDone
                      ? uebungen.reduce((a, u) => a + u.saetze, 0)
                      : [...checkedEx].reduce((a, i) => a + (uebungen[i]?.saetze ?? 0), 0);
                    const totalSaetze    = uebungen.reduce((a, u) => a + u.saetze, 0);
                    const minDone        = Math.round(doneSaetze * 3);
                    const minTotal       = Math.max(zMin, Math.round(totalSaetze * 3));
                    const kcalDone       = Math.round(minDone * 6);
                    const kcalTotal      = Math.round(minTotal * 6);
                    const hasPlan        = uebungen.length > 0;

                    return (
                      <div className="db-bars-card db-today-col">
                        <p className="section-label" style={{ marginBottom: 10 }}>⚡ Sport heute</p>
                        {hasPlan ? (
                          <>
                            <MacroBar
                              label="Trainingsminuten"
                              emoji="⏱️"
                              current={minDone}
                              goal={minTotal}
                              unit="Min."
                            />
                            <MacroBar
                              label="Kcal verbrannt (ca.)"
                              emoji="🔥"
                              current={kcalDone}
                              goal={kcalTotal}
                              unit="kcal"
                              accentColor="var(--cat-fitness)"
                            />
                            {!trainingDone && doneSaetze === 0 && (
                              <p className="db-hint" style={{ marginTop: 8 }}>
                                Hake unten Übungen ab, um deinen Fortschritt zu tracken.
                              </p>
                            )}
                            {trainingDone && (
                              <p className="db-hint" style={{ marginTop: 8, color: 'var(--cat-fitness)' }}>
                                ✓ Heutiges Training abgeschlossen!
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <MacroBar label="Trainingsminuten" emoji="⏱️" current={data.sportMinuten} goal={zMin} unit="Min." />
                            {data.einheiten === 0 && (
                              <p className="db-hint" style={{ marginTop: 8 }}>
                                Noch kein Training eingetragen.{' '}
                                <Link href="/tracker/sport" className="db-hint-link">Jetzt eintragen →</Link>
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ── Heute geplant (compact overview) ── */}
            {(aktivTP || aktivEP) && (
              <div className="db-section">
                <p className="section-label">📋 Heute geplant</p>
                <div className="db-heute-grid">

                  {/* Training column */}
                  {aktivTP && aktivTP.tage[selectedDay] && (
                    <div className="db-heute-col">
                      <div className="db-heute-col-head">
                        <span className="db-heute-col-icon">🏋️</span>
                        <div className="db-heute-col-info">
                          <span className="db-heute-col-type">Training heute</span>
                          <span className="db-heute-col-sub">
                            {aktivTP.titel} · {aktivTP.tage[selectedDay].name}
                          </span>
                        </div>
                        {trainingDone && (
                          <span className="db-heute-done-pill">Fertig ✓</span>
                        )}
                      </div>
                      <div className="db-heute-items">
                        {aktivTP.tage[selectedDay].uebungen.map((ue, i) => {
                          const checked = trainingDone || checkedEx.has(i);
                          return (
                            <label
                              key={i}
                              className={`db-heute-item${checked ? ' db-heute-item-done' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleExercise(i)}
                                className="db-heute-check"
                                disabled={trainingDone}
                              />
                              <span className="db-heute-item-text">
                                <span className="db-heute-item-name">{ue.name}</span>
                                <span className="db-heute-item-meta">
                                  {ue.saetze}×{ue.wiederholungen}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Nutrition column */}
                  {aktivEP && todaysMealsDay && (
                    <div className="db-heute-col">
                      <div className="db-heute-col-head">
                        <span className="db-heute-col-icon">🥗</span>
                        <div className="db-heute-col-info">
                          <span className="db-heute-col-type">
                            Essen heute ({todaysMealsDay.wochentag})
                          </span>
                          <span className="db-heute-col-sub">{aktivEP.titel}</span>
                        </div>
                      </div>
                      <div className="db-heute-items">
                        {todaysMealsDay.mahlzeiten.map((meal, i) => {
                          const key   = `${aktivEP.id}:${todaysMealsDay.wochentag}:${i}`;
                          const eaten = gegessenMeals.has(key);
                          return (
                            <label
                              key={i}
                              className={`db-heute-item${eaten ? ' db-heute-item-done' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={eaten}
                                onChange={() => handleGegessen(meal, key)}
                                className="db-heute-check"
                              />
                              <span className="db-heute-item-text">
                                <span className="db-heute-item-name">
                                  {MEAL_ICON[meal.typ] ?? '🍽️'} {meal.typ}: {meal.name}
                                </span>
                                <span className="db-heute-item-meta">{meal.kalorien} kcal</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ── Weekly overview ── */}
            <div className="db-section">
              <p className="section-label">📅 Diese Woche</p>
              <div className="db-week-card">

                {/* Day training dots */}
                <div className="db-week-dots">
                  {data.weekDayStatus.map(day => (
                    <div key={day.dateStr} className={`db-week-day${day.isToday ? ' db-week-today' : ''}`}>
                      <span className="db-week-day-label">{day.short}</span>
                      <span className={`db-week-dot${
                        day.isFuture  ? ' db-dot-future'
                        : day.trained ? ' db-dot-done'
                        :               ' db-dot-miss'
                      }`}>
                        {!day.isFuture && (day.trained ? '✓' : '○')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Weekly stats */}
                <div className="db-week-stats-row">

                  <div className="db-week-stat-box">
                    <div className="db-wstat-top">
                      <span className="db-wstat-val" style={{ color: trainPct >= 100 ? 'var(--cat-fitness)' : trainPct >= 70 ? 'var(--cat-ernaehrung)' : 'var(--text)' }}>
                        {data.weekTrainingSessions}
                      </span>
                      {zEinheiten > 0 && (
                        <span className="db-wstat-goal">/ {zEinheiten} Einheiten</span>
                      )}
                    </div>
                    <span className="db-wstat-label">Training diese Woche</span>
                    {zEinheiten > 0 && (
                      <div className="db-week-mini-bar">
                        <div className="db-week-mini-fill" style={{ width: `${trainPct}%`, background: barColor(trainPct) }} />
                      </div>
                    )}
                  </div>

                  <div className="db-week-stat-box">
                    <div className="db-wstat-top">
                      <span className="db-wstat-val" style={{ color: avgKcalPct > 0 ? barColor(avgKcalPct) : 'var(--text)' }}>
                        {data.weekAvgKcal > 0 ? data.weekAvgKcal.toLocaleString('de-DE') : '–'}
                      </span>
                      {zKal > 0 && <span className="db-wstat-goal">/ {zKal.toLocaleString('de-DE')} kcal</span>}
                    </div>
                    <span className="db-wstat-label">
                      Ø Kalorien / Tag
                      {data.weekDaysLogged > 0 && (
                        <span className="db-wstat-sub"> ({data.weekDaysLogged} Tage)</span>
                      )}
                    </span>
                    {zKal > 0 && data.weekAvgKcal > 0 && (
                      <div className="db-week-mini-bar">
                        <div className="db-week-mini-fill" style={{ width: `${avgKcalPct}%`, background: barColor(avgKcalPct) }} />
                      </div>
                    )}
                  </div>

                  <div className="db-week-stat-box db-streak-box">
                    <div className="db-wstat-top">
                      <span className="db-streak-num">
                        {data.kcalStreak > 0 ? '🔥' : '💤'}&thinsp;{data.kcalStreak}
                      </span>
                    </div>
                    <span className="db-wstat-label">
                      {data.kcalStreak === 1 ? 'Tag Streak' : 'Tage Streak'}
                    </span>
                    <span className="db-streak-sub">Kalorienziel eingehalten</span>
                  </div>

                </div>
              </div>
            </div>

            {/* ── Gewichtsfortschritt ── */}
            {data.verlauf7asc.length > 0 && (
              <WeightSection data={data} />
            )}
          </>
        )}

      </div>
    </main>
  );
}

const TREND_CFG = {
  sinkend:  { icon: '↘', label: 'Sinkend',  color: 'var(--cat-fitness)' },
  steigend: { icon: '↗', label: 'Steigend', color: 'var(--cat-ernaehrung)' },
  stabil:   { icon: '→', label: 'Stabil',   color: 'var(--text-muted)' },
};

function WeightSection({ data }) {
  const trend = TREND_CFG[data.verlaufTrend] || TREND_CFG.stabil;
  return (
    <div className="db-section">
      <p className="section-label">⚖️ Gewichtsfortschritt</p>
      <div className="db-weight-card">

        {/* Stats row */}
        <div className="db-weight-stats">
          <div className="db-weight-stat">
            <p className="db-weight-stat-label">Trend</p>
            <p className="db-weight-stat-val" style={{ color: trend.color }}>
              {trend.icon} {trend.label}
            </p>
          </div>
          <div className="db-weight-stat">
            <p className="db-weight-stat-label">Start</p>
            <p className="db-weight-stat-val">
              {data.verlaufAlt !== null ? `${data.verlaufAlt} kg` : '–'}
            </p>
          </div>
          <div className="db-weight-stat">
            <p className="db-weight-stat-label">Aktuell</p>
            <p className="db-weight-stat-val" style={{ color: 'var(--accent)' }}>
              {data.verlaufNeu !== null ? `${data.verlaufNeu} kg` : '–'}
            </p>
          </div>
          <div className="db-weight-stat">
            <p className="db-weight-stat-label">Ziel</p>
            <p className="db-weight-stat-val" style={{ color: 'var(--cat-fitness)' }}>
              {data.verlaufZiel !== null ? `${data.verlaufZiel} kg` : '–'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="db-weight-legend">
          <span className="db-weight-legend-item">
            <span className="db-weight-legend-dot" style={{ background: 'var(--accent)' }} />
            Gewicht
          </span>
          {data.verlaufZiel !== null && (
            <span className="db-weight-legend-item">
              <span className="db-weight-legend-line" style={{ background: 'var(--cat-fitness)' }} />
              Ziel {data.verlaufZiel} kg
            </span>
          )}
        </div>

        {/* Chart */}
        <WeightChart entries={data.verlauf7asc} zielgewicht={data.verlaufZiel} />

        {data.verlauf7asc.length < 7 && (
          <p className="db-hint" style={{ marginTop: '10px' }}>
            {data.verlauf7asc.length === 1
              ? 'Erst ein Eintrag – trage mehr ein, um den Verlauf zu sehen.'
              : `${data.verlauf7asc.length} von 7 Einträgen.`}{' '}
            <Link href="/profil" className="db-hint-link">Gewicht eintragen →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
