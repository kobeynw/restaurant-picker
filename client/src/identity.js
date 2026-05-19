const CLIENT_ID_KEY = 'lunchspin.clientId';
const LAST_JOIN_KEY = 'lunchspin.lastJoin';

export function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function rememberJoin(sessionId, name) {
  localStorage.setItem(LAST_JOIN_KEY, JSON.stringify({ sessionId, name }));
}

export function getRememberedJoin() {
  try {
    return JSON.parse(localStorage.getItem(LAST_JOIN_KEY) || 'null');
  } catch {
    return null;
  }
}

export function forgetJoin() {
  localStorage.removeItem(LAST_JOIN_KEY);
}
