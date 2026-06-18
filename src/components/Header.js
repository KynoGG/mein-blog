'use client';

import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

const NAV_ITEMS_PUBLIC = [
  { href: '/', label: 'Home' },
  {
    label: 'Pläne',
    dropdown: [
      { href: '/plaene-entdecken', label: 'Pläne entdecken' },
    ],
  },
];

const NAV_ITEMS_AUTH = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  {
    label: 'Pläne',
    dropdown: [
      { href: '/plaene-entdecken',  label: 'Pläne entdecken'     },
      { href: '/plaene/training',   label: 'Mein Trainingsplan'  },
      { href: '/plaene/ernaehrung', label: 'Mein Ernährungsplan' },
    ],
  },
  { href: '/challenges', label: 'Challenges' },
  {
    label: 'Life Hub',
    dropdown: [
      { href: '/kalender', label: 'Kalender' },
      { href: '/todo',     label: 'To-do'    },
      { href: '/notizen',  label: 'Notizen'  },
    ],
  },
];

function getInitials(name) {
  return (name || '').trim().split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const NAV_ITEMS = user ? NAV_ITEMS_AUTH : NAV_ITEMS_PUBLIC;
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [authOpen,      setAuthOpen]      = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [query,         setQuery]         = useState('');
  const [searchMode,    setSearchMode]    = useState('app'); // 'app' | 'nutzer'
  const [headerAvatar,  setHeaderAvatar]  = useState(null);
  const [initials,      setInitials]      = useState('?');
  const router   = useRouter();
  const pathname = usePathname();
  const inputRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function loadAvatar() {
      try {
        const img    = localStorage.getItem('nutzerprofil-avatar');
        const profil = JSON.parse(localStorage.getItem('nutzerprofil') || '{}');
        setHeaderAvatar(img || null);
        setInitials(getInitials(profil.name));
      } catch {}
    }
    loadAvatar();
    window.addEventListener('profileAvatarUpdated', loadAvatar);
    return () => window.removeEventListener('profileAvatarUpdated', loadAvatar);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const modeParam = searchMode === 'nutzer' ? '&mode=nutzer' : '';
    router.push(`/suche?q=${encodeURIComponent(trimmed)}${modeParam}`);
    setSearchOpen(false);
    setQuery('');
  }

  function handleSearchClose() {
    setSearchOpen(false);
    setQuery('');
  }

  async function handleSignOut() {
    await auth.signOut();
    setMenuOpen(false);
  }

  const shortEmail = user?.email
    ? user.email.length > 20 ? user.email.slice(0, 18) + '…' : user.email
    : null;

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <nav className="header-nav">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-mode-toggle">
                  <button
                    type="button"
                    className={`search-mode-btn${searchMode === 'app' ? ' active' : ''}`}
                    onClick={() => setSearchMode('app')}
                  >
                    App
                  </button>
                  <button
                    type="button"
                    className={`search-mode-btn${searchMode === 'nutzer' ? ' active' : ''}`}
                    onClick={() => setSearchMode('nutzer')}
                  >
                    Nutzer
                  </button>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  className="search-input"
                  placeholder={searchMode === 'nutzer' ? '@benutzername suchen…' : 'Suchen…'}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <button type="submit" className="search-btn" aria-label="Suchen">
                  <SearchIcon />
                </button>
                <button type="button" className="search-close-btn" onClick={handleSearchClose} aria-label="Schließen">
                  <CloseIcon />
                </button>
              </form>
            ) : (
              <>
                {NAV_ITEMS.map(item =>
                  item.dropdown ? (
                    <NavDropdown key={item.label} label={item.label} items={item.dropdown} pathname={pathname} />
                  ) : (
                    <Link key={item.href} href={item.href} className="nav-link">
                      {item.label}
                    </Link>
                  )
                )}
                <button className="theme-toggle" onClick={() => setSearchOpen(true)} aria-label="Suche öffnen">
                  <SearchIcon />
                </button>
              </>
            )}

            {user ? (
              <div className="user-menu">
                <button className="auth-btn outline" onClick={handleSignOut}>Abmelden</button>
              </div>
            ) : (
              <button className="auth-btn" onClick={() => setAuthOpen(true)}>Anmelden</button>
            )}

            {user && (
              <Link href="/nachrichten" className="theme-toggle" aria-label="Nachrichten">
                <ChatIcon />
              </Link>
            )}

            {user && (
              <Link href="/profil" className="header-avatar" aria-label="Profil">
                {headerAvatar
                  ? <img src={headerAvatar} alt="Profilbild" />
                  : <span className="header-avatar-initials">{initials}</span>
                }
              </Link>
            )}

            <button className="theme-toggle" onClick={toggleTheme} aria-label="Theme wechseln">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* Hamburger – only visible on mobile */}
            <button
              className={`menu-toggle${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={menuOpen}
            >
              <HamburgerIcon open={menuOpen} />
            </button>
          </nav>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav className="mobile-menu" aria-label="Mobile Navigation">
            {NAV_ITEMS.map(item =>
              item.dropdown ? (
                <div key={item.label} className="mobile-menu-group">
                  <span className="mobile-menu-group-label">{item.label}</span>
                  {item.dropdown.map(sub => (
                    <Link key={sub.href} href={sub.href} className="mobile-menu-link mobile-menu-sub">
                      {sub.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link key={item.href} href={item.href} className="mobile-menu-link">
                  {item.label}
                </Link>
              )
            )}
            <div className="mobile-menu-divider" />
            {user ? (
              <>
                <button className="mobile-menu-link mobile-menu-signout" onClick={handleSignOut}>
                  Abmelden
                </button>
              </>
            ) : (
              <button className="mobile-menu-link mobile-menu-auth" onClick={() => { setAuthOpen(true); setMenuOpen(false); }}>
                Anmelden
              </button>
            )}
          </nav>
        )}
      </header>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}

function NavDropdown({ label, items, pathname }) {
  const isActive = items.some(i => pathname === i.href || pathname?.startsWith(i.href + '/'));
  return (
    <div className="nav-dropdown">
      <button className={`nav-link nav-dropdown-trigger${isActive ? ' active' : ''}`} tabIndex={0}>
        {label}
        <ChevronIcon />
      </button>
      <div className="nav-dropdown-panel" role="menu">
        {items.map(item => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-dropdown-item${active ? ' active' : ''}`}
              role="menuitem"
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="nav-dropdown-chevron"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="2,3.5 5,6.5 8,3.5" />
    </svg>
  );
}

function HamburgerIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      {open ? (
        <>
          <line x1="4" y1="4" x2="16" y2="16" />
          <line x1="16" y1="4" x2="4" y2="16" />
        </>
      ) : (
        <>
          <line x1="3" y1="5"  x2="17" y2="5"  />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </>
      )}
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  );
}
