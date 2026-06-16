'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';
import {
  oeffentlicheTrainingsplaene,
  oeffentlicheErnaehrungsplaene,
} from '@/data/oeffentlichePlaene';
import { upsertUser, isUsernameTaken, isValidUsername } from '@/lib/userRegistry';

const SESSION_KEY = 'kynogg-demo-session';

const PROFIL_KEY  = 'nutzerprofil';
const ZIELE_KEY   = 'nutzerziele';
const VERLAUF_KEY = 'gewichtsverlauf';
const AVATAR_KEY  = 'nutzerprofil-avatar';
const MEINE_T_KEY = 'meine-trainingsplaene';
const MEINE_E_KEY = 'meine-ernaehrungsplaene';
const AKTIV_T_KEY = 'aktiver-trainingsplan';
const AKTIV_E_KEY = 'aktiver-ernaehrungsplan';
// Posts/Stories are keyed by user ID so the public profile page can read them
function postsKey(userId)   { return `profil-posts-${userId}`; }
function storiesKey(userId) { return `profil-stories-${userId}`; }

const EMPTY_PROFIL = {
  name: '', alter: '', geschlecht: '',
  groesse: '', gewicht: '', zielgewicht: '', zieldatum: '',
  bio: '',
};

const EMPTY_ZIELE = {
  kalorien: '', protein: '', kohlenhydrate: '', fett: '',
  einheitenProWoche: '', minutenProEinheit: '',
};

function dateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(ts) {
  return new Date(ts).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getInitials(name) {
  return (name || '').trim().split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ── Plan card ─────────────────────────────────────────────────────────────────

const MP_HDR = {
  kraft:        { emoji: '🏋️', cls: 'pe-hdr-fitness'    },
  ausdauer:     { emoji: '🏃', cls: 'pe-hdr-gaming'     },
  mobilitaet:   { emoji: '🧘', cls: 'pe-hdr-ki'         },
  abnehmen:     { emoji: '🥗', cls: 'pe-hdr-ernaehrung' },
  muskelaufbau: { emoji: '💪', cls: 'pe-hdr-lifestyle'  },
  vegetarisch:  { emoji: '🌱', cls: 'pe-hdr-fitness'    },
};

const MP_KAT = {
  kraft:        { label: 'Kraft',        cls: 'cat-fitness'    },
  ausdauer:     { label: 'Ausdauer',     cls: 'cat-gaming'     },
  mobilitaet:   { label: 'Mobilität',    cls: 'cat-ki'         },
  abnehmen:     { label: 'Abnehmen',     cls: 'cat-ernaehrung' },
  muskelaufbau: { label: 'Muskelaufbau', cls: 'cat-lifestyle'  },
  vegetarisch:  { label: 'Vegetarisch',  cls: 'cat-fitness'    },
};

const MP_NIVEAU = {
  einsteiger:      { label: 'Einsteiger',     cls: 'cat-fitness'    },
  mittel:          { label: 'Mittel',          cls: 'cat-ernaehrung' },
  fortgeschritten: { label: 'Fortgeschritten', cls: 'cat-lifestyle'  },
};

function MPlanCard({ plan, type, isAktiv, onToggleAktiv, onEntfernen }) {
  const hdr        = MP_HDR[plan.kategorie]    ?? { emoji: '📋', cls: 'pe-hdr-ki' };
  const katBadge   = MP_KAT[plan.kategorie];
  const niveauBadge = plan.niveau ? MP_NIVEAU[plan.niveau] : null;

  return (
    <div className={`mp-card${isAktiv ? ' mp-card-aktiv' : ''}`}>
      <div className={`mp-card-band ${hdr.cls}`}>
        <span className="mp-card-emoji" aria-hidden="true">{hdr.emoji}</span>
        {isAktiv && <span className="mp-aktiv-badge">Aktiv</span>}
      </div>
      <div className="mp-card-body">
        <h3 className="mp-card-title">{plan.titel}</h3>
        <div className="mp-card-badges">
          {niveauBadge && <span className={`cat-pill small ${niveauBadge.cls}`}>{niveauBadge.label}</span>}
          {katBadge    && <span className={`cat-pill small ${katBadge.cls}`}>{katBadge.label}</span>}
        </div>
        {type === 'training'
          ? <p className="mp-card-meta">{plan.trainingsTagsProWoche}× pro Woche · {plan.dauer}</p>
          : <p className="mp-card-meta">{plan.kalorien} kcal/Tag · {plan.tage.length} Tage</p>
        }
      </div>
      <div className="mp-card-footer">
        <button
          className={`mp-activate-btn${isAktiv ? ' mp-activate-btn-aktiv' : ''}`}
          onClick={onToggleAktiv}
        >
          {isAktiv ? 'Aktiver Plan ✓' : 'Als aktiven Plan setzen'}
        </button>
        <button className="mp-remove-btn" onClick={onEntfernen}>Entfernen</button>
      </div>
    </div>
  );
}

function resizeToBase64(file, maxPx = 400) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = url;
  });
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post, avatar, name, onDelete }) {
  return (
    <div className="post-card">
      <div className="post-card-header">
        <div className="post-avatar-small">
          {avatar
            ? <img src={avatar} alt="" className="profil-avatar-img" />
            : <div className="profil-avatar-placeholder" style={{ fontSize: '0.75rem', width: '36px', height: '36px' }}>{getInitials(name)}</div>
          }
        </div>
        <div className="post-meta">
          <span className="post-author">{name || 'Du'}</span>
          <span className="post-time">{fmtDateTime(post.ts)}</span>
        </div>
        <span className={`post-type-badge post-type-${post.type}`}>
          {post.type === 'text' ? 'Text' : post.type === 'bild' ? 'Bild' : 'Story'}
        </span>
        <button className="post-delete" onClick={() => onDelete(post.id)} aria-label="Post löschen">×</button>
      </div>
      {post.text && <p className="post-text">{post.text}</p>}
      {post.image && (
        <div className="post-image-wrap">
          <img src={post.image} alt="Post-Bild" className="post-image" />
        </div>
      )}
    </div>
  );
}

// ── Story bubble ──────────────────────────────────────────────────────────────

