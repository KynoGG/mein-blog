'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const REGISTRY_KEY = 'kynogg-users-registry';
const USER_ID_KEY  = 'kynogg-user-id';

const TEST_USERS = [
  {
    id:       'demo-user-alex',
    name:     'Alex Müller',
    email:    'alex@kynogg.de',
    username: 'alex_kynogg',
    avatar:   null,
    bio:      'Fitness-Fan · Push/Pull/Legs · 3 Jahre Training',
  },
  {
    id:       'demo-user-lisa',
    name:     'Lisa Schmidt',
    email:    'lisa@kynogg.de',
    username: 'lisa_fit',
    avatar:   null,
    bio:      'HIIT & Yoga · Clean Eating · Motivation is key 🔑',
  },
];

const SEEDED_GROUP_ID   = 'group-fitness-crew';
const SEEDED_GROUP_NAME = 'Fitness Crew 💪';

function getOrCreateMyId() {
  try {
    const session = JSON.parse(localStorage.getItem('kynogg-demo-session') || 'null');
    if (session?.id) {
      localStorage.setItem(USER_ID_KEY, session.id);
      return session.id;
    }
  } catch {}
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = 'user-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function getMyProfile() {
  try {
    const p = JSON.parse(localStorage.getItem('nutzerprofil') || '{}');
    const avatar = localStorage.getItem('nutzerprofil-avatar') || null;
    return { name: p.name || 'Ich', avatar };
  } catch { return { name: 'Ich', avatar: null }; }
}

function friendsKey(id)        { return `kynogg-freunde-${id}`; }
function sentKey(id)           { return `kynogg-anfragen-gesendet-${id}`; }
function incomingKey(id)       { return `kynogg-anfragen-eingehend-${id}`; }
function dmKey(a, b)           { return `kynogg-dm-${[a, b].sort().join('_')}`; }
function groupInvitesKey(id)   { return `kynogg-gruppenanfragen-${id}`; }
function allGroupsKey()        { return 'kynogg-gruppen'; }
function groupMsgsKey(gid)     { return `kynogg-gruppe-msgs-${gid}`; }

