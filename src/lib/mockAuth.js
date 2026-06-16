import { isUsernameTaken, isValidUsername, upsertUser, readRegistry, writeRegistry } from './userRegistry';

const STORAGE_KEY = 'kynogg-demo-session';

// Seed demo user so they're always in the registry
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

function seedDemoUsers() {
  const reg = readRegistry();
  DEMO_USERS.forEach(u => {
    if (!reg.find(r => r.id === u.id)) reg.push(u);
  });
  writeRegistry(reg);
}

const listeners = new Set();

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function writeSession(user) {
  if (typeof window === 'undefined') return;
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function notify(event, session) {
  listeners.forEach(fn => fn(event, session));
}

export const mockAuth = {
  async getSession() {
    if (typeof window !== 'undefined') seedDemoUsers();
    const user = readSession();
    return { data: { session: user ? { user } : null } };
  },

  async signInWithPassword({ email, password }) {
    if (!email || password.length < 6) {
      return { error: { message: 'Invalid login credentials' } };
    }
    seedDemoUsers();
    const expectedId = 'demo-' + btoa(email);
    const reg = readRegistry();
    const existing = reg.find(u => u.id === expectedId || u.email === email);
    const user = {
      id:       expectedId,
      email,
      username: existing?.username ?? null,
    };
    writeSession(user);
    notify('SIGNED_IN', { user });
    return { error: null };
  },

  async signUp({ email, password, username }) {
    if (password.length < 6) {
      return { error: { message: 'Password should be at least 6 characters.' } };
    }
    if (!username || !isValidUsername(username)) {
      return { error: { message: 'Ungültiger Benutzername. Nur Buchstaben, Zahlen und _ erlaubt (3–20 Zeichen).' } };
    }
    seedDemoUsers();
    if (isUsernameTaken(username)) {
      return { error: { message: 'USERNAME_TAKEN' } };
    }
    const id = 'demo-' + btoa(email);
    const user = { id, email, username };
    writeSession(user);
    upsertUser({ id, email, username, name: '', avatar: null, bio: '' });
    notify('SIGNED_IN', { user });
    return { error: null };
  },

  async signOut() {
    writeSession(null);
    notify('SIGNED_OUT', null);
    return { error: null };
  },

  onAuthStateChange(callback) {
    listeners.add(callback);
    return {
      data: {
        subscription: { unsubscribe: () => listeners.delete(callback) },
      },
    };
  },
};
