import { useSyncExternalStore } from 'react'
import { load, save } from './storage'
import type {
  ChatMessage, Contact, LogLine, Peer, Profile, ReceivedSheet, RelayKind, Sheet, TableInfo,
} from './types'
import { emptySheet } from './types'

export type Status = 'deconnecte' | 'connexion' | 'connecte' | 'erreur'

export type State = {
  profile: Profile | null
  sheet: Sheet
  table: TableInfo | null
  status: Status
  relaysOpen: number
  relaysTotal: number
  peers: Record<string, Peer>
  contacts: Record<string, Contact>
  messages: ChatMessage[]
  unread: Record<string, number>
  sheets: Record<string, ReceivedSheet>
  sheetAckAt: number | null
  preferredRelay: RelayKind
  transfer: { label: string; percent: number } | null
  packResults: string[]
  logs: LogLine[]
}

let state: State = {
  profile: load<Profile | null>('profile', null),
  sheet: load<Sheet>('sheet', emptySheet()),
  table: load<TableInfo | null>('table', null),
  status: 'deconnecte',
  relaysOpen: 0,
  relaysTotal: 0,
  peers: {},
  contacts: load('contacts', {}),
  messages: load('messages', []),
  unread: load('unread', {}),
  sheets: load('sheets', {}),
  sheetAckAt: load('sheetAckAt', null),
  preferredRelay: load<RelayKind>('preferredRelay', 'nostr'),
  transfer: null,
  packResults: [],
  logs: [],
}

const PERSISTED: (keyof State)[] = [
  'profile', 'sheet', 'table', 'contacts', 'messages', 'unread', 'sheets', 'sheetAckAt', 'preferredRelay',
]

const listeners = new Set<() => void>()

export function getState(): State {
  return state
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)): void {
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  for (const k of Object.keys(p) as (keyof State)[]) {
    if (PERSISTED.includes(k)) save(k, state[k])
  }
  listeners.forEach((l) => l())
}

export function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function log(text: string, level: LogLine['level'] = 'info'): void {
  setState((s) => ({ logs: [...s.logs.slice(-199), { at: Date.now(), text, level }] }))
}

export function heure(t: number): string {
  return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
