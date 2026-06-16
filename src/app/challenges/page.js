'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

/* ── Constants ──────────────────────────────────────────────────────────── */
const CHALLENGE_TYPES = [
  { key: 'steps',    label: 'Schritte sammeln',   icon: '👟', einheit: 'Schritte',  placeholder: '50000' },
  { key: 'minutes',  label: 'Trainingsminuten',    icon: '⏱️', einheit: 'Minuten',   placeholder: '300'   },
  { key: 'calories', label: 'Kalorienverbrauch',   icon: '🔥', einheit: 'kcal',      placeholder: '5000'  },
  { key: 'weights',  label: 'Gewichtstraining',    icon: '🏋️', einheit: 'Einheiten', placeholder: '10'    },
  { key: 'cardio',   label: 'Cardio-Challenge',    icon: '🏃', einheit: 'km',        placeholder: '50'    },
  { key: 'custom',   label: 'Eigene Challenge',    icon: '⭐', einheit: 'Punkte',    placeholder: '100'   },
];

const DEMO_FRIENDS = [
  { id: 'f-alex',  name: 'Alex Müller',  username: 'alex_kynogg', statusText: 'Heute aktiv',                  initials: 'AM' },
  { id: 'f-sarah', name: 'Sarah Koch',   username: 'sarah_k',     statusText: '3 Workouts diese Woche',        initials: 'SK' },
  { id: 'f-max',   name: 'Max Becker',   username: 'max_b',       statusText: 'Läuft aktuell eine Challenge',  initials: 'MB' },
  { id: 'f-jana',  name: 'Jana Wolf',    username: 'jana_w',      statusText: 'Offline',                       initials: 'JW' },
  { id: 'f-tom',   name: 'Tom Richter',  username: 'tom_r',       statusText: '2 Workouts diese Woche',        initials: 'TR' },
];

const SEED_CHALLENGES = [
  {
    id: 'seed-c1',
    typ: 'steps', name: '7-Tage-Schritte-Battle',
    beschreibung: 'Wer schafft in 7 Tagen die meisten Schritte?',
    startdatum: '2026-06-08', enddatum: '2026-06-21',
    zielwert: 50000, zielEinheit: 'Schritte', sichtbarkeit: 'privat',
    ersteller: 'me', erstellerName: 'Du',
    teilnehmer: [
      { id: 'me',      name: 'Du',           initials: 'Du', fortschritt: 32400 },
      { id: 'f-alex',  name: 'Alex Müller',  initials: 'AM', fortschritt: 38900 },
      { id: 'f-sarah', name: 'Sarah Koch',   initials: 'SK', fortschritt: 21000 },
    ],
    status: 'aktiv', erstellt: '2026-06-08T08:00:00Z',
  },
  {
    id: 'seed-c2',
    typ: 'cardio', name: 'Juni Cardio-Month',
    beschreibung: '100 km laufen im Juni – schaffst du es?',
    startdatum: '2026-06-01', enddatum: '2026-06-30',
    zielwert: 100, zielEinheit: 'km', sichtbarkeit: 'freundesliste',
    ersteller: 'f-max', erstellerName: 'Max Becker',
    teilnehmer: [
      { id: 'me',     name: 'Du',          initials: 'Du', fortschritt: 34 },
      { id: 'f-max',  name: 'Max Becker',  initials: 'MB', fortschritt: 51 },
      { id: 'f-tom',  name: 'Tom Richter', initials: 'TR', fortschritt: 28 },
      { id: 'f-jana', name: 'Jana Wolf',   initials: 'JW', fortschritt: 42 },
    ],
    status: 'aktiv', erstellt: '2026-06-01T09:00:00Z',
  },
  {
    id: 'seed-c3',
    typ: 'minutes', name: 'Mai Trainings-Sprint',
    beschreibung: '300 Trainingsminuten im Mai',
    startdatum: '2026-05-01', enddatum: '2026-05-31',
    zielwert: 300, zielEinheit: 'Minuten', sichtbarkeit: 'privat',
    ersteller: 'me', erstellerName: 'Du',
    teilnehmer: [
      { id: 'me',      name: 'Du',           initials: 'Du', fortschritt: 300 },
      { id: 'f-sarah', name: 'Sarah Koch',   initials: 'SK', fortschritt: 285 },
    ],
    status: 'abgeschlossen', erstellt: '2026-05-01T07:00:00Z',
  },
];

const SEED_INVITATIONS = [
  {
    id: 'seed-inv1',
    challengeId: 'seed-inv-c1',
    challengeName: 'Kalorien-Burner Juni',
    vonId: 'f-jana', vonName: 'Jana Wolf',
    anId: 'me',
    zeitraum: { start: '2026-06-15', end: '2026-06-30' },
    ziel: 8000, zielEinheit: 'kcal',
    typ: 'calories',
    teilnehmer: ['Jana Wolf', 'Du', 'Tom Richter'],
    status: 'offen',
    erstellt: '2026-06-14T10:00:00Z',
  },
];

const LS_CHALLENGES   = 'livora-challenges';
const LS_INVITATIONS  = 'livora-challenge-invitations';
const LS_FRIENDS      = 'livora-friends';

