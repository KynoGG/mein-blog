'use client';

import Link from 'next/link';

const trackerCards = [
  {
    href: '/tracker/ernaehrung',
    emoji: '🥗',
    label: 'Ernährung',
    labelClass: 'cat-ernaehrung',
    title: 'Ernährung tracken',
    description: 'Mahlzeiten, Kalorien und Nährstoffe im Blick behalten. Dokumentiere deinen Alltag und erkenne Muster in deiner Ernährung.',
    cta: 'Ernährung öffnen',
  },
  {
    href: '/tracker/sport',
    emoji: '🏋️',
    label: 'Fitness',
    labelClass: 'cat-fitness',
    title: 'Sport tracken',
    description: 'Trainingseinheiten festhalten, Fortschritte messen und motiviert bleiben. Von Krafttraining bis Cardio – alles an einem Ort.',
    cta: 'Sport öffnen',
  },
];

import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

export default function TrackerPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <AuthGate />;
  return (
    <main className="main-content">
      <div className="tracker-page">
        <div className="tracker-header">
          <p className="hero-eyebrow-sm">Dein persönlicher</p>
          <h1 className="kategorie-title">Tracker</h1>
          <p className="tracker-sub">
            Behalte Ernährung und Sport im Überblick – einfach, schnell, persönlich.
          </p>
        </div>

        <div className="tracker-grid">
          {trackerCards.map(card => (
            <Link key={card.href} href={card.href} className="tracker-card">
              <div className="tracker-card-icon">{card.emoji}</div>
              <span className={`cat-pill small ${card.labelClass}`}>
                {card.label}
              </span>
              <h2 className="tracker-card-title">{card.title}</h2>
              <p className="tracker-card-desc">{card.description}</p>
              <span className="tracker-card-cta">
                {card.cta} <ArrowIcon />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
