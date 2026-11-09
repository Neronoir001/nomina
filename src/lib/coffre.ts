// Espace MJ : un « coffre » chiffré par une phrase de passe.
// Le contenu n'est jamais enregistré en clair : il est chiffré (AES-GCM 256 bits) avec une clé
// tirée de la phrase de passe (PBKDF2-SHA256). Sans la phrase, les données sont illisibles.
import { createStore, del, get, set } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import type { CaracKey } from './pack'
import { normaliserProfil, type ProfilCreation } from './creation'
import { uid } from './storage'

// ───────── Contenu ─────────

export const NATURES_PNJ = ['Humain', 'Démon', 'Ange', 'Serviteur', 'Créature', 'Autre'] as const

export type PNJ = {
  id: string
  nom: string
  nature: string
  role: string
  superieur: string
  grade: string
  caracs: Partial<Record<CaracKey, number>>
  pp: { actuel: number; max: number }
  pv: { actuel: number; max: number }
  talents: string
  pouvoirs: string
  notes: string
}

export type Seance = { id: string; date: string; titre: string; texte: string }
export type RegleMaison = { id: string; titre: string; texte: string; publique: boolean }

export type ContenuCoffre = {
  v: 1
  campagne: { nom: string; notes: string; aides: string }
  journal: Seance[]
  pnj: PNJ[]
  regles: RegleMaison[]
  /** Règles de création (null = 3e édition officielle) */
  creation: ProfilCreation | null
  creeLe: number
}

export function contenuVide(): ContenuCoffre {
  return { v: 1, campagne: { nom: '', notes: '', aides: '' }, journal: [], pnj: [], regles: [], creation: null, creeLe: Date.now() }
}

export function nouveauPNJ(): PNJ {
  return {
    id: uid(), nom: '', nature: 'Humain', role: '', superieur: '', grade: '', caracs: {},
    pp: { actuel: 0, max: 0 }, pv: { actuel: 0, max: 0 }, talents: '', pouvoirs: '', notes: '',
  }
}

export function nouvelleSeance(): Seance {
  return { id: uid(), date: new Date().toISOString().slice(0, 10), titre: '', texte: '' }
}

export function nouvelleRegle(): RegleMaison {
  return { id: uid(), titre: '', texte: '', publique: false }
}

/** Tolère un contenu incomplet (version antérieure, fichier abîmé). */
function normaliserContenu(c: Partial<ContenuCoffre> | null | undefined): ContenuCoffre {
  const base = contenuVide()
  if (!c || typeof c !== 'object') return base
  return {
    v: 1,
    campagne: { ...base.campagne, ...(c.campagne ?? {}) },
    journal: Array.isArray(c.journal) ? c.journal : [],
    pnj: Array.isArray(c.pnj) ? c.pnj.map((p) => ({ ...nouveauPNJ(), ...p })) : [],
    regles: Array.isArray(c.regles) ? c.regles.map((r) => ({ ...nouvelleRegle(), ...r })) : [],
    creation: c.creation ? normaliserProfil(c.creation) : null,
    creeLe: c.creeLe ?? base.creeLe,
  }
}

// ───────── Fichier chiffré ─────────

export type Enveloppe = {
  format: 'nomina-coffre'
  v: 1
  kdf: 'PBKDF2-SHA256'
  iter: number
  salt: string
  iv: string
  data: string
  majLe: number
}

const ITERATIONS = 600_000

export function estEnveloppe(x: unknown): x is Enveloppe {
  const e = x as Enveloppe
  return !!e && e.format === 'nomina-coffre' && typeof e.salt === 'string' && typeof e.iv === 'string' && typeof e.data === 'string'
}

const b64 = (b: Uint8Array): string => {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s)
}
const deB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const aleatoire = (n: number): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(n))

/** La phrase est comparée sans espaces superflus ni différences d'accents codés. */
function preparer(phrase: string): string {
  return phrase.normalize('NFC').trim()
}

async function deriver(phrase: string, salt: Uint8Array<ArrayBuffer>, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(preparer(phrase)), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function chiffrer(contenu: ContenuCoffre, cle: CryptoKey, salt: Uint8Array<ArrayBuffer>, iter: number): Promise<Enveloppe> {
  const iv = aleatoire(12)
  const brut = new TextEncoder().encode(JSON.stringify(contenu))
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle, brut))
  return { format: 'nomina-coffre', v: 1, kdf: 'PBKDF2-SHA256', iter, salt: b64(salt), iv: b64(iv), data: b64(data), majLe: Date.now() }
}