/* ── Helpers ────────────────────────────────────────────────────────────── */
function ls(key, fb) { try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } }
function lsSave(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

function getMe() {
  try {
    const p = JSON.parse(localStorage.getItem('nutzerprofil') || '{}');
    return { id: 'me', name: p.name || 'Du', initials: (p.name||'Du').slice(0,2).toUpperCase() };
  } catch { return { id: 'me', name: 'Du', initials: 'Du' }; }
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysLeft(end) {
  const d = Math.ceil((new Date(end) - Date.now()) / 86400000);
  return Math.max(0, d);
}

function pct(val, max) { return max > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0; }

function fmtNum(n) { return n?.toLocaleString('de-DE') ?? '0'; }

function avatarColor(name) {
  const palette = ['#6BAF7E','#A788FA','#F5A623','#E8506A','#4DB8FF','#F06292'];
  return palette[(name?.charCodeAt(0) || 0) % palette.length];
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function Avatar({ name, initials, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.36),
      flexShrink: 0, fontFamily: "'Plus Jakarta Sans',sans-serif",
      letterSpacing: '0.01em',
    }}>
      {(initials || name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

function TypeIcon({ typ, size = 28 }) {
  const t = CHALLENGE_TYPES.find(c => c.key === typ);
  return <span style={{ fontSize: size }}>{t?.icon ?? '🏆'}</span>;
}

function StatusBadge({ status }) {
  const map = {
    aktiv:          { label: 'Aktiv',          bg: 'var(--cat-fitness-bg)',    color: 'var(--cat-fitness)' },
    ausstehend:     { label: 'Ausstehend',      bg: 'var(--cat-ki-bg)',         color: 'var(--accent-2)'    },
    abgeschlossen:  { label: 'Abgeschlossen',   bg: 'var(--cat-ernaehrung-bg)', color: '#8A9BA5'            },
    offen:          { label: 'Einladung',        bg: 'var(--cat-ki-bg)',         color: 'var(--accent-2)'    },
  };
  const s = map[status] || map.aktiv;
  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

function MiniBar({ val, max, color = 'var(--accent)' }) {
  return (
    <div className="ch-bar-track">
      <div className="ch-bar-fill" style={{ width: `${pct(val, max)}%`, background: color }} />
    </div>
  );
}

/* ── CSS ────────────────────────────────────────────────────────────────── */
const css = `
.ch-page { max-width: 860px; margin: 0 auto; padding: 32px 20px 60px; }

/* header */
.ch-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
.ch-hdr-title { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 1.875rem; font-weight: 800; color: var(--text); margin: 0 0 4px; }
.ch-hdr-sub { font-size: 0.9375rem; color: var(--text-muted); margin: 0; }
.ch-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm);
  font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 700; font-size: 0.9375rem;
  padding: 10px 20px; cursor: pointer; white-space: nowrap; transition: opacity .15s;
}
.ch-btn-primary:hover { opacity: .88; }

/* tabs */
.ch-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 2px solid var(--border); }
.ch-tab {
  padding: 8px 18px 10px; background: none; border: none; cursor: pointer;
  font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 600; font-size: 0.875rem;
  color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: color .15s, border-color .15s;
}
.ch-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.ch-tab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; border-radius: 999px; padding: 0 5px;
  background: var(--accent); color: #fff; font-size: 0.6875rem; font-weight: 700;
  margin-left: 6px;
}

/* cards grid */
.ch-grid { display: grid; gap: 14px; }

.ch-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 20px 22px; cursor: pointer; transition: border-color .15s, transform .12s;
  text-decoration: none; color: inherit;
}
.ch-card:hover { border-color: var(--accent); transform: translateY(-1px); }

.ch-card-top { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
.ch-card-icon {
  width: 48px; height: 48px; border-radius: 12px; background: var(--cat-fitness-bg);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 1.5rem;
}
.ch-card-meta { flex: 1; min-width: 0; }
.ch-card-name { font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 700; font-size: 1rem; margin: 0 0 4px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ch-card-desc { font-size: 0.825rem; color: var(--text-muted); margin: 0 0 8px; }
.ch-card-badges { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.ch-card-progress { margin-bottom: 14px; }
.ch-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px; }
.ch-bar-track { height: 7px; background: var(--bg-card-hover); border-radius: 999px; overflow: hidden; }
.ch-bar-fill { height: 100%; border-radius: 999px; transition: width .4s ease; }

.ch-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ch-avatars { display: flex; }
.ch-avatars > div { margin-left: -8px; border: 2px solid var(--bg-card); border-radius: 50%; }
.ch-avatars > div:first-child { margin-left: 0; }
.ch-footer-meta { font-size: 0.75rem; color: var(--text-muted); }

/* empty state */
.ch-empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.ch-empty-icon { font-size: 3rem; margin-bottom: 12px; }
.ch-empty h3 { font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 700; font-size: 1.125rem; color: var(--text); margin: 0 0 6px; }
.ch-empty p { font-size: 0.9rem; margin: 0; }

/* invitation cards */
.ch-inv-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 20px 22px;
}
.ch-inv-card + .ch-inv-card { margin-top: 14px; }
.ch-inv-top { display: flex; gap: 14px; margin-bottom: 16px; align-items: flex-start; }
.ch-inv-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--cat-ki-bg); display: flex; align-items: center; justify-content: center; font-size: 1.375rem; flex-shrink: 0; }
.ch-inv-title { font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 700; font-size: 1rem; color: var(--text); margin: 0 0 3px; }
.ch-inv-from { font-size: 0.825rem; color: var(--text-muted); margin: 0 0 8px; }
.ch-inv-details { display: grid; grid-template-columns: repeat(auto-fill,minmax(140px,1fr)); gap: 10px; margin-bottom: 16px; }
.ch-inv-detail { background: var(--bg-card-hover); border-radius: var(--radius-sm); padding: 10px 12px; }
.ch-inv-detail-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); margin-bottom: 3px; }
.ch-inv-detail-val { font-size: 0.9rem; font-weight: 700; color: var(--text); }
.ch-inv-actions { display: flex; gap: 10px; }
.ch-btn-accept { background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); padding: 9px 20px; font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: opacity .15s; }
.ch-btn-accept:hover { opacity: .85; }
.ch-btn-decline { background: var(--bg-card-hover); color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 9px 20px; font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background .15s; }
.ch-btn-decline:hover { background: var(--border); }

/* detail view */
.ch-detail { animation: fadeIn .2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.ch-detail-back { background: none; border: none; cursor: pointer; color: var(--text-muted); font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 600; font-size: 0.875rem; padding: 0; margin-bottom: 20px; display: flex; align-items: center; gap: 6px; transition: color .15s; }
.ch-detail-back:hover { color: var(--accent); }

.ch-detail-hero {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 24px 26px; margin-bottom: 20px;
}
.ch-detail-hero-top { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.ch-detail-icon { width: 60px; height: 60px; border-radius: 14px; background: var(--cat-fitness-bg); display: flex; align-items: center; justify-content: center; font-size: 1.875rem; flex-shrink: 0; }
.ch-detail-name { font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 800; font-size: 1.375rem; color: var(--text); margin: 0 0 4px; }
.ch-detail-desc { font-size: 0.9rem; color: var(--text-muted); margin: 0 0 10px; }

.ch-detail-stats { display: grid; grid-template-columns: repeat(auto-fill,minmax(130px,1fr)); gap: 12px; margin-top: 20px; }
.ch-detail-stat { background: var(--bg-card-hover); border-radius: var(--radius-sm); padding: 12px 14px; }
.ch-detail-stat-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); margin-bottom: 4px; }
.ch-detail-stat-val { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 1.1rem; font-weight: 800; color: var(--text); }

.ch-detail-progress-label { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }
.ch-detail-bar-track { height: 10px; background: var(--bg-card-hover); border-radius: 999px; overflow: hidden; margin-bottom: 6px; }
.ch-detail-bar-fill { height: 100%; border-radius: 999px; background: var(--accent); transition: width .5s ease; }

/* status banner */
.ch-status-banner {
  background: var(--cat-fitness-bg); border: 1px solid var(--border);
  border-left: 4px solid var(--accent); border-radius: var(--radius-sm);
  padding: 12px 16px; font-size: 0.9rem; font-weight: 600; color: var(--accent);
  margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
}

/* leaderboard */
.ch-leaderboard { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.ch-lb-header { padding: 16px 20px; border-bottom: 1px solid var(--border); font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 700; font-size: 1rem; color: var(--text); }
.ch-lb-row { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid var(--border); transition: background .12s; }
.ch-lb-row:last-child { border-bottom: none; }
.ch-lb-row.is-me { background: var(--bg-card-hover); }
.ch-lb-rank { font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 800; font-size: 1rem; color: var(--text-muted); width: 24px; text-align: center; flex-shrink: 0; }
.ch-lb-rank.gold   { color: #F5A623; }
.ch-lb-rank.silver { color: #A0A0B0; }
.ch-lb-rank.bronze { color: #C87941; }
.ch-lb-info { flex: 1; min-width: 0; }
.ch-lb-name { font-weight: 700; font-size: 0.9rem; color: var(--text); margin-bottom: 5px; display: flex; align-items: center; gap: 8px; }
.ch-lb-name-you { font-size: 0.7rem; background: var(--accent); color: #fff; padding: 1px 6px; border-radius: 999px; font-weight: 700; }
.ch-lb-bar { display: flex; align-items: center; gap: 10px; }
.ch-lb-bar-track { flex: 1; height: 6px; background: var(--bg-card-hover); border-radius: 999px; overflow: hidden; }
.ch-lb-bar-fill { height: 100%; border-radius: 999px; transition: width .5s ease; }
.ch-lb-val { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); white-space: nowrap; }

/* modal overlay */
.ch-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.55); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.ch-modal {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius); width: 100%; max-width: 680px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 24px 60px rgba(0,0,0,.3);
}
.ch-modal-hdr {
  padding: 22px 24px 18px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
}
.ch-modal-title { font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 800; font-size: 1.125rem; color: var(--text); margin: 0; }
.ch-modal-close { background: var(--bg-card-hover); border: 1px solid var(--border); border-radius: var(--radius-sm); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); font-size: 1rem; transition: background .15s; }
.ch-modal-close:hover { background: var(--border); color: var(--text); }
.ch-modal-body { flex: 1; overflow-y: auto; padding: 22px 24px; }
.ch-modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0; }

/* form elements */
.ch-field { margin-bottom: 18px; }
.ch-label { display: block; font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 600; font-size: 0.8125rem; color: var(--text); margin-bottom: 6px; }
.ch-label span { color: var(--accent); }
.ch-input, .ch-textarea, .ch-select {
  width: 100%; padding: 10px 13px; font-family: 'Plus Jakarta Sans',sans-serif;
  font-size: 0.9rem; color: var(--text); background: var(--bg);
  border: 1.5px solid var(--border); border-radius: var(--radius-sm);
  outline: none; transition: border-color .15s; box-sizing: border-box;
}
.ch-input:focus, .ch-textarea:focus, .ch-select:focus { border-color: var(--accent); }
.ch-input.error, .ch-textarea.error { border-color: #E8506A; }
.ch-textarea { resize: vertical; min-height: 72px; }
.ch-error-msg { font-size: 0.775rem; color: #E8506A; margin-top: 5px; font-weight: 500; }

.ch-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ch-goal-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: end; }
.ch-goal-unit { padding: 10px 13px; background: var(--bg-card-hover); border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: 0.875rem; font-weight: 600; color: var(--text-muted); white-space: nowrap; }

/* type selector */
.ch-type-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 4px; }
.ch-type-btn {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 12px 8px; border-radius: var(--radius-sm); cursor: pointer;
  border: 1.5px solid var(--border); background: var(--bg);
  transition: border-color .15s, background .15s;
}
.ch-type-btn:hover { border-color: var(--accent); background: var(--bg-card-hover); }
.ch-type-btn.selected { border-color: var(--accent); background: var(--cat-fitness-bg); }
.ch-type-icon { font-size: 1.375rem; }
.ch-type-label { font-size: 0.7rem; font-weight: 700; color: var(--text); text-align: center; line-height: 1.25; }

/* visibility radio */
.ch-radio-group { display: flex; gap: 10px; }
.ch-radio-btn {
  flex: 1; display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  border: 1.5px solid var(--border); border-radius: var(--radius-sm); cursor: pointer;
  background: var(--bg); transition: border-color .15s, background .15s;
}
.ch-radio-btn.selected { border-color: var(--accent); background: var(--cat-fitness-bg); }
.ch-radio-dot {
  width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--border);
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  transition: border-color .15s;
}
.ch-radio-btn.selected .ch-radio-dot { border-color: var(--accent); background: var(--accent); }
.ch-radio-dot::after { content:''; width:6px; height:6px; border-radius:50%; background:#fff; display:none; }
.ch-radio-btn.selected .ch-radio-dot::after { display:block; }
.ch-radio-label { font-size: 0.875rem; font-weight: 600; color: var(--text); }
.ch-radio-sub { font-size: 0.725rem; color: var(--text-muted); }

/* friend selector */
.ch-friend-search { margin-bottom: 10px; }
.ch-friend-list { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; }
.ch-friend-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border: 1.5px solid var(--border); border-radius: var(--radius-sm);
  cursor: pointer; background: var(--bg); transition: border-color .15s, background .15s;
}
.ch-friend-item.selected { border-color: var(--accent); background: var(--cat-fitness-bg); }
.ch-friend-info { flex: 1; min-width: 0; }
.ch-friend-name { font-weight: 700; font-size: 0.875rem; color: var(--text); }
.ch-friend-status { font-size: 0.75rem; color: var(--text-muted); }
.ch-friend-check {
  width: 20px; height: 20px; border-radius: 6px; border: 2px solid var(--border);
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  transition: border-color .15s, background .15s; font-size: 0.75rem; color: #fff;
}
.ch-friend-item.selected .ch-friend-check { background: var(--accent); border-color: var(--accent); }

.ch-btn-cancel { background: var(--bg-card-hover); color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 9px 20px; font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background .15s; }
.ch-btn-cancel:hover { background: var(--border); }

.ch-section-title { font-family: 'Plus Jakarta Sans',sans-serif; font-weight: 700; font-size: 1rem; color: var(--text); margin: 24px 0 14px; }

@media (max-width: 560px) {
  .ch-type-grid { grid-template-columns: repeat(2,1fr); }
  .ch-date-row  { grid-template-columns: 1fr; }
  .ch-radio-group { flex-direction: column; }
  .ch-detail-stats { grid-template-columns: repeat(2,1fr); }
  .ch-hdr { flex-direction: column; }
}
`;

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function ChallengePage() {
  const { user: _au, loading: _al } = useAuth();
  const [challenges,   setChallenges]   = useState([]);
  const [invitations,  setInvitations]  = useState([]);
  const [friends,      setFriends]      = useState([]);
  const [tab,          setTab]          = useState('aktiv');   // aktiv | einladungen | abgeschlossen
  const [showCreate,   setShowCreate]   = useState(false);
  const [detailId,     setDetailId]     = useState(null);
  const me = getMe();

  /* seed + load */
  useEffect(() => {
    // seed friends
    let f = ls(LS_FRIENDS, null);
    if (!f) { lsSave(LS_FRIENDS, DEMO_FRIENDS); f = DEMO_FRIENDS; }
    setFriends(f);

    // seed challenges
    let c = ls(LS_CHALLENGES, null);
    if (!c) { lsSave(LS_CHALLENGES, SEED_CHALLENGES); c = SEED_CHALLENGES; }
    setChallenges(c);

    // seed invitations
    let inv = ls(LS_INVITATIONS, null);
    if (!inv) { lsSave(LS_INVITATIONS, SEED_INVITATIONS); inv = SEED_INVITATIONS; }
    setInvitations(inv);
  }, []);

  const aktiv         = challenges.filter(c => c.status === 'aktiv');
  const abgeschlossen = challenges.filter(c => c.status === 'abgeschlossen');
  const offeneInvs    = invitations.filter(i => i.anId === 'me' && i.status === 'offen');

  /* create challenge */
  function handleCreate(data) {
    const newC = {
      id: `c-${Date.now()}`,
      ...data,
      ersteller: 'me', erstellerName: me.name,
      teilnehmer: [
        { id: 'me', name: me.name, initials: me.initials, fortschritt: 0 },
        ...data.freunde.map(f => ({ id: f.id, name: f.name, initials: f.initials, fortschritt: 0 })),
      ],
      status: 'aktiv',
      erstellt: new Date().toISOString(),
    };
    const updated = [...challenges, newC];
    setChallenges(updated);
    lsSave(LS_CHALLENGES, updated);

    // send invitations
    const newInvs = data.freunde.map(f => ({
      id: `inv-${Date.now()}-${f.id}`,
      challengeId: newC.id, challengeName: newC.name,
      vonId: 'me', vonName: me.name,
      anId: f.id,
      zeitraum: { start: newC.startdatum, end: newC.enddatum },
      ziel: newC.zielwert, zielEinheit: newC.zielEinheit, typ: newC.typ,
      teilnehmer: newC.teilnehmer.map(t => t.name),
      status: 'offen', erstellt: new Date().toISOString(),
    }));
    const updatedInvs = [...invitations, ...newInvs];
    setInvitations(updatedInvs);
    lsSave(LS_INVITATIONS, updatedInvs);
    setShowCreate(false);
  }

  /* invitation actions */
  function handleInvitation(id, action) {
    const updated = invitations.map(i => i.id === id ? { ...i, status: action } : i);
    setInvitations(updated);
    lsSave(LS_INVITATIONS, updated);
  }

  const detail = detailId ? challenges.find(c => c.id === detailId) : null;

  if (_al) return null;
  if (!_au) return <AuthGate />;

  return (
    <>
      <style>{css}</style>
      <div className="main-content">
        <div className="ch-page">
          {detail ? (
            <DetailView
              challenge={detail}
              onBack={() => setDetailId(null)}
            />
          ) : (
            <>
              {/* Header */}
              <div className="ch-hdr">
                <div>
                  <h1 className="ch-hdr-title">🏆 Fitness-Challenges</h1>
                  <p className="ch-hdr-sub">Fordere deine Freunde heraus, erreiche gemeinsame Ziele und bleib motiviert.</p>
                </div>
                <button className="ch-btn-primary" onClick={() => setShowCreate(true)}>
                  + Neue Challenge erstellen
                </button>
              </div>

              {/* Tabs */}
              <div className="ch-tabs">
                {[
                  { key: 'aktiv',         label: 'Aktiv',          count: aktiv.length         },
                  { key: 'einladungen',   label: 'Einladungen',    count: offeneInvs.length    },
                  { key: 'abgeschlossen', label: 'Abgeschlossen',  count: abgeschlossen.length },
                ].map(t => (
                  <button
                    key={t.key}
                    className={`ch-tab${tab === t.key ? ' active' : ''}`}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label}
                    {t.count > 0 && <span className="ch-tab-badge">{t.count}</span>}
                  </button>
                ))}
              </div>

              {/* Content */}
              {tab === 'aktiv' && (
                <div className="ch-grid">
                  {aktiv.length === 0
                    ? <EmptyState icon="🏅" title="Keine aktiven Challenges" text="Erstelle eine neue Challenge und fordere deine Freunde heraus!" />
                    : aktiv.map(c => <ChallengeCard key={c.id} challenge={c} onClick={() => setDetailId(c.id)} />)
                  }
                </div>
              )}

              {tab === 'einladungen' && (
                <div>
                  {offeneInvs.length === 0
                    ? <EmptyState icon="📬" title="Keine Einladungen" text="Du hast aktuell keine offenen Challenge-Einladungen." />
                    : offeneInvs.map(inv => (
                        <InvitationCard key={inv.id} inv={inv} onAction={handleInvitation} />
                      ))
                  }
                </div>
              )}

              {tab === 'abgeschlossen' && (
                <div className="ch-grid">
                  {abgeschlossen.length === 0
                    ? <EmptyState icon="🎖️" title="Noch keine abgeschlossenen Challenges" text="Abgeschlossene Challenges erscheinen hier." />
                    : abgeschlossen.map(c => <ChallengeCard key={c.id} challenge={c} onClick={() => setDetailId(c.id)} />)
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateModal
          friends={friends}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </>
  );
}

/* ── ChallengeCard ──────────────────────────────────────────────────────── */
function ChallengeCard({ challenge: c, onClick }) {
  const myEntry  = c.teilnehmer.find(t => t.id === 'me');
  const myPct    = pct(myEntry?.fortschritt ?? 0, c.zielwert);
  const dLeft    = daysLeft(c.enddatum);
  const typConf  = CHALLENGE_TYPES.find(t => t.key === c.typ);

  return (
    <div className="ch-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key==='Enter'&&onClick()}>
      <div className="ch-card-top">
        <div className="ch-card-icon"><TypeIcon typ={c.typ} size={26} /></div>
        <div className="ch-card-meta">
          <p className="ch-card-name">{c.name}</p>
          <p className="ch-card-desc">{c.beschreibung}</p>
          <div className="ch-card-badges">
            <StatusBadge status={c.status} />
            {c.status === 'aktiv' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Noch {dLeft} {dLeft === 1 ? 'Tag' : 'Tage'}
              </span>
            )}
          </div>
        </div>
      </div>

      {myEntry && (
        <div className="ch-card-progress">
          <div className="ch-progress-label">
            <span>Dein Fortschritt</span>
            <span>{fmtNum(myEntry.fortschritt)} / {fmtNum(c.zielwert)} {c.zielEinheit}</span>
          </div>
          <MiniBar val={myEntry.fortschritt} max={c.zielwert} />
        </div>
      )}

      <div className="ch-card-footer">
        <div className="ch-avatars">
          {c.teilnehmer.slice(0, 4).map(t => (
            <Avatar key={t.id} name={t.name} initials={t.initials} size={28} />
          ))}
        </div>
        <span className="ch-footer-meta">
          {c.teilnehmer.length} Teilnehmer · {fmtDate(c.startdatum)} – {fmtDate(c.enddatum)}
        </span>
      </div>
    </div>
  );
}

/* ── InvitationCard ─────────────────────────────────────────────────────── */
function InvitationCard({ inv, onAction }) {
  const typConf = CHALLENGE_TYPES.find(t => t.key === inv.typ);
  return (
    <div className="ch-inv-card">
      <div className="ch-inv-top">
        <div className="ch-inv-icon">{typConf?.icon ?? '🏆'}</div>
        <div>
          <p className="ch-inv-title">{inv.challengeName}</p>
          <p className="ch-inv-from">Einladung von <strong>{inv.vonName}</strong></p>
          <StatusBadge status="offen" />
        </div>
      </div>

      <div className="ch-inv-details">
        <div className="ch-inv-detail">
          <div className="ch-inv-detail-label">Zeitraum</div>
          <div className="ch-inv-detail-val">{fmtDate(inv.zeitraum.start)} – {fmtDate(inv.zeitraum.end)}</div>
        </div>
        <div className="ch-inv-detail">
          <div className="ch-inv-detail-label">Ziel</div>
          <div className="ch-inv-detail-val">{fmtNum(inv.ziel)} {inv.zielEinheit}</div>
        </div>
        <div className="ch-inv-detail">
          <div className="ch-inv-detail-label">Teilnehmer</div>
          <div className="ch-inv-detail-val">{inv.teilnehmer.join(', ')}</div>
        </div>
      </div>

      <div className="ch-inv-actions">
        <button className="ch-btn-accept" onClick={() => onAction(inv.id, 'angenommen')}>✓ Annehmen</button>
        <button className="ch-btn-decline" onClick={() => onAction(inv.id, 'abgelehnt')}>✗ Ablehnen</button>
      </div>
    </div>
  );
}

/* ── DetailView ─────────────────────────────────────────────────────────── */
function DetailView({ challenge: c, onBack }) {
  const sorted   = [...c.teilnehmer].sort((a, b) => b.fortschritt - a.fortschritt);
  const myRank   = sorted.findIndex(t => t.id === 'me') + 1;
  const myEntry  = c.teilnehmer.find(t => t.id === 'me');
  const dLeft    = daysLeft(c.enddatum);
  const typConf  = CHALLENGE_TYPES.find(t => t.key === c.typ);
  const leader   = sorted[0];
  const myPct    = pct(myEntry?.fortschritt ?? 0, c.zielwert);

  // motivational status message
  let statusMsg = '';
  if (c.status === 'abgeschlossen') {
    statusMsg = myRank === 1 ? '🥇 Du hast diese Challenge gewonnen!' : `🎖️ Du bist auf Platz ${myRank} abgeschlossen.`;
  } else if (myRank === 1) {
    statusMsg = '🔥 Du liegst aktuell auf Platz 1 — halte die Führung!';
  } else {
    const gap = leader.fortschritt - (myEntry?.fortschritt ?? 0);
    statusMsg = `💪 Du liegst auf Platz ${myRank} — noch ${fmtNum(gap)} ${c.zielEinheit} bis Platz 1`;
  }

  const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  const rankLabel = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
  const maxProgress = sorted[0]?.fortschritt || 1;

  return (
    <div className="ch-detail">
      <button className="ch-detail-back" onClick={onBack}>
        ← Zurück zu Challenges
      </button>

      {/* Hero card */}
      <div className="ch-detail-hero">
        <div className="ch-detail-hero-top">
          <div className="ch-detail-icon"><TypeIcon typ={c.typ} size={32} /></div>
          <div style={{ flex: 1 }}>
            <p className="ch-detail-name">{c.name}</p>
            <p className="ch-detail-desc">{c.beschreibung}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={c.status} />
              {c.status === 'aktiv' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  ⏳ Endet in {dLeft} {dLeft === 1 ? 'Tag' : 'Tagen'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* My progress */}
        {myEntry && (
          <>
            <div className="ch-detail-progress-label">
              <span>Dein Fortschritt</span>
              <span>{fmtNum(myEntry.fortschritt)} / {fmtNum(c.zielwert)} {c.zielEinheit} ({myPct}%)</span>
            </div>
            <div className="ch-detail-bar-track">
              <div className="ch-detail-bar-fill" style={{ width: `${myPct}%` }} />
            </div>
          </>
        )}

        {/* Stats */}
        <div className="ch-detail-stats">
          <div className="ch-detail-stat">
            <div className="ch-detail-stat-label">Ziel</div>
            <div className="ch-detail-stat-val">{fmtNum(c.zielwert)} {c.zielEinheit}</div>
          </div>
          <div className="ch-detail-stat">
            <div className="ch-detail-stat-label">Zeitraum</div>
            <div className="ch-detail-stat-val" style={{ fontSize: '0.85rem' }}>{fmtDate(c.startdatum)} – {fmtDate(c.enddatum)}</div>
          </div>
          <div className="ch-detail-stat">
            <div className="ch-detail-stat-label">Dein Rang</div>
            <div className="ch-detail-stat-val">{myRank === 1 ? '🥇 Platz 1' : `Platz ${myRank}`}</div>
          </div>
          <div className="ch-detail-stat">
            <div className="ch-detail-stat-label">Teilnehmer</div>
            <div className="ch-detail-stat-val">{c.teilnehmer.length}</div>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className="ch-status-banner">
        <span style={{ fontSize: '1.25rem' }}>{myRank === 1 ? '🔥' : '💪'}</span>
        {statusMsg}
        {c.status === 'aktiv' && (
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Challenge endet in {dLeft} {dLeft === 1 ? 'Tag' : 'Tagen'}
          </span>
        )}
      </div>

      {/* Leaderboard */}
      <div className="ch-leaderboard">
        <div className="ch-lb-header">🏅 Rangliste</div>
        {sorted.map((t, i) => (
          <div key={t.id} className={`ch-lb-row${t.id === 'me' ? ' is-me' : ''}`}>
            <div className={`ch-lb-rank ${rankClass(i)}`}>{rankLabel(i)}</div>
            <Avatar name={t.name} initials={t.initials} size={34} />
            <div className="ch-lb-info">
              <div className="ch-lb-name">
                {t.name}
                {t.id === 'me' && <span className="ch-lb-name-you">Du</span>}
              </div>
              <div className="ch-lb-bar">
                <div className="ch-lb-bar-track">
                  <div
                    className="ch-lb-bar-fill"
                    style={{
                      width: `${pct(t.fortschritt, maxProgress)}%`,
                      background: i === 0 ? '#F5A623' : i === 1 ? '#A0A0B0' : i === 2 ? '#C87941' : 'var(--accent)',
                    }}
                  />
                </div>
                <span className="ch-lb-val">{fmtNum(t.fortschritt)} {c.zielEinheit}</span>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {pct(t.fortschritt, c.zielwert)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── EmptyState ─────────────────────────────────────────────────────────── */
function EmptyState({ icon, title, text }) {
  return (
    <div className="ch-empty">
      <div className="ch-empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

/* ── CreateModal ────────────────────────────────────────────────────────── */
function CreateModal({ friends, onClose, onSubmit }) {
  const today = new Date().toISOString().split('T')[0];

  const [typ,          setTyp]          = useState('steps');
  const [name,         setName]         = useState('');
  const [desc,         setDesc]         = useState('');
  const [startdatum,   setStartdatum]   = useState(today);
  const [enddatum,     setEnddatum]     = useState('');
  const [zielwert,     setZielwert]     = useState('');
  const [sichtbarkeit, setSichtbarkeit] = useState('privat');
  const [selected,     setSelected]     = useState(new Set());
  const [search,       setSearch]       = useState('');
  const [errors,       setErrors]       = useState({});

  const typConf      = CHALLENGE_TYPES.find(t => t.key === typ);
  const filteredF    = friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  function toggleFriend(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function validate() {
    const e = {};
    if (!name.trim())                                   e.name       = 'Challenge-Name ist erforderlich.';
    if (!startdatum)                                    e.start      = 'Startdatum ist erforderlich.';
    if (!enddatum)                                      e.end        = 'Enddatum ist erforderlich.';
    if (startdatum && enddatum && enddatum <= startdatum) e.end     = 'Enddatum muss nach dem Startdatum liegen.';
    if (!zielwert || Number(zielwert) <= 0)             e.zielwert  = 'Zielwert muss größer als 0 sein.';
    if (selected.size === 0)                            e.freunde   = 'Wähle mindestens einen Freund aus.';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSubmit({
      typ, name: name.trim(), beschreibung: desc.trim(),
      startdatum, enddatum,
      zielwert: Number(zielwert), zielEinheit: typConf.einheit,
      sichtbarkeit,
      freunde: friends.filter(f => selected.has(f.id)),
    });
  }

  // close on backdrop click
  function handleBackdrop(e) { if (e.target === e.currentTarget) onClose(); }

  return (
    <div className="ch-overlay" onClick={handleBackdrop}>
      <div className="ch-modal">
        <div className="ch-modal-hdr">
          <p className="ch-modal-title">Neue Challenge erstellen</p>
          <button className="ch-modal-close" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="ch-modal-body">

          {/* Type selector */}
          <div className="ch-field">
            <label className="ch-label">Challenge-Typ <span>*</span></label>
            <div className="ch-type-grid">
              {CHALLENGE_TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={`ch-type-btn${typ === t.key ? ' selected' : ''}`}
                  onClick={() => setTyp(t.key)}
                >
                  <span className="ch-type-icon">{t.icon}</span>
                  <span className="ch-type-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="ch-field">
            <label className="ch-label">Challenge-Name <span>*</span></label>
            <input
              className={`ch-input${errors.name ? ' error' : ''}`}
              placeholder={`z. B. "7-Tage-${typConf?.einheit}-Battle"`}
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({...p, name: ''})); }}
            />
            {errors.name && <p className="ch-error-msg">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="ch-field">
            <label className="ch-label">Beschreibung</label>
            <textarea
              className="ch-textarea"
              placeholder={`z. B. "Wer schafft in 7 Tagen die meisten ${typConf?.einheit}?"`}
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {/* Date range */}
          <div className="ch-field">
            <label className="ch-label">Zeitraum <span>*</span></label>
            <div className="ch-date-row">
              <div>
                <input
                  type="date" className={`ch-input${errors.start ? ' error' : ''}`}
                  value={startdatum} min={today}
                  onChange={e => { setStartdatum(e.target.value); setErrors(p => ({...p, start: ''})); }}
                />
                {errors.start && <p className="ch-error-msg">{errors.start}</p>}
              </div>
              <div>
                <input
                  type="date" className={`ch-input${errors.end ? ' error' : ''}`}
                  value={enddatum} min={startdatum || today}
                  onChange={e => { setEnddatum(e.target.value); setErrors(p => ({...p, end: ''})); }}
                />
                {errors.end && <p className="ch-error-msg">{errors.end}</p>}
              </div>
            </div>
          </div>

          {/* Goal */}
          <div className="ch-field">
            <label className="ch-label">Zielwert <span>*</span></label>
            <div className="ch-goal-row">
              <div>
                <input
                  type="number" className={`ch-input${errors.zielwert ? ' error' : ''}`}
                  placeholder={typConf?.placeholder} min="1"
                  value={zielwert}
                  onChange={e => { setZielwert(e.target.value); setErrors(p => ({...p, zielwert: ''})); }}
                />
                {errors.zielwert && <p className="ch-error-msg">{errors.zielwert}</p>}
              </div>
              <div className="ch-goal-unit">{typConf?.einheit}</div>
            </div>
          </div>

          {/* Friends */}
          <div className="ch-field">
            <label className="ch-label">Freunde auswählen <span>*</span></label>
            <div className="ch-friend-search">
              <input
                className="ch-input"
                placeholder="🔍 Freunde suchen…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="ch-friend-list">
              {filteredF.length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '12px' }}>Keine Freunde gefunden.</p>
                : filteredF.map(f => (
                    <div
                      key={f.id}
                      className={`ch-friend-item${selected.has(f.id) ? ' selected' : ''}`}
                      onClick={() => { toggleFriend(f.id); setErrors(p => ({...p, freunde: ''})); }}
                    >
                      <Avatar name={f.name} initials={f.initials} size={36} />
                      <div className="ch-friend-info">
                        <div className="ch-friend-name">{f.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>@{f.username}</span></div>
                        <div className="ch-friend-status">{f.statusText}</div>
                      </div>
                      <div className="ch-friend-check">{selected.has(f.id) && '✓'}</div>
                    </div>
                  ))
              }
            </div>
            {errors.freunde && <p className="ch-error-msg" style={{ marginTop: 6 }}>{errors.freunde}</p>}
            {selected.size > 0 && (
              <p style={{ fontSize: '0.775rem', color: 'var(--accent)', marginTop: 6, fontWeight: 600 }}>
                {selected.size} {selected.size === 1 ? 'Freund' : 'Freunde'} ausgewählt
              </p>
            )}
          </div>

          {/* Visibility */}
          <div className="ch-field">
            <label className="ch-label">Sichtbarkeit</label>
            <div className="ch-radio-group">
              {[
                { key: 'privat',        label: 'Privat',          sub: 'Nur eingeladene Freunde', icon: '🔒' },
                { key: 'freundesliste', label: 'Freundesliste',   sub: 'Alle Freunde können sehen', icon: '👥' },
              ].map(o => (
                <div
                  key={o.key}
                  className={`ch-radio-btn${sichtbarkeit === o.key ? ' selected' : ''}`}
                  onClick={() => setSichtbarkeit(o.key)}
                >
                  <div className="ch-radio-dot" />
                  <div>
                    <div className="ch-radio-label">{o.icon} {o.label}</div>
                    <div className="ch-radio-sub">{o.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="ch-modal-footer">
          <button className="ch-btn-cancel" onClick={onClose}>Abbrechen</button>
          <button className="ch-btn-primary" onClick={handleSubmit}>
            🚀 Challenge senden
          </button>
        </div>
      </div>
    </div>
  );
}
