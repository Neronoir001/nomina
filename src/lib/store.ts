import { useSyncExternalStore } from 'react'
import { clear, createStore, getMany, set as idbSet } from 'idb-keyval'
import type { Pack } from './pack'
import type { Annulation } from './pp'
import type { JetSecret } from './jets'
import type { Personnage } from './personnage'
import { depuisFicheProto, nomAffiche, normaliser, nouveauPersonnage } from './personnage'
import type { ChatMessage, Contact, FicheRecue, Groupe, LogLine, Peer, Profile, ReglesMaison, RelayKind, Signalement, TableInfo } from './types'

export type Status = 'deconnecte' | 'connexion' | 'connecte' | 'erreur'

export type State = {
  hydrated: boolean
  profile: Profile | null
  personnages: Record<string, Personnage>
  actifId: string | null
  pack: Pack | null
  signalements: Signalement[]
  table: TableInfo | null
  status: Status
  relaysOpen: number
  relaysTotal: number
  peers: Record<string, Peer>
  contacts: Record<string, Contact>
  messages: ChatMessage[]
  /** Non lus, par conversation */
  unread: Record<string, number>
  groupes: Record<string, Groupe>
  /** Groupes quittés : on ignore ce qui en arrive encore */
  groupesQuittes: string[]
  fichesRecues: Record<string, FicheRecue>
  sheetAckAt: number | null
  preferredRelay: RelayKind
  transfer: { label: string; percent: number } | null
  /** Référentiel proposé par le MJ, en attente d'acceptation */
  packPropose: { pack: Pack; de: string } | null
  /** Date de la dernière sauvegarde complète exportée */
  derniereSauvegarde: number | null
  /** Dernière version dont l'utilisateur a lu les nouveautés */
  nouveautesVues: string | null
  /** Visite guidée déjà vue (ou passée) */
  visiteFaite: boolean
  /** Règles maison publiées par le MJ (visibles de tous les joueurs) */
  reglesMaison: ReglesMaison | null
  /** MJ : jets secrets lancés ou reçus */
  jetsSecrets: JetSecret[]
  /** MJ : jet affiché dans la fenêtre de résultat */
  jetOuvert: string | null
  /** Joueur : demandes de jet envoyées au MJ (non conservées) */
  jetsDemandes: Record<string, 'envoye' | 'recu'>
  /** Annonce à afficher (ex. pouvoir accordé par le MJ) */
  annonce: { titre: string; texte: string } | null
  /** Dernière dépense de PP, annulable quelques secondes */
  annulation: Annulation | null
  /** Message d'erreur si le démarrage a échoué (données non chargées) */
  erreurDemarrage: string | null
  logs: LogLine[]
}

const PERSISTED = [
  'profile', 'personnages', 'actifId', 'pack', 'signalements', 'table', 'contacts', 'messages', 'unread',
  'fichesRecues', 'sheetAckAt', 'preferredRelay', 'derniereSauvegarde', 'nouveautesVues', 'visiteFaite', 'reglesMaison', 'jetsSecrets',
  'groupes', 'groupesQuittes',
] as const
type PersistedKey = (typeof PERSISTED)[number]

let state: State = {
  hydrated: false,
  profile: null,
  personnages: {},
  actifId: null,
  pack: null,
  signalements: [],
  table: null,
  status: 'deconnecte',
  relaysOpen: 0,
  relaysTotal: 0,
  peers: {},
  contacts: {},
  messages: [],
  unread: {},
  groupes: {},
  groupesQuittes: [],
  fichesRecues: {},
  sheetAckAt: null,
  preferredRelay: 'nostr',
  transfer: null,
  packPropose: null,
  derniereSauvegarde: null,
  nouveautesVues: null,
  visiteFaite: false,
  reglesMaison: null,
  jetsSecrets: [],
  jetOuvert: null,
  jetsDemandes: {},
  erreurDemarrage: null,
  annonce: null,
  annulation: null,
  logs: [],
}

const db = createStore('nomina', 'donnees')
const listeners = new Set<() => void>()
const timers = new Map<string, number>()
let persistError = false

