// Local persistence and URL-safe state serialisation.

const STATE_KEY = 'net-salary:state';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota exceeded…): nothing to do.
  }
}

export const loadState = () => read(STATE_KEY, null);
export const saveState = (state) => write(STATE_KEY, state);

/** Encodes any JSON value as Unicode-safe, URL-safe base64. */
export function encode(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decode(text) {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}