/** Déchiffre une enveloppe. Renvoie null si la phrase de passe est fausse. */
async function dechiffrer(env: Enveloppe, phrase: string): Promise<{ contenu: ContenuCoffre; cle: CryptoKey; salt: Uint8Array<ArrayBuffer> } | null> {
  const salt = deB64(env.salt)
  const cle = await deriver(phrase, salt, env.iter || ITERATIONS)
  try {
    const brut = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(env.iv) }, cle, deB64(env.data))
    return { contenu: normaliserContenu(JSON.parse(new TextDecoder().decode(brut))), cle, salt }
  } catch {
    return null
  }
}

// ───────── Phrase de passe ─────────

const MOTS = (
  'abbaye abime acier agneau aiguille alambic albatros ambre ancre anneau araignee arcane ardoise argent armure astre ' +
  'aube autel automne avalanche baleine balcon bambou banquet baron basilic bastion beffroi belier blason bougie boussole ' +
  'braise brouillard brume buisson cachot calice camelia canif cantique caravane carillon carrosse cascade castor cathedrale ' +
  'cendre cerbere cerf chaine chandelle chapelle chardon chateau chimere chouette cierge citadelle citron clairon clepsydre ' +
  'cloche cobra colombe comete compas corail corbeau corne couronne crane crapaud crepuscule cristal crypte cyprès dague ' +
  'dentelle desert diamant dragon dune ebene echarpe eclair ecume emeraude encens encre enigme epee epine escalier etoile ' +
  'eventail fanfare fantome faucon fenetre fer festin flamme fleuve fontaine foret forge fougere foudre fresque fumee ' +
  'galion gargouille gazelle geyser givre glacier glaive gobelet gondole granit grenat griffon grimoire grotte guepard ' +
  'harpe hermine heron hibou horloge hydre ibis icone indigo jade jaguar jasmin javelot labyrinthe lagune lanterne laurier ' +
  'lave licorne lierre loup lotus louve lune lynx manoir marbre marais masque meduse menhir mercure meteore miel minuit ' +
  'miroir mistral monastere mousse nacre nectar neige nenuphar nuage oasis obelisque ocean ocre onyx opale orage orchidee ' +
  'orgue ouragan palais panthere papyrus parchemin pegase pelerin perle phare phenix pierre plume pollen portail prisme ' +
  'puits pyramide quartz rameau rapace relique renard requiem rivage roseau rubis sable safran salamandre saphir satin ' +
  'sceau sceptre scorpion serpent silex sirene soufre sphinx tambour tempete tenebres tigre tisane tonnerre topaze torche ' +
  'tornade tour trefle trident trompette tulipe vague vautour velours venin vertige vipere vitrail volcan zephyr'
)
  .split(/\s+/)
  .filter((m) => /^[a-z]+$/.test(m))

function hasard(n: number): number {
  // Tirage uniforme, sans biais de modulo
  const lim = Math.floor(0x1_0000_0000 / n) * n
  const t = new Uint32Array(1)
  do crypto.getRandomValues(t)
  while (t[0] >= lim)
  return t[0] % n
}

/** Phrase facile à retenir : 4 mots et un nombre (ex. corbeau-velours-soufre-tonnerre-42). */
export function genererPhrase(): string {
  const mots = Array.from({ length: 4 }, () => MOTS[hasard(MOTS.length)])
  return [...mots, String(10 + hasard(90))].join('-')
}

// ───────── État du coffre (en mémoire uniquement quand il est ouvert) ─────────

export type EtatCoffre = 'chargement' | 'absent' | 'verrouille' | 'ouvert' | 'passation'

type Interne = {
  etat: EtatCoffre
  contenu: ContenuCoffre | null
  majLe: number | null
  enregistrement: 'ok' | 'encours' | 'erreur'
}

const db = createStore('nomina', 'donnees')
const CLE_IDB = 'coffreMJ'
const VERROU_APRES = 10 * 60 * 1000

let st: Interne = { etat: 'chargement', contenu: null, majLe: null, enregistrement: 'ok' }
let cle: CryptoKey | null = null
let sel: Uint8Array<ArrayBuffer> | null = null
let iterations = ITERATIONS
let minuteur: number | undefined
let cacheLe: number | null = null
const abonnes = new Set<() => void>()

function maj(p: Partial<Interne>): void {
  st = { ...st, ...p }
  abonnes.forEach((f) => f())
}

