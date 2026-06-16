'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const STORAGE_KEY = 'kynogg-ernaehrung';
const EMPTY_FORM = { name: '', kalorien: '', protein: '', kohlenhydrate: '', fett: '' };

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

function sumKey(meals, key) {
  return Math.round(meals.reduce((acc, m) => acc + (m[key] || 0), 0) * 10) / 10;
}

export default function ErnaehrungTracker() {
  const { user: _au, loading: _al } = useAuth();
  const [mahlzeiten, setMahlzeiten] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setMahlzeiten(JSON.parse(stored));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(mahlzeiten));
  }, [mahlzeiten, loaded]);

  const today = todayStr();

  const todayMeals = useMemo(
    () => mahlzeiten.filter(m => m.datum === today),
    [mahlzeiten, today]
  );

  const pastByDate = useMemo(() => {
    const groups = {};
    for (const m of mahlzeiten) {
      if (m.datum === today) continue;
      if (!groups[m.datum]) groups[m.datum] = [];
      groups[m.datum].push(m);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [mahlzeiten, today]);

  const totals = {
    kalorien: sumKey(todayMeals, 'kalorien'),
    protein: sumKey(todayMeals, 'protein'),
    kohlenhydrate: sumKey(todayMeals, 'kohlenhydrate'),
    fett: sumKey(todayMeals, 'fett'),
  };

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setMahlzeiten(prev => [{
      id: Date.now().toString(),
      datum: today,
      name: form.name.trim(),
      kalorien: parseFloat(form.kalorien) || 0,
      protein: parseFloat(form.protein) || 0,
      kohlenhydrate: parseFloat(form.kohlenhydrate) || 0,
      fett: parseFloat(form.fett) || 0,
    }, ...prev]);
    setForm(EMPTY_FORM);
  }

  function handleDelete(id) {
    setMahlzeiten(prev => prev.filter(m => m.id !== id));
  }

  if (!loaded || _al) return null;
  if (!_au) return <AuthGate />;

  return (
    <main className="main-content">
      <div className="tracker-page">
        <Link href="/tracker" className="back-link">← Tracker</Link>

        <div className="tracker-header">
          <span className="cat-pill small cat-ernaehrung">🥗 Ernährung</span>
          <h1 className="kategorie-title" style={{ marginTop: '10px' }}>Ernährungs-Tracker</h1>
          <p className="tracker-sub">Heute, {formatDate(today)}</p>
        </div>

        <div className="tracker-section">
          <p className="section-label">Tagesübersicht</p>
        <div className="macro-summary">
          <div className="macro-card macro-kcal">
            <span className="macro-value">{totals.kalorien}</span>
            <span className="macro-label">kcal</span>
          </div>
          <div className="macro-card macro-protein">
            <span className="macro-value">{totals.protein}g</span>
            <span className="macro-label">Protein</span>
          </div>
          <div className="macro-card macro-carbs">
            <span className="macro-value">{totals.kohlenhydrate}g</span>
            <span className="macro-label">Kohlenhydrate</span>
          </div>
          <div className="macro-card macro-fat">
            <span className="macro-value">{totals.fett}g</span>
            <span className="macro-label">Fett</span>
          </div>
        </div>
        </div>

        <div className="tracker-section">
          <p className="section-label">Mahlzeit hinzufügen</p>
          <form onSubmit={handleSubmit} className="meal-form">
            <input
              name="name"
              type="text"
              placeholder="z.B. Haferflocken mit Beeren"
              value={form.name}
              onChange={handleChange}
              required
              className="tracker-input meal-name-input"
            />
            <div className="meal-macros-row">
              <MacroInput label="kcal" name="kalorien" value={form.kalorien} onChange={handleChange} />
              <MacroInput label="Protein (g)" name="protein" value={form.protein} onChange={handleChange} />
              <MacroInput label="Kohlenhydrate (g)" name="kohlenhydrate" value={form.kohlenhydrate} onChange={handleChange} />
              <MacroInput label="Fett (g)" name="fett" value={form.fett} onChange={handleChange} />
            </div>
            <button type="submit" className="tracker-submit">+ Eintragen</button>
          </form>
        </div>

        <div className="tracker-section">
          <p className="section-label">Heute</p>
          {todayMeals.length === 0 ? (
            <div className="tracker-empty">
              <span>🍽️</span>
              <p>Noch keine Mahlzeiten für heute eingetragen.</p>
            </div>
          ) : (
            <>
              <div className="meal-list">
                {todayMeals.map(meal => (
                  <MealRow key={meal.id} meal={meal} onDelete={handleDelete} />
                ))}
              </div>
              <div className="day-total-row">
                <span className="day-total-label">
                  Gesamt ({todayMeals.length} {todayMeals.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'})
                </span>
                <div className="day-total-macros">
                  <span className="day-total-item kcal">{totals.kalorien} kcal</span>
                  <span className="day-total-item">Protein: {totals.protein}g</span>
                  <span className="day-total-item">Kohlenhydrate: {totals.kohlenhydrate}g</span>
                  <span className="day-total-item">Fett: {totals.fett}g</span>
                </div>
              </div>
            </>
          )}
        </div>

        {pastByDate.length > 0 && (
          <div className="tracker-section">
            <p className="section-label">Frühere Einträge</p>
            <div className="past-days">
              {pastByDate.map(([date, meals]) => (
                <div key={date} className="past-day">
                  <div className="past-day-header">
                    <span className="past-day-date">{formatDate(date)}</span>
                    <span className="past-day-totals">
                      {sumKey(meals, 'kalorien')} kcal · P: {sumKey(meals, 'protein')}g · K: {sumKey(meals, 'kohlenhydrate')}g · F: {sumKey(meals, 'fett')}g
                    </span>
                  </div>
                  <div className="meal-list">
                    {meals.map(meal => (
                      <MealRow key={meal.id} meal={meal} onDelete={handleDelete} />
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

function MacroInput({ label, name, value, onChange }) {
  return (
    <div className="macro-input-wrap">
      <label className="macro-input-label">{label}</label>
      <input
        name={name}
        type="number"
        min="0"
        step="0.1"
        placeholder="0"
        value={value}
        onChange={onChange}
        className="tracker-input"
      />
    </div>
  );
}

function MealRow({ meal, onDelete }) {
  return (
    <div className="meal-row">
      <span className="meal-row-name">{meal.name}</span>
      <div className="meal-row-macros">
        <span className="meal-tag meal-kcal">{meal.kalorien} kcal</span>
        <span className="meal-tag">P: {meal.protein}g</span>
        <span className="meal-tag">K: {meal.kohlenhydrate}g</span>
        <span className="meal-tag">F: {meal.fett}g</span>
      </div>
      <button className="meal-delete" onClick={() => onDelete(meal.id)} aria-label="Löschen">
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
