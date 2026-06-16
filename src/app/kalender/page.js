'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const STORAGE_KEY = 'kynogg-kalender';
const SPORT_KEY   = 'kynogg-sport';
const ERN_KEY     = 'kynogg-ernaehrung';

const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONATE = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
];
const MONATE_KURZ = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

const FARBEN = ['#7c3aed','#16a34a','#d97706','#2563eb','#db2777','#0891b2','#dc2626','#65a30d'];

const STANDARD_FARBE = {
  eigener:    '#7c3aed',
  sport:      '#16a34a',
  ernaehrung: '#d97706',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseDate(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

// Montag-first: return 0 for Monday, 6 for Sunday
function wochentag(date) {
  return (date.getDay() + 6) % 7;
}

function tageImMonat(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Build calendar grid for month view (6 rows x 7 cols)
function buildMonthGrid(year, month) {
  const firstDay = wochentag(new Date(year, month, 1));
  const daysInMonth = tageImMonat(year, month);
  const prevMonthDays = tageImMonat(year, month - 1);
  const cells = [];
  // prev month fill
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ date: dateToStr(new Date(y, m, d)), current: false });
  }
  // current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: dateToStr(new Date(year, month, d)), current: true });
  }
  // next month fill
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ date: dateToStr(new Date(y, m, d)), current: false });
  }
  return cells;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function EventDot({ typ }) {
  const color = STANDARD_FARBE[typ] || '#7c3aed';
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />;
}

