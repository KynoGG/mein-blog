'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';
import { readRegistry, searchUsers, upsertUser } from '@/lib/userRegistry';

const DEMO_USERS = [
  { id: 'demo-user-alex', email: 'alex@kynogg.de', username: 'alex_kynogg', name: 'Alex Müller', avatar: null, bio: 'Fitness-Fan · Push/Pull/Legs · 3 Jahre Training' },
];

const NOTES_KEY      = 'livora-notizen';
const NOTIF_KEY      = 'kynogg-todo-notifs';
const DEMO_NOTE_ID   = 'demo-alex-note-001';
const DEMO_USER_ID   = 'demo-user-alex';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function now()  { return new Date().toISOString(); }

function readLS(key, fb) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fb; } catch { return fb; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function pushNotif(forUserId, notif) {
  const all = readLS(NOTIF_KEY, []);
  all.unshift({ id: uid(), gelesen: false, erstellt: now(), ...notif, forUserId });
  writeLS(NOTIF_KEY, all.slice(0, 200));
}

function ensureDemoSharedNote(currentUserId) {
  const all = readLS(NOTES_KEY, []);
  // Alte Version entfernen falls sharedWith noch IDs statt Objekte enthält
  const existing = all.find(n => n.id === DEMO_NOTE_ID);
  if (existing) {
    const isOldFormat = existing.sharedWith?.some(x => typeof x === 'string');
    if (!isOldFormat) return; // aktuelles Format — nichts tun
    writeLS(NOTES_KEY, all.filter(n => n.id !== DEMO_NOTE_ID));
  }
  const demoNote = {
    id:        DEMO_NOTE_ID,
    ownerId:   DEMO_USER_ID,
    ownerName: 'Alex Müller',
    titel:     'Supplement-Liste 💊',
    inhalt:    '– Creatin Monohydrat (5g täglich, morgens)\n– Whey Protein (nach dem Training)\n– Vitamin D3 + K2 (morgens zum Essen)\n– Omega-3 Fischöl (2 Kapseln täglich)\n– Magnesium (abends vor dem Schlafen)\n– Zink (bei Bedarf, nicht dauerhaft)\n\nAlex: Die Reihenfolge ist so, wie ich sie selbst einnehme. Creatin und Protein sind Pflicht, der Rest optional!',
    farbe:     '#2563eb',
    erstellt:  new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    geaendert: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    sharedWith: [{ id: currentUserId, name: 'Du', username: 'ich' }],
  };
  const fresh = readLS(NOTES_KEY, []);
  writeLS(NOTES_KEY, [demoNote, ...fresh]);
}

const FARBEN = [
  '#7c3aed','#16a34a','#d97706','#2563eb','#db2777','#0891b2',
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function NotizenPage() {
  const { user } = useAuth();
  const [notes,    setNotes]    = useState([]);
  const [loaded,   setLoaded]   = useState(false);
  const [activeId, setActiveId] = useState(null); // null = Übersicht
  const [creating, setCreating] = useState(false);
  const [searchQ,  setSearchQ]  = useState('');

  useEffect(() => {
    if (!user?.id) return;
    DEMO_USERS.forEach(u => upsertUser(u)); // Alex immer in Registry sicherstellen
    ensureDemoSharedNote(user.id);
    const all = readLS(NOTES_KEY, []);
    const mine = all.filter(n => n.ownerId === user.id || n.sharedWith?.some(u => u.id === user.id));
    setNotes(mine);
    setLoaded(true);
  }, [user?.id]);

  function persist(updated) {
    const all = readLS(NOTES_KEY, []);
    const ids = new Set(updated.map(n => n.id));
    const others = all.filter(n => !ids.has(n.id) && n.ownerId !== user?.id);
    writeLS(NOTES_KEY, [...updated, ...others]);
    setNotes(updated);
  }

  function isSharedWithMe(note) {
    return note.sharedWith?.some(u => u.id === user?.id);
  }

  function handleCreate({ titel, inhalt, farbe }) {
    const note = {
      id: uid(), ownerId: user.id,
      ownerName: user.user_metadata?.name || user.email,
      titel, inhalt, farbe,
      erstellt: now(), geaendert: now(), sharedWith: [],
    };
    const updated = [note, ...notes];
    persist(updated);
    setCreating(false);
    setActiveId(note.id);
  }

  function handleUpdate(id, changes) {
    persist(notes.map(n => n.id === id ? { ...n, ...changes, geaendert: now() } : n));
  }

  function handleDelete(id) {
    persist(notes.filter(n => n.id !== id));
    setActiveId(null);
  }

  function handleShare(id, targetUser) {
    const note = notes.find(n => n.id === id);
    if (!note || note.sharedWith?.some(u => u.id === targetUser.id)) return;
    const sharedEntry = { id: targetUser.id, name: targetUser.name, username: targetUser.username };
    handleUpdate(id, { sharedWith: [...(note.sharedWith ?? []), sharedEntry] });
    pushNotif(targetUser.id, {
      typ: 'notiz-geteilt',
      text: `${note.ownerName} hat eine Notiz mit dir geteilt: „${note.titel}"`,
      link: '/notizen',
    });
  }

  function handleUnshare(id, targetId) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    handleUpdate(id, { sharedWith: (note.sharedWith ?? []).filter(u => u.id !== targetId) });
  }

  if (!loaded) return null;
  if (!user)   return <AuthGate />;

  const activeNote = notes.find(n => n.id === activeId) ?? null;

  // ── Detail-Ansicht ──────────────────────────────────────────────────────────
  if (creating) {
    return (
      <main className="main-content">
        <div className="tracker-page">
          <button className="nz-back-btn" onClick={() => setCreating(false)}>
            ← Alle Notizen
          </button>
          <div className="nz-editor-wrap">
            <NewNoteForm onSave={handleCreate} onCancel={() => setCreating(false)} />
          </div>
        </div>
      </main>
    );
  }

  if (activeNote) {
    return (
      <main className="main-content">
        <div className="tracker-page">
          <button className="nz-back-btn" onClick={() => setActiveId(null)}>
            ← Alle Notizen
          </button>
          <NoteDetail
            note={activeNote}
            isOwn={activeNote.ownerId === user.id}
            onUpdate={changes => handleUpdate(activeNote.id, changes)}
            onDelete={() => handleDelete(activeNote.id)}
            onShare={tu => handleShare(activeNote.id, tu)}
            onUnshare={tid => handleUnshare(activeNote.id, tid)}
          />
        </div>
      </main>
    );
  }

  // ── Übersicht ───────────────────────────────────────────────────────────────
  const privateNotes = notes.filter(n => n.ownerId === user.id && !(n.sharedWith?.length > 0));
  const mySharedNotes = notes.filter(n => n.ownerId === user.id && n.sharedWith?.length > 0);
  const sharedNotes   = notes.filter(n => n.ownerId !== user.id && isSharedWithMe(n));

  const filterNotes = (list) => !searchQ.trim() ? list : list.filter(n =>
    n.titel.toLowerCase().includes(searchQ.toLowerCase()) ||
    n.inhalt.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <main className="main-content">
      <div className="tracker-page">

        <div className="tracker-header">
          <span className="cat-pill small cat-ki">📝 Notizen</span>
          <h1 className="kategorie-title" style={{ marginTop: 10 }}>Meine Notizen</h1>
          <p className="tracker-sub">Erstelle Notizen und teile sie mit Freunden.</p>
        </div>

        {/* Toolbar */}
        <div className="nz-toolbar">
          <input
            type="text"
            className="tracker-input nz-search"
            placeholder="Notizen durchsuchen…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          <button className="tracker-submit" onClick={() => setCreating(true)}>
            + Neue Notiz
          </button>
        </div>

        {notes.length === 0 && (
          <div className="tracker-empty" style={{ paddingTop: 60 }}>
            <span>📝</span>
            <p>Noch keine Notizen. Erstelle deine erste!</p>
          </div>
        )}

        {/* Nur für mich */}
        {filterNotes(privateNotes).length > 0 && (
          <>
            <p className="section-label" style={{ marginBottom: 12 }}>🔒 Nur für mich</p>
            <div className="nz-grid">
              {filterNotes(privateNotes).map(note => (
                <NoteCard key={note.id} note={note} onClick={() => setActiveId(note.id)} />
              ))}
            </div>
          </>
        )}

        {/* Geteilt mit Freunden */}
        {filterNotes(mySharedNotes).length > 0 && (
          <>
            <p className="section-label" style={{ margin: '28px 0 12px' }}>🔗 Geteilt mit Freunden</p>
            <div className="nz-grid">
              {filterNotes(mySharedNotes).map(note => (
                <NoteCard key={note.id} note={note} sharedByMe onClick={() => setActiveId(note.id)} />
              ))}
            </div>
          </>
        )}

        {/* Von Freunden geteilt */}
        {filterNotes(sharedNotes).length > 0 && (
          <>
            <p className="section-label" style={{ margin: '28px 0 12px' }}>👥 Mit mir geteilt</p>
            <div className="nz-grid">
              {filterNotes(sharedNotes).map(note => (
                <NoteCard key={note.id} note={note} shared onClick={() => setActiveId(note.id)} />
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  );
}

// ── Notizkarte (Mappe) ────────────────────────────────────────────────────────
function NoteCard({ note, shared, sharedByMe, onClick }) {
  const sharedWith = note.sharedWith ?? [];
  return (
    <div className="nz-folder-card" onClick={onClick} style={{ '--nz-color': note.farbe || '#7c3aed' }}>
      <div className="nz-folder-top" />
      <div className="nz-folder-body">
        <div className="nz-folder-header">
          <span className="nz-folder-title">{note.titel || 'Ohne Titel'}</span>
          {shared     && <span className="nz-shared-badge">von {note.ownerName?.split(' ')[0]}</span>}
          {sharedByMe && <span className="nz-shared-badge nz-shared-badge-own">
            {sharedWith.length} {sharedWith.length === 1 ? 'Person' : 'Personen'}
          </span>}
        </div>
        <p className="nz-folder-preview">
          {note.inhalt?.slice(0, 100)}{note.inhalt?.length > 100 ? '…' : ''}
        </p>
        <span className="nz-folder-date">{fmtDate(note.geaendert)}</span>
      </div>
    </div>
  );
}

// ── Neue Notiz Formular ───────────────────────────────────────────────────────
function NewNoteForm({ onSave, onCancel }) {
  const [titel,  setTitel]  = useState('');
  const [inhalt, setInhalt] = useState('');
  const [farbe,  setFarbe]  = useState(FARBEN[0]);

  return (
    <form className="nz-new-form" onSubmit={e => { e.preventDefault(); if (titel.trim()) onSave({ titel: titel.trim(), inhalt, farbe }); }}>
      <h2 className="nz-editor-heading">Neue Notiz</h2>
      <input
        type="text" className="tracker-input" placeholder="Titel…"
        value={titel} onChange={e => setTitel(e.target.value)} required autoFocus
      />
      <textarea
        className="tracker-input nz-textarea" placeholder="Inhalt der Notiz…"
        value={inhalt} onChange={e => setInhalt(e.target.value)} rows={8}
      />
      <div className="nz-farben">
        {FARBEN.map(f => (
          <button key={f} type="button"
            className={`nz-farbe-dot${farbe === f ? ' active' : ''}`}
            style={{ background: f }} onClick={() => setFarbe(f)} />
        ))}
      </div>
      <div className="plan-form-actions">
        <button type="submit" className="tracker-submit plan-save-btn">Erstellen</button>
        <button type="button" className="plan-cancel-btn" onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  );
}

// ── Notiz Detail & Editor ─────────────────────────────────────────────────────
function NoteDetail({ note, isOwn, onUpdate, onDelete, onShare, onUnshare }) {
  const [editTitel,  setEditTitel]  = useState(note.titel);
  const [editInhalt, setEditInhalt] = useState(note.inhalt);
  const [editFarbe,  setEditFarbe]  = useState(note.farbe || FARBEN[0]);
  const [dirty,      setDirty]      = useState(false);
  const [shareQ,     setShareQ]     = useState('');
  const [shareRes,   setShareRes]   = useState([]);
  const [showShare,  setShowShare]  = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    setEditTitel(note.titel);
    setEditInhalt(note.inhalt);
    setEditFarbe(note.farbe || FARBEN[0]);
    setDirty(false);
  }, [note.id]);

  useEffect(() => {
    if (!dirty || !isOwn) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate({ titel: editTitel, inhalt: editInhalt, farbe: editFarbe });
      setDirty(false);
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [editTitel, editInhalt, editFarbe, dirty]);

  function change(fn) { fn(); setDirty(true); }

  const sharedUsers = note.sharedWith ?? [];

  return (
    <div className="nz-editor-wrap">
      <div className="nz-editor-topbar" style={{ borderLeft: `4px solid ${editFarbe}` }}>
        {isOwn ? (
          <input
            className="nz-detail-title-input"
            value={editTitel}
            onChange={e => change(() => setEditTitel(e.target.value))}
            placeholder="Titel…"
          />
        ) : (
          <h2 className="nz-detail-title-ro">{note.titel}</h2>
        )}
        <p className="nz-meta">Zuletzt geändert: {fmtDate(note.geaendert)}</p>
      </div>

      {isOwn && (
        <div className="nz-farben" style={{ padding: '0 0 12px' }}>
          {FARBEN.map(f => (
            <button key={f} type="button"
              className={`nz-farbe-dot${editFarbe === f ? ' active' : ''}`}
              style={{ background: f }} onClick={() => change(() => setEditFarbe(f))} />
          ))}
        </div>
      )}

      {isOwn ? (
        <textarea
          className="tracker-input nz-textarea nz-detail-area"
          value={editInhalt}
          onChange={e => change(() => setEditInhalt(e.target.value))}
          placeholder="Schreibe hier deine Notiz…"
        />
      ) : (
        <p className="nz-detail-content-ro">{note.inhalt}</p>
      )}

      {isOwn && (
        <>
          {/* Geteilt mit — immer sichtbar wenn vorhanden */}
          {sharedUsers.length > 0 && (
            <div className="nz-shared-list">
              <p className="nz-share-label">Geteilt mit</p>
              {sharedUsers.map(u => (
                <div key={u.id} className="nz-share-row">
                  <div className="nz-share-user-info">
                    <span className="nz-share-dot" />
                    <span className="nz-share-name">{u.name || u.username}</span>
                    {u.username && u.username !== 'ich' && (
                      <span className="nz-share-user">@{u.username}</span>
                    )}
                  </div>
                  <button className="pe-remove-btn" onClick={() => onUnshare(u.id)}>Entfernen</button>
                </div>
              ))}
            </div>
          )}

          <div className="nz-actions">
            <button className="tp-dash-active-btn" onClick={() => setShowShare(s => !s)}>
              🔗 {showShare ? 'Suche schließen' : 'Teilen mit…'}
            </button>
            <button className="plan-cancel-btn"
              onClick={() => { if (confirm('Notiz wirklich löschen?')) onDelete(); }}>
              Löschen
            </button>
          </div>

          {/* Suchfeld zum Teilen */}
          {showShare && (
            <div className="nz-share-panel">
              <p className="nz-share-label">Nutzer suchen</p>
              <input
                type="text" className="tracker-input"
                placeholder="Name oder @benutzername…"
                value={shareQ}
                autoFocus
                onChange={e => {
                  setShareQ(e.target.value);
                  setShareRes(e.target.value.trim()
                    ? searchUsers(e.target.value.trim()).filter(u => u.id !== note.ownerId)
                    : []);
                }}
              />
              {shareRes.length > 0 && (
                <div className="nz-share-results">
                  {shareRes.map(u => (
                    <div key={u.id} className="nz-share-row">
                      <span className="nz-share-name">{u.name || u.username} <span className="nz-share-user">@{u.username}</span></span>
                      {note.sharedWith?.some(s => s.id === u.id)
                        ? <span className="nz-already-shared">✓ Geteilt</span>
                        : <button className="tracker-submit plan-save-btn"
                            style={{ padding: '4px 14px', fontSize: '0.8rem' }}
                            onClick={() => { onShare(u); setShareQ(''); setShareRes([]); setShowShare(false); }}>
                            Teilen
                          </button>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
