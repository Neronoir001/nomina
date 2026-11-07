import type { RelayKind, TableInfo } from './types'

const MOTS = [
  'soufre', 'cendre', 'corbeau', 'velours', 'braise', 'aureole', 'plume', 'encens',
  'calice', 'abysse', 'ombre', 'lys', 'fournaise', 'grimoire', 'relique', 'sabbat',
  'harpe', 'trompette', 'chapelet', 'gargouille', 'chandelle', 'parchemin', 'tocsin', 'vitrail',
]

function pick(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]
  return MOTS[n % MOTS.length]
}

function num(): string {
  return String(10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90))
}

export function newTable(relay: RelayKind): TableInfo {
  return {
    id: `${pick()}-${pick()}-${num()}`,
    key: `${pick()}-${pick()}-${pick()}-${num()}`,
    relay,
  }
}

export function appUrl(): string {
  return location.origin + import.meta.env.BASE_URL
}

export function joinUrl(t: TableInfo): string {
  const p = new URLSearchParams({ table: t.id, cle: t.key, relais: t.relay })
  return `${appUrl()}#rejoindre&${p.toString()}`
}

/** Lit un lien ou un texte de QR code « rejoindre ». Renvoie null si ce n'en est pas un. */
export function parseJoin(text: string): TableInfo | null {
  const hash = text.includes('#') ? text.slice(text.indexOf('#') + 1) : text
  const p = new URLSearchParams(hash)
  const id = p.get('table')
  const key = p.get('cle')
  const relay = (p.get('relais') ?? 'nostr') as RelayKind
  if (!id || !key) return null
  if (!['nostr', 'mqtt', 'torrent'].includes(relay)) return null
  return { id: id.trim().toLowerCase(), key: key.trim().toLowerCase(), relay }
}
