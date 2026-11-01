export function readStored<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? 'null');
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