export default function KalenderPage() {
  const { user: _au, loading: _al } = useAuth();
  const today = todayStr();
  const now = new Date();

  const [view, setView] = useState('monat');
  const [curYear,  setCurYear]  = useState(now.getFullYear());
  const [curMonth, setCurMonth] = useState(now.getMonth());
  const [curDay,   setCurDay]   = useState(today);

  const [events,   setEvents]   = useState([]);
  const [loaded,   setLoaded]   = useState(false);
  const [sportData, setSportData] = useState([]);
  const [ernData,   setErnData]   = useState([]);

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editEvent,   setEditEvent]   = useState(null);
  const [prefillDate, setPrefillDate] = useState('');
  const [prefillTime, setPrefillTime] = useState('');

  // Load data
  useEffect(() => {
    try {
      const ev = localStorage.getItem(STORAGE_KEY);
      if (ev) setEvents(JSON.parse(ev));
    } catch {}
    try {
      const sp = localStorage.getItem(SPORT_KEY);
      if (sp) setSportData(JSON.parse(sp));
    } catch {}
    try {
      const er = localStorage.getItem(ERN_KEY);
      if (er) setErnData(JSON.parse(er));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events, loaded]);

  // Merge all events (eigene + sport + ernährung) for display
  const allEvents = useMemo(() => {
    const ev = [...events];
    for (const s of sportData) {
      ev.push({
        id: `sport-${s.id}`,
        titel: s.sportart || 'Training',
        datum: s.datum,
        uhrzeit: s.uhrzeit || null,
        uhrzeitEnde: null,
        typ: 'sport',
        farbe: STANDARD_FARBE.sport,
        notizen: `${s.dauer ? s.dauer + ' Min.' : ''} · ${s.intensitaet || ''}`.trim().replace(/^·\s*|·\s*$/, ''),
        readonly: true,
      });
    }
    for (const e of ernData) {
      if (!e.datum) continue;
      const existing = ev.find(x => x.typ === 'ernaehrung' && x.datum === e.datum && x.titel.startsWith('Ernährung'));
      if (!existing) {
        ev.push({
          id: `ern-${e.datum}`,
          titel: 'Ernährungsprotokoll',
          datum: e.datum,
          uhrzeit: null,
          uhrzeitEnde: null,
          typ: 'ernaehrung',
          farbe: STANDARD_FARBE.ernaehrung,
          notizen: '',
          readonly: true,
        });
      }
    }
    return ev;
  }, [events, sportData, ernData]);

  // Index by date
  const byDate = useMemo(() => {
    const map = {};
    for (const e of allEvents) {
      if (!map[e.datum]) map[e.datum] = [];
      map[e.datum].push(e);
    }
    return map;
  }, [allEvents]);

  function openNew(datum = '', time = '') {
    setEditEvent(null);
    setPrefillDate(datum || today);
    setPrefillTime(time);
    setModalOpen(true);
  }

  function openEdit(ev) {
    if (ev.readonly) return;
    setEditEvent(ev);
    setPrefillDate(ev.datum);
    setPrefillTime(ev.uhrzeit || '');
    setModalOpen(true);
  }

  function saveEvent(data) {
    if (editEvent) {
      setEvents(prev => prev.map(e => e.id === editEvent.id ? { ...e, ...data } : e));
    } else {
      setEvents(prev => [...prev, { id: Date.now().toString(), typ: 'eigener', ...data }]);
    }
    setModalOpen(false);
  }

  function deleteEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id));
    setModalOpen(false);
  }

  // Navigation
  function prevMonth() {
    if (curMonth === 0) { setCurMonth(11); setCurYear(y => y-1); }
    else setCurMonth(m => m-1);
  }
  function nextMonth() {
    if (curMonth === 11) { setCurMonth(0); setCurYear(y => y+1); }
    else setCurMonth(m => m+1);
  }

  function goToDay(dateStr) {
    setCurDay(dateStr);
    const d = parseDate(dateStr);
    setCurYear(d.getFullYear());
    setCurMonth(d.getMonth());
    setView('tag');
  }

  const grid = useMemo(() => buildMonthGrid(curYear, curMonth), [curYear, curMonth]);

  if (_al) return null;
  if (!_au) return <AuthGate />;

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Kalender
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['monat','tag','jahr'].map(v => (
            <button key={v} onClick={() => setView(v)} className="kal-view-btn" data-active={view === v}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <button onClick={() => openNew()} className="kal-new-btn">+ Termin</button>
        </div>
      </div>

      {view === 'monat' && (
        <MonatView
          year={curYear} month={curMonth}
          grid={grid} byDate={byDate} today={today}
          onPrev={prevMonth} onNext={nextMonth}
          onDayClick={goToDay}
          onEventClick={openEdit}
          onNewEvent={openNew}
        />
      )}

      {view === 'tag' && (
        <TagView
          date={curDay}
          events={byDate[curDay] || []}
          today={today}
          onPrev={() => {
            const d = parseDate(curDay);
            d.setDate(d.getDate()-1);
            const s = dateToStr(d);
            setCurDay(s);
            setCurYear(d.getFullYear());
            setCurMonth(d.getMonth());
          }}
          onNext={() => {
            const d = parseDate(curDay);
            d.setDate(d.getDate()+1);
            const s = dateToStr(d);
            setCurDay(s);
            setCurYear(d.getFullYear());
            setCurMonth(d.getMonth());
          }}
          onToday={() => { setCurDay(today); setCurYear(now.getFullYear()); setCurMonth(now.getMonth()); }}
          onNewEvent={openNew}
          onEventClick={openEdit}
        />
      )}

      {view === 'jahr' && (
        <JahrView
          year={curYear} byDate={byDate} today={today}
          onPrev={() => setCurYear(y => y-1)}
          onNext={() => setCurYear(y => y+1)}
          onDayClick={goToDay}
        />
      )}

      {modalOpen && (
        <EventModal
          initial={editEvent}
          prefillDate={prefillDate}
          prefillTime={prefillTime}
          onSave={saveEvent}
          onDelete={editEvent ? () => deleteEvent(editEvent.id) : null}
          onClose={() => setModalOpen(false)}
        />
      )}

      <style>{kalCSS}</style>
    </div>
  );
}

/* ── Month View ──────────────────────────────────────────────────────────── */

