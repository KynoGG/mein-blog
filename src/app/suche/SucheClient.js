'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchUsers, upsertUser } from '@/lib/userRegistry';
import { useAuth } from '@/components/AuthProvider';
import dynamic from 'next/dynamic';

const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false });

const DEMO_USERS = [
  {
    id:       'demo-user-alex',
    email:    'alex@kynogg.de',
    username: 'alex_kynogg',
    name:     'Alex Müller',
    avatar:   null,
    bio:      'Fitness-Fan · Push/Pull/Legs · 3 Jahre Training',
  },
];

function ensureDemoUsers() {
  DEMO_USERS.forEach(u => upsertUser(u));
}

const categoryConfig = {
  fitness:    { label: 'Fitness',    emoji: '🏋️', color: 'cat-fitness'    },
  ernaehrung: { label: 'Ernährung',  emoji: '🥗', color: 'cat-ernaehrung' },
  gaming:     { label: 'Gaming',     emoji: '🎮', color: 'cat-gaming'     },
  ki:         { label: 'KI & Tech',  emoji: '🤖', color: 'cat-ki'         },
  lifestyle:  { label: 'Lifestyle',  emoji: '✨', color: 'cat-lifestyle'  },
};

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function SucheClient({ allPosts }) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { user }     = useAuth();

  const [authOpen, setAuthOpen] = useState(false);

  const q    = searchParams.get('q')    || '';
  const mode = (searchParams.get('mode') === 'nutzer' && !user) ? 'app' : (searchParams.get('mode') || 'app');

  const [inputVal,  setInputVal]  = useState(q);
  const [curMode,   setCurMode]   = useState(mode);
  const [userResults, setUserResults] = useState([]);

  // Sync input when URL changes
  useEffect(() => { setInputVal(q); }, [q]);
  useEffect(() => { setCurMode(mode); }, [mode]);

  // User search runs client-side (localStorage)
  useEffect(() => {
    if (curMode === 'nutzer' && q.trim()) {
      ensureDemoUsers();
      setUserResults(searchUsers(q.trim()));
    } else {
      setUserResults([]);
    }
  }, [q, curMode]);

  const postResults = curMode === 'app' && q.trim()
    ? allPosts.filter(post => {
        const term = q.toLowerCase();
        return (
          post.title.toLowerCase().includes(term) ||
          post.excerpt.toLowerCase().includes(term) ||
          (categoryConfig[post.kategorie]?.label || post.kategorie).toLowerCase().includes(term)
        );
      })
    : [];

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    const modeParam = curMode === 'nutzer' ? '&mode=nutzer' : '';
    router.push(`/suche?q=${encodeURIComponent(trimmed)}${modeParam}`);
  }

  function switchMode(m) {
    setCurMode(m);
    if (q) router.push(`/suche?q=${encodeURIComponent(q)}${m === 'nutzer' ? '&mode=nutzer' : ''}`);
  }

  return (
    <>
    <main className="main-content">
      <div className="kategorie-page">

        <div className="kategorie-header">
          <h1 className="kategorie-title">Suche</h1>
          <p className="tracker-sub">Durchsuche Beiträge oder finde Nutzer.</p>
        </div>

        {/* ── Search bar with mode toggle ── */}
        <div className="suche-bar-wrap">
          <div className="suche-mode-tabs">
            <button
              className={`suche-mode-tab${curMode === 'app' ? ' active' : ''}`}
              onClick={() => switchMode('app')}
            >
              App-Inhalte
            </button>
            <button
              className={`suche-mode-tab${curMode === 'nutzer' ? ' active' : ''}`}
              onClick={() => user ? switchMode('nutzer') : setAuthOpen(true)}
            >
              Nutzer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="suche-input-row">
            <input
              type="text"
              className="tracker-input"
              placeholder={curMode === 'nutzer' ? '@benutzername oder Name suchen…' : 'Thema, Kategorie oder Stichwort…'}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              autoFocus
            />
            <button type="submit" className="tracker-submit" style={{ whiteSpace: 'nowrap' }}>
              Suchen
            </button>
          </form>
        </div>

        {/* ── APP mode results ── */}
        {curMode === 'app' && q && (
          <>
            <p className="search-count">
              {postResults.length} {postResults.length === 1 ? 'Ergebnis' : 'Ergebnisse'} für „{q}"
            </p>
            {postResults.length > 0 ? (
              <div className="posts-grid">
                {postResults.map(post => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="post-card">
                    <span className={`cat-pill small ${categoryConfig[post.kategorie]?.color || 'cat-lifestyle'}`}>
                      {categoryConfig[post.kategorie]?.emoji} {categoryConfig[post.kategorie]?.label || post.kategorie}
                    </span>
                    <h3 className="post-card-title">{post.title}</h3>
                    <p className="post-card-excerpt">{post.excerpt}</p>
                    <span className="post-date">{post.date}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-emoji">🔍</p>
                <h2>Nichts gefunden</h2>
                <p>Für „{q}" gibt es keine Treffer. Versuche einen anderen Begriff.</p>
              </div>
            )}
          </>
        )}

        {/* ── NUTZER mode results ── */}
        {curMode === 'nutzer' && q && (
          <>
            <p className="search-count">
              {userResults.length} {userResults.length === 1 ? 'Nutzer' : 'Nutzer'} gefunden für „{q}"
            </p>
            {userResults.length > 0 ? (
              <div className="suche-user-list">
                {userResults.map(u => (
                  <div key={u.id} className="suche-user-row">
                    <div className="dm-avatar">
                      {u.avatar
                        ? <img src={u.avatar} alt={u.name} />
                        : <span>{getInitials(u.name || u.username)}</span>
                      }
                    </div>
                    <div className="suche-user-info">
                      <span className="suche-user-name">{u.name || u.username}</span>
                      <span className="suche-user-username">@{u.username}</span>
                      {u.bio && <span className="suche-user-bio">{u.bio}</span>}
                    </div>
                    {u.username
                      ? <Link href={`/profil/${u.username}`} className="dm-add-btn">Profil ansehen →</Link>
                      : <span className="dm-req-sent">Kein @Username</span>
                    }
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-emoji">👤</p>
                <h2>Kein Nutzer gefunden</h2>
                <p>Für „{q}" gibt es keinen passenden Benutzernamen.</p>
              </div>
            )}
          </>
        )}

        {!q && (
          <div className="suche-empty-hint">
            <p>
              {curMode === 'nutzer'
                ? 'Gib einen Benutzernamen ein, um Nutzer zu finden.'
                : 'Gib einen Begriff ein, um Beiträge zu durchsuchen.'}
            </p>
          </div>
        )}

      </div>
    </main>

    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
