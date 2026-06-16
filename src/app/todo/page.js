'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';
import { readRegistry, searchUsers } from '@/lib/userRegistry';

// ── Storage keys ──────────────────────────────────────────────────────────────
const LISTS_KEY  = 'kynogg-todo-listen';
const ITEMS_KEY  = 'kynogg-todo-items';
const NOTIF_KEY  = 'kynogg-todo-notifs';

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function now()  { return new Date().toISOString(); }
function fmt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Notification helpers ──────────────────────────────────────────────────────
function pushNotif(forUserId, notif) {
  const all = readLS(NOTIF_KEY, []);
  all.unshift({ id: uid(), gelesen: false, erstellt: now(), ...notif, forUserId });
  writeLS(NOTIF_KEY, all.slice(0, 200));
}

function notifsFor(userId) {
  return readLS(NOTIF_KEY, []).filter(n => n.forUserId === userId);
}

// ── List colours ──────────────────────────────────────────────────────────────
const FARBEN = [
  { key: 'violet', val: '#7c3aed' },
  { key: 'green',  val: '#16a34a' },
  { key: 'amber',  val: '#d97706' },
  { key: 'blue',   val: '#2563eb' },
  { key: 'pink',   val: '#db2777' },
  { key: 'cyan',   val: '#0891b2' },
  { key: 'red',    val: '#dc2626' },
  { key: 'lime',   val: '#65a30d' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function TodoPage() {
  const { user } = useAuth();

  const [listen,   setListen]   = useState([]);
  const [items,    setItems]    = useState([]);
  const [notifs,   setNotifs]   = useState([]);
  const [loaded,   setLoaded]   = useState(false);

  const [activeListId,  setActiveListId]  = useState(null);
  const [showNewList,   setShowNewList]   = useState(false);
  const [showNotifs,    setShowNotifs]    = useState(false);

  // Load everything from localStorage
  useEffect(() => {
    setListen(readLS(LISTS_KEY, []));
    setItems(readLS(ITEMS_KEY, []));
    if (user?.id) setNotifs(notifsFor(user.id));
    setLoaded(true);
  }, [user?.id]);

  // Persist on change
  useEffect(() => { if (loaded) writeLS(LISTS_KEY, listen); }, [listen, loaded]);
  useEffect(() => { if (loaded) writeLS(ITEMS_KEY, items);  }, [items,  loaded]);

  // Poll notifications every 5 s (simulates real-time for same-device multi-user)
  useEffect(() => {
    if (!user?.id) return;
    const t = setInterval(() => setNotifs(notifsFor(user.id)), 5000);
    return () => clearInterval(t);
  }, [user?.id]);

  const userId   = user?.id ?? null;
  const username = user?.username ?? user?.email ?? 'Anonym';

  // Lists visible to current user (owner or member)
  const meineListen = useMemo(() =>
    listen.filter(l => l.owner === userId || l.mitglieder?.some(m => m.id === userId)),
    [listen, userId]
  );

  const activeList = useMemo(() => listen.find(l => l.id === activeListId) ?? null, [listen, activeListId]);
  const activeItems = useMemo(() => items.filter(i => i.listeId === activeListId), [items, activeListId]);

  const ungelesen = useMemo(() => notifs.filter(n => !n.gelesen).length, [notifs]);

  // ── List CRUD ──────────────────────────────────────────────────────────────
  function createList(data) {
    const liste = { id: uid(), owner: userId, ownerName: username, mitglieder: [], erstellt: now(), ...data };
    setListen(prev => [...prev, liste]);
    setActiveListId(liste.id);
    setShowNewList(false);
  }

  function updateList(id, patch) {
    setListen(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function deleteList(id) {
    setListen(prev => prev.filter(l => l.id !== id));
    setItems(prev => prev.filter(i => i.listeId !== id));
    if (activeListId === id) setActiveListId(null);
  }

  // ── Member management ──────────────────────────────────────────────────────
  function inviteMember(liste, targetUser) {
    if (liste.mitglieder.some(m => m.id === targetUser.id)) return 'already';
    if (liste.owner === targetUser.id) return 'already';
    const updated = { ...liste, mitglieder: [...liste.mitglieder, { id: targetUser.id, username: targetUser.username, name: targetUser.name }] };
    updateList(liste.id, { mitglieder: updated.mitglieder });
    pushNotif(targetUser.id, {
      typ: 'eingeladen',
      listeId: liste.id,
      listeTitel: liste.titel,
      vonUser: username,
      text: `${username} hat dich zur Liste „${liste.titel}" eingeladen.`,
    });
    return 'ok';
  }

  function removeMember(liste, memberId) {
    updateList(liste.id, { mitglieder: liste.mitglieder.filter(m => m.id !== memberId) });
  }

  // ── Item CRUD ──────────────────────────────────────────────────────────────
  function addItem(listeId, text, zugewiesen = null) {
    if (!text.trim()) return;
    const item = { id: uid(), listeId, text: text.trim(), erledigt: false, ersteller: userId, erstellerName: username, zugewiesen, erledigtVon: null, erledigtVonName: null, erstellt: now(), erledigtAm: null };
    setItems(prev => [...prev, item]);

    const liste = listen.find(l => l.id === listeId);
    if (liste) {
      const others = [liste.owner, ...liste.mitglieder.map(m => m.id)].filter(id => id !== userId);
      others.forEach(uid2 => pushNotif(uid2, {
        typ: 'item_hinzugefuegt',
        listeId,
        listeTitel: liste.titel,
        vonUser: username,
        text: `${username} hat „${text.trim()}" zur Liste „${liste.titel}" hinzugefügt.`,
      }));
      // Extra-Notif für die zugewiesene Person
      if (zugewiesen && zugewiesen.id !== userId) {
        pushNotif(zugewiesen.id, {
          typ: 'item_zugewiesen',
          listeId,
          listeTitel: liste.titel,
          vonUser: username,
          text: `${username} hat dir „${text.trim()}" in „${liste.titel}" zugewiesen.`,
        });
      }
    }
  }

  function assignItem(itemId, zugewiesen) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, zugewiesen } : i));
    const item = items.find(i => i.id === itemId);
    const liste = item ? listen.find(l => l.id === item.listeId) : null;
    if (zugewiesen && zugewiesen.id !== userId && liste) {
      pushNotif(zugewiesen.id, {
        typ: 'item_zugewiesen',
        listeId: item.listeId,
        listeTitel: liste.titel,
        vonUser: username,
        text: `${username} hat dir „${item.text}" in „${liste.titel}" zugewiesen.`,
      });
    }
  }

  function toggleItem(item) {
    const now2 = now();
    const erledigt = !item.erledigt;
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, erledigt, erledigtVon: erledigt ? userId : null, erledigtVonName: erledigt ? username : null, erledigtAm: erledigt ? now2 : null }
      : i
    ));

    const liste = listen.find(l => l.id === item.listeId);
    if (liste && erledigt) {
      const others = [liste.owner, ...liste.mitglieder.map(m => m.id)].filter(id => id !== userId);
      others.forEach(uid2 => pushNotif(uid2, {
        typ: 'item_erledigt',
        listeId: item.listeId,
        listeTitel: liste.titel,
        vonUser: username,
        text: `${username} hat „${item.text}" in „${liste.titel}" abgehakt.`,
      }));
    }
  }

  function deleteItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function editItem(id, text) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, text } : i));
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  function markAllRead() {
    const all = readLS(NOTIF_KEY, []);
    const updated = all.map(n => n.forUserId === userId ? { ...n, gelesen: true } : n);
    writeLS(NOTIF_KEY, updated);
    setNotifs(notifsFor(userId));
  }

  function clearNotifs() {
    const all = readLS(NOTIF_KEY, []).filter(n => n.forUserId !== userId);
    writeLS(NOTIF_KEY, all);
    setNotifs([]);
  }

  if (!loaded) return <div className="container" style={{ padding: '40px 24px', color: 'var(--text-muted)' }}>Lädt…</div>;
  if (!user) return <AuthGate />;

  if (!userId) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: 12 }}>📋</p>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", marginBottom: 8 }}>To-do Listen</h2>
        <p style={{ color: 'var(--text-muted)' }}>Bitte melde dich an, um deine To-do Listen zu verwalten.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      {/* ── Header ── */}
      <div className="todo-page-header">
        <h1 className="todo-page-title">To-do Listen</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button
              className="todo-icon-btn"
              onClick={() => { setShowNotifs(o => !o); if (!showNotifs) markAllRead(); }}
              title="Benachrichtigungen"
            >
              🔔
              {ungelesen > 0 && (
                <span className="todo-notif-badge">{ungelesen > 9 ? '9+' : ungelesen}</span>
              )}
            </button>
            {showNotifs && (
              <NotifPanel notifs={notifs} onClear={clearNotifs} onClose={() => setShowNotifs(false)} onOpenList={id => { setActiveListId(id); setShowNotifs(false); }} />
            )}
          </div>
          <button className="todo-new-btn" onClick={() => setShowNewList(true)}>+ Neue Liste</button>
        </div>
      </div>

      <div className="todo-layout">
        {/* ── Sidebar: list of lists ── */}
        <aside className="todo-sidebar">
          {meineListen.length === 0 ? (
            <div className="todo-empty-sidebar">
              <span style={{ fontSize: '2rem' }}>📋</span>
              <p>Noch keine Listen.</p>
              <button className="todo-new-btn" onClick={() => setShowNewList(true)}>Erste Liste erstellen</button>
            </div>
          ) : (
            meineListen.map(liste => {
              const listeItems   = items.filter(i => i.listeId === liste.id);
              const erledigtCount = listeItems.filter(i => i.erledigt).length;
              const isOwner = liste.owner === userId;
              return (
                <button
                  key={liste.id}
                  className={`todo-list-row${activeListId === liste.id ? ' active' : ''}`}
                  onClick={() => setActiveListId(liste.id)}
                >
                  <span className="todo-list-dot" style={{ background: liste.farbe }} />
                  <span className="todo-list-row-title">{liste.titel}</span>
                  <span className="todo-list-row-meta">
                    {erledigtCount}/{listeItems.length}
                    {liste.mitglieder?.length > 0 && <span className="todo-shared-icon" title="Geteilt">👥</span>}
                    {!isOwner && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}> (Eingeladen)</span>}
                  </span>
                </button>
              );
            })
          )}
        </aside>

        {/* ── Main panel ── */}
        <main className="todo-main">
          {!activeList ? (
            <div className="todo-empty-main">
              <span style={{ fontSize: '3rem' }}>✅</span>
              <p>Wähle eine Liste aus oder erstelle eine neue.</p>
            </div>
          ) : (
            <ListDetail
              liste={activeList}
              items={activeItems}
              userId={userId}
              username={username}
              isOwner={activeList.owner === userId}
              onAddItem={(text, zugewiesen) => addItem(activeList.id, text, zugewiesen)}
              onToggle={toggleItem}
              onDeleteItem={deleteItem}
              onEditItem={editItem}
              onAssignItem={assignItem}
              onUpdateList={patch => updateList(activeList.id, patch)}
              onDeleteList={() => deleteList(activeList.id)}
              onInvite={targetUser => inviteMember(activeList, targetUser)}
              onRemoveMember={memberId => removeMember(activeList, memberId)}
            />
          )}
        </main>
      </div>

      {/* ── New List Modal ── */}
      {showNewList && (
        <NewListModal onSave={createList} onClose={() => setShowNewList(false)} />
      )}

      <style>{todoCSS}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ListDetail