function MonatView({ year, month, grid, byDate, today, onPrev, onNext, onDayClick, onEventClick, onNewEvent }) {
  return (
    <div className="kal-card">
      <div className="kal-nav">
        <button onClick={onPrev} className="kal-nav-btn">‹</button>
        <span className="kal-nav-title">{MONATE[month]} {year}</span>
        <button onClick={onNext} className="kal-nav-btn">›</button>
      </div>

      <div className="kal-month-grid">
        {WOCHENTAGE_KURZ.map(d => (
          <div key={d} className="kal-weekday-label">{d}</div>
        ))}
        {grid.map(cell => {
          const isToday = cell.date === today;
          const dayEvents = byDate[cell.date] || [];
          return (
            <div
              key={cell.date}
              className={`kal-day-cell${!cell.current ? ' kal-day-other' : ''}${isToday ? ' kal-day-today' : ''}`}
              onClick={() => onDayClick(cell.date)}
            >
              <span className="kal-day-num">{parseInt(cell.date.split('-')[2])}</span>
              <div className="kal-day-events">
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className="kal-event-pill"
                    style={{ background: ev.farbe + '22', color: ev.farbe, borderColor: ev.farbe + '44' }}
                    onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                    title={ev.titel}
                  >
                    {ev.uhrzeit && <span className="kal-event-time">{ev.uhrzeit}</span>}
                    <span className="kal-event-name">{ev.titel}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="kal-event-more">+{dayEvents.length - 3} weitere</div>
                )}
              </div>
              <button
                className="kal-day-add"
                onClick={e => { e.stopPropagation(); onNewEvent(cell.date); }}
                title="Termin hinzufügen"
              >+</button>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="kal-legend">
        {Object.entries(STANDARD_FARBE).map(([typ, color]) => (
          <span key={typ} className="kal-legend-item">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {typ === 'eigener' ? 'Eigene Termine' : typ === 'sport' ? 'Sport' : 'Ernährung'}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Day View ────────────────────────────────────────────────────────────── */

function TagView({ date, events, today, onPrev, onNext, onToday, onNewEvent, onEventClick }) {
  const d = parseDate(date);
  const label = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isToday = date === today;

  // Sort: timed events first by time, then untimed
  const timed   = events.filter(e => e.uhrzeit).sort((a,b) => a.uhrzeit.localeCompare(b.uhrzeit));
  const untimed = events.filter(e => !e.uhrzeit);

  // For hour slots – which events overlap
  function eventsForHour(h) {
    return timed.filter(e => {
      const [eh] = e.uhrzeit.split(':').map(Number);
      return eh === h;
    });
  }

  return (
    <div className="kal-card">
      <div className="kal-nav">
        <button onClick={onPrev} className="kal-nav-btn">‹</button>
        <span className="kal-nav-title" style={isToday ? { color: 'var(--accent)' } : {}}>
          {label}{isToday ? ' — Heute' : ''}
        </span>
        <button onClick={onNext} className="kal-nav-btn">›</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={onToday} className="kal-small-btn">Heute</button>
        <button onClick={() => onNewEvent(date)} className="kal-new-btn">+ Termin</button>
      </div>

      {/* All-day / untimed events */}
      {untimed.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="kal-section-label">Ganztägig</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {untimed.map(ev => (
              <TagEvent key={ev.id} ev={ev} onClick={() => onEventClick(ev)} />
            ))}
          </div>
        </div>
      )}

      {/* Hour timeline */}
      <div className="kal-timeline">
        {HOURS.map(h => {
          const slot = eventsForHour(h);
          return (
            <div key={h} className="kal-hour-row">
              <span className="kal-hour-label">{String(h).padStart(2,'0')}:00</span>
              <div className="kal-hour-content">
                {slot.length === 0 ? (
                  <div
                    className="kal-hour-empty"
                    onClick={() => onNewEvent(date, `${String(h).padStart(2,'0')}:00`)}
                    title="Termin hinzufügen"
                  />
                ) : (
                  slot.map(ev => <TagEvent key={ev.id} ev={ev} onClick={() => onEventClick(ev)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TagEvent({ ev, onClick }) {
  return (
    <div
      className={`kal-tag-event${ev.readonly ? ' kal-tag-event-readonly' : ''}`}
      style={{ borderLeftColor: ev.farbe || '#7c3aed', background: (ev.farbe || '#7c3aed') + '18' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {ev.uhrzeit && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: ev.farbe || 'var(--accent)', minWidth: 36 }}>
            {ev.uhrzeit}
          </span>
        )}
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ev.titel}</span>
        {ev.uhrzeitEnde && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>bis {ev.uhrzeitEnde}</span>
        )}
        {ev.readonly && (
          <span style={{ fontSize: '0.7rem', background: 'var(--border)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-muted)' }}>
            {ev.typ === 'sport' ? 'Sport' : 'Ernährung'}
          </span>
        )}
      </div>
      {ev.notizen && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>{ev.notizen}</div>
      )}
    </div>
  );
}

/* ── Year View ───────────────────────────────────────────────────────────── */

function JahrView({ year, byDate, today, onPrev, onNext, onDayClick }) {
  return (
    <div className="kal-card">
      <div className="kal-nav">
        <button onClick={onPrev} className="kal-nav-btn">‹</button>
        <span className="kal-nav-title">{year}</span>
        <button onClick={onNext} className="kal-nav-btn">›</button>
      </div>

      <div className="kal-year-grid">
        {Array.from({ length: 12 }, (_, mi) => {
          const grid = buildMonthGrid(year, mi);
          return (
            <div key={mi} className="kal-mini-month">
              <div className="kal-mini-month-title">{MONATE_KURZ[mi]}</div>
              <div className="kal-mini-grid">
                {WOCHENTAGE_KURZ.map(d => (
                  <div key={d} className="kal-mini-weekday">{d[0]}</div>
                ))}
                {grid.map((cell, i) => {
                  const hasEvents = (byDate[cell.date] || []).length > 0;
                  const isToday = cell.date === today;
                  const types = [...new Set((byDate[cell.date] || []).map(e => e.typ))];
                  return (
                    <div
                      key={i}
                      className={`kal-mini-day${!cell.current ? ' kal-mini-day-other' : ''}${isToday ? ' kal-mini-day-today' : ''}`}
                      onClick={() => cell.current && onDayClick(cell.date)}
                      title={hasEvents ? `${(byDate[cell.date]||[]).length} Termin(e)` : ''}
                    >
                      <span>{parseInt(cell.date.split('-')[2])}</span>
                      {hasEvents && (
                        <div className="kal-mini-dots">
                          {types.slice(0,3).map(t => <EventDot key={t} typ={t} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Event Modal ─────────────────────────────────────────────────────────── */

const EMPTY_FORM = {
  titel: '',
  datum: '',
  uhrzeit: '',
  uhrzeitEnde: '',
  notizen: '',
  farbe: '#7c3aed',
};

function EventModal({ initial, prefillDate, prefillTime, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...( initial ? {
      titel: initial.titel || '',
      datum: initial.datum || prefillDate,
      uhrzeit: initial.uhrzeit || '',
      uhrzeitEnde: initial.uhrzeitEnde || '',
      notizen: initial.notizen || '',
      farbe: initial.farbe || '#7c3aed',
    } : {
      datum: prefillDate,
      uhrzeit: prefillTime,
    }),
  });

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.titel.trim() || !form.datum) return;
    onSave({
      titel: form.titel.trim(),
      datum: form.datum,
      uhrzeit: form.uhrzeit || null,
      uhrzeitEnde: form.uhrzeitEnde || null,
      notizen: form.notizen.trim(),
      farbe: form.farbe,
    });
  }

  return (
    <div className="kal-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="kal-modal">
        <div className="kal-modal-header">
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.125rem' }}>
            {initial ? 'Termin bearbeiten' : 'Neuer Termin'}
          </h2>
          <button onClick={onClose} className="kal-modal-close">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="kal-field">
            <label>Titel</label>
            <input
              className="kal-input"
              value={form.titel}
              onChange={e => set('titel', e.target.value)}
              placeholder="z.B. Krafttraining, Arzttermin…"
              required
              autoFocus
            />
          </div>

          <div className="kal-field">
            <label>Datum</label>
            <input
              className="kal-input"
              type="date"
              value={form.datum}
              onChange={e => set('datum', e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="kal-field">
              <label>Uhrzeit (von)</label>
              <input
                className="kal-input"
                type="time"
                value={form.uhrzeit}
                onChange={e => set('uhrzeit', e.target.value)}
              />
            </div>
            <div className="kal-field">
              <label>Uhrzeit (bis)</label>
              <input
                className="kal-input"
                type="time"
                value={form.uhrzeitEnde}
                onChange={e => set('uhrzeitEnde', e.target.value)}
              />
            </div>
          </div>

          <div className="kal-field">
            <label>Farbe</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FARBEN.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('farbe', c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    outline: form.farbe === c ? `3px solid ${c}` : '2px solid transparent',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="kal-field">
            <label>Notizen</label>
            <textarea
              className="kal-input"
              rows={3}
              value={form.notizen}
              onChange={e => set('notizen', e.target.value)}
              placeholder="Optionale Notizen…"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            {onDelete && (
              <button type="button" onClick={onDelete} className="kal-btn-danger">Löschen</button>
            )}
            <button type="button" onClick={onClose} className="kal-small-btn">Abbrechen</button>
            <button type="submit" className="kal-new-btn">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── CSS ─────────────────────────────────────────────────────────────────── */

const kalCSS = `
.kal-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}

.kal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.kal-nav-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.kal-nav-btn {
  width: 36px; height: 36px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-size: 1.25rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.kal-nav-btn:hover { background: var(--bg-card-hover); }

.kal-view-btn {
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.kal-view-btn:hover { background: var(--bg-card-hover); color: var(--text); }
.kal-view-btn[data-active="true"] {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.kal-new-btn {
  padding: 6px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.kal-new-btn:hover { opacity: 0.88; }

.kal-small-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.kal-small-btn:hover { background: var(--bg-card-hover); color: var(--text); }

.kal-btn-danger {
  padding: 6px 14px;
  border: 1px solid #dc262655;
  border-radius: var(--radius-sm);
  background: #dc262611;
  color: #dc2626;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.kal-btn-danger:hover { background: #dc262622; }

/* Month grid */
.kal-month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.kal-weekday-label {
  background: var(--bg);
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 8px 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kal-day-cell {
  background: var(--bg-card);
  min-height: 90px;
  padding: 6px;
  cursor: pointer;
  position: relative;
  transition: background 0.1s;
}
.kal-day-cell:hover { background: var(--bg-card-hover); }
.kal-day-cell:hover .kal-day-add { opacity: 1; }

.kal-day-other { background: var(--bg); }
.kal-day-other .kal-day-num { color: var(--text-muted); opacity: 0.4; }
.kal-day-today { background: color-mix(in srgb, var(--accent) 8%, var(--bg-card)); }
.kal-day-today .kal-day-num {
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
}

.kal-day-num {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px; height: 22px;
  margin-bottom: 4px;
}

.kal-day-events { display: flex; flex-direction: column; gap: 2px; }

.kal-event-pill {
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  white-space: nowrap;
  transition: opacity 0.1s;
}
.kal-event-pill:hover { opacity: 0.8; }
.kal-event-time { opacity: 0.7; flex-shrink: 0; }
.kal-event-name { overflow: hidden; text-overflow: ellipsis; }

.kal-event-more {
  font-size: 0.68rem;
  color: var(--text-muted);
  padding: 1px 4px;
}

.kal-day-add {
  position: absolute;
  top: 4px; right: 4px;
  width: 18px; height: 18px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}
.kal-day-add:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

/* Legend */
.kal-legend {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.kal-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Day / Tag view */
.kal-section-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.kal-timeline {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.kal-hour-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--border);
  min-height: 44px;
}
.kal-hour-row:last-child { border-bottom: none; }

.kal-hour-label {
  width: 52px;
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg);
  border-right: 1px solid var(--border);
  display: flex;
  align-items: flex-start;
  padding: 6px 6px 0;
}

.kal-hour-content {
  flex: 1;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.kal-hour-empty {
  flex: 1;
  min-height: 28px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}
.kal-hour-empty:hover { background: var(--bg-card-hover); }

.kal-tag-event {
  border-left: 3px solid var(--accent);
  border-radius: 0 6px 6px 0;
  padding: 6px 10px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.kal-tag-event:hover { opacity: 0.85; }
.kal-tag-event-readonly { cursor: default; }

/* Year grid */
.kal-year-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.kal-mini-month {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
  background: var(--bg);
}

.kal-mini-month-title {
  font-size: 0.8125rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8px;
  color: var(--text);
}

.kal-mini-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.kal-mini-weekday {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--text-muted);
  text-align: center;
  padding: 2px 0;
  text-transform: uppercase;
}

.kal-mini-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.65rem;
  padding: 2px 1px;
  border-radius: 3px;
  cursor: pointer;
  color: var(--text);
  transition: background 0.1s;
  min-height: 22px;
  gap: 1px;
}
.kal-mini-day:hover { background: var(--bg-card-hover); }
.kal-mini-day-other { color: var(--text-muted); opacity: 0.3; cursor: default; }
.kal-mini-day-today span {
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  width: 16px; height: 16px;
  display: flex; align-items: center; justify-content: center;
}

.kal-mini-dots {
  display: flex;
  gap: 2px;
  justify-content: center;
}

/* Modal */
.kal-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.kal-modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.kal-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.kal-modal-close {
  width: 30px; height: 30px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg);
  color: var(--text-muted);
  font-size: 0.875rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.kal-modal-close:hover { background: var(--bg-card-hover); color: var(--text); }

.kal-field { display: flex; flex-direction: column; gap: 5px; }
.kal-field label { font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); }

.kal-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.15s;
  width: 100%;
}
.kal-input:focus { outline: none; border-color: var(--accent); }

@media (max-width: 640px) {
  .kal-month-grid { gap: 0; }
  .kal-day-cell { min-height: 60px; }
  .kal-year-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .kal-event-pill { display: none; }
  .kal-day-events::after {
    content: '';
    display: block;
  }
}
`;
