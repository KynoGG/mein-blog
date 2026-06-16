'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const USER_ID_KEY = 'kynogg-user-id';

const ALEX_REPLIES = [
  'Genau, weiter so! 💪',
  'Ich war heute auch im Gym – Beinday 🔥',
  'Wie läuft euer Training diese Woche?',
  'Hat jemand schon den neuen Ernährungsplan ausprobiert?',
  'Let\'s go Leute! Wir schaffen das! 🚀',
  'Ich hab heute einen neuen PR gesetzt 🏆',
];

const LISA_REPLIES = [
  'Das klingt super! 😊',
  'Ich mache heute Yoga, danach kurzes HIIT.',
  'Habt ihr schon mal Meal Prep ausprobiert? Spart so viel Zeit!',
  'Motivation ist alles! Ihr seid toll 💕',
  'Ich hab gerade mein Protein-Smoothie fertig 🥤',
];

let alexIdx = 0;
let lisaIdx = 0;

function groupMsgsKey(gid) { return `kynogg-gruppe-msgs-${gid}`; }
function allGroupsKey()    { return 'kynogg-gruppen'; }

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

export default function GruppenChatPage({ params }) {
  const { user: _au, loading: _al } = useAuth();
  const { groupId } = use(params);

  const [myId,     setMyId]     = useState(null);
  const [group,    setGroup]    = useState(null);
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [typing,   setTyping]   = useState(null); // name of who is typing
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    const id = localStorage.getItem(USER_ID_KEY) || '';
    setMyId(id);
    const allGroups = readArr(allGroupsKey());
    const g = allGroups.find(x => x.id === groupId) ?? null;
    setGroup(g);
    if (g) setMessages(readArr(groupMsgsKey(groupId)));
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const isSeededGroup = groupId === 'group-fitness-crew';

  function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !myId || !group) return;

    const msg = { id: Date.now().toString(), senderId: myId, text: t, ts: Date.now() };
    const key  = groupMsgsKey(groupId);
    const next = [...messages, msg];
    setMessages(next);
    localStorage.setItem(key, JSON.stringify(next));
    setText('');
    inputRef.current?.focus();

    if (isSeededGroup) {
      // Pick a random bot to reply
      const replyWithAlex = Math.random() > 0.4;
      const botId   = replyWithAlex ? 'demo-user-alex'  : 'demo-user-lisa';
      const botName = replyWithAlex ? 'Alex Müller'     : 'Lisa Schmidt';
      const reply   = replyWithAlex
        ? ALEX_REPLIES[alexIdx++ % ALEX_REPLIES.length]
        : LISA_REPLIES[lisaIdx++ % LISA_REPLIES.length];

      setTyping(botName);
      const delay = 1000 + Math.random() * 1200;
      setTimeout(() => {
        const replyMsg = {
          id: (Date.now() + 1).toString(),
          senderId: botId,
          text: reply,
          ts: Date.now(),
        };
        const withReply = [...next, replyMsg];
        setMessages(withReply);
        localStorage.setItem(key, JSON.stringify(withReply));
        setTyping(null);
      }, delay);
    }
  }

  if (_al) return null;
  if (!_au) return <AuthGate />;

  if (!group) {
    return (
      <main className="main-content">
        <div className="tracker-page">
          <Link href="/nachrichten" className="back-link">← Nachrichten</Link>
          <div className="tracker-empty" style={{ marginTop: 40 }}>
            <span>🔍</span>
            <p>Gruppe nicht gefunden.</p>
          </div>
        </div>
      </main>
    );
  }

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

  function getMemberName(senderId) {
    const m = group.members.find(x => x.id === senderId);
    return m?.name || senderId;
  }

  return (
    <main className="main-content dm-chat-page">
      <div className="dm-chat-layout">

        {/* ── Header ── */}
        <div className="dm-chat-header">
          <Link href="/nachrichten" className="dm-back-btn" aria-label="Zurück">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="dm-avatar dm-group-avatar dm-avatar-md">
            <span>👥</span>
          </div>
          <div className="dm-chat-partner-info">
            <span className="dm-chat-partner-name">{group.name}</span>
            <span className="dm-chat-online" style={{ color: 'var(--text-muted)' }}>
              {group.members.length} Mitglieder · {group.members.map(m => m.name).join(', ')}
            </span>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="dm-messages">
          {grouped.length === 0 && (
            <p className="dm-no-msgs">Seid die Ersten – schreibt die erste Nachricht! 👋</p>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: item.msg.senderId === myId ? 'flex-end' : 'flex-start' }}>
                  {item.msg.senderId !== myId && (
                    <span className="dm-sender-label">{getMemberName(item.msg.senderId)}</span>
                  )}
                  <div className="dm-bubble">
                    <p className="dm-bubble-text">{item.msg.text}</p>
                    <span className="dm-bubble-time">{fmtTime(item.msg.ts)}</span>
                  </div>
                </div>
              </div>
            )
          )}
          {typing && (
            <div className="dm-bubble-wrap dm-theirs">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="dm-sender-label">{typing}</span>
                <div className="dm-bubble dm-typing">
                  <span /><span /><span />
                </div>
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
            placeholder={`Nachricht an ${group.name}…`}
            value={text}
            onChange={e => setText(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className="dm-send-btn"
            disabled={!text.trim()}
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
