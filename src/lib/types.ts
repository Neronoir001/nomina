import type { ProfilCreation } from './creation'
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
  /** Conversation : « d:<appareil> » pour un échange à deux, « g:<groupe> » pour un groupe */
  conv: string
  from: string
  text: string
  at: number
  /** Messages envoyés : destinataires qui n'ont pas encore confirmé la réception */
  enAttente?: string[]
  /** Messages envoyés : destinataires qui ont confirmé la réception */
  recus?: string[]
}

export type Groupe = {
  id: string
  nom: string
  /** Appareils membres (créateur compris) */
  membres: string[]
  /** Noms des membres, pour afficher ceux qu'on n'a jamais croisés à la table */
  noms: Record<string, string>
  createur: string
  majLe: number
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

/** Règles maison publiées par le MJ aux joueurs. */
export type ReglesMaison = { regles: { id: string; titre: string; texte: string }[]; at: number; de: string; creation?: ProfilCreation }
