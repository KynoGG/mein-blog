'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const REGISTRY_KEY = 'kynogg-users-registry';
const USER_ID_KEY  = 'kynogg-user-id';

const ALEX_REPLIES = [
  'Krass, weiter so! 💪',
  'Ich bin diese Woche auch 3x im Gym gewesen.',
  'Hast du schon den neuen Kraft-Plan probiert?',
  'Was ist dein aktuelles Trainingsgewicht bei Bankdrücken?',
  'Ich hab meine Ernährung gerade auf High Protein umgestellt.',
  'Let\'s go! 🔥',
  'Das klingt gut – weiter so!',
  'Ich plane nächste Woche einen neuen PR-Versuch.',
  'Welche Supplements nimmst du gerade?',
  'Nice! Ich trainiere morgen wieder Beine, die hassen mich dafür 😂',
  'Wie viele Kalorien isst du aktuell am Tag?',
  'Ich hab heute meinen Push-Day abgesolvert – richtig gut gelaufen!',
];

let alexIdx = 0;

function dmKey(a, b)    { return `kynogg-dm-${[a, b].sort().join('_')}`; }
function friendsKey(id) { return `kynogg-freunde-${id}`; }

function readArr(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function getInitials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Heute';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
}

export default function ChatPage({ params }) {
  const { user: _au, loading: _al } = useAuth();
  const { userId } = use(params);

  const [myId,     setMyId]     = useState(null);
  const [partner,  setPartner]  = useState(null);
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [isFriend, setIsFriend] = useState(false);
  const [typing,   setTyping]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    const id = localStorage.getItem(USER_ID_KEY) || '';
    setMyId(id);

    const reg = readArr(REGISTRY_KEY);
    const p = reg.find(u => u.id === userId) ?? null;
    setPartner(p);

    if (id && p) {
      setMessages(readArr(dmKey(id, userId)));
      setIsFriend(readArr(friendsKey(id)).includes(userId));
    }
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const isTestUser = userId === 'demo-user-alex';

  function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !myId || !isFriend) return;

    const msg = { id: Date.now().toString(), senderId: myId, text: t, ts: Date.now() };
    const key  = dmKey(myId, userId);
    const next = [...messages, msg];
    setMessages(next);
    localStorage.setItem(key, JSON.stringify(next));
    setText('');
    inputRef.current?.focus();

    if (isTestUser) {
      setTyping(true);
      const delay = 900 + Math.random() * 1100;
      setTimeout(() => {
        const reply = ALEX_REPLIES[alexIdx % ALEX_REPLIES.length];
        alexIdx++;
        const replyMsg = {
          id: (Date.now() + 1).toString(),
          senderId: userId,
          text: reply,
          ts: Date.now(),
        };
        const withReply = [...next, replyMsg];
        setMessages(withReply);
        localStorage.setItem(key, JSON.stringify(withReply));
        setTyping(false);
      }, delay);
    }
  }

  if (_al) return null;
  if (!_au) return <AuthGate />;

  if (!partner) {
    return (
      <main className="main-content">
        <div className="tracker-page">
          <Link href="/nachrichten" className="back-link">← Nachrichten</Link>
          <div className="tracker-empty" style={{ marginTop: 40 }}>
            <span>🔍</span>
            <p>Nutzer nicht gefunden.</p>
          </div>
        </div>
      </main>
    );
  }

  // Group by date
  const grouped = [];
  let lastDate = null;
  messages.forEach(msg => {
    const label = fmtDateLabel(msg.ts);
    if (label !== lastDate) {
      grouped.push({ type: 'date', label, key: 'date-' + msg.id });
      lastDate = label;
    }
    grouped.push({ type: 'msg', msg, key: msg.id });
  });

  return (
    <main className="main-content dm-chat-page">
      <div className="dm-chat-layout">

        {/* ── Chat header ── */}
        <div className="dm-chat-header">
          <Link href="/nachrichten" className="dm-back-btn" aria-label="Zurück">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="dm-avatar dm-avatar-md">
            {partner.avatar
              ? <img src={partner.avatar} alt={partner.name} />
              : <span>{getInitials(partner.name)}</span>
            }
          </div>
          <div className="dm-chat-partner-info">
            <span className="dm-chat-partner-name">{partner.name}</span>
            {isTestUser && <span className="dm-chat-online">● Online</span>}
          </div>
        </div>

        {!isFriend && (
          <div className="dm-not-friend-banner">
            Ihr seid noch nicht befreundet.{' '}
            <Link href="/nachrichten" className="tracker-link">Freunde verwalten →</Link>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="dm-messages">
          {grouped.length === 0 && (
            <p className="dm-no-msgs">Schreibe die erste Nachricht! 👋</p>
          )}
          {grouped.map(item =>
            item.type === 'date' ? (
              <div key={item.key} className="dm-date-divider">
                <span>{item.label}</span>
              </div>
            ) : (
              <div
                key={item.key}
                className={`dm-bubble-wrap ${item.msg.senderId === myId ? 'dm-mine' : 'dm-theirs'}`}
              >
                <div className="dm-bubble">
                  <p className="dm-bubble-text">{item.msg.text}</p>
                  <span className="dm-bubble-time">{fmtTime(item.msg.ts)}</span>
                </div>
              </div>
            )
          )}
          {typing && (
            <div className="dm-bubble-wrap dm-theirs">
              <div className="dm-bubble dm-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <form onSubmit={send} className="dm-input-bar">
          <input
            ref={inputRef}
            type="text"
            className="tracker-input dm-input"
            placeholder={isFriend ? `Nachricht an ${partner.name}…` : 'Erst befreunden, um zu schreiben'}
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={!isFriend}
            autoComplete="off"
          />
          <button
            type="submit"
            className="dm-send-btn"
            disabled={!text.trim() || !isFriend}
            aria-label="Senden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>

      </div>
    </main>
  );
}
