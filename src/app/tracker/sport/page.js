'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const STORAGE_KEY = 'kynogg-sport';
const EMPTY_FORM = { sportart: '', dauer: '', intensitaet: 'mittel', notizen: '' };

const INTENSITY = {
  leicht:   { label: 'Leicht',   cls: 'intensity-leicht' },
  mittel:   { label: 'Mittel',   cls: 'intensity-mittel' },
  intensiv: { label: 'Intensiv', cls: 'intensity-intensiv' },
};

const QUICK_SPORTS = ['Laufen', 'Krafttraining', 'Radfahren', 'Schwimmen', 'Yoga', 'HIIT'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function SportTracker() {
  const { user: _au, loading: _al } = useAuth();
  const [einheiten, setEinheiten] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setEinheiten(JSON.parse(stored));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(einheiten));
  }, [einheiten, loaded]);

  const today = todayStr();

  const todayEntries = useMemo(
    () => einheiten.filter(e => e.datum === today),
    [einheiten, today]
  );

  const pastByDate = useMemo(() => {
    const groups = {};
    for (const e of einheiten) {
      if (e.datum === today) continue;
      if (!groups[e.datum]) groups[e.datum] = [];
      groups[e.datum].push(e);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [einheiten, today]);

  const totalMinuten = todayEntries.reduce((acc, e) => acc + (e.dauer || 0), 0);
  const avgMinuten = todayEntries.length > 0 ? Math.round(totalMinuten / todayEntries.length) : 0;

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setEinheiten(prev => [{
      id: Date.now().toString(),
      datum: today,
      sportart: form.sportart.trim(),
      dauer: parseInt(form.dauer) || 0,
      intensitaet: form.intensitaet,
      notizen: form.notizen.trim(),
    }, ...prev]);
    setForm(EMPTY_FORM);
  }

  function handleDelete(id) {
    setEinheiten(prev => prev.filter(e => e.id !== id));
  }

  if (!loaded || _al) return null;
  if (!_au) return <AuthGate />;

  return (
    <main className="main-content">
      <div className="tracker-page">
        <Link href="/tracker" className="back-link">← Tracker</Link>

        <div className="tracker-header">
          <span className="cat-pill small cat-fitness">🏋️ Fitness</span>
          <h1 className="kategorie-title" style={{ marginTop: '10px' }}>Sport-Tracker</h1>
          <p className="tracker-sub">Heute, {formatDate(today)}</p>
        </div>

        <div className="tracker-section">
          <p className="section-label">Wochenübersicht</p>
          <WochenChart einheiten={einheiten} />
        </div>

        <div className="tracker-section">
          <p className="section-label">Tagesübersicht</p>
          <div className="sport-summary">
            <div className="macro-card macro-protein">
              <span className="macro-value">{todayEntries.length}</span>
              <span className="macro-label">Einheiten</span>
            </div>
            <div className="macro-card macro-kcal">
              <span className="macro-value">{totalMinuten}</span>
              <span className="macro-label">Minuten gesamt</span>
            </div>
            <div className="macro-card macro-carbs">
              <span className="macro-value">{avgMinuten}</span>
              <span className="macro-label">Ø Minuten</span>
            </div>
          </div>
        </div>

        <div className="tracker-section">
          <p className="section-label">Einheit hinzufügen</p>
          <form onSubmit={handleSubmit} className="meal-form">

            <div>
              <p className="macro-input-label" style={{ marginBottom: '8px' }}>Schnellauswahl</p>
              <div className="sport-quick-row">
                {QUICK_SPORTS.map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`sport-quick-btn ${form.sportart === s ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, sportart: s }))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="sport-form-row">
              <div className="macro-input-wrap" style={{ flex: 2 }}>
                <label className="macro-input-label">Sportart</label>
                <input
                  name="sportart"
                  type="text"
                  placeholder="z.B. Laufen, Yoga, Radfahren…"
                  value={form.sportart}
                  onChange={handleChange}
                  required
                  className="tracker-input"
                />
              </div>
              <div className="macro-input-wrap" style={{ flex: 1 }}>
                <label className="macro-input-label">Dauer (Min.)</label>
                <input
                  name="dauer"
                  type="number"
                  min="1"
                  placeholder="30"
                  value={form.dauer}
                  onChange={handleChange}
                  required
                  className="tracker-input"
                />
              </div>
            </div>

            <div>
              <p className="macro-input-label" style={{ marginBottom: '8px' }}>Intensität</p>
              <div className="intensity-toggle">
                {Object.entries(INTENSITY).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    className={`intensity-btn ${cfg.cls} ${form.intensitaet === key ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, intensitaet: key }))}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="macro-input-wrap">
              <label className="macro-input-label">Notizen (optional)</label>
              <textarea
                name="notizen"
                placeholder="z.B. 5 km in 28 Min., neue Bestzeit…"
                value={form.notizen}
                onChange={handleChange}
                className="tracker-input tracker-textarea"
                rows={2}
              />
            </div>

            <button type="submit" className="tracker-submit">+ Eintragen</button>
          </form>
        </div>

        <div className="tracker-section">
          <p className="section-label">Heute</p>
          {todayEntries.length === 0 ? (
            <div className="tracker-empty">
              <span>🏃</span>
              <p>Noch keine Trainingseinheit für heute eingetragen.</p>
            </div>
          ) : (
            <div className="meal-list">
              {todayEntries.map(entry => (
                <SportRow key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {pastByDate.length > 0 && (
          <div className="tracker-section">
            <p className="section-label">Frühere Einträge</p>
            <div className="past-days">
              {pastByDate.map(([date, entries]) => (
                <div key={date} className="past-day">
                  <div className="past-day-header">
                    <span className="past-day-date">{formatDate(date)}</span>
                    <span className="past-day-totals">
                      {entries.length} {entries.length === 1 ? 'Einheit' : 'Einheiten'} · {entries.reduce((a, e) => a + e.dauer, 0)} Min.
                    </span>
                  </div>
                  <div className="meal-list">
                    {entries.map(entry => (
                      <SportRow key={entry.id} entry={entry} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function WochenChart({ einheiten }) {
  const days = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const minuten = einheiten
      .filter(e => e.datum === dateStr)
      .reduce((acc, e) => acc + (e.dauer || 0), 0);
    const label = d.toLocaleDateString('de-DE', { weekday: 'short' });
    days.push({ dateStr, label, minuten, isToday: i === 0 });
  }

  const maxMin = Math.max(...days.map(d => d.minuten), 1);

  return (
    <div className="wochen-chart">
      {days.map(day => {
        const pct = day.minuten > 0 ? Math.max(4, Math.round((day.minuten / maxMin) * 100)) : 0;
        return (
          <div key={day.dateStr} className="chart-col">
            <span className="chart-val">
              {day.minuten > 0 ? day.minuten : ''}
            </span>
            <div className="chart-track">
              <div
                className={`chart-bar${day.isToday ? ' chart-bar-today' : ''}`}
                style={{ height: pct > 0 ? `${pct}%` : '3px' }}
              />
            </div>
            <span className={`chart-day${day.isToday ? ' chart-day-today' : ''}`}>
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SportRow({ entry, onDelete }) {
  const cfg = INTENSITY[entry.intensitaet] || INTENSITY.mittel;
  return (
    <div className="meal-row">
      <div className="sport-row-body">
        <span className="meal-row-name">{entry.sportart}</span>
        {entry.notizen && <span className="sport-row-notes">{entry.notizen}</span>}
      </div>
      <div className="meal-row-macros">
        <span className={`meal-tag intensity-tag ${cfg.cls}`}>{cfg.label}</span>
        <span className="meal-tag">{entry.dauer} Min.</span>
      </div>
      <button className="meal-delete" onClick={() => onDelete(entry.id)} aria-label="Löschen">
        <TrashIcon />
      </button>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