/** Vrai si le chargement a échoué : on n'écrit plus rien pour ne pas écraser les vraies données. */
let enregistrementSuspendu = false

function persist(k: PersistedKey): void {
  if (enregistrementSuspendu) return
  window.clearTimeout(timers.get(k))
  timers.set(
    k,
    window.setTimeout(() => {
      idbSet(k, state[k], db).catch((e) => {
        if (!persistError) log(`Impossible d'enregistrer les données sur cet appareil : ${String(e)}`, 'erreur')
        persistError = true
      })
    }, 250),
  )
}

/** Écrit immédiatement les données en attente (avant de quitter la page). */
export function flush(): void {
  if (enregistrementSuspendu) return
  for (const [k, t] of timers) {
    window.clearTimeout(t)
    void idbSet(k, state[k as PersistedKey], db)
  }
  timers.clear()
}

export function getState(): State {
  return state
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)): void {
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  for (const k of Object.keys(p)) if ((PERSISTED as readonly string[]).includes(k)) persist(k as PersistedKey)
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

// ───────── Personnage actif ─────────

export function persoActif(s: State = state): Personnage | null {
  return (s.actifId && s.personnages[s.actifId]) || null
}

export function majPerso(id: string, f: (p: Personnage) => Personnage): void {
  setState((s) => {
    const cur = s.personnages[id]
    if (!cur) return {}
    return { personnages: { ...s.personnages, [id]: { ...f(cur), updatedAt: Date.now() } } }
  })
}

export function creerPerso(p: Personnage = nouveauPersonnage()): string {
  setState((s) => ({ personnages: { ...s.personnages, [p.id]: p }, actifId: p.id }))
  return p.id
}

export function supprimerPerso(id: string): void {
  setState((s) => {
    const personnages = { ...s.personnages }
    delete personnages[id]
    const restants = Object.values(personnages).sort((a, b) => b.updatedAt - a.updatedAt)
    return { personnages, actifId: s.actifId === id ? (restants[0]?.id ?? null) : s.actifId }
  })
}

export function listePersos(s: State = state): Personnage[] {
  return Object.values(s.personnages).sort((a, b) => nomAffiche(a).localeCompare(nomAffiche(b)))
}

// ───────── Chargement initial et migration depuis le prototype ─────────

function objet<T>(x: T | undefined | null): NonNullable<T> | Record<string, never> {
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as NonNullable<T>) : {}
}

function lsGet<T>(k: string): T | undefined {
  try {
    const raw = localStorage.getItem('nomina:' + k)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

function avecDelai<T>(p: Promise<T>, ms: number, quoi: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => window.setTimeout(() => rej(new Error(`${quoi} : pas de réponse après ${ms / 1000} s`)), ms)),
  ])
}

/**
 * Chargement au démarrage. Quoi qu'il arrive, l'appli finit par s'afficher :
 * en cas d'échec, un message d'erreur est montré et l'enregistrement est suspendu
 * pour ne jamais écraser les données existantes par des données vides.
 */
export async function initStore(): Promise<void> {
  const debut = performance.now()
  try {
    await chargerDonnees()
    log(`Données chargées en ${Math.round(performance.now() - debut)} ms.`)
  } catch (e) {
    const msg = e instanceof Error ? `${e.name} : ${e.message}` : String(e)
    enregistrementSuspendu = true
    state = { ...state, erreurDemarrage: msg }
    log(`Erreur au démarrage : ${msg}`, 'erreur')
  } finally {
    state = { ...state, hydrated: true }
    listeners.forEach((l) => l())
  }
}