// ═══════════════════════════════════════════════════════════════════════════════
function ListDetail({ liste, items, userId, username, isOwner, onAddItem, onToggle, onDeleteItem, onEditItem, onAssignItem, onUpdateList, onDeleteList, onInvite, onRemoveMember }) {
  const [newText,      setNewText]      = useState('');
  const [newAssignee,  setNewAssignee]  = useState('');   // member id or ''
  const [showMembers,  setShowMembers]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter,       setFilter]       = useState('alle'); // 'alle'|'offen'|'erledigt'|'meine'
  const inputRef = useRef(null);

  // Members including owner, for assignment dropdown
  const allMembers = useMemo(() => [
    { id: liste.owner, name: liste.ownerName || 'Ersteller' },
    ...(liste.mitglieder || []).map(m => ({ id: m.id, name: m.name || m.username })),
  ], [liste]);

  const isShared = allMembers.length > 1;

  useEffect(() => { inputRef.current?.focus(); }, [liste.id]);

  const filtered = useMemo(() => {
    let base = items;
    if (filter === 'offen')    base = items.filter(i => !i.erledigt);
    if (filter === 'erledigt') base = items.filter(i =>  i.erledigt);
    if (filter === 'meine')    base = items.filter(i => i.zugewiesen?.id === userId || i.ersteller === userId);
    return base;
  }, [items, filter, userId]);

  const offen    = items.filter(i => !i.erledigt).length;
  const erledigt = items.filter(i =>  i.erledigt).length;
  const progress = items.length > 0 ? Math.round((erledigt / items.length) * 100) : 0;

  function submit(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    const assignee = newAssignee ? allMembers.find(m => m.id === newAssignee) ?? null : null;
    onAddItem(newText, assignee);
    setNewText('');
    setNewAssignee('');
  }

  return (
    <div>
      {/* ── List header ── */}
      <div className="todo-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="todo-list-dot lg" style={{ background: liste.farbe }} />
          <div>
            <h2 className="todo-detail-title">{liste.titel}</h2>
            {liste.beschreibung && <p className="todo-detail-desc">{liste.beschreibung}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="todo-icon-btn" onClick={() => setShowMembers(true)} title="Mitglieder">👥</button>
          {isOwner && <button className="todo-icon-btn" onClick={() => setShowSettings(true)} title="Einstellungen">⚙️</button>}
          {isOwner && <button className="todo-icon-btn danger" onClick={() => { if (confirm('Liste wirklich löschen?')) onDeleteList(); }} title="Liste löschen">🗑️</button>}
        </div>
      </div>

      {/* ── Progress bar ── */}
      {items.length > 0 && (
        <div className="todo-progress-wrap">
          <div className="todo-progress-bar">
            <div className="todo-progress-fill" style={{ width: progress + '%', background: liste.farbe }} />
          </div>
          <span className="todo-progress-label">{erledigt}/{items.length} erledigt · {progress}%</span>
        </div>
      )}

      {/* ── Members chips ── */}
      {liste.mitglieder?.length > 0 && (
        <div className="todo-members-chips">
          <span className="todo-chip owner">👑 {liste.ownerName || 'Ersteller'}</span>
          {liste.mitglieder.map(m => (
            <span key={m.id} className="todo-chip">{m.name || m.username}</span>
          ))}
        </div>
      )}

      {/* ── Add item ── */}
      <form onSubmit={submit} className="todo-add-form">
        <input
          ref={inputRef}
          className="todo-input"
          placeholder="Neues To-do hinzufügen…"
          value={newText}
          onChange={e => setNewText(e.target.value)}
        />
        <select
          className="todo-assign-select"
          value={newAssignee}
          onChange={e => setNewAssignee(e.target.value)}
          title="Aufgabe zuweisen"
          style={!isShared ? { visibility: 'hidden', pointerEvents: 'none' } : {}}
          tabIndex={!isShared ? -1 : 0}
        >
          <option value="">Zuweisen…</option>
          {allMembers.map(m => (
            <option key={m.id} value={m.id}>
              {m.id === userId ? `${m.name} (Ich)` : m.name}
            </option>
          ))}
        </select>
        <button type="submit" className="todo-add-btn" style={{ background: liste.farbe }}>+</button>
      </form>

      {/* ── Filter tabs ── */}
      <div className="todo-filter-row">
        {[
          ['alle','Alle'],
          ['offen','Offen'],
          ['erledigt','Erledigt'],
          ...(isShared ? [['meine','Meine']] : []),
        ].map(([k,l]) => (
          <button key={k} className={`todo-filter-btn${filter === k ? ' active' : ''}`} style={filter===k ? { borderColor: liste.farbe, color: liste.farbe } : {}} onClick={() => setFilter(k)}>{l}</button>
        ))}
        <span className="todo-stats">{offen} offen · {erledigt} erledigt</span>
      </div>

      {/* ── Items ── */}
      {filtered.length === 0 ? (
        <div className="todo-empty-items">
          {filter === 'erledigt' ? 'Noch nichts abgehakt.' : filter === 'offen' ? 'Alles erledigt! 🎉' : 'Noch keine Einträge. Füge dein erstes To-do hinzu.'}
        </div>
      ) : (
        <ul className="todo-items-list">
          {filtered.map(item => (
            <TodoItem
              key={item.id}
              item={item}
              accentColor={liste.farbe}
              allMembers={isShared ? allMembers : []}
              onToggle={() => onToggle(item)}
              onDelete={() => onDeleteItem(item.id)}
              onEdit={text => onEditItem(item.id, text)}
              onAssign={member => onAssignItem(item.id, member)}
            />
          ))}
        </ul>
      )}

      {/* ── Modals ── */}
      {showMembers && (
        <MembersModal
          liste={liste}
          userId={userId}
          username={username}
          isOwner={isOwner}
          onInvite={onInvite}
          onRemove={onRemoveMember}
          onClose={() => setShowMembers(false)}
        />
      )}
      {showSettings && (
        <ListSettingsModal
          liste={liste}
          onSave={onUpdateList}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TodoItem
// ═══════════════════════════════════════════════════════════════════════════════
function TodoItem({ item, accentColor, allMembers, onToggle, onDelete, onEdit, onAssign }) {
  const [editing,        setEditing]        = useState(false);
  const [draft,          setDraft]          = useState(item.text);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const assignRef = useRef(null);

  useEffect(() => {
    if (!showAssignMenu) return;
    function close(e) { if (assignRef.current && !assignRef.current.contains(e.target)) setShowAssignMenu(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showAssignMenu]);

  function saveEdit() {
    if (draft.trim()) onEdit(draft.trim());
    setEditing(false);
  }

  const assignee = item.zugewiesen;

  return (
    <li className={`todo-item${item.erledigt ? ' done' : ''}`}>
      <button
        className="todo-check"
        onClick={onToggle}
        style={item.erledigt ? { background: accentColor, borderColor: accentColor } : {}}
        aria-label={item.erledigt ? 'Als offen markieren' : 'Als erledigt markieren'}
      >
        {item.erledigt && <CheckIcon />}
      </button>

      <div className="todo-item-body">
        {editing ? (
          <input
            className="todo-input inline"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
          />
        ) : (
          <span className="todo-item-text" onDoubleClick={() => setEditing(true)}>{item.text}</span>
        )}
        <div className="todo-item-meta">
          <span>von {item.erstellerName || 'Unbekannt'}</span>
          {assignee && (
            <span className="todo-assignee-badge" style={{ borderColor: accentColor, color: accentColor }}>
              👤 {assignee.name}
            </span>
          )}
          {item.erledigt && item.erledigtVonName && (
            <span> · ✓ {item.erledigtVonName}{item.erledigtAm ? ` am ${fmt(item.erledigtAm)}` : ''}</span>
          )}
        </div>
      </div>

      <div className="todo-item-actions">
        {!editing && <button className="todo-action-btn" onClick={() => setEditing(true)} title="Bearbeiten">✏️</button>}
        {allMembers.length > 0 && (
          <div style={{ position: 'relative' }} ref={assignRef}>
            <button
              className="todo-action-btn"
              onClick={() => setShowAssignMenu(o => !o)}
              title="Zuweisen"
              style={assignee ? { color: accentColor } : {}}
            >
              👤
            </button>
            {showAssignMenu && (
              <div className="todo-assign-menu">
                <div className="todo-assign-menu-title">Zuweisen an</div>
                {allMembers.map(m => (
                  <button
                    key={m.id}
                    className={`todo-assign-menu-item${assignee?.id === m.id ? ' active' : ''}`}
                    style={assignee?.id === m.id ? { color: accentColor } : {}}
                    onClick={() => { onAssign(assignee?.id === m.id ? null : m); setShowAssignMenu(false); }}
                  >
                    <span className="todo-assign-avatar">{(m.name||'?')[0].toUpperCase()}</span>
                    {m.name}
                    {assignee?.id === m.id && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>✓</span>}
                  </button>
                ))}
                {assignee && (
                  <button className="todo-assign-menu-item remove" onClick={() => { onAssign(null); setShowAssignMenu(false); }}>
                    Zuweisung entfernen
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <button className="todo-action-btn" onClick={onDelete} title="Löschen">🗑️</button>
      </div>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Members Modal
// ═══════════════════════════════════════════════════════════════════════════════
function MembersModal({ liste, userId, username, isOwner, onInvite, onRemove, onClose }) {
  const [suche,    setSuche]    = useState('');
  const [results,  setResults]  = useState([]);
  const [msg,      setMsg]      = useState('');

  // Seed demo users so they appear in registry
  useEffect(() => {
    try {
      const { mockAuth } = require('@/lib/mockAuth');
      if (mockAuth?.seedDemoUsers) mockAuth.seedDemoUsers();
    } catch {}
    // Fallback: directly seed known demo users into registry
    try {
      const { readRegistry, writeRegistry } = require('@/lib/userRegistry');
      const reg = readRegistry();
      const demo = { id: 'demo-user-alex', email: 'alex@kynogg.de', username: 'alex_kynogg', name: 'Alex Müller', avatar: null, bio: '' };
      if (!reg.find(u => u.id === demo.id)) { reg.push(demo); writeRegistry(reg); }
    } catch {}
  }, []);

  useEffect(() => {
    const term = suche.trim();
    if (!term) { setResults([]); setMsg(''); return; }
    const found = searchUsers(term).filter(u => u.id !== userId);
    setResults(found);
    setMsg(found.length === 0 ? 'Kein Nutzer gefunden.' : '');
  }, [suche, userId]);

  function invite(user) {
    const r = onInvite(user);
    if (r === 'already') setMsg(`${user.username || user.name} ist bereits Mitglied.`);
    else { setMsg(`${user.username || user.name} wurde eingeladen! ✓`); setResults([]); setSuche(''); }
  }

  // Resolve owner display: use current session username if we're the owner, else stored value
  const ownerDisplay = liste.owner === userId
    ? (username && !username.includes('@') ? username : (liste.ownerName || username))
    : liste.ownerName;

  const allMembers = [
    { id: liste.owner, username: ownerDisplay, name: null, isOwner: true },
    ...(liste.mitglieder || []),
  ];

  return (
    <Modal title="Mitglieder & Einladungen" onClose={onClose}>
      <div className="todo-section-label">Aktuelle Mitglieder</div>
      <ul className="todo-members-list">
        {allMembers.map(m => (
          <li key={m.id} className="todo-member-row">
            <span className="todo-member-avatar">{(m.username || m.name || '?')[0].toUpperCase()}</span>
            <span className="todo-member-name">@{m.username || m.name || m.id}</span>
            {m.isOwner && <span className="todo-owner-badge">Ersteller</span>}
            {!m.isOwner && isOwner && (
              <button className="todo-remove-btn" onClick={() => onRemove(m.id)} title="Entfernen">✕</button>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <>
          <div className="todo-section-label" style={{ marginTop: 20 }}>Nutzer einladen</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            Tippe einen Benutzernamen oder eine E-Mail-Adresse ein.
          </p>
          <input
            className="todo-input"
            placeholder="z.B. alex oder alex@kynogg.de"
            value={suche}
            onChange={e => setSuche(e.target.value)}
            autoComplete="off"
          />
          {msg && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>{msg}</p>}
          {results.length > 0 && (
            <ul className="todo-search-results">
              {results.map(u => (
                <li key={u.id} className="todo-invite-result">
                  <span className="todo-member-avatar">{(u.name || u.username || '?')[0].toUpperCase()}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name || u.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                  </div>
                  <button className="todo-new-btn" onClick={() => invite(u)}>Einladen</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// List Settings Modal
// ═══════════════════════════════════════════════════════════════════════════════
function ListSettingsModal({ liste, onSave, onClose }) {
  const [titel,       setTitel]       = useState(liste.titel);
  const [beschreibung, setBeschreibung] = useState(liste.beschreibung || '');
  const [farbe,       setFarbe]       = useState(liste.farbe);

  function save() {
    if (!titel.trim()) return;
    onSave({ titel: titel.trim(), beschreibung: beschreibung.trim(), farbe });
    onClose();
  }

  return (
    <Modal title="Liste bearbeiten" onClose={onClose}>
      <div className="todo-field">
        <label>Name</label>
        <input className="todo-input" value={titel} onChange={e => setTitel(e.target.value)} />
      </div>
      <div className="todo-field">
        <label>Beschreibung (optional)</label>
        <input className="todo-input" value={beschreibung} onChange={e => setBeschreibung(e.target.value)} placeholder="Worum geht es in dieser Liste?" />
      </div>
      <div className="todo-field">
        <label>Farbe</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FARBEN.map(f => (
            <button key={f.key} type="button" onClick={() => setFarbe(f.val)} style={{ width: 28, height: 28, borderRadius: '50%', background: f.val, border: 'none', cursor: 'pointer', outline: farbe === f.val ? `3px solid ${f.val}` : '2px solid transparent', outlineOffset: 2 }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="todo-cancel-btn" onClick={onClose}>Abbrechen</button>
        <button className="todo-new-btn" onClick={save}>Speichern</button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// New List Modal
// ═══════════════════════════════════════════════════════════════════════════════
function NewListModal({ onSave, onClose }) {
  const [titel,        setTitel]        = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [farbe,        setFarbe]        = useState('#7c3aed');
  const [typ,          setTyp]          = useState('privat');

  function save() {
    if (!titel.trim()) return;
    onSave({ titel: titel.trim(), beschreibung: beschreibung.trim(), farbe, typ });
  }

  return (
    <Modal title="Neue Liste erstellen" onClose={onClose}>
      <div className="todo-field">
        <label>Name *</label>
        <input className="todo-input" placeholder="z.B. Einkaufsliste, Projekt…" value={titel} onChange={e => setTitel(e.target.value)} autoFocus />
      </div>
      <div className="todo-field">
        <label>Beschreibung (optional)</label>
        <input className="todo-input" placeholder="Worum geht es?" value={beschreibung} onChange={e => setBeschreibung(e.target.value)} />
      </div>
      <div className="todo-field">
        <label>Typ</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['privat','🔒 Privat','Nur du kannst diese Liste sehen'], ['geteilt','👥 Geteilt','Du kannst Freunde einladen']].map(([k,l,d]) => (
            <button key={k} type="button" className={`todo-type-btn${typ === k ? ' active' : ''}`} onClick={() => setTyp(k)}>
              <span>{l}</span>
              <span style={{ fontSize: '0.7rem', color: typ === k ? 'inherit' : 'var(--text-muted)', display: 'block' }}>{d}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="todo-field">
        <label>Farbe</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FARBEN.map(f => (
            <button key={f.key} type="button" onClick={() => setFarbe(f.val)} style={{ width: 28, height: 28, borderRadius: '50%', background: f.val, border: 'none', cursor: 'pointer', outline: farbe === f.val ? `3px solid ${f.val}` : '2px solid transparent', outlineOffset: 2 }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="todo-cancel-btn" onClick={onClose}>Abbrechen</button>
        <button className="todo-new-btn" onClick={save} disabled={!titel.trim()}>Erstellen</button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Notification Panel
// ═══════════════════════════════════════════════════════════════════════════════
function NotifPanel({ notifs, onClear, onClose, onOpenList }) {
  const ref = useRef(null);

  useEffect(() => {
    function click(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [onClose]);

  const ICONS = { eingeladen: '📨', item_erledigt: '✅', item_hinzugefuegt: '➕', item_zugewiesen: '👤' };

  return (
    <div className="todo-notif-panel" ref={ref}>
      <div className="todo-notif-header">
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Benachrichtigungen</span>
        {notifs.length > 0 && <button className="todo-notif-clear" onClick={onClear}>Alle löschen</button>}
      </div>
      {notifs.length === 0 ? (
        <div className="todo-notif-empty">Keine Benachrichtigungen</div>
      ) : (
        <ul className="todo-notif-list">
          {notifs.slice(0, 30).map(n => (
            <li key={n.id} className={`todo-notif-item${n.gelesen ? '' : ' unread'}`} onClick={() => onOpenList(n.listeId)}>
              <span className="todo-notif-icon">{ICONS[n.typ] || '🔔'}</span>
              <div>
                <p className="todo-notif-text">{n.text}</p>
                <p className="todo-notif-time">{fmt(n.erstellt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Generic Modal wrapper
// ═══════════════════════════════════════════════════════════════════════════════
function Modal({ title, children, onClose }) {
  return (
    <div className="todo-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="todo-modal">
        <div className="todo-modal-header">
          <h3 className="todo-modal-title">{title}</h3>
          <button className="todo-modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Icons
// ═══════════════════════════════════════════════════════════════════════════════
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,6 5,9 10,3" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════
const todoCSS = `
.todo-page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.todo-page-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em;
}

.todo-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  align-items: stretch;
  min-height: 560px;
}
@media (max-width: 640px) {
  .todo-layout { grid-template-columns: 1fr; min-height: unset; }
  .todo-main { padding: 14px; }
  .todo-add-form { flex-wrap: wrap; }
  .todo-add-form .todo-input { flex: 1 1 100%; }
  .todo-add-form select { flex: 1 1 auto; }
  .todo-filter-row { gap: 4px; }
  .todo-stats { width: 100%; margin-left: 0; }
  .todo-detail-header { gap: 8px; }
  .todo-icon-btn { padding: 6px 8px; font-size: 0.9rem; }
  .todo-members-chips { gap: 4px; }
  .todo-chip { font-size: 0.7rem; padding: 2px 8px; }
}

/* Sidebar */
.todo-sidebar {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  display: flex; flex-direction: column; gap: 4px;
  overflow-y: auto;
}

.todo-list-row {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 9px 10px;
  border: none; border-radius: var(--radius-sm);
  background: transparent; color: var(--text);
  cursor: pointer; text-align: left;
  transition: background 0.1s;
}
.todo-list-row:hover { background: var(--bg-card-hover); }
.todo-list-row.active { background: color-mix(in srgb, var(--accent) 10%, var(--bg-card)); }

.todo-list-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.todo-list-dot.lg { width: 14px; height: 14px; }

.todo-list-row-title { flex: 1; font-size: 0.875rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.todo-list-row-meta  { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.todo-shared-icon    { font-size: 0.75rem; }

.todo-empty-sidebar {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 24px 12px; text-align: center; color: var(--text-muted); font-size: 0.875rem;
}

/* Main panel */
.todo-main {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  min-height: 480px;
  display: flex;
  flex-direction: column;
}
.todo-items-list {
  list-style: none; display: flex; flex-direction: column; gap: 6px;
  min-height: 200px;
}
.todo-empty-items {
  text-align: center; color: var(--text-muted); padding: 32px; font-size: 0.875rem;
  min-height: 200px; display: flex; align-items: center; justify-content: center;
}
.todo-empty-main {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: var(--text-muted); text-align: center; min-height: 200px;
}

/* Detail header */
.todo-detail-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
}
.todo-detail-title { font-family: 'Space Grotesk',sans-serif; font-size: 1.25rem; font-weight: 700; }
.todo-detail-desc  { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }

/* Progress */
.todo-progress-wrap  { margin-bottom: 14px; }
.todo-progress-bar   { height: 6px; background: var(--border); border-radius: 999px; overflow: hidden; margin-bottom: 4px; }
.todo-progress-fill  { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
.todo-progress-label { font-size: 0.75rem; color: var(--text-muted); }

/* Members chips */
.todo-members-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.todo-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px;
  font-size: 0.75rem; font-weight: 600;
  background: var(--bg-card-hover); color: var(--text-muted);
  border: 1px solid var(--border);
}
.todo-chip.owner { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--bg-card)); }

/* Add form */
.todo-add-form { display: flex; gap: 8px; margin-bottom: 14px; }

/* Filter row */
.todo-filter-row { display: flex; align-items: center; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
.todo-filter-btn {
  padding: 4px 12px; border: 1px solid var(--border);
  border-radius: 999px; background: transparent; color: var(--text-muted);
  font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.todo-filter-btn:hover { background: var(--bg-card-hover); color: var(--text); }
.todo-filter-btn.active { font-weight: 600; }
.todo-stats { margin-left: auto; font-size: 0.75rem; color: var(--text-muted); }

/* Items list */

.todo-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border: 1px solid var(--border);
  min-height: 54px;
  border-radius: var(--radius-sm); background: var(--bg);
  transition: background 0.1s;
}
.todo-item.done { opacity: 0.65; }
.todo-item:hover { background: var(--bg-card-hover); }
.todo-item:hover .todo-item-actions { opacity: 1; }

.todo-check {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid var(--border); background: transparent;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.15s; margin-top: 1px;
}
.todo-check:hover { border-color: var(--accent); }

.todo-item-body { flex: 1; min-width: 0; }
.todo-item-text {
  display: block; font-size: 0.875rem; font-weight: 500;
  word-break: break-word; cursor: text;
}
.todo-item.done .todo-item-text { text-decoration: line-through; color: var(--text-muted); }
.todo-item-meta { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.todo-item-actions {
  display: flex; gap: 4px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s;
}
.todo-action-btn {
  background: none; border: none; cursor: pointer; font-size: 0.85rem; padding: 2px 4px;
  border-radius: 4px; transition: background 0.1s;
}
.todo-action-btn:hover { background: var(--bg-card-hover); }

/* Buttons */
.todo-new-btn {
  padding: 7px 16px; border: none; border-radius: var(--radius-sm);
  background: var(--accent); color: #fff; font-size: 0.875rem;
  font-weight: 600; cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
}
.todo-new-btn:hover:not(:disabled) { opacity: 0.88; }
.todo-new-btn:disabled { opacity: 0.4; cursor: default; }

.todo-cancel-btn {
  padding: 7px 14px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: var(--bg-card);
  color: var(--text-muted); font-size: 0.875rem; cursor: pointer;
}
.todo-cancel-btn:hover { background: var(--bg-card-hover); }

.todo-icon-btn {
  width: 34px; height: 34px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: var(--bg-card);
  cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s; position: relative;
}
.todo-icon-btn:hover { background: var(--bg-card-hover); }
.todo-icon-btn.danger:hover { background: #dc262618; border-color: #dc262655; }

.todo-add-btn {
  width: 38px; height: 38px; border: none; border-radius: var(--radius-sm);
  color: #fff; font-size: 1.25rem; font-weight: 600; cursor: pointer;
  flex-shrink: 0; transition: opacity 0.15s;
}
.todo-add-btn:hover { opacity: 0.85; }

/* Inputs */
.todo-input {
  flex: 1; padding: 8px 12px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: var(--bg);
  color: var(--text); font-size: 0.875rem; font-family: inherit;
  transition: border-color 0.15s; width: 100%;
}
.todo-input:focus { outline: none; border-color: var(--accent); }
.todo-input.inline { padding: 3px 8px; height: auto; }

/* Type select */
.todo-type-btn {
  flex: 1; padding: 10px 12px; border: 2px solid var(--border);
  border-radius: var(--radius-sm); background: var(--bg);
  color: var(--text); cursor: pointer; text-align: left;
  transition: all 0.15s; font-size: 0.875rem; font-weight: 600;
}
.todo-type-btn:hover { border-color: var(--accent); }
.todo-type-btn.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--bg)); color: var(--accent); }

/* Modal */
.todo-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 16px;
}
.todo-modal {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  max-height: 90vh; overflow-y: auto;
}
.todo-modal-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
}
.todo-modal-title { font-family: 'Space Grotesk',sans-serif; font-weight: 700; font-size: 1.125rem; }
.todo-modal-close {
  width: 30px; height: 30px; border: 1px solid var(--border);
  border-radius: 50%; background: var(--bg); color: var(--text-muted);
  font-size: 0.875rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.todo-modal-close:hover { background: var(--bg-card-hover); }

.todo-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.todo-field label { font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); }

.todo-section-label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 10px;
}

/* Members list */
.todo-members-list { list-style: none; display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
.todo-member-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: var(--radius-sm); background: var(--bg);
}
.todo-member-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.875rem; font-weight: 700; flex-shrink: 0;
}
.todo-member-name { flex: 1; font-size: 0.875rem; font-weight: 500; }
.todo-owner-badge {
  font-size: 0.72rem; padding: 2px 8px; border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 15%, var(--bg-card));
  color: var(--accent); font-weight: 600;
}
.todo-remove-btn {
  background: none; border: none; cursor: pointer; color: var(--text-muted);
  font-size: 0.875rem; padding: 4px; border-radius: 4px;
}
.todo-remove-btn:hover { color: #dc2626; background: #dc262618; }

.todo-invite-row { display: flex; gap: 8px; margin-bottom: 8px; }
.todo-search-results { list-style: none; display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.todo-invite-result {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: var(--bg);
}

/* Notification badge */
.todo-notif-badge {
  position: absolute; top: -4px; right: -4px;
  background: #dc2626; color: #fff;
  font-size: 0.6rem; font-weight: 700;
  min-width: 16px; height: 16px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 3px;
}

/* Notification panel */
.todo-notif-panel {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 320px; background: var(--bg-card);
  border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-hover); z-index: 500;
  overflow: hidden;
}
.todo-notif-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
}
.todo-notif-clear { background: none; border: none; cursor: pointer; font-size: 0.75rem; color: var(--text-muted); }
.todo-notif-clear:hover { color: var(--text); }
.todo-notif-empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem; }
.todo-notif-list { list-style: none; max-height: 360px; overflow-y: auto; }
.todo-notif-item {
  display: flex; gap: 10px; padding: 12px 16px;
  border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.1s;
}
.todo-notif-item:last-child { border-bottom: none; }
.todo-notif-item:hover { background: var(--bg-card-hover); }
.todo-notif-item.unread { background: color-mix(in srgb, var(--accent) 6%, var(--bg-card)); }
.todo-notif-icon { font-size: 1.1rem; flex-shrink: 0; }
.todo-notif-text { font-size: 0.8rem; font-weight: 500; line-height: 1.4; }
.todo-notif-time { font-size: 0.72rem; color: var(--text-muted); margin-top: 3px; }

/* Assignment select in add-form */
.todo-assign-select {
  padding: 0 10px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  max-width: 140px;
}
.todo-assign-select:focus { outline: none; border-color: var(--accent); }

/* Assignee badge on item */
.todo-assignee-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid;
  border-radius: 999px;
  padding: 1px 7px;
  margin-left: 6px;
}

/* Assign dropdown menu */
.todo-assign-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 180px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-hover);
  z-index: 200;
  overflow: hidden;
}
.todo-assign-menu-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  padding: 8px 12px 4px;
}
.todo-assign-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}
.todo-assign-menu-item:hover { background: var(--bg-card-hover); }
.todo-assign-menu-item.active { font-weight: 700; }
.todo-assign-menu-item.remove { color: var(--text-muted); font-size: 0.75rem; border-top: 1px solid var(--border); }
.todo-assign-avatar {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--accent); color: #fff;
  font-size: 0.7rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
`;
