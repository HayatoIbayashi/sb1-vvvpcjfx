export type StoredTokens = {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
};

export type AuthProfile = {
  email?: string;
  name?: string;
  sub?: string;
  exp?: number;
  [key: string]: unknown;
};

export const AUTH_STORAGE_KEY = 'cognito_tokens';

export function readStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function writeStoredTokens(tokens: StoredTokens) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    return;
  }
}

export function clearStoredTokens() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    return;
  }
}

export function clearOidcArtifacts() {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (key.startsWith('oidc.user:') || key.startsWith('oidc.')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    return;
  }
}

export function decodeJwtPayload(token?: string): AuthProfile {
  if (!token) return {};

  try {
    const [, payload] = token.split('.');
    if (!payload) return {};
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = window.atob(normalized);
    return JSON.parse(decoded) as AuthProfile;
  } catch {
    return {};
  }
}

export function isTokenExpired(token?: string): boolean {
  if (!token) return false;
  const profile = decodeJwtPayload(token);
  if (typeof profile.exp !== 'number') return false;
  return profile.exp * 1000 <= Date.now();
}

export function hasExpiredTokens(tokens: StoredTokens | null): boolean {
  if (!tokens) return false;
  if (tokens.access_token && isTokenExpired(tokens.access_token)) return true;
  if (tokens.id_token && isTokenExpired(tokens.id_token)) return true;
  return false;
}
