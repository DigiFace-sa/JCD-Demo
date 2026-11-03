/**
 * localStorage access that never throws (private mode, blocked site data, sandboxed previews).
 * Callers treat a null read as "no stored preference".
 */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the preference simply won't persist.
  }
}