function StoryBubble({ story, avatar, name, onDelete, onAddSlide }) {
  const [open,       setOpen]       = useState(false);
  const [slide,      setSlide]      = useState(0);
  const [adding,     setAdding]     = useState(false);
  const [addPreview, setAddPreview] = useState(null);
  const [addCaption, setAddCaption] = useState('');
  const addFileRef = useRef(null);

  // backwards-compat: old stories have a single `image` field
  const slides = story.slides ?? (story.image ? [{ image: story.image, caption: story.text || '' }] : []);
  const current = slides[slide] ?? null;

  function handleOpen() { setSlide(0); setOpen(true); }

  function resetAdd() { setAdding(false); setAddPreview(null); setAddCaption(''); }

  async function handleAddFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const base64 = await resizeToBase64(file, 800);
    setAddPreview(base64);
    setAddCaption('');
  }

  function handleAddConfirm() {
    if (!addPreview) return;
    onAddSlide(story.id, { image: addPreview, caption: addCaption.trim() });
    setSlide(slides.length); // jump to new (last) slide
    resetAdd();
  }

  return (
    <>
      <div className="story-bubble-wrap">
        <button className="story-bubble" onClick={handleOpen}>
          <div className="story-ring">
            {avatar
              ? <img src={avatar} alt="" className="profil-avatar-img" style={{ borderRadius: '50%' }} />
              : <div className="profil-avatar-placeholder" style={{ width: '52px', height: '52px', fontSize: '1rem' }}>{getInitials(name)}</div>
            }
          </div>
          <span className="story-label">{story.label || 'Story'}</span>
          {slides.length > 1 && <span className="story-count-badge">{slides.length}</span>}
        </button>
        {onAddSlide && (
          <button
            className="story-add-slide-btn"
            title="Bilder hinzufügen"
            onClick={() => { setAdding(true); setOpen(true); }}
          >+</button>
        )}
      </div>

      {open && (
        <div className="story-overlay" onClick={() => { setOpen(false); resetAdd(); }}>
          <div className="story-modal" onClick={e => e.stopPropagation()}>
            <button className="story-close" onClick={() => { setOpen(false); resetAdd(); }}>×</button>

            {adding ? (
              <div className="story-add-panel">
                <p className="story-add-title">Weiteres Bild hinzufügen</p>
                {addPreview ? (
                  <>
                    <img src={addPreview} alt="Vorschau" className="story-img" />
                    <input
                      type="text"
                      className="tracker-input story-add-caption"
                      placeholder="Beschriftung (optional)…"
                      value={addCaption}
                      onChange={e => setAddCaption(e.target.value)}
                    />
                    <div className="story-add-actions">
                      <button className="tracker-submit" onClick={handleAddConfirm}>Zur Story hinzufügen</button>
                      <button className="mp-remove-btn" onClick={() => setAddPreview(null)}>Anderes Bild wählen</button>
                    </div>
                  </>
                ) : (
                  <div className="story-add-pick">
                    <p className="story-add-hint">Wähle ein Bild, das du dieser Story hinzufügen möchtest.</p>
                    <button className="tracker-submit" onClick={() => addFileRef.current?.click()}>
                      📷 Bild auswählen
                    </button>
                    <input ref={addFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAddFileSelect} />
                    <button className="mp-remove-btn" onClick={resetAdd}>Abbrechen</button>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {onAddSlide && (
                      <button className="story-add-more-btn" onClick={() => setAdding(true)}>
                        + Bild hinzufügen
                      </button>
                    )}
                    {onDelete && (
                      <button className="mp-remove-btn" onClick={() => { onDelete(story.id); setOpen(false); }}>Löschen</button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Own Post Grid (with delete) ───────────────────────────────────────────────

function OwnPostGrid({ posts, avatar, name, onDelete }) {
  const [active, setActive] = useState(null);

  if (posts.length === 0) {
    return (
      <div className="profil-form profil-section-gap">
        <div className="profil-section-title">
          <h2 className="kategorie-title" style={{ fontSize: '1.5rem' }}>Meine Beiträge</h2>
          <p className="tracker-sub">Noch keine Beiträge.</p>
        </div>
        <div className="tracker-empty">
          <span>📝</span>
          <p>Noch keine Beiträge veröffentlicht.</p>
        </div>
      </div>
    );
  }

  const post = active !== null ? posts[active] : null;

  function handleDelete(id) {
    onDelete(id);
    setActive(null);
  }

  return (
    <>
      <div className="profil-form profil-section-gap">
        <div className="profil-section-title">
          <h2 className="kategorie-title" style={{ fontSize: '1.5rem' }}>Meine Beiträge</h2>
          <p className="tracker-sub">{posts.length} Beitrag{posts.length !== 1 ? 'e' : ''}</p>
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
                <span className="post-grid-overlay-icon">{p.image ? '🖼️' : '📝'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {post && (
        <div className="post-modal-overlay" onClick={() => setActive(null)}>
          <div className="post-modal" onClick={e => e.stopPropagation()}>
            <button className="post-modal-close" onClick={() => setActive(null)}>×</button>

            <div className="post-modal-header">
              <div className="post-avatar-small">
                {avatar
                  ? <img src={avatar} alt="" className="profil-avatar-img" />
                  : <div className="profil-avatar-placeholder" style={{ fontSize: '0.75rem', width: '36px', height: '36px' }}>
                      {(name || '?').trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                    </div>
                }
              </div>
              <div className="post-meta" style={{ flex: 1 }}>
                <span className="post-author">{name || 'Du'}</span>
                <span className="post-time">
                  {new Date(post.ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                className="mp-remove-btn"
                style={{ marginRight: '32px' }}
                onClick={() => handleDelete(post.id)}
              >
                Löschen
              </button>
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilPage() {
  const { user: _au, loading: _al } = useAuth();
  const [activeTab, setActiveTab] = useState('privat');

  // Profil state
  const [form,        setForm]        = useState(EMPTY_PROFIL);
  const [ziele,       setZiele]       = useState(EMPTY_ZIELE);
  const [verlauf,     setVerlauf]     = useState([]);
  const [avatar,      setAvatar]      = useState(null);
  const [savedProfil, setSavedProfil] = useState(false);
  const [savedZiele,  setSavedZiele]  = useState(false);
  const [loaded,      setLoaded]      = useState(false);
  const [neuesGewicht, setNeuesGewicht] = useState('');
  const [neuesDatum,   setNeuesDatum]   = useState('');
  const [meinePlaeneIds, setMeinePlaeneIds] = useState({ training: [], ernaehrung: [] });
  const [aktivePlaene,   setAktivePlaene]   = useState({ training: null, ernaehrung: null });
  const [sessionUser,    setSessionUser]    = useState(null); // { id, email, username }
  const [followerCount,  setFollowerCount]  = useState(0);
  // Username-Claim für Nutzer ohne Username
  const [claimInput,  setClaimInput]  = useState('');
  const [claimStatus, setClaimStatus] = useState('idle'); // idle|checking|ok|taken|invalid
  const [claimSaving, setClaimSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Post / Story state
  const [posts,   setPosts]   = useState([]);
  const [stories, setStories] = useState([]);

  // New post form
  const [postType,  setPostType]  = useState('text');
  const [postText,  setPostText]  = useState('');
  const [postImage, setPostImage] = useState(null);
  const [storyLabel,    setStoryLabel]    = useState('');
  const [pendingSlides, setPendingSlides] = useState([]); // [{image, caption}]
  const postFileRef   = useRef(null);
  const storyFileRef  = useRef(null);

  useEffect(() => {
    try { const p = localStorage.getItem(PROFIL_KEY);  if (p) setForm({ ...EMPTY_PROFIL, ...JSON.parse(p) }); } catch {}
    try { const z = localStorage.getItem(ZIELE_KEY);   if (z) setZiele({ ...EMPTY_ZIELE, ...JSON.parse(z) }); } catch {}
    try { const v = localStorage.getItem(VERLAUF_KEY); if (v) setVerlauf(JSON.parse(v)); } catch {}
    try { const a = localStorage.getItem(AVATAR_KEY);  if (a) setAvatar(a); } catch {}
    try {
      const tIds = JSON.parse(localStorage.getItem(MEINE_T_KEY) || '[]');
      const eIds = JSON.parse(localStorage.getItem(MEINE_E_KEY) || '[]');
      setMeinePlaeneIds({ training: tIds, ernaehrung: eIds });
      setAktivePlaene({
        training:   localStorage.getItem(AKTIV_T_KEY) || null,
        ernaehrung: localStorage.getItem(AKTIV_E_KEY) || null,
      });
    } catch {}
    try {
      const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (sess) {
        setSessionUser(sess);
        const po = localStorage.getItem(postsKey(sess.id));
        // fall back to legacy key for existing data
        const poLegacy = localStorage.getItem('profil-posts');
        if (po) setPosts(JSON.parse(po));
        else if (poLegacy) { setPosts(JSON.parse(poLegacy)); localStorage.setItem(postsKey(sess.id), poLegacy); }
        const st = localStorage.getItem(storiesKey(sess.id));
        const stLegacy = localStorage.getItem('profil-stories');
        if (st) setStories(JSON.parse(st));
        else if (stLegacy) { setStories(JSON.parse(stLegacy)); localStorage.setItem(storiesKey(sess.id), stLegacy); }
        try {
          const followers = JSON.parse(localStorage.getItem(`kynogg-followers-${sess.id}`) || '[]');
          setFollowerCount(followers.filter(f => f.status === 'following').length);
        } catch {}
      }
    } catch {}
    setNeuesDatum(dateStr());
    setLoaded(true);
  }, []);

  // Debounced availability check for username claim
  useEffect(() => {
    const val = claimInput.trim();
    if (!val) { setClaimStatus('idle'); return; }
    if (!isValidUsername(val)) { setClaimStatus('invalid'); return; }
    setClaimStatus('checking');
    const t = setTimeout(() => setClaimStatus(isUsernameTaken(val) ? 'taken' : 'ok'), 350);
    return () => clearTimeout(t);
  }, [claimInput]);

  function handleClaimUsername(e) {
    e.preventDefault();
    if (claimStatus !== 'ok' || !sessionUser) return;
    setClaimSaving(true);
    const username = claimInput.trim();
    const updated  = { ...sessionUser, username };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
    const av = null;
    try { const a = localStorage.getItem(AVATAR_KEY); if (a) {} } catch {} // avatar read separately below
    const avatarVal = (() => { try { return localStorage.getItem(AVATAR_KEY) || null; } catch { return null; } })();
    const profData  = (() => { try { return JSON.parse(localStorage.getItem(PROFIL_KEY) || '{}'); } catch { return {}; } })();
    upsertUser({ id: sessionUser.id, email: sessionUser.email, username, name: profData.name || '', avatar: avatarVal, bio: profData.bio || '' });
    setSessionUser(updated);
    setClaimSaving(false);
  }

  function setP(key, value) { setForm(prev => ({ ...prev, [key]: value })); setSavedProfil(false); }
  function setZ(key, value) { setZiele(prev => ({ ...prev, [key]: value })); setSavedZiele(false); }

  function handleSaveProfil(e) {
    e.preventDefault();
    try { localStorage.setItem(PROFIL_KEY, JSON.stringify(form)); } catch {}
    // Keep user registry in sync so search & friends see updated name/bio/avatar
    if (sessionUser?.id) {
      try {
        const av = localStorage.getItem(AVATAR_KEY) || null;
        upsertUser({ id: sessionUser.id, email: sessionUser.email || '', username: sessionUser.username || null, name: form.name, avatar: av, bio: form.bio || '' });
      } catch {}
    }
    setSavedProfil(true);
  }

  function handleSaveZiele(e) {
    e.preventDefault();
    try { localStorage.setItem(ZIELE_KEY, JSON.stringify(ziele)); } catch {}
    try { localStorage.setItem(PROFIL_KEY, JSON.stringify(form)); } catch {}
    setSavedZiele(true);
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const base64 = await resizeToBase64(file);
    setAvatar(base64);
    try {
      localStorage.setItem(AVATAR_KEY, base64);
      window.dispatchEvent(new CustomEvent('profileAvatarUpdated', { detail: base64 }));
      if (sessionUser?.id) {
        const profData = JSON.parse(localStorage.getItem(PROFIL_KEY) || '{}');
        upsertUser({ id: sessionUser.id, email: sessionUser.email || '', username: sessionUser.username || null, name: profData.name || '', avatar: base64, bio: profData.bio || '' });
      }
    } catch {}
  }

  function handleAvatarRemove() {
    setAvatar(null);
    try {
      localStorage.removeItem(AVATAR_KEY);
      window.dispatchEvent(new CustomEvent('profileAvatarUpdated', { detail: null }));
      if (sessionUser?.id) {
        const profData = JSON.parse(localStorage.getItem(PROFIL_KEY) || '{}');
        upsertUser({ id: sessionUser.id, email: sessionUser.email || '', username: sessionUser.username || null, name: profData.name || '', avatar: null, bio: profData.bio || '' });
      }
    } catch {}
  }

  function autoKcal() {
    const kg = parseFloat(form.gewicht);
    if (!kg) return;
    setZiele(prev => ({ ...prev, kalorien: String(Math.round(kg * 30)) }));
    setSavedZiele(false);
  }

  function addEintrag(e) {
    e.preventDefault();
    const w = parseFloat(neuesGewicht);
    if (!w || !neuesDatum) return;
    const updated = [
      { id: Date.now().toString(), datum: neuesDatum, gewicht: w },
      ...verlauf,
    ].sort((a, b) => b.datum.localeCompare(a.datum));
    setVerlauf(updated);
    try { localStorage.setItem(VERLAUF_KEY, JSON.stringify(updated)); } catch {}
    setNeuesGewicht('');
    setNeuesDatum(dateStr());
  }

  function deleteEintrag(id) {
    const updated = verlauf.filter(e => e.id !== id);
    setVerlauf(updated);
    try { localStorage.setItem(VERLAUF_KEY, JSON.stringify(updated)); } catch {}
  }

  function toggleAktiv(plan, type) {
    const key   = type === 'training' ? AKTIV_T_KEY : AKTIV_E_KEY;
    const newId = aktivePlaene[type] === plan.id ? null : plan.id;
    setAktivePlaene(prev => ({ ...prev, [type]: newId }));
    try {
      if (newId) localStorage.setItem(key, newId);
      else localStorage.removeItem(key);
    } catch {}
  }

  function entfernenPlan(plan, type) {
    const mKey = type === 'training' ? MEINE_T_KEY : MEINE_E_KEY;
    const aKey = type === 'training' ? AKTIV_T_KEY : AKTIV_E_KEY;
    setMeinePlaeneIds(prev => {
      const next = { ...prev, [type]: prev[type].filter(id => id !== plan.id) };
      try { localStorage.setItem(mKey, JSON.stringify(next[type])); } catch {}
      return next;
    });
    if (aktivePlaene[type] === plan.id) {
      setAktivePlaene(prev => ({ ...prev, [type]: null }));
      try { localStorage.removeItem(aKey); } catch {}
    }
  }

  // ── Post actions ──

  async function handlePostImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const base64 = await resizeToBase64(file, 800);
    setPostImage(base64);
  }

  async function handlePostSubmit(e) {
    e.preventDefault();
    if (!postText.trim() && !postImage) return;
    const newPost = {
      id: Date.now().toString(),
      ts: Date.now(),
      type: postImage ? 'bild' : 'text',
      text: postText.trim(),
      image: postImage || null,
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    if (sessionUser?.id) try { localStorage.setItem(postsKey(sessionUser.id), JSON.stringify(updated)); } catch {}
    setPostText('');
    setPostImage(null);
  }

  function deletePost(id) {
    const updated = posts.filter(p => p.id !== id);
    setPosts(updated);
    if (sessionUser?.id) try { localStorage.setItem(postsKey(sessionUser.id), JSON.stringify(updated)); } catch {}
  }

  async function handleStoryImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const base64 = await resizeToBase64(file, 800);
    setPendingSlides(prev => [...prev, { image: base64, caption: '' }]);
  }

  function handlePendingCaption(index, caption) {
    setPendingSlides(prev => prev.map((s, i) => i === index ? { ...s, caption } : s));
  }

  function handleRemovePendingSlide(index) {
    setPendingSlides(prev => prev.filter((_, i) => i !== index));
  }

  function handleStoryPublish() {
    if (pendingSlides.length === 0) return;
    const newStory = {
      id: Date.now().toString(),
      ts: Date.now(),
      label: storyLabel.trim() || 'Story',
      slides: pendingSlides,
    };
    const updated = [newStory, ...stories];
    setStories(updated);
    if (sessionUser?.id) try { localStorage.setItem(storiesKey(sessionUser.id), JSON.stringify(updated)); } catch {}
    setStoryLabel('');
    setPendingSlides([]);
  }

  function deleteStory(id) {
    const updated = stories.filter(s => s.id !== id);
    setStories(updated);
    if (sessionUser?.id) try { localStorage.setItem(storiesKey(sessionUser.id), JSON.stringify(updated)); } catch {}
  }

  function handleAddSlideToStory(storyId, newSlide) {
    const updated = stories.map(s => {
      if (s.id !== storyId) return s;
      const existing = s.slides ?? (s.image ? [{ image: s.image, caption: s.text || '' }] : []);
      return { ...s, slides: [...existing, newSlide] };
    });
    setStories(updated);
    if (sessionUser?.id) try { localStorage.setItem(storiesKey(sessionUser.id), JSON.stringify(updated)); } catch {}
  }

  if (!loaded || _al) return null;
  if (!_au) return <AuthGate />;

  const meinTraining = meinePlaeneIds.training
    .map(id => oeffentlicheTrainingsplaene.find(p => p.id === id))
    .filter(Boolean);
  const meinErnaehrung = meinePlaeneIds.ernaehrung
    .map(id => oeffentlicheErnaehrungsplaene.find(p => p.id === id))
    .filter(Boolean);

  const bmi = form.groesse && form.gewicht
    ? (parseFloat(form.gewicht) / Math.pow(parseFloat(form.groesse) / 100, 2)).toFixed(1)
    : null;
  const bmiLabel =
    bmi === null ? null : bmi < 18.5 ? 'Untergewicht' : bmi < 25 ? 'Normalgewicht' : bmi < 30 ? 'Übergewicht' : 'Adipositas';
  const bmiColor =
    bmi === null ? null : bmi < 18.5 ? 'var(--cat-gaming)' : bmi < 25 ? 'var(--cat-fitness)' : bmi < 30 ? 'var(--cat-ernaehrung)' : 'var(--cat-lifestyle)';
  const weightDiff = form.gewicht && form.zielgewicht
    ? (parseFloat(form.zielgewicht) - parseFloat(form.gewicht)).toFixed(1)
    : null;

  const startGewicht = verlauf.length > 0 ? verlauf[verlauf.length - 1].gewicht : parseFloat(form.gewicht) || null;
  const aktGewicht   = verlauf.length > 0 ? verlauf[0].gewicht : null;
  const zielGewicht  = parseFloat(form.zielgewicht) || null;
  const totalDiff    = aktGewicht && startGewicht ? (aktGewicht - startGewicht) : null;
  const nochBisZiel  = aktGewicht && zielGewicht  ? (zielGewicht - aktGewicht)  : null;

  const progressPct = startGewicht && zielGewicht && aktGewicht && startGewicht !== zielGewicht
    ? Math.min(100, Math.max(0, Math.round(
        Math.abs(aktGewicht - startGewicht) / Math.abs(zielGewicht - startGewicht) * 100
      )))
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="main-content">
      <div className="tracker-page">

        {/* ══ Page header ══ */}
        <div className="tracker-header">
          <h1 className="kategorie-title">Mein Profil</h1>
          <p className="tracker-sub">Verwalte deine persönlichen Daten und dein öffentliches Profil.</p>
        </div>

        {/* ══ Username-Claim Banner (nur wenn kein Username vorhanden) ══ */}
        {sessionUser && !sessionUser.username && (
          <div className="claim-banner">
            <div className="claim-banner-icon">👤</div>
            <div className="claim-banner-body">
              <p className="claim-banner-title">Wähle deinen Benutzernamen</p>
              <p className="claim-banner-sub">
                Damit bist du über die Suche findbar. Der Name kann danach nicht mehr geändert werden.
              </p>
              <form onSubmit={handleClaimUsername} className="claim-form">
                <div className="un-input-wrap">
                  <span className="un-at">@</span>
                  <input
                    type="text"
                    placeholder="dein_name"
                    value={claimInput}
                    maxLength={20}
                    onChange={e => setClaimInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    autoComplete="off"
                  />
                </div>
                {claimInput && (
                  <span className={`un-hint ${
                    claimStatus === 'ok'       ? 'un-hint-ok'       :
                    claimStatus === 'taken'    ? 'un-hint-taken'    :
                    claimStatus === 'invalid'  ? 'un-hint-invalid'  :
                    claimStatus === 'checking' ? 'un-hint-checking' : ''
                  }`}>
                    {claimStatus === 'ok'       && `@${claimInput} ist verfügbar ✓`}
                    {claimStatus === 'taken'    && 'Dieser Name ist bereits vergeben.'}
                    {claimStatus === 'invalid'  && 'Nur a–z, 0–9 und _ (3–20 Zeichen).'}
                    {claimStatus === 'checking' && 'Prüfe…'}
                  </span>
                )}
                <button
                  type="submit"
                  className="tracker-submit"
                  disabled={claimStatus !== 'ok' || claimSaving}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Benutzernamen sichern
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ══ Tab switcher ══ */}
        <div className="profil-tabs">
          <button
            className={`profil-tab${activeTab === 'privat' ? ' profil-tab--active' : ''}`}
            onClick={() => setActiveTab('privat')}
          >
            <span className="profil-tab-icon">🔒</span>
            <span>Persönlicher Bereich</span>
            <span className="profil-tab-sub">Nur für dich sichtbar</span>
          </button>
          <button
            className={`profil-tab${activeTab === 'oeffentlich' ? ' profil-tab--active' : ''}`}
            onClick={() => setActiveTab('oeffentlich')}
          >
            <span className="profil-tab-icon">🌍</span>
            <span>Öffentliches Profil</span>
            <span className="profil-tab-sub">Für Freunde &amp; andere sichtbar</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1 – PERSÖNLICHER BEREICH                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {activeTab === 'privat' && (
          <>
            {/* Profilbild */}
            <div className="profil-form" style={{ marginBottom: '0' }}>
              <div className="profil-card">
                <p className="section-label">Profilbild</p>
                <div className="profil-avatar-wrap">
                  <div className="profil-avatar-preview">
                    {avatar
                      ? <img src={avatar} alt="Profilbild" className="profil-avatar-img" />
                      : <div className="profil-avatar-placeholder">{getInitials(form.name)}</div>
                    }
                  </div>
                  <div className="profil-avatar-actions">
                    <p className="profil-label" style={{ marginBottom: '4px' }}>
                      {avatar ? 'Aktuelles Profilbild' : 'Noch kein Profilbild'}
                    </p>
                    <p className="profil-hint-text" style={{ marginBottom: '12px' }}>
                      Wird im Header und im öffentlichen Profil angezeigt.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="tracker-submit profil-avatar-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {avatar ? 'Bild ändern' : 'Bild hochladen'}
                      </button>
                      {avatar && (
                        <button type="button" className="profil-avatar-remove" onClick={handleAvatarRemove}>
                          Entfernen
                        </button>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                  </div>
                </div>
              </div>
            </div>

            {/* Persönliche Daten */}
            <form onSubmit={handleSaveProfil} className="profil-form">

              <div className="profil-card">
                <p className="section-label">Persönliche Daten</p>
                <div className="profil-fields">
                  {sessionUser?.username && (
                    <div className="profil-field">
                      <label className="profil-label">Benutzername</label>
                      <div className="profil-username-display">
                        <span className="profil-username-at">@</span>
                        <span className="profil-username-val">{sessionUser.username}</span>
                        <span className="profil-username-hint">Kann nicht geändert werden</span>
                      </div>
                    </div>
                  )}
                  {sessionUser?.email && (
                    <div className="profil-field">
                      <label className="profil-label">E-Mail-Adresse</label>
                      <div className="profil-username-display">
                        <span className="profil-username-val">{sessionUser.email}</span>
                        <span className="profil-username-hint">Nur für dich sichtbar</span>
                      </div>
                    </div>
                  )}
                  <div className="profil-field">
                    <label className="profil-label" htmlFor="name">Anzeigename</label>
                    <input id="name" type="text" className="tracker-input"
                      placeholder="Dein Name" value={form.name}
                      onChange={e => setP('name', e.target.value)} />
                  </div>
                  <div className="profil-field profil-field--half">
                    <label className="profil-label" htmlFor="alter">Alter</label>
                    <input id="alter" type="number" min="1" max="120" className="tracker-input"
                      placeholder="Jahre" value={form.alter}
                      onChange={e => setP('alter', e.target.value)} />
                  </div>
                  <div className="profil-field profil-field--half">
                    <label className="profil-label" htmlFor="geschlecht">Geschlecht</label>
                    <select id="geschlecht" className="tracker-input profil-select"
                      value={form.geschlecht} onChange={e => setP('geschlecht', e.target.value)}>
                      <option value="">Keine Angabe</option>
                      <option value="maennlich">Männlich</option>
                      <option value="weiblich">Weiblich</option>
                      <option value="divers">Divers</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="profil-card">
                <p className="section-label">Körperdaten</p>
                <div className="profil-fields">
                  <div className="profil-field profil-field--half">
                    <label className="profil-label" htmlFor="groesse">Körpergröße</label>
                    <div className="profil-input-wrap">
                      <input id="groesse" type="number" min="50" max="250" className="tracker-input"
                        placeholder="0" value={form.groesse} onChange={e => setP('groesse', e.target.value)} />
                      <span className="profil-unit">cm</span>
                    </div>
                  </div>
                  <div className="profil-field profil-field--half">
                    <label className="profil-label" htmlFor="gewicht">Aktuelles Gewicht</label>
                    <div className="profil-input-wrap">
                      <input id="gewicht" type="number" min="1" max="500" step="0.1"
                        className="tracker-input" placeholder="0" value={form.gewicht}
                        onChange={e => setP('gewicht', e.target.value)} />
                      <span className="profil-unit">kg</span>
                    </div>
                  </div>
                  {bmi && (
                    <div className="profil-bmi">
                      <span className="profil-bmi-label">BMI</span>
                      <span className="profil-bmi-val" style={{ color: bmiColor }}>{bmi}</span>
                      <span className="profil-bmi-text" style={{ color: bmiColor }}>{bmiLabel}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="profil-save-row">
                <button type="submit" className="tracker-submit profil-save-btn">Speichern</button>
                {savedProfil && <span className="profil-saved-msg">Profil gespeichert ✓</span>}
              </div>

            </form>

            {/* Meine Ziele */}
            <form onSubmit={handleSaveZiele} className="profil-form profil-section-gap">
              <div className="profil-section-title">
                <h2 className="kategorie-title" style={{ fontSize: '1.5rem' }}>Meine Ziele</h2>
                <p className="tracker-sub">Tägliche Nährwert- und Trainingsziele.</p>
              </div>

              <div className="profil-card">
                <p className="section-label">Gewichtsziel</p>
                <div className="profil-fields">
                  <div className="profil-field profil-field--half">
                    <label className="profil-label" htmlFor="zielgewicht">Zielgewicht</label>
                    <div className="profil-input-wrap">
                      <input id="zielgewicht" type="number" min="1" max="500" step="0.1"
                        className="tracker-input" placeholder="0" value={form.zielgewicht}
                        onChange={e => setP('zielgewicht', e.target.value)} />
                      <span className="profil-unit">kg</span>
                    </div>
                  </div>
                  <div className="profil-field profil-field--half">
                    <label className="profil-label" htmlFor="zieldatum">Zieldatum</label>
                    <input id="zieldatum" type="date" className="tracker-input"
                      value={form.zieldatum} onChange={e => setP('zieldatum', e.target.value)} />
                  </div>
                  {weightDiff !== null && (
                    <div className="profil-ziel-diff">
                      <span className="profil-ziel-text">
                        {weightDiff == 0 ? '🎯 Ziel bereits erreicht!'
                          : `${weightDiff < 0 ? '📉' : '📈'} ${Math.abs(weightDiff)} kg ${weightDiff < 0 ? 'abnehmen' : 'zunehmen'}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="profil-card">
                <p className="section-label">Ernährungsziele</p>
                <div className="profil-hint-box">
                  <p className="profil-hint-title">💡 Kalorienbedarf grob berechnen</p>
                  <p className="profil-hint-text">
                    Faustregel: <strong>Gewicht (kg) × 30 = täglicher Kalorienbedarf (kcal)</strong>.
                  </p>
                  {form.gewicht ? (
                    <button type="button" className="profil-hint-btn" onClick={autoKcal}>
                      Automatisch berechnen ({Math.round(parseFloat(form.gewicht) * 30)} kcal)
                    </button>
                  ) : (
                    <p className="profil-hint-note">Trage dein Gewicht ein, um automatisch zu berechnen.</p>
                  )}
                </div>
                <div className="profil-fields" style={{ marginTop: '16px' }}>
                  {[
                    { id: 'kalorien', label: 'Kalorien / Tag', unit: 'kcal', key: 'kalorien' },
                    { id: 'protein',  label: 'Protein / Tag',  unit: 'g',    key: 'protein'  },
                    { id: 'kohlenhydrate', label: 'Kohlenhydrate / Tag', unit: 'g', key: 'kohlenhydrate' },
                    { id: 'fett',     label: 'Fett / Tag',     unit: 'g',    key: 'fett'     },
                  ].map(({ id, label, unit, key }) => (
                    <div key={id} className="profil-field profil-field--half">
                      <label className="profil-label" htmlFor={id}>{label}</label>
                      <div className="profil-input-wrap">
                        <input id={id} type="number" min="0" className="tracker-input"
                          placeholder="0" value={ziele[key]} onChange={e => setZ(key, e.target.value)} />
                        <span className="profil-unit">{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="profil-card">
                <p className="section-label">Trainingsziele</p>
                <div className="profil-fields">
                  <div className="profil-field profil-field--half">
                    <label className="profil-label" htmlFor="einheitenProWoche">Einheiten / Woche</label>
                    <div className="profil-input-wrap">
                      <input id="einheitenProWoche" type="number" min="0" max="21" className="tracker-input"
                        placeholder="0" value={ziele.einheitenProWoche}
                        onChange={e => setZ('einheitenProWoche', e.target.value)} />
                      <span className="profil-unit">×</span>
                    </div>
                  </div>
                  <div className="profil-field profil-field--half">
                    <label className="profil-label" htmlFor="minutenProEinheit">Minuten / Einheit</label>
                    <div className="profil-input-wrap">
                      <input id="minutenProEinheit" type="number" min="0" max="480" className="tracker-input"
                        placeholder="0" value={ziele.minutenProEinheit}
                        onChange={e => setZ('minutenProEinheit', e.target.value)} />
                      <span className="profil-unit">min</span>
                    </div>
                  </div>
                  {ziele.einheitenProWoche && ziele.minutenProEinheit && (
                    <div className="profil-ziel-diff">
                      <span className="profil-ziel-text">
                        ⚡ {ziele.einheitenProWoche} × {ziele.minutenProEinheit} min =&nbsp;
                        <strong>{ziele.einheitenProWoche * ziele.minutenProEinheit} min Sport pro Woche</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="profil-save-row">
                <button type="submit" className="tracker-submit profil-save-btn">Ziele speichern</button>
                {savedZiele && <span className="profil-saved-msg">Ziele gespeichert ✓</span>}
              </div>
            </form>

            {/* Gewichtsverlauf */}
            <div className="profil-form profil-section-gap">
              <div className="profil-section-title">
                <h2 className="kategorie-title" style={{ fontSize: '1.5rem' }}>Gewichtsverlauf</h2>
                <p className="tracker-sub">Täglich eintragen und Fortschritt verfolgen.</p>
              </div>

              {(startGewicht || zielGewicht) && (
                <div className="verlauf-summary">
                  <div className="verlauf-stat">
                    <span className="verlauf-stat-label">Startgewicht</span>
                    <span className="verlauf-stat-val">{startGewicht ? `${startGewicht} kg` : '–'}</span>
                  </div>
                  <div className="verlauf-stat">
                    <span className="verlauf-stat-label">Aktuell</span>
                    <span className="verlauf-stat-val">{aktGewicht ? `${aktGewicht} kg` : (form.gewicht ? `${form.gewicht} kg` : '–')}</span>
                  </div>
                  <div className="verlauf-stat">
                    <span className="verlauf-stat-label">Veränderung</span>
                    <span className="verlauf-stat-val" style={{
                      color: totalDiff === null ? 'var(--text)' : totalDiff < 0 ? 'var(--cat-fitness)' : totalDiff > 0 ? 'var(--cat-ernaehrung)' : 'var(--text)',
                    }}>
                      {totalDiff === null ? '–' : `${totalDiff > 0 ? '+' : ''}${totalDiff} kg`}
                    </span>
                  </div>
                  <div className="verlauf-stat">
                    <span className="verlauf-stat-label">Noch bis Ziel</span>
                    <span className="verlauf-stat-val" style={{
                      color: nochBisZiel === null ? 'var(--text)' : Math.abs(nochBisZiel) < 0.1 ? 'var(--cat-fitness)' : 'var(--text)',
                    }}>
                      {nochBisZiel === null ? '–'
                        : Math.abs(nochBisZiel) < 0.1 ? '🎯 Erreicht!'
                        : `${Math.abs(nochBisZiel).toFixed(1)} kg`}
                    </span>
                  </div>
                </div>
              )}

              {progressPct !== null && (
                <div className="verlauf-progress-wrap">
                  <div className="verlauf-progress-bar" style={{ width: `${progressPct}%` }} />
                  <span className="verlauf-progress-label">{progressPct}% des Ziels erreicht</span>
                </div>
              )}

              <div className="profil-card">
                <p className="section-label">Neuer Eintrag</p>
                <form onSubmit={addEintrag} className="verlauf-add-form">
                  <div className="profil-field" style={{ flex: 1 }}>
                    <label className="profil-label" htmlFor="vDatum">Datum</label>
                    <input id="vDatum" type="date" className="tracker-input"
                      value={neuesDatum} onChange={e => setNeuesDatum(e.target.value)} required />
                  </div>
                  <div className="profil-field" style={{ flex: 1 }}>
                    <label className="profil-label" htmlFor="vGewicht">Gewicht</label>
                    <div className="profil-input-wrap">
                      <input id="vGewicht" type="number" min="1" max="500" step="0.1"
                        className="tracker-input" placeholder="0"
                        value={neuesGewicht} onChange={e => setNeuesGewicht(e.target.value)} required />
                      <span className="profil-unit">kg</span>
                    </div>
                  </div>
                  <div className="verlauf-add-btn-wrap">
                    <label className="profil-label">&nbsp;</label>
                    <button type="submit" className="tracker-submit">Eintragen</button>
                  </div>
                </form>
              </div>

              {verlauf.length === 0 ? (
                <div className="tracker-empty">
                  <span>⚖️</span>
                  <p>Noch keine Einträge. Trage heute dein Gewicht ein!</p>
                </div>
              ) : (
                <div className="verlauf-list">
                  {verlauf.map((entry, i) => {
                    const diffStart = startGewicht ? (entry.gewicht - startGewicht) : null;
                    const diffZiel  = zielGewicht  ? (zielGewicht - entry.gewicht)  : null;
                    const isNewest  = i === 0;
                    return (
                      <div key={entry.id} className={`verlauf-row${isNewest ? ' verlauf-row--latest' : ''}`}>
                        <div className="verlauf-row-date">
                          <span className="verlauf-date">{fmtDate(entry.datum)}</span>
                          {isNewest && <span className="verlauf-badge">Aktuell</span>}
                        </div>
                        <span className="verlauf-weight">{entry.gewicht} kg</span>
                        <div className="verlauf-diffs">
                          {diffStart !== null && (
                            <span className="verlauf-diff" style={{
                              color: diffStart < 0 ? 'var(--cat-fitness)' : diffStart > 0 ? 'var(--cat-ernaehrung)' : 'var(--text-muted)',
                            }}>
                              {diffStart > 0 ? '+' : ''}{diffStart.toFixed(1)} kg vom Start
                            </span>
                          )}
                          {diffZiel !== null && (
                            <span className="verlauf-diff" style={{ color: 'var(--text-muted)' }}>
                              {Math.abs(diffZiel) < 0.1
                                ? '🎯 Ziel erreicht'
                                : diffZiel > 0
                                  ? `${diffZiel.toFixed(1)} kg bis Ziel`
                                  : `${Math.abs(diffZiel).toFixed(1)} kg über Ziel`}
                            </span>
                          )}
                        </div>
                        <button className="verlauf-delete" onClick={() => deleteEintrag(entry.id)} aria-label="Eintrag löschen">×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Meine Pläne */}
            <div className="profil-form profil-section-gap">
              <div className="profil-section-title">
                <h2 className="kategorie-title" style={{ fontSize: '1.5rem' }}>Meine Pläne</h2>
                <p className="tracker-sub">Gespeicherte Trainings- und Ernährungspläne.</p>
              </div>

              {meinTraining.length === 0 && meinErnaehrung.length === 0 ? (
                <div className="profil-card">
                  <div className="mp-empty">
                    <span>📋</span>
                    <p>Noch keine Pläne gespeichert.</p>
                    <Link href="/plaene-entdecken" className="tracker-submit mp-discover-btn">
                      Pläne entdecken →
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {meinTraining.length > 0 && (
                    <div className="profil-card">
                      <p className="section-label">
                        Trainingspläne ({meinTraining.length})
                        {aktivePlaene.training && <span className="mp-section-aktiv">· 1 aktiv</span>}
                      </p>
                      <div className="mp-grid">
                        {meinTraining.map(plan => (
                          <MPlanCard key={plan.id} plan={plan} type="training"
                            isAktiv={aktivePlaene.training === plan.id}
                            onToggleAktiv={() => toggleAktiv(plan, 'training')}
                            onEntfernen={() => entfernenPlan(plan, 'training')} />
                        ))}
                      </div>
                    </div>
                  )}
                  {meinErnaehrung.length > 0 && (
                    <div className="profil-card">
                      <p className="section-label">
                        Ernährungspläne ({meinErnaehrung.length})
                        {aktivePlaene.ernaehrung && <span className="mp-section-aktiv">· 1 aktiv</span>}
                      </p>
                      <div className="mp-grid">
                        {meinErnaehrung.map(plan => (
                          <MPlanCard key={plan.id} plan={plan} type="ernaehrung"
                            isAktiv={aktivePlaene.ernaehrung === plan.id}
                            onToggleAktiv={() => toggleAktiv(plan, 'ernaehrung')}
                            onEntfernen={() => entfernenPlan(plan, 'ernaehrung')} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mp-footer-link">
                    <Link href="/plaene-entdecken" className="back-link">+ Weitere Pläne entdecken</Link>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2 – ÖFFENTLICHES PROFIL                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {activeTab === 'oeffentlich' && (
          <>
            {/* Profilkarte */}
            <div className="profil-form" style={{ marginBottom: '0' }}>
              <div className="profil-card oeprofil-card">
                <div className="oeprofil-header">
                  <div className="oeprofil-avatar">
                    {avatar
                      ? <img src={avatar} alt="Profilbild" className="profil-avatar-img" style={{ borderRadius: '50%' }} />
                      : <div className="profil-avatar-placeholder" style={{ width: '72px', height: '72px', fontSize: '1.5rem' }}>{getInitials(form.name)}</div>
                    }
                  </div>
                  <div className="oeprofil-info">
                    <h2 className="oeprofil-name">{form.name || sessionUser?.username || 'Kein Name angegeben'}</h2>
                    {sessionUser?.username && (
                      <p className="oeprofil-username">@{sessionUser.username}</p>
                    )}
                    {form.bio
                      ? <p className="oeprofil-bio">{form.bio}</p>
                      : <p className="oeprofil-bio oeprofil-bio--leer">Noch keine Bio – trage unten etwas ein.</p>
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
                        <span className="oeprofil-stat-val">{followerCount}</span>
                        <span className="oeprofil-stat-label">Follower</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio bearbeiten */}
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <label className="profil-label" htmlFor="bio">Kurze Bio (öffentlich sichtbar)</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <textarea
                      id="bio"
                      className="tracker-input"
                      placeholder="Stell dich kurz vor, z.B. Ziele, Hobbys, Motivation…"
                      value={form.bio || ''}
                      rows={2}
                      style={{ resize: 'vertical', flex: 1 }}
                      onChange={e => setP('bio', e.target.value)}
                    />
                    <button
                      type="button"
                      className="tracker-submit"
                      style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}
                      onClick={handleSaveProfil}
                    >
                      Speichern
                    </button>
                  </div>
                  {savedProfil && <span className="profil-saved-msg">Gespeichert ✓</span>}
                </div>
              </div>
            </div>

            {/* Stories-Leiste */}
            <div className="profil-form profil-section-gap" style={{ marginTop: '32px' }}>
              <div className="profil-section-title">
                <h2 className="kategorie-title" style={{ fontSize: '1.5rem' }}>Stories</h2>
                <p className="tracker-sub">Kurze Bildmomente für Freunde und andere Nutzer.</p>
              </div>

              <div className="profil-card">
                <p className="section-label">Neue Story erstellen</p>

                <div className="story-add-row">
                  <input
                    type="text"
                    className="tracker-input"
                    placeholder="Story-Titel (optional)"
                    value={storyLabel}
                    onChange={e => setStoryLabel(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="tracker-submit"
                    onClick={() => storyFileRef.current?.click()}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Bild hinzufügen
                  </button>
                  <input ref={storyFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleStoryImageSelect} />
                </div>

                {pendingSlides.length > 0 && (
                  <>
                    <div className="story-pending-strip">
                      {pendingSlides.map((slide, i) => (
                        <div key={i} className="story-pending-slide">
                          <div className="story-pending-img-wrap">
                            <img src={slide.image} alt="" className="story-pending-img" />
                            <button
                              type="button"
                              className="story-pending-remove"
                              onClick={() => handleRemovePendingSlide(i)}
                            >×</button>
                            <span className="story-pending-num">{i + 1}</span>
                          </div>
                          <input
                            type="text"
                            className="tracker-input story-pending-caption"
                            placeholder="Beschriftung…"
                            value={slide.caption}
                            onChange={e => handlePendingCaption(i, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <button type="button" className="tracker-submit" onClick={handleStoryPublish}>
                        Story veröffentlichen ({pendingSlides.length} {pendingSlides.length === 1 ? 'Bild' : 'Bilder'})
                      </button>
                    </div>
                  </>
                )}
              </div>

              {stories.length > 0 ? (
                <div className="story-bar">
                  {stories.map(story => (
                    <StoryBubble key={story.id} story={story} avatar={avatar} name={form.name} onDelete={deleteStory} onAddSlide={handleAddSlideToStory} />
                  ))}
                </div>
              ) : (
                <div className="tracker-empty">
                  <span>✨</span>
                  <p>Noch keine Stories. Lade ein Bild hoch!</p>
                </div>
              )}
            </div>

            {/* Post erstellen */}
            <div className="profil-form profil-section-gap">
              <div className="profil-section-title">
                <h2 className="kategorie-title" style={{ fontSize: '1.5rem' }}>Beitrag erstellen</h2>
                <p className="tracker-sub">Teile Texte oder Bilder mit Freunden und anderen Nutzern.</p>
              </div>

              <div className="profil-card">
                <div className="post-create-header">
                  <div className="post-avatar-small">
                    {avatar
                      ? <img src={avatar} alt="" className="profil-avatar-img" />
                      : <div className="profil-avatar-placeholder" style={{ fontSize: '0.75rem', width: '36px', height: '36px' }}>{getInitials(form.name)}</div>
                    }
                  </div>
                  <span className="post-author">{form.name || 'Du'}</span>
                </div>

                <form onSubmit={handlePostSubmit} className="post-create-form">
                  <textarea
                    className="tracker-input post-textarea"
                    placeholder="Was möchtest du teilen? Schreibe etwas…"
                    value={postText}
                    rows={3}
                    onChange={e => setPostText(e.target.value)}
                  />

                  {postImage && (
                    <div className="post-preview-wrap">
                      <img src={postImage} alt="Vorschau" className="post-preview-img" />
                      <button type="button" className="post-preview-remove" onClick={() => setPostImage(null)}>× Bild entfernen</button>
                    </div>
                  )}

                  <div className="post-create-actions">
                    <button
                      type="button"
                      className="post-action-btn"
                      onClick={() => postFileRef.current?.click()}
                    >
                      📷 Bild hinzufügen
                    </button>
                    <input ref={postFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePostImageSelect} />
                    <button
                      type="submit"
                      className="tracker-submit"
                      disabled={!postText.trim() && !postImage}
                    >
                      Veröffentlichen
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Post-Grid */}
            <OwnPostGrid posts={posts} avatar={avatar} name={form.name} onDelete={deletePost} />
          </>
        )}

      </div>
    </main>
  );
}
