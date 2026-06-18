// Berechtigte Nutzer für den Gate-Login.
// Nutzername + Login-Code (mind. 6 Zeichen empfohlen).
// Neue Nutzer hier einfach hinzufügen.

export const GATE_USERS = [
  { username: 'tim',   code: 'livora2025' },
  { username: 'admin', code: 'admin123'   },
];

export const GATE_SESSION_KEY = 'livora-gate-session';

export function gateVerify(username, code) {
  const u = username.trim().toLowerCase();
  const c = code.trim();
  return GATE_USERS.some(
    entry => entry.username.toLowerCase() === u && entry.code === c
  );
}

export function gateReadSession() {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(GATE_SESSION_KEY) || null; } catch { return null; }
}

export function gateWriteSession(username) {
  if (typeof window === 'undefined') return;
  try {
    if (username) localStorage.setItem(GATE_SESSION_KEY, username);
    else localStorage.removeItem(GATE_SESSION_KEY);
  } catch {}
}