function readArr(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function NachrichtenPage() {
  const { user: _au, loading: _al } = useAuth();
  const [myId,         setMyId]         = useState(null);
  const [users,        setUsers]        = useState([]);
  const [friends,      setFriends]      = useState([]);
  const [sent,         setSent]         = useState([]);
  const [incoming,     setIncoming]     = useState([]);
  const [groups,       setGroups]       = useState([]);       // groups I'm a member of
  const [groupInvites, setGroupInvites] = useState([]);       // pending group invites
  const [tab,          setTab]          = useState('chats');
  const [search,       setSearch]       = useState('');
  const [loaded,       setLoaded]       = useState(false);

  // Group creation modal
  const [showCreate,    setShowCreate]    = useState(false);
  const [newGroupName,  setNewGroupName]  = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    const id = getOrCreateMyId();
    setMyId(id);

    const { name, avatar } = getMyProfile();
    const reg = readArr(REGISTRY_KEY);

    const selfIdx = reg.findIndex(u => u.id === id);
    if (selfIdx === -1) {
      reg.push({ id, name, email: '', avatar, bio: '' });
    } else {
      reg[selfIdx] = { ...reg[selfIdx], name: name || reg[selfIdx].name, avatar: avatar || reg[selfIdx].avatar };
    }
    TEST_USERS.forEach(tu => {
      const idx = reg.findIndex(u => u.id === tu.id);
      if (idx === -1) reg.push(tu);
      else reg[idx] = { ...reg[idx], ...tu };
    });
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
    setUsers(reg);

    setFriends(readArr(friendsKey(id)));
    setSent(readArr(sentKey(id)));
    setIncoming(readArr(incomingKey(id)));

    // Seed group invite from Alex if not yet seen
    const existingInvites = readArr(groupInvitesKey(id));
    const alreadySeeded   = existingInvites.some(i => i.groupId === SEEDED_GROUP_ID);
    const alreadyInGroup  = readArr(allGroupsKey()).some(g => g.id === SEEDED_GROUP_ID);
    if (!alreadySeeded && !alreadyInGroup) {
      const seeded = [
        ...existingInvites,
        {
          groupId:   SEEDED_GROUP_ID,
          groupName: SEEDED_GROUP_NAME,
          fromId:    'demo-user-alex',
          members:   [
            { id: 'demo-user-alex', name: 'Alex Müller' },
            { id: 'demo-user-lisa', name: 'Lisa Schmidt' },
          ],
          ts: Date.now() - 3_600_000,
        },
      ];
      localStorage.setItem(groupInvitesKey(id), JSON.stringify(seeded));
      setGroupInvites(seeded);
    } else {
      setGroupInvites(existingInvites);
    }

    setGroups(readArr(allGroupsKey()).filter(g => g.members.some(m => m.id === id)));
    setLoaded(true);
  }, []);

  /* ── Friend actions ── */
  function sendRequest(targetId) {
    const isTestUser = TEST_USERS.some(t => t.id === targetId);
    if (isTestUser) {
      const newFriends = [...new Set([...friends, targetId])];
      setFriends(newFriends);
      localStorage.setItem(friendsKey(myId), JSON.stringify(newFriends));
      const key = dmKey(myId, targetId);
      if (readArr(key).length === 0) {
        const welcome = {
          id: Date.now().toString(),
          senderId: targetId,
          text: targetId === 'demo-user-alex'
            ? 'Hey! Freut mich, dass wir jetzt verbunden sind 💪 Wie läuft dein Training?'
            : 'Hey! Schön, dass wir jetzt verbunden sind 😊 Machst du gerade einen bestimmten Plan?',
          ts: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify([welcome]));
      }
    } else {
      const newSent = [...new Set([...sent, targetId])];
      setSent(newSent);
      localStorage.setItem(sentKey(myId), JSON.stringify(newSent));
      const targetIncoming = readArr(incomingKey(targetId));
      if (!targetIncoming.some(r => r.fromId === myId)) {
        localStorage.setItem(incomingKey(targetId), JSON.stringify([
          ...targetIncoming, { fromId: myId, ts: Date.now() },
        ]));
      }
    }
  }

  function acceptRequest(fromId) {
    const newFriends = [...new Set([...friends, fromId])];
    setFriends(newFriends);
    localStorage.setItem(friendsKey(myId), JSON.stringify(newFriends));
    const theirFriends = readArr(friendsKey(fromId));
    if (!theirFriends.includes(myId)) {
      localStorage.setItem(friendsKey(fromId), JSON.stringify([...theirFriends, myId]));
    }
    const theirSent = readArr(sentKey(fromId)).filter(id => id !== myId);
    localStorage.setItem(sentKey(fromId), JSON.stringify(theirSent));
    const newIncoming = incoming.filter(r => r.fromId !== fromId);
    setIncoming(newIncoming);
    localStorage.setItem(incomingKey(myId), JSON.stringify(newIncoming));
  }

  function declineRequest(fromId) {
    const newIncoming = incoming.filter(r => r.fromId !== fromId);
    setIncoming(newIncoming);
    localStorage.setItem(incomingKey(myId), JSON.stringify(newIncoming));
    const theirSent = readArr(sentKey(fromId)).filter(id => id !== myId);
    localStorage.setItem(sentKey(fromId), JSON.stringify(theirSent));
  }

  function removeFriend(targetId) {
    const next = friends.filter(id => id !== targetId);
    setFriends(next);
    localStorage.setItem(friendsKey(myId), JSON.stringify(next));
  }

  /* ── Group invite actions ── */
  function acceptGroupInvite(invite) {
    const myProfile = getMyProfile();
    const allGroups = readArr(allGroupsKey());
    const existing  = allGroups.find(g => g.id === invite.groupId);

    let updated;
    if (existing) {
      if (!existing.members.some(m => m.id === myId)) {
        existing.members.push({ id: myId, name: myProfile.name });
      }
      updated = allGroups.map(g => g.id === invite.groupId ? existing : g);
    } else {
      const newGroup = {
        id:        invite.groupId,
        name:      invite.groupName,
        createdBy: invite.fromId,
        members:   [...invite.members, { id: myId, name: myProfile.name }],
        createdAt: invite.ts,
      };
      // Seed a welcome message
      const welcomeMsg = {
        id: 'seed-1',
        senderId: 'demo-user-alex',
        text: `Hey alle! Willkommen in der Gruppe "${invite.groupName}" 🎉 Hier können wir unsere Fortschritte teilen!`,
        ts: invite.ts,
      };
      const lisaMsg = {
        id: 'seed-2',
        senderId: 'demo-user-lisa',
        text: 'Super Idee, Alex! Ich bin dabei 💪',
        ts: invite.ts + 60_000,
      };
      localStorage.setItem(groupMsgsKey(invite.groupId), JSON.stringify([welcomeMsg, lisaMsg]));
      updated = [...allGroups, newGroup];
    }

    localStorage.setItem(allGroupsKey(), JSON.stringify(updated));
    setGroups(updated.filter(g => g.members.some(m => m.id === myId)));

    const newInvites = groupInvites.filter(i => i.groupId !== invite.groupId);
    setGroupInvites(newInvites);
    localStorage.setItem(groupInvitesKey(myId), JSON.stringify(newInvites));
  }

  function declineGroupInvite(groupId) {
    const newInvites = groupInvites.filter(i => i.groupId !== groupId);
    setGroupInvites(newInvites);
    localStorage.setItem(groupInvitesKey(myId), JSON.stringify(newInvites));
  }

  /* ── Create group ── */
  function toggleMember(uid) {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  }

  function createGroup() {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    const myProfile = getMyProfile();
    const allGroups = readArr(allGroupsKey());
    const memberObjs = [
      { id: myId, name: myProfile.name },
      ...selectedMembers.map(uid => {
        const u = users.find(x => x.id === uid);
        return { id: uid, name: u?.name || uid };
      }),
    ];
    const newGroup = {
      id:        'group-' + Date.now().toString(36),
      name:      newGroupName.trim(),
      createdBy: myId,
      members:   memberObjs,
      createdAt: Date.now(),
    };
    const updated = [...allGroups, newGroup];
    localStorage.setItem(allGroupsKey(), JSON.stringify(updated));
    setGroups(updated.filter(g => g.members.some(m => m.id === myId)));
    setShowCreate(false);
    setNewGroupName('');
    setSelectedMembers([]);
    setTab('gruppen');
  }

  if (!loaded || !myId || _al) return null;
  if (!_au) return <AuthGate />;

  const friendUsers   = friends.map(id => users.find(u => u.id === id)).filter(Boolean);
  const incomingUsers = incoming.map(r => ({ ...r, user: users.find(u => u.id === r.fromId) })).filter(r => r.user);

  const conversations = friendUsers.map(u => {
    const msgs = readArr(dmKey(myId, u.id));
    const last = msgs[msgs.length - 1] ?? null;
    return { user: u, last, type: 'dm' };
  }).sort((a, b) => (b.last?.ts ?? 0) - (a.last?.ts ?? 0));

  const groupConversations = groups.map(g => {
    const msgs = readArr(groupMsgsKey(g.id));
    const last = msgs[msgs.length - 1] ?? null;
    return { group: g, last };
  }).sort((a, b) => (b.last?.ts ?? 0) - (a.last?.ts ?? 0));

  const searchResults = search.trim().length >= 1
    ? users.filter(u =>
        u.id !== myId &&
        !friends.includes(u.id) &&
        (u.name?.toLowerCase().includes(search.toLowerCase()) ||
         (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
         (u.email || '').toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  const totalAnfragen = incomingUsers.length + groupInvites.length;

  return (
    <main className="main-content">
      <div className="tracker-page">

        <div className="tracker-header">
          <h1 className="kategorie-title">Nachrichten</h1>
          <p className="tracker-sub">Chatte mit deinen Freunden und Gruppen.</p>
        </div>

        <div className="tp-section-toggle">
          <button
            className={`tp-section-btn ${tab === 'chats' ? 'active' : ''}`}
            onClick={() => setTab('chats')}
          >
            Chats
            {conversations.length > 0 && <span className="tp-section-count">{conversations.length}</span>}
          </button>
          <button
            className={`tp-section-btn ${tab === 'gruppen' ? 'active' : ''}`}
            onClick={() => setTab('gruppen')}
          >
            Gruppen
            {groups.length > 0 && <span className="tp-section-count">{groups.length}</span>}
          </button>
          <button
            className={`tp-section-btn ${tab === 'freunde' ? 'active' : ''}`}
            onClick={() => setTab('freunde')}
          >
            Freunde
            {friendUsers.length > 0 && <span className="tp-section-count">{friendUsers.length}</span>}
          </button>
          <button
            className={`tp-section-btn ${tab === 'anfragen' ? 'active' : ''}`}
            onClick={() => setTab('anfragen')}
          >
            Anfragen
            {totalAnfragen > 0 && (
              <span className="tp-section-count" style={{ background: 'var(--cat-ernaehrung)', color: '#fff' }}>
                {totalAnfragen}
              </span>
            )}
          </button>
        </div>

        {/* ── Chats ── */}
        {tab === 'chats' && (
          conversations.length === 0 ? (
            <div className="tracker-empty" style={{ paddingTop: 60 }}>
              <span>💬</span>
              <p>Noch keine Chats. Füge Freunde hinzu, um loszulegen.</p>
              <button className="tracker-submit" style={{ marginTop: 16 }} onClick={() => setTab('freunde')}>
                Freunde hinzufügen →
              </button>
            </div>
          ) : (
            <div className="dm-conv-list">
              {conversations.map(({ user: u, last }) => (
                <Link key={u.id} href={`/nachrichten/${u.id}`} className="dm-conv-row">
                  <div className="dm-avatar">
                    {u.avatar
                      ? <img src={u.avatar} alt={u.name} />
                      : <span>{getInitials(u.name)}</span>
                    }
                  </div>
                  <div className="dm-conv-info">
                    <span className="dm-conv-name">{u.name}</span>
                    {last && (
                      <span className="dm-conv-last">
                        {last.senderId === myId ? 'Du: ' : ''}
                        {last.text.length > 52 ? last.text.slice(0, 52) + '…' : last.text}
                      </span>
                    )}
                  </div>
                  {last && <span className="dm-conv-time">{fmtTime(last.ts)}</span>}
                </Link>
              ))}
            </div>
          )
        )}

        {/* ── Gruppen ── */}
        {tab === 'gruppen' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="dm-add-btn" onClick={() => setShowCreate(true)}>
                + Gruppe erstellen
              </button>
            </div>

            {groups.length === 0 ? (
              <div className="tracker-empty" style={{ paddingTop: 40 }}>
                <span>👥</span>
                <p>Noch keine Gruppen. Erstelle eine neue oder nimm eine Einladung an.</p>
              </div>
            ) : (
              <div className="dm-conv-list">
                {groupConversations.map(({ group: g, last }) => (
                  <Link key={g.id} href={`/nachrichten/gruppe/${g.id}`} className="dm-conv-row">
                    <div className="dm-avatar dm-group-avatar">
                      <span>👥</span>
                    </div>
                    <div className="dm-conv-info">
                      <span className="dm-conv-name">{g.name}</span>
                      <span className="dm-conv-last" style={{ color: 'var(--text-muted)' }}>
                        {g.members.length} Mitglieder
                        {last ? ` · ${last.text.length > 35 ? last.text.slice(0, 35) + '…' : last.text}` : ''}
                      </span>
                    </div>
                    {last && <span className="dm-conv-time">{fmtTime(last.ts)}</span>}
                  </Link>
                ))}
              </div>
            )}

            {/* ── Create group modal ── */}
            {showCreate && (
              <div className="dm-modal-overlay" onClick={() => setShowCreate(false)}>
                <div className="dm-modal" onClick={e => e.stopPropagation()}>
                  <div className="dm-modal-header">
                    <h2 className="dm-modal-title">Neue Gruppe</h2>
                    <button className="dm-modal-close" onClick={() => setShowCreate(false)}>✕</button>
                  </div>

                  <label className="dm-modal-label">Gruppenname</label>
                  <input
                    type="text"
                    className="tracker-input"
                    placeholder="z.B. Fitness Crew, Meal Prep Gang…"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    autoFocus
                  />

                  <label className="dm-modal-label" style={{ marginTop: 16 }}>
                    Freunde einladen ({selectedMembers.length} ausgewählt)
                  </label>

                  {friendUsers.length === 0 ? (
                    <p className="dm-no-results">Du hast noch keine Freunde. Füge zuerst Freunde hinzu.</p>
                  ) : (
                    <div className="dm-member-list">
                      {friendUsers.map(u => (
                        <div
                          key={u.id}
                          className={`dm-member-row ${selectedMembers.includes(u.id) ? 'selected' : ''}`}
                          onClick={() => toggleMember(u.id)}
                        >
                          <div className="dm-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                            {u.avatar ? <img src={u.avatar} alt={u.name} /> : <span>{getInitials(u.name)}</span>}
                          </div>
                          <span className="dm-conv-name" style={{ flex: 1 }}>{u.name}</span>
                          <span className="dm-member-check">{selectedMembers.includes(u.id) ? '✓' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className="tracker-submit"
                    style={{ marginTop: 20, width: '100%' }}
                    disabled={!newGroupName.trim() || selectedMembers.length === 0}
                    onClick={createGroup}
                  >
                    Gruppe erstellen
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Freunde ── */}
        {tab === 'freunde' && (
          <>
            <div className="dm-search-wrap">
              <input
                type="text"
                className="tracker-input"
                placeholder='Name oder @benutzername suchen…'
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {searchResults.length > 0 && (
              <div className="dm-user-list">
                <p className="section-label">Suchergebnisse</p>
                {searchResults.map(u => (
                  <div key={u.id} className="dm-user-row">
                    <div className="dm-avatar">
                      {u.avatar ? <img src={u.avatar} alt={u.name} /> : <span>{getInitials(u.name)}</span>}
                    </div>
                    <div className="dm-conv-info">
                      <span className="dm-conv-name">{u.name || u.username}</span>
                      {u.username && <span className="dm-conv-last" style={{ color: 'var(--accent)' }}>@{u.username}</span>}
                      {u.bio && <span className="dm-conv-last">{u.bio}</span>}
                    </div>
                    {sent.includes(u.id) ? (
                      <span className="dm-req-sent">Anfrage gesendet</span>
                    ) : (
                      <button className="dm-add-btn" onClick={() => sendRequest(u.id)}>
                        + Hinzufügen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {search.trim().length >= 1 && searchResults.length === 0 && (
              <p className="dm-no-results">Kein Nutzer gefunden.</p>
            )}

            {friendUsers.length > 0 && (
              <div className="dm-user-list" style={{ marginTop: 24 }}>
                <p className="section-label">Meine Freunde ({friendUsers.length})</p>
                {friendUsers.map(u => (
                  <div key={u.id} className="dm-user-row">
                    <div className="dm-avatar">
                      {u.avatar ? <img src={u.avatar} alt={u.name} /> : <span>{getInitials(u.name)}</span>}
                    </div>
                    <div className="dm-conv-info">
                      <span className="dm-conv-name">{u.name || u.username}</span>
                      {u.username && <span className="dm-conv-last" style={{ color: 'var(--accent)' }}>@{u.username}</span>}
                      {u.bio && <span className="dm-conv-last">{u.bio}</span>}
                    </div>
                    <div className="dm-user-actions">
                      <Link href={`/nachrichten/${u.id}`} className="dm-add-btn">
                        Schreiben →
                      </Link>
                      <button className="dm-remove-btn" onClick={() => removeFriend(u.id)}>
                        Entfernen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {friendUsers.length === 0 && !search && (
              <div className="tracker-empty" style={{ paddingTop: 40 }}>
                <span>👥</span>
                <p>Noch keine Freunde. Suche nach „Alex" oder „Lisa" um Testnutzer hinzuzufügen.</p>
              </div>
            )}
          </>
        )}

        {/* ── Anfragen ── */}
        {tab === 'anfragen' && (
          totalAnfragen === 0 ? (
            <div className="tracker-empty" style={{ paddingTop: 60 }}>
              <span>📬</span>
              <p>Keine offenen Anfragen.</p>
            </div>
          ) : (
            <div className="dm-user-list">
              {/* Friend requests */}
              {incomingUsers.length > 0 && (
                <>
                  <p className="section-label">Freundschaftsanfragen ({incomingUsers.length})</p>
                  {incomingUsers.map(({ user: u, fromId }) => (
                    <div key={fromId} className="dm-user-row">
                      <div className="dm-avatar">
                        {u.avatar ? <img src={u.avatar} alt={u.name} /> : <span>{getInitials(u.name)}</span>}
                      </div>
                      <div className="dm-conv-info">
                        <span className="dm-conv-name">{u.name || u.username}</span>
                        {u.username && <span className="dm-conv-last" style={{ color: 'var(--accent)' }}>@{u.username}</span>}
                        {u.bio && <span className="dm-conv-last">{u.bio}</span>}
                      </div>
                      <div className="dm-user-actions">
                        <button className="dm-add-btn" onClick={() => acceptRequest(fromId)}>✓ Annehmen</button>
                        <button className="dm-remove-btn" onClick={() => declineRequest(fromId)}>Ablehnen</button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Group invites */}
              {groupInvites.length > 0 && (
                <>
                  <p className="section-label" style={{ marginTop: incomingUsers.length > 0 ? 20 : 0 }}>
                    Gruppeneinladungen ({groupInvites.length})
                  </p>
                  {groupInvites.map(inv => {
                    const sender = users.find(u => u.id === inv.fromId);
                    return (
                      <div key={inv.groupId} className="dm-group-invite-card">
                        <div className="dm-group-invite-icon">👥</div>
                        <div className="dm-conv-info">
                          <span className="dm-conv-name">{inv.groupName}</span>
                          <span className="dm-conv-last">
                            Eingeladen von <strong>{sender?.name || inv.fromId}</strong>
                          </span>
                          <span className="dm-conv-last" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                            Mitglieder: {inv.members.map(m => m.name).join(', ')}
                          </span>
                        </div>
                        <div className="dm-user-actions">
                          <button className="dm-add-btn" onClick={() => acceptGroupInvite(inv)}>✓ Beitreten</button>
                          <button className="dm-remove-btn" onClick={() => declineGroupInvite(inv.groupId)}>Ablehnen</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )
        )}

      </div>
    </main>
  );
}
