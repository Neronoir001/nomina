import type { Personnage } from './personnage'

export type Role = 'joueur' | 'mj'
export type RelayKind = 'nostr' | 'mqtt' | 'torrent'

export type Profile = {
  deviceId: string
  name: string
  role: Role
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

export type FicheRecue = {
  deviceId: string
  name: string
  perso: Personnage
  receivedAt: number
}

export type Signalement = {
  id: string
  at: number
  /** ex. « superieur:baal » */
  cible: string
  libelle: string
  texte: string
}

export type LogLine = { at: number; text: string; level: 'info' | 'ok' | 'erreur' }

export const RELAYS: Record<RelayKind, string> = {
  nostr: 'Nostr (recommandé)',
  mqtt: 'MQTT',
  torrent: 'BitTorrent',
}
