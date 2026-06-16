'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { findByUsername, upsertUser } from '@/lib/userRegistry';

// Storage helpers
// kynogg-following-{myId}  → [{ userId, status: 'requested'|'following', ts }]
// kynogg-followers-{userId} → [{ fromId, status: 'requested'|'following', ts }]

function followingKey(id)  { return `kynogg-following-${id}`; }
function followersKey(id)  { return `kynogg-followers-${id}`; }

function readArr(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

const DEMO_USERS = [
  {
    id: 'demo-user-alex', email: 'alex@kynogg.de', username: 'alex_kynogg',
    name: 'Alex Müller', avatar: null, bio: 'Fitness-Fan · Push/Pull/Legs · 3 Jahre Training',
  },
];

function ensureDemoUsers() { DEMO_USERS.forEach(u => upsertUser(u)); }

const ALEX_DEMO_PLAN = {
  id: 'alex-ppl-plan-001',
  type: 'training',
  name: 'Push / Pull / Legs',
  publishedAt: 1700000000000,
  authorId: 'demo-user-alex',
  authorName: 'Alex Müller',
  authorUsername: 'alex_kynogg',
  days: [
    { id: 'mo', name: 'Montag',     type: 'training', focus: 'Push Day',   exercises: [
      { id: 'e1', name: 'Bankdrücken',      saetze: 4, wiederholungen: '8–10', gewicht: '80 kg', notizen: '' },
      { id: 'e2', name: 'Schulterdrücken',  saetze: 3, wiederholungen: '10',   gewicht: '50 kg', notizen: '' },
      { id: 'e3', name: 'Trizeps Pushdown', saetze: 3, wiederholungen: '12',   gewicht: '25 kg', notizen: '' },
    ]},
    { id: 'di', name: 'Dienstag',   type: 'training', focus: 'Pull Day',   exercises: [
      { id: 'e4', name: 'Klimmzüge',        saetze: 4, wiederholungen: '6–8',  gewicht: '',      notizen: 'Körpergewicht' },
      { id: 'e5', name: 'Langhantelrudern', saetze: 4, wiederholungen: '8',    gewicht: '70 kg', notizen: '' },
      { id: 'e6', name: 'Bizeps Curls',     saetze: 3, wiederholungen: '12',   gewicht: '15 kg', notizen: 'je Arm' },
    ]},
    { id: 'mi', name: 'Mittwoch',   type: 'rest',     focus: '', exercises: [] },
    { id: 'do', name: 'Donnerstag', type: 'training', focus: 'Leg Day',    exercises: [
      { id: 'e7', name: 'Kniebeugen',  saetze: 5, wiederholungen: '5',  gewicht: '100 kg', notizen: '' },
      { id: 'e8', name: 'Beinpresse',  saetze: 4, wiederholungen: '10', gewicht: '150 kg', notizen: '' },
      { id: 'e9', name: 'Wadenheben',  saetze: 4, wiederholungen: '15', gewicht: '60 kg',  notizen: '' },
    ]},
    { id: 'fr', name: 'Freitag',    type: 'training', focus: 'Push Day 2', exercises: [
      { id: 'e10', name: 'Schrägbankdrücken', saetze: 4, wiederholungen: '8–10', gewicht: '70 kg', notizen: '' },
      { id: 'e11', name: 'Seitheben',         saetze: 3, wiederholungen: '12',   gewicht: '10 kg', notizen: '' },
    ]},
    { id: 'sa', name: 'Samstag', type: 'rest', focus: '', exercises: [] },
    { id: 'so', name: 'Sonntag', type: 'rest', focus: '', exercises: [] },
  ],
};

function ensureDemoPlans() {
  const key = `livora-published-plans-demo-user-alex`;
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.find(p => p.id === ALEX_DEMO_PLAN.id)) {
      localStorage.setItem(key, JSON.stringify([...existing, ALEX_DEMO_PLAN]));
    }
  } catch {}
}

