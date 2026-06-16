// Shared user registry stored in localStorage under REGISTRY_KEY.
// Each entry: { id, email, username, name, avatar, bio }

export const REGISTRY_KEY = 'kynogg-users-registry';

export function readRegistry() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]'); } catch { return []; }
}

export function writeRegistry(reg) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg)); } catch {}
}

export function isUsernameTaken(username) {
  const lc = username.toLowerCase();
  return readRegistry().some(u => u.username?.toLowerCase() === lc);
}

export function isValidUsername(username) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

export function findByUsername(username) {
  const lc = username.toLowerCase();
  return readRegistry().find(u => u.username?.toLowerCase() === lc) ?? null;
}

export function searchUsers(term) {
  const lc = term.toLowerCase();
  return readRegistry().filter(u =>
    u.username?.toLowerCase().includes(lc) ||
    u.name?.toLowerCase().includes(lc)
  );
}

export function upsertUser(entry) {
  const reg = readRegistry();
  const idx = reg.findIndex(u => u.id === entry.id);
  if (idx === -1) reg.push(entry);
  else reg[idx] = { ...reg[idx], ...entry };
  writeRegistry(reg);
}
