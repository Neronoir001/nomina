export type Role = 'joueur' | 'mj'
export type RelayKind = 'nostr' | 'mqtt' | 'torrent'

export type Profile = {
  deviceId: string
  name: string
  role: Role
}

/** Fiche simplifiée, uniquement pour tester la synchronisation. */
export type Sheet = {
  nomCouverture: string
  nom: string
  camp: 'INS' | 'MV'
  superieur: string
  grade: string
  fo: number
  ag: number
  vo: number
  pr: number
  pe: number
  ap: number
  pp: number
  ppMax: number
  blessures: number
  notes: string
  updatedAt: number
}

export type TableInfo = {
  id: string
  key: string
  relay: RelayKind
}

export type Peer = {
  peerId: string
  deviceId?: string
  name?: string
  role?: Role
  version?: string
  joinedAt: number
  link?: string
  ping?: number
}

export type Contact = {
  deviceId: string
  name: string
  role: Role
  lastSeen: number
}

export type ChatMessage = {
  id: string
  from: string
  to: string
  text: string
  at: number
  status: 'en-attente' | 'envoye' | 'recu'
}

export type ReceivedSheet = {
  deviceId: string
  name: string
  sheet: Sheet
  receivedAt: number
}

export type LogLine = { at: number; text: string; level: 'info' | 'ok' | 'erreur' }

export const RELAYS: Record<RelayKind, string> = {
  nostr: 'Nostr (recommandé)',
  mqtt: 'MQTT',
  torrent: 'BitTorrent',
}

export const emptySheet = (): Sheet => ({
  nomCouverture: '',
  nom: '',
  camp: 'INS',
  superieur: '',
  grade: '',
  fo: 2,
  ag: 2,
  vo: 2,
  pr: 2,
  pe: 2,
  ap: 2,
  pp: 0,
  ppMax: 0,
  blessures: 0,
  notes: '',
  updatedAt: Date.now(),
})