function getMySession() {
  try { return JSON.parse(localStorage.getItem('kynogg-demo-session') || 'null'); } catch { return null; }
}

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function fmtDateTime(ts) {
  return new Date(ts).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const USER_SUB_KEY = 'livora-user-subscribed-plans';
function readArrP(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }

// ── Story Bubble ──────────────────────────────────────────────────────────────

function StoryBubble({ story }) {
  const [open,  setOpen]  = useState(false);
  const [slide, setSlide] = useState(0);

  const slides = story.slides ?? (story.image ? [{ image: story.image, caption: story.text || '' }] : []);
  const current = slides[slide] ?? null;

  function handleOpen() { setSlide(0); setOpen(true); }

  const thumb = slides[0]?.image ?? null;

  return (
    <>
      <button className="story-bubble" onClick={handleOpen}>
        <div className="story-ring">
          {thumb
            ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : <span style={{ fontSize: '1.25rem' }}>✨</span>
          }
        </div>
        <span className="story-label">{story.label || 'Story'}</span>
        {slides.length > 1 && <span className="story-count-badge">{slides.length}</span>}
      </button>

      {open && (
        <div className="story-overlay" onClick={() => setOpen(false)}>
          <div className="story-modal" onClick={e => e.stopPropagation()}>
            <button className="story-close" onClick={() => setOpen(false)}>×</button>

            {slides.length > 1 && (
              <div className="story-dots">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    className={`story-dot${i === slide ? ' story-dot--active' : ''}`}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            )}

            {current?.image && <img src={current.image} alt="Story" className="story-img" />}
            {current?.caption && <p className="story-caption">{current.caption}</p>}

            {slides.length > 1 && (
              <div className="story-nav">
                <button className="story-nav-btn" onClick={() => setSlide(i => Math.max(0, i - 1))} disabled={slide === 0}>←</button>
                <span className="story-nav-counter">{slide + 1} / {slides.length}</span>
                <button className="story-nav-btn" onClick={() => setSlide(i => Math.min(slides.length - 1, i + 1))} disabled={slide === slides.length - 1}>→</button>
              </div>
            )}

            <div className="story-modal-footer">
              <span className="post-time">{fmtDateTime(story.ts)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Follow Button ─────────────────────────────────────────────────────────────

function FollowButton({ myId, targetUser }) {
  const [status, setStatus] = useState(null); // null | 'requested' | 'following'
  const isDemoUser = DEMO_USERS.some(u => u.id === targetUser.id);

  useEffect(() => {
    const following = readArr(followingKey(myId));
    const entry = following.find(f => f.userId === targetUser.id);
    setStatus(entry?.status ?? null);
  }, [myId, targetUser.id]);

  function handleFollow() {
    const newStatus = isDemoUser ? 'following' : 'requested';

    // Update my following list
    const following = readArr(followingKey(myId));
    const without   = following.filter(f => f.userId !== targetUser.id);
    localStorage.setItem(followingKey(myId), JSON.stringify([
      ...without, { userId: targetUser.id, status: newStatus, ts: Date.now() },
    ]));

    // Update target's followers list
    const followers = readArr(followersKey(targetUser.id));
    const withoutMe = followers.filter(f => f.fromId !== myId);
    localStorage.setItem(followersKey(targetUser.id), JSON.stringify([
      ...withoutMe, { fromId: myId, status: newStatus, ts: Date.now() },
    ]));

    setStatus(newStatus);
  }

  function handleUnfollow() {
    const following = readArr(followingKey(myId));
    localStorage.setItem(followingKey(myId), JSON.stringify(following.filter(f => f.userId !== targetUser.id)));

    const followers = readArr(followersKey(targetUser.id));
    localStorage.setItem(followersKey(targetUser.id), JSON.stringify(followers.filter(f => f.fromId !== myId)));

    setStatus(null);
  }

  if (status === 'following') {
    return (
      <div className="follow-btn-group">
        <span className="follow-status-badge follow-status-following">Folgst du ✓</span>
        <button className="follow-unfollow-btn" onClick={handleUnfollow}>Entfolgen</button>
      </div>
    );
  }

  if (status === 'requested') {
    return (
      <div className="follow-btn-group">
        <span className="follow-status-badge follow-status-requested">Anfrage gesendet</span>
        <button className="follow-unfollow-btn" onClick={handleUnfollow}>Zurückziehen</button>
      </div>
    );
  }

  return (
    <button className="follow-btn" onClick={handleFollow}>
      + Folgen
    </button>
  );
}

// ── Published Plans Section ───────────────────────────────────────────────────

function PlanCard({ plan, myId, isOwnProfile, isSubscribed, onSubscribe, onUnsubscribe }) {
  const [expanded, setExpanded] = useState(false);

  const trainingDays = plan.type === 'training'
    ? (plan.days ?? []).filter(d => d.type !== 'rest')
    : [];
  const totalEx = trainingDays.reduce((a, d) => a + (d.exercises?.length ?? 0), 0);

  return (
    <div className={`pub-plan-card ${expanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div className="pub-plan-card-top">
        <div className="pub-plan-badge">
          {plan.type === 'training' ? '🏋️ Training' : '🥗 Ernährung'}
        </div>
        <h3 className="pub-plan-name">{plan.name}</h3>

        {plan.type === 'training' && (
          <p className="pub-plan-meta">
            {trainingDays.length} Trainingstag{trainingDays.length !== 1 ? 'e' : ''} · {totalEx} Übungen
          </p>
        )}
        {plan.type === 'ernaehrung' && plan.tage?.length > 0 && (
          <p className="pub-plan-meta">
            {plan.tage.length} Tag{plan.tage.length !== 1 ? 'e' : ''} · {plan.tage.reduce((a, t) => a + (t.mahlzeiten?.length ?? 0), 0)} Mahlzeiten
          </p>
        )}

        <button className="pub-plan-toggle-btn" onClick={() => setExpanded(v => !v)}>
          {expanded ? 'Plan schließen ▲' : 'Plan ansehen ▼'}
        </button>
      </div>

      {/* Detail View */}
      {expanded && (
        <div className="pub-plan-detail">
          {plan.type === 'training' && (
            <>
              {(plan.days ?? []).map(day => (
                <div key={day.id} className="pub-plan-day">
                  <div className="pub-plan-day-header">
                    <span className="pub-plan-day-name">{day.name}</span>
                    {day.type === 'rest'
                      ? <span className="pub-plan-day-tag rest">💤 Ruhetag</span>
                      : <span className="pub-plan-day-tag training">🏋️ {day.focus || 'Training'}</span>
                    }
                  </div>
                  {day.type !== 'rest' && day.exercises?.length > 0 && (
                    <ul className="pub-plan-ex-list">
                      {day.exercises.map(ex => (
                        <li key={ex.id} className="pub-plan-ex-item">
                          <span className="pub-plan-ex-name">{ex.name}</span>
                          <span className="pub-plan-ex-meta">
                            {ex.saetze}× {ex.wiederholungen}{ex.gewicht ? ` · ${ex.gewicht}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {day.type !== 'rest' && (!day.exercises || day.exercises.length === 0) && (
                    <p className="pub-plan-ex-empty">Keine Übungen eingetragen.</p>
                  )}
                </div>
              ))}
            </>
          )}

          {plan.type === 'ernaehrung' && (plan.tage ?? []).map(tag => (
            <div key={tag.id} className="pub-plan-day">
              <div className="pub-plan-day-header">
                <span className="pub-plan-day-name">{tag.name}</span>
                <span className="pub-plan-day-tag training">🥗 {tag.mahlzeiten?.length ?? 0} Mahlzeiten</span>
              </div>
              {tag.mahlzeiten?.length > 0 && (
                <ul className="pub-plan-ex-list">
                  {tag.mahlzeiten.map((m, i) => (
                    <li key={i} className="pub-plan-ex-item">
                      <span className="pub-plan-ex-name">{m.name}</span>
                      <span className="pub-plan-ex-meta">{m.kalorien ? `${m.kalorien} kcal` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Subscribe actions */}
          <div className="pub-plan-detail-footer">
            {!isOwnProfile && myId && (
              isSubscribed ? (
                <button className="pub-plan-unsub-btn" onClick={() => onUnsubscribe(plan.id)}>
                  Abonniert ✓ — Abonnement beenden
                </button>
              ) : (
                <button className="pub-plan-sub-btn" onClick={() => onSubscribe(plan)}>
                  + Plan abonnieren
                </button>
              )
            )}
            {isOwnProfile && <span className="pub-plan-own-hint">Dein veröffentlichter Plan</span>}
          </div>
        </div>
      )}

      {/* Collapsed subscribe state */}
      {!expanded && !isOwnProfile && myId && isSubscribed && (
        <div style={{ marginTop: 8 }}>
          <span className="pub-plan-unsub-btn" style={{ display: 'inline-block', cursor: 'default' }}>Abonniert ✓</span>
        </div>
      )}
      {!expanded && isOwnProfile && (
        <span className="pub-plan-own-hint" style={{ display: 'block', marginTop: 8 }}>Dein veröffentlichter Plan</span>
      )}
    </div>
  );
}

function PublishedPlansSection({ plans, myId, isOwnProfile, subscribedIds, onSubscribe, onUnsubscribe }) {
  const training   = plans.filter(p => p.type === 'training');
  const ernaehrung = plans.filter(p => p.type === 'ernaehrung');

  return (
    <div className="profil-form profil-section-gap" style={{ marginTop: 28 }}>
      <div className="profil-section-title">
        <h2 className="kategorie-title" style={{ fontSize: '1.25rem' }}>
          Veröffentlichte Pläne
          <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            {plans.length} {plans.length === 1 ? 'Plan' : 'Pläne'}
          </span>
        </h2>
      </div>
      {training.length > 0 && (
        <>
          <p className="pub-plan-section-label">🏋️ Trainingspläne</p>
          <div className="pub-plan-list">
            {training.map(p => (
              <PlanCard key={p.id} plan={p} myId={myId} isOwnProfile={isOwnProfile}
                isSubscribed={subscribedIds.has(p.id)} onSubscribe={onSubscribe} onUnsubscribe={onUnsubscribe} />
            ))}
          </div>
        </>
      )}
      {ernaehrung.length > 0 && (
        <>
          <p className="pub-plan-section-label" style={{ marginTop: training.length > 0 ? 20 : 0 }}>🥗 Ernährungspläne</p>
          <div className="pub-plan-list">
            {ernaehrung.map(p => (
              <PlanCard key={p.id} plan={p} myId={myId} isOwnProfile={isOwnProfile}
                isSubscribed={subscribedIds.has(p.id)} onSubscribe={onSubscribe} onUnsubscribe={onUnsubscribe} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Post Grid ─────────────────────────────────────────────────────────────────

function PostGrid({ posts, user }) {
  const [active, setActive] = useState(null);

  if (posts.length === 0) {
    return (
      <div className="profil-form profil-section-gap" style={{ marginTop: 28 }}>
        <div className="profil-section-title">
          <h2 className="kategorie-title" style={{ fontSize: '1.25rem' }}>Beiträge</h2>
        </div>
        <div className="tracker-empty">
          <span>📝</span>
          <p>Dieser Nutzer hat noch keine Beiträge veröffentlicht.</p>
        </div>
      </div>
    );
  }

  const post = active !== null ? posts[active] : null;

  return (
    <>
      <div className="profil-form profil-section-gap" style={{ marginTop: 28 }}>
        <div className="profil-section-title">
          <h2 className="kategorie-title" style={{ fontSize: '1.25rem' }}>
            Beiträge
            <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: 8 }}>
              {posts.length} {posts.length === 1 ? 'Beitrag' : 'Beiträge'}
            </span>
          </h2>
        </div>

        <div className="post-grid">
          {posts.map((p, i) => (
            <button key={p.id} className="post-grid-tile" onClick={() => setActive(i)}>
              {p.image
                ? <img src={p.image} alt="" className="post-grid-img" />
                : <div className="post-grid-text-thumb">
                    <span className="post-grid-text-icon">📝</span>
                    <p className="post-grid-text-preview">{p.text}</p>
                  </div>
              }
              <div className="post-grid-overlay">
                {p.image && p.text && <span className="post-grid-overlay-icon">🖼️</span>}
                {p.image && !p.text && <span className="post-grid-overlay-icon">🖼️</span>}
                {!p.image && <span className="post-grid-overlay-icon">📝</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {post && (
        <div className="post-modal-overlay" onClick={() => setActive(null)}>
          <div className="post-modal" onClick={e => e.stopPropagation()}>
            <button className="post-modal-close" onClick={() => setActive(null)}>×</button>

            <div className="post-modal-header">
              <div className="post-avatar-small">
                {user.avatar
                  ? <img src={user.avatar} alt="" className="profil-avatar-img" />
                  : <div className="profil-avatar-placeholder" style={{ fontSize: '0.75rem', width: '36px', height: '36px' }}>
                      {getInitials(user.name || user.username)}
                    </div>
                }
              </div>
              <div className="post-meta">
                <span className="post-author">{user.name || user.username}</span>
                <span className="post-time">{fmtDateTime(post.ts)}</span>
              </div>
            </div>

            {post.image && (
              <div className="post-modal-image-wrap">
                <img src={post.image} alt="Post-Bild" className="post-modal-image" />
              </div>
            )}
            {post.text && <p className="post-modal-text">{post.text}</p>}

            <div className="post-modal-nav">
              <button
                className="post-modal-nav-btn"
                onClick={() => setActive(i => Math.max(0, i - 1))}
                disabled={active === 0}
              >← Vorheriger</button>
              <span className="post-modal-counter">{active + 1} / {posts.length}</span>
              <button
                className="post-modal-nav-btn"
                onClick={() => setActive(i => Math.min(posts.length - 1, i + 1))}
                disabled={active === posts.length - 1}
              >Nächster →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OeffentlichesProfilPage({ params }) {
  const { username } = use(params);

  const [user,           setUser]           = useState(null);
  const [posts,          setPosts]          = useState([]);
  const [stories,        setStories]        = useState([]);
  const [myId,           setMyId]           = useState(null);
  const [isOwnProfile,   setIsOwnProfile]   = useState(false);
  const [followerCount,  setFollowerCount]  = useState(0);
  const [loaded,         setLoaded]         = useState(false);
  const [notFound,       setNotFound]       = useState(false);
  const [publishedPlans, setPublishedPlans] = useState([]);
  const [subscribedIds,  setSubscribedIds]  = useState(new Set()); // plan IDs I've subscribed to

  useEffect(() => {
    ensureDemoUsers();
    ensureDemoPlans();

    const sess = getMySession();
    if (sess?.id) setMyId(sess.id);

    const u = findByUsername(username);
    if (!u) { setNotFound(true); setLoaded(true); return; }

    setUser(u);
    setIsOwnProfile(sess?.id === u.id || sess?.username === u.username);
    setFollowerCount(readArr(followersKey(u.id)).filter(f => f.status === 'following').length);

    try {
      const po = localStorage.getItem(`profil-posts-${u.id}`);
      if (po) setPosts(JSON.parse(po));
    } catch {}

    try {
      const st = localStorage.getItem(`profil-stories-${u.id}`);
      if (st) setStories(JSON.parse(st));
    } catch {}

    try {
      const pp = JSON.parse(localStorage.getItem(`livora-published-plans-${u.id}`) || '[]');
      setPublishedPlans(pp);
    } catch {}

    try {
      const mySub = JSON.parse(localStorage.getItem('livora-user-subscribed-plans') || '[]');
      setSubscribedIds(new Set(mySub.map(p => p.id)));
    } catch {}

    setLoaded(true);
  }, [username]);

  if (!loaded) return null;

  if (notFound) {
    return (
      <main className="main-content">
        <div className="tracker-page">
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <p className="empty-emoji">👤</p>
            <h2>Nutzer nicht gefunden</h2>
            <p>@{username} existiert nicht oder wurde gelöscht.</p>
            <Link href="/suche?mode=nutzer" className="tracker-submit"
              style={{ marginTop: 20, display: 'inline-block', textDecoration: 'none' }}>
              Zurück zur Suche
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="tracker-page">

        {/* ── Navigation ── */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/suche?mode=nutzer" className="back-link">← Zurück zur Suche</Link>
        </div>

        {/* ── Profilkarte ── */}
        <div className="profil-form" style={{ marginBottom: 0 }}>
          <div className="profil-card oeprofil-card">
            <div className="oeprofil-header">

              <div className="oeprofil-avatar">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : <div className="profil-avatar-placeholder"
                      style={{ width: '72px', height: '72px', fontSize: '1.5rem' }}>
                      {getInitials(user.name || user.username)}
                    </div>
                }
              </div>

              <div className="oeprofil-info" style={{ flex: 1 }}>
                <div className="oeprofil-name-row">
                  <h1 className="oeprofil-name">{user.name || user.username}</h1>
                  {/* Follow-Button — nur wenn nicht eigenes Profil und eingeloggt */}
                  {myId && !isOwnProfile && (
                    <FollowButton myId={myId} targetUser={user} />
                  )}
                  {isOwnProfile && (
                    <Link href="/profil" className="follow-edit-btn">Profil bearbeiten →</Link>
                  )}
                </div>

                <p className="oeprofil-username">@{user.username}</p>

                {user.bio
                  ? <p className="oeprofil-bio">{user.bio}</p>
                  : <p className="oeprofil-bio oeprofil-bio--leer">Keine Bio vorhanden.</p>
                }

                <div className="oeprofil-stats">
                  <div className="oeprofil-stat">
                    <span className="oeprofil-stat-val">{posts.length}</span>
                    <span className="oeprofil-stat-label">Posts</span>
                  </div>
                  <div className="oeprofil-stat">
                    <span className="oeprofil-stat-val">{stories.length}</span>
                    <span className="oeprofil-stat-label">Stories</span>
                  </div>
                  <div className="oeprofil-stat">
                    <span className="oeprofil-stat-val">{publishedPlans.length}</span>
                    <span className="oeprofil-stat-label">Pläne</span>
                  </div>
                  <div className="oeprofil-stat">
                    <span className="oeprofil-stat-val">{followerCount}</span>
                    <span className="oeprofil-stat-label">Follower</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Stories ── */}
        {stories.length > 0 && (
          <div className="profil-form profil-section-gap" style={{ marginTop: 28 }}>
            <div className="profil-section-title">
              <h2 className="kategorie-title" style={{ fontSize: '1.25rem' }}>Stories</h2>
            </div>
            <div className="story-bar">
              {stories.map(story => (
                <StoryBubble key={story.id} story={story} />
              ))}
            </div>
          </div>
        )}

        {/* ── Veröffentlichte Pläne ── */}
        {publishedPlans.length > 0 && (
          <PublishedPlansSection
            plans={publishedPlans}
            myId={myId}
            isOwnProfile={isOwnProfile}
            subscribedIds={subscribedIds}
            onSubscribe={(plan) => {
              const all = readArrP(USER_SUB_KEY);
              if (all.find(p => p.id === plan.id)) return;
              localStorage.setItem(USER_SUB_KEY, JSON.stringify([...all, plan]));
              setSubscribedIds(prev => new Set([...prev, plan.id]));
            }}
            onUnsubscribe={(planId) => {
              localStorage.setItem(USER_SUB_KEY, JSON.stringify(readArrP(USER_SUB_KEY).filter(p => p.id !== planId)));
              setSubscribedIds(prev => { const s = new Set(prev); s.delete(planId); return s; });
            }}
          />
        )}

        {/* ── Posts Grid ── */}
        <PostGrid posts={posts} user={user} />

      </div>
    </main>
  );
}