export function useCoffre(): Interne {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f)
      return () => abonnes.delete(f)
    },
    () => st,
    () => st,
  )
}

export function etatCoffre(): Interne {
  return st
}

let initialise = false
export async function initCoffre(): Promise<void> {
  if (!initialise) {
    initialise = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        cacheLe = Date.now()
        void enregistrer()
      } else if (cacheLe && Date.now() - cacheLe > VERROU_APRES && st.etat === 'ouvert') {
        void verrouiller()
      }
    })
  }
  if (st.etat === 'ouvert' || st.etat === 'passation') return
  try {
    const env = await get<Enveloppe>(CLE_IDB, db)
    maj({ etat: estEnveloppe(env) ? 'verrouille' : 'absent', majLe: env?.majLe ?? null })
  } catch {
    maj({ etat: 'absent' })
  }
}

export async function creerCoffre(phrase: string): Promise<void> {
  sel = aleatoire(16)
  iterations = ITERATIONS
  cle = await deriver(phrase, sel, iterations)
  maj({ etat: 'ouvert', contenu: contenuVide() })
  await enregistrer()
}

/** Ouvre le coffre de cet appareil. Renvoie false si la phrase est fausse. */
export async function ouvrirCoffre(phrase: string): Promise<boolean> {
  const env = await get<Enveloppe>(CLE_IDB, db)
  if (!estEnveloppe(env)) {
    maj({ etat: 'absent' })
    return false
  }
  const r = await dechiffrer(env, phrase)
  if (!r) return false
  cle = r.cle
  sel = r.salt
  iterations = env.iter || ITERATIONS
  maj({ etat: 'ouvert', contenu: r.contenu, majLe: env.majLe })
  return true
}

export async function verrouiller(): Promise<void> {
  await enregistrer()
  cle = null
  sel = null
  maj({ etat: st.etat === 'absent' ? 'absent' : 'verrouille', contenu: null })
}

/** Modifie le contenu ; l'enregistrement chiffré suit une demi-seconde plus tard. */
export function majCoffre(f: (c: ContenuCoffre) => ContenuCoffre): void {
  if (!st.contenu || st.etat !== 'ouvert') return
  maj({ contenu: f(st.contenu), enregistrement: 'encours' })
  window.clearTimeout(minuteur)
  minuteur = window.setTimeout(() => void enregistrer(), 500)
}

export async function enregistrer(): Promise<void> {
  window.clearTimeout(minuteur)
  minuteur = undefined
  if (st.etat !== 'ouvert' || !st.contenu || !cle || !sel) return
  try {
    const env = await chiffrer(st.contenu, cle, sel, iterations)
    await set(CLE_IDB, env, db)
    maj({ enregistrement: 'ok', majLe: env.majLe })
  } catch {
    maj({ enregistrement: 'erreur' })
  }
}

/** Nouvelle phrase de passe : nouveau sel, nouvelle clé, tout est rechiffré. */
export async function changerPhrase(nouvelle: string): Promise<void> {
  if (!st.contenu) return
  sel = aleatoire(16)
  iterations = ITERATIONS
  cle = await deriver(nouvelle, sel, iterations)
  maj({ etat: 'ouvert' })
  await enregistrer()
}

/** Exporte la campagne (toujours chiffrée) pour une sauvegarde ou une passation. */
export async function enveloppeActuelle(): Promise<Enveloppe | null> {
  await enregistrer()
  const env = await get<Enveloppe>(CLE_IDB, db)
  return estEnveloppe(env) ? env : null
}

/**
 * Passation : ouvre une campagne reçue avec l'ancienne phrase de passe.
 * Le contenu reste en mémoire jusqu'au choix d'une nouvelle phrase (`changerPhrase`) :
 * l'ancienne phrase ne fonctionne plus pour la copie de cet appareil.
 */
export async function importerCampagne(env: Enveloppe, anciennePhrase: string): Promise<boolean> {
  const r = await dechiffrer(env, anciennePhrase)
  if (!r) return false
  cle = null
  sel = null
  maj({ etat: 'passation', contenu: r.contenu })
  return true
}

/** Abandonne une passation en cours (rien n'a été enregistré). */
export function annulerPassation(): void {
  cle = null
  sel = null
  maj({ etat: 'chargement', contenu: null })
  void initCoffre()
}

export async function effacerCoffre(): Promise<void> {
  window.clearTimeout(minuteur)
  cle = null
  sel = null
  await del(CLE_IDB, db)
  maj({ etat: 'absent', contenu: null, majLe: null })
}
