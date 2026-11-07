// Petit stockage local (prototype). Sera remplacé par une vraie base locale (IndexedDB) à l'étape 1.
const PREFIX = 'nomina:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* stockage indisponible (navigation privée…) : on continue sans sauvegarder */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignoré */
  }
}

export function uid(): string {
  const c: Crypto = crypto
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x: number) => x.toString(16).padStart(2, '0')).join('')
}
