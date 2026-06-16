import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';
import {
  oeffentlicheTrainingsplaene,
  oeffentlicheErnaehrungsplaene,
} from '@/data/oeffentlichePlaene';

const categoryConfig = {
  fitness: { label: 'Fitness', emoji: '🏋️', color: 'cat-fitness' },
  ernaehrung: { label: 'Ernährung', emoji: '🥗', color: 'cat-ernaehrung' },
  gaming: { label: 'Gaming', emoji: '🎮', color: 'cat-gaming' },
  ki: { label: 'KI & Tech', emoji: '🤖', color: 'cat-ki' },
  lifestyle: { label: 'Lifestyle', emoji: '✨', color: 'cat-lifestyle' },
};

// First 3 plans (mixed: training, nutrition, training)
const PREVIEW_PLANS = [
  { ...oeffentlicheTrainingsplaene[0],  _type: 'training'   },
  { ...oeffentlicheErnaehrungsplaene[0], _type: 'ernaehrung' },
  { ...oeffentlicheTrainingsplaene[1],  _type: 'training'   },
];

const PLAN_HDR = {
  kraft:        { emoji: '🏋️', cls: 'pe-hdr-fitness'    },
  ausdauer:     { emoji: '🏃', cls: 'pe-hdr-gaming'     },
  mobilitaet:   { emoji: '🧘', cls: 'pe-hdr-ki'         },
  abnehmen:     { emoji: '🥗', cls: 'pe-hdr-ernaehrung' },
  muskelaufbau: { emoji: '💪', cls: 'pe-hdr-lifestyle'  },
  vegetarisch:  { emoji: '🌱', cls: 'pe-hdr-fitness'    },
};

const NIVEAU_CFG = {
  einsteiger:      { label: 'Einsteiger',     cls: 'cat-fitness'    },
  mittel:          { label: 'Mittel',          cls: 'cat-ernaehrung' },
  fortgeschritten: { label: 'Fortgeschritten', cls: 'cat-lifestyle'  },
};

const HERO_TAGS = [
  { href: '/plaene-entdecken',   label: '🏋️ Körper & Training',        color: 'cat-fitness'    },
  { href: '/tracker/ernaehrung', label: '🥗 Ernährung',                 color: 'cat-ernaehrung' },
  { href: '/kalender',           label: '📅 Organisation',              color: 'cat-ki'         },
  { href: '/dashboard',          label: '📊 Tracking & Insights',       color: 'cat-gaming'     },
];

export default async function Home() {
  const posts = await getAllPosts();
  const featuredPost = posts[0];
  const recentPosts = posts.slice(1, 7);

  return (
    <main className="main-content">
      <section className="hero">
        <div className="hero-inner">

          <h1 className="hero-title">
            Dein Leben.<br />
            In Balance.<br />
            <span className="hero-accent">Jeden Tag.</span>
          </h1>
          <p className="hero-sub">
            Die All-in-One Plattform für Körper, Ernährung & Alltag — praxisnah, motivierend und immer auf den Punkt.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="section-label">Willkommen bei LIVORA</p>
          <div className="featured-card">
            <div className="featured-card-body">
              <span className="cat-pill cat-ki">💡 Was ist LIVORA?</span>
              <h2 className="featured-title">Dein Lifestyle-Hub für Gesundheit, Fitness und Alltag.</h2>
              <p className="featured-excerpt">
                Mehr als eine Fitness-App: Diese Plattform hilft dir, gesünder zu leben, bewusster zu essen, besser zu trainieren und gleichzeitig deinen Alltag zu organisieren. Erstelle Pläne, tracke deinen Fortschritt, teile Routinen mit anderen, starte Challenges und behalte Kalender, To-dos und persönliche Ziele im Griff.
              </p>
              <p className="featured-excerpt" style={{ marginTop: '12px' }}>
                Alles, was dich weiterbringt — körperlich, mental und im Alltag — an einem Ort.
              </p>
            </div>
          </div>
        </div>
      </section>

      {recentPosts.length > 0 && (
        <section className="section">
          <div className="container">
            <p className="section-label">Weitere Beiträge</p>
            <div className="posts-grid">
              {recentPosts.map(post => (
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
          </div>
        </section>
      )}

      {/* ── Entdecke unsere Pläne ── */}
      <section className="section">
        <div className="container">
          <p className="section-label">Entdecke unsere Pläne</p>
          <div className="home-plans-grid">
            {PREVIEW_PLANS.map(plan => {
              const hdr       = PLAN_HDR[plan.kategorie] ?? { emoji: '📋', cls: 'pe-hdr-ki' };
              const typCls    = plan._type === 'training' ? 'cat-fitness' : 'cat-ernaehrung';
              const typLabel  = plan._type === 'training' ? 'Training' : 'Ernährung';
              const niveauCfg = plan.niveau ? NIVEAU_CFG[plan.niveau] : null;
              return (
                <article key={plan.id} className="home-plan-card">
                  <div className={`home-plan-band ${hdr.cls}`}>
                    <span className="home-plan-band-emoji" aria-hidden="true">{hdr.emoji}</span>
                  </div>
                  <div className="home-plan-body">
                    <div className="home-plan-badges">
                      <span className={`cat-pill small ${typCls}`}>{typLabel}</span>
                      {niveauCfg && (
                        <span className={`cat-pill small ${niveauCfg.cls}`}>{niveauCfg.label}</span>
                      )}
                    </div>
                    <h3 className="home-plan-title">{plan.titel}</h3>
                    <p className="home-plan-desc">{plan.beschreibung}</p>
                  </div>
                  <div className="home-plan-footer">
                    <Link href={`/plaene-entdecken/${plan.id}`} className="home-plan-btn">
                      Plan ansehen →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="home-plans-cta">
            <Link href="/plaene-entdecken" className="home-plans-all-btn">
              Alle Pläne entdecken →
            </Link>
          </div>
        </div>
      </section>


      {posts.length === 0 && (
        <section className="section">
          <div className="container empty-state">
            <p className="empty-emoji">✍️</p>
            <h2>Noch keine Beiträge</h2>
            <p>Erstelle deinen ersten Post im Ordner <code>content/</code></p>
          </div>
        </section>
      )}
    </main>
  );
}