async function chargerDonnees(): Promise<void> {
  const values = await avecDelai(getMany([...PERSISTED], db), 8000, 'Ouverture de la base locale')
  const loaded: Partial<State> = {}
  PERSISTED.forEach((k, i) => {
    if (values[i] !== undefined) (loaded as Record<string, unknown>)[k] = values[i]
  })

  // Données du prototype (étape 0) restées dans l'ancien stockage
  if (!loaded.profile) {
    const oldProfile = lsGet<Profile>('profile')
    if (oldProfile) {
      loaded.profile = oldProfile
      // Chaque élément est repris séparément : un élément abîmé est ignoré au lieu de tout bloquer.
      const reprendre = (quoi: string, f: () => void) => {
        try {
          f()
        } catch (e) {
          log(`Reprise du prototype : « ${quoi} » ignoré (${String(e)}).`, 'erreur')
        }
      }
      reprendre('fiche', () => {
        const oldSheet = lsGet<Parameters<typeof depuisFicheProto>[0]>('sheet')
        if (oldSheet && typeof oldSheet === 'object') {
          const p = depuisFicheProto(oldSheet)
          loaded.personnages = { [p.id]: p }
          loaded.actifId = p.id
        }
      })
      reprendre('contacts', () => (loaded.contacts = objet(lsGet('contacts'))))
      reprendre('messages', () => (loaded.messages = Array.isArray(lsGet('messages')) ? lsGet('messages') : []))
      reprendre('non lus', () => (loaded.unread = objet(lsGet('unread'))))
      reprendre('table', () => (loaded.table = lsGet<TableInfo>('table')?.id ? lsGet<TableInfo>('table')! : null))
      reprendre('relais', () => (loaded.preferredRelay = lsGet<RelayKind>('preferredRelay') ?? 'nostr'))
      reprendre('fiches reçues', () => {
        type Ancienne = { deviceId?: string; name?: string; sheet?: Parameters<typeof depuisFicheProto>[0]; receivedAt?: number }
        const oldSheets = objet(lsGet<Record<string, Ancienne>>('sheets'))
        const fiches: Record<string, FicheRecue> = {}
        for (const r of Object.values(oldSheets)) {
          if (!r || !r.deviceId || !r.sheet || typeof r.sheet !== 'object') continue
          fiches[r.deviceId] = { deviceId: r.deviceId, name: r.name ?? '?', perso: depuisFicheProto(r.sheet), receivedAt: r.receivedAt ?? Date.now() }
        }
        loaded.fichesRecues = fiches
      })
      try {
        Object.keys(localStorage).filter((k) => k.startsWith('nomina:')).forEach((k) => localStorage.removeItem(k))
      } catch {
        /* ignoré */
      }
      log('Données du prototype récupérées.', 'ok')
    }
  }

  if (loaded.personnages) {
    loaded.personnages = Object.fromEntries(
      Object.entries(loaded.personnages)
        .filter(([, v]) => v && typeof v === 'object')
        .map(([k, v]) => [k, normaliser(v)]),
    )
  }
  // Messages des versions 0.1 à 0.3 : ajout de la conversation et des accusés de réception
  const moi = loaded.profile?.deviceId
  if (Array.isArray(loaded.messages) && moi) {
    loaded.messages = loaded.messages
      .filter((m) => m && typeof m === 'object' && m.id)
      .map((m) => {
        if (m.conv) return m
        const ancien = m as ChatMessage & { to?: string; status?: string }
        const autre = ancien.from === moi ? (ancien.to ?? '') : ancien.from
        if (ancien.from !== moi) return { id: m.id, conv: `d:${autre}`, from: m.from, text: m.text, at: m.at }
        const recu = ancien.status === 'recu'
        return { id: m.id, conv: `d:${autre}`, from: m.from, text: m.text, at: m.at, enAttente: recu ? [] : [autre], recus: recu ? [autre] : [] }
      })
  }
  if (loaded.unread) {
    loaded.unread = Object.fromEntries(Object.entries(loaded.unread).map(([k, v]) => [k.includes(':') ? k : `d:${k}`, v]))
  }
  if (loaded.actifId && !loaded.personnages?.[loaded.actifId]) loaded.actifId = Object.keys(loaded.personnages ?? {})[0] ?? null

  state = { ...state, ...loaded }
  // Réécrit ce qui vient de la migration
  for (const k of Object.keys(loaded)) persist(k as PersistedKey)
}

/** Efface toutes les données de Nomina sur cet appareil. */
export async function toutEffacer(): Promise<void> {
  for (const t of timers.values()) window.clearTimeout(t)
  timers.clear()
  await clear(db)
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('nomina:')).forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignoré */
  }
}
