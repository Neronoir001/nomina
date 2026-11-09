// Création guidée : profil de règles (3e édition par défaut, modifiable par le MJ), budgets et tirages.
// Règles du livre (3e édition) pour un personnage-joueur débutant :
//  - Démon : 18 points de caractéristiques (max 5), 12 points de talents ; Ange : 20 et 8.
//  - Talent : niveau 1 = 1 point, 2 = 2 points, 3 = 4 points, 4 = 8 points ; max 4 ; jamais au-dessus de sa caractéristique.
//  - 4 pouvoirs au niveau 1 : 1 choisi parmi les 6 privilégiés du supérieur, 1 tiré au d6 parmi eux,
//    2 tirés au d666 dans la table générale (un pouvoir déjà possédé se relance).
//  - 1 limitation tirée au d66. PP maximum = Volonté + 4.
import type { Camp, CaracKey, LimitationRef, Pack, PouvoirRef, SuperieurRef, TalentRef } from './pack'
import type { Personnage } from './personnage'
import { nouveauPersonnage, nouveauPouvoir, profilDe, serviteurDepuisProfil } from './personnage'
import { trouverPouvoir } from './referentiel'
import { uid } from './storage'

export type Budget = { caracPoints: number; talentPoints: number }

export type ProfilCreation = {
  nom: string
  /** strict : bloque ; conseil : avertit ; libre : aucun contrôle */
  controle: 'strict' | 'conseil' | 'libre'
  /** des : tirages au hasard comme dans le livre ; choix : tout est choisi librement */
  tirage: 'des' | 'choix'
  budgets: Record<Camp, Budget>
  caracMin: number
  caracMax: number
  talentMax: number
  ppBonus: number
  privChoisis: number
  privTires: number
  generauxTires: number
  limitations: number
}

export const PROFIL_OFFICIEL: ProfilCreation = {
  nom: '3e édition (officiel)',
  controle: 'strict',
  tirage: 'des',
  budgets: { INS: { caracPoints: 18, talentPoints: 12 }, MV: { caracPoints: 20, talentPoints: 8 } },
  caracMin: 1,
  caracMax: 5,
  talentMax: 4,
  ppBonus: 4,
  privChoisis: 1,
  privTires: 1,
  generauxTires: 2,
  limitations: 1,
}

export function normaliserProfil(p: Partial<ProfilCreation> | null | undefined): ProfilCreation {
  if (!p) return PROFIL_OFFICIEL
  return {
    ...PROFIL_OFFICIEL,
    ...p,
    budgets: { INS: { ...PROFIL_OFFICIEL.budgets.INS, ...p.budgets?.INS }, MV: { ...PROFIL_OFFICIEL.budgets.MV, ...p.budgets?.MV } },
  }
}

export function estOfficiel(p: ProfilCreation): boolean {
  return JSON.stringify({ ...p, nom: '' }) === JSON.stringify({ ...PROFIL_OFFICIEL, nom: '' })
}

/** Points de talents pour un niveau : 1, 2, 4, 8… */
export function coutTalent(niveau: number): number {
  return niveau <= 0 ? 0 : 2 ** (niveau - 1)
}

/** Niveau maximum d'un talent : sa caractéristique associée (la meilleure s'il y en a deux). */
export function plafondTalent(t: Pick<TalentRef, 'carac'>, caracs: Record<CaracKey, number>): number | null {
  if (t.carac === 'var') return null
  const cs = t.carac.split('-').filter((c) => c in caracs) as CaracKey[]
  return cs.length ? Math.max(...cs.map((c) => caracs[c])) : null
}

// ───────── Dés ─────────

export function d6(): number {
  const t = new Uint8Array(1)
  do crypto.getRandomValues(t)
  while (t[0] >= 252)
  return (t[0] % 6) + 1
}
export const d66 = (): string => `${d6()}${d6()}`
export const d666 = (): string => `${d6()}${d6()}${d6()}`

/** Le code (ex. « 352 ») tombe-t-il dans la plage du référentiel (ex. « 351-352 » ou « 35 ») ? */
export function dansPlage(code: string, plage?: string): boolean {
  if (!plage) return false
  return plage.split(/[,;]/).some((morceau) => {
    const [a, b] = morceau.trim().split(/\s*[-–]\s*/)
    if (!a) return false
    const n = Number(code)
    return b ? n >= Number(a) && n <= Number(b) : Number(a) === n
  })
}

/** Pouvoirs de la table générale d'un camp (hors pouvoirs propres des supérieurs). */
export function tableGenerale(pack: Pack, camp: Camp): PouvoirRef[] {
  return pack.pouvoirs.filter((p) => p.camp === camp && !p.superieur && p.d666)
}

export function privilegies(pack: Pack, sup: SuperieurRef | undefined): { nom: string; ref?: PouvoirRef }[] {
  return (sup?.pouvoirsPrivilegies ?? []).map((nom) => ({ nom, ref: trouverPouvoir(pack, nom, sup?.camp) }))
}

export function limitationsDu(pack: Pack, camp: Camp): LimitationRef[] {
  return pack.limitations.filter((l) => l.camp === camp)
}

// ───────── Brouillon ─────────

export type ChoixPouvoir = { cle: string; refId?: string; nom: string; origine: 'choisi' | 'd6' | 'd666'; tirage?: string }
export type ChoixLimitation = { cle: string; refId?: string; nom: string; tirage?: string }

export type Brouillon = {
  id: string
  etape: number
  camp: Camp
  nom: string
  nomCouverture: string
  superieurId: string
  caracs: Record<CaracKey, number>
  talents: Record<string, number>
  pouvoirs: ChoixPouvoir[]
  limitations: ChoixLimitation[]
  /** Trace des jets, recopiée dans les notes de la fiche */
  journal: string[]
  profil: ProfilCreation
}

export function nouveauBrouillon(camp: Camp, profil: ProfilCreation): Brouillon {
  const base = Math.max(profil.caracMin, 1)
  return {
    id: uid(), etape: 0, camp, nom: '', nomCouverture: '', superieurId: '',
    caracs: { fo: base, ag: base, vo: base, pr: base, pe: base, ap: base },
    talents: {}, pouvoirs: [], limitations: [], journal: [], profil,
  }
}

export const CARACS_ORDRE: CaracKey[] = ['fo', 'ag', 'pe', 'vo', 'pr', 'ap']

export function pointsCaracs(b: Brouillon): number {
  return CARACS_ORDRE.reduce((s, k) => s + b.caracs[k], 0)
}

export function pointsTalents(b: Brouillon): number {
  return Object.values(b.talents).reduce((s, n) => s + coutTalent(n), 0)
}

/** Problèmes de chaque étape (vide = tout est bon). */
export function problemes(b: Brouillon, pack: Pack | null, etape: number): string[] {
  const p = b.profil
  const budget = p.budgets[b.camp]
  const out: string[] = []
  if (etape === 0 && !b.nom.trim() && !b.nomCouverture.trim()) out.push('Donne au moins un nom ou un nom de couverture.')
  if (etape === 1 && !b.superieurId) out.push(`Choisis ton ${b.camp === 'INS' ? 'Prince-Démon' : 'Archange'}.`)
  if (etape === 2) {
    const reste = budget.caracPoints - pointsCaracs(b)
    if (reste > 0) out.push(`Il reste ${reste} point(s) de caractéristiques à répartir.`)
    if (reste < 0) out.push(`${-reste} point(s) de caractéristiques en trop.`)
    for (const k of CARACS_ORDRE) if (b.caracs[k] > p.caracMax) out.push(`Une caractéristique dépasse le maximum (${p.caracMax}).`)
  }
  if (etape === 3) {
    const reste = budget.talentPoints - pointsTalents(b)
    if (reste > 0) out.push(`Il reste ${reste} point(s) de talents à dépenser.`)
    if (reste < 0) out.push(`${-reste} point(s) de talents en trop.`)
    for (const [id, n] of Object.entries(b.talents)) {
      const t = pack?.talents.find((x) => x.id === id)
      if (!t || n <= 0) continue
      if (n > p.talentMax) out.push(`${t.nom} dépasse le niveau maximum (${p.talentMax}).`)
      const plafond = plafondTalent(t, b.caracs)
      if (plafond !== null && n > plafond) out.push(`${t.nom} (${n}) dépasse sa caractéristique associée (${plafond}).`)
    }
  }
  if (etape === 4) {
    const attendu = p.privChoisis + p.privTires + p.generauxTires
    if (b.pouvoirs.length < attendu) out.push(`Il manque ${attendu - b.pouvoirs.length} pouvoir(s).`)
  }
  if (etape === 5 && b.limitations.length < p.limitations) out.push(`Il manque ${p.limitations - b.limitations.length} limitation(s).`)
  return out
}

export const ETAPES = ['Identité', 'Supérieur', 'Caractéristiques', 'Talents', 'Pouvoirs', 'Limitation', 'Récapitulatif']

// ───────── Personnage final ─────────

export function construirePersonnage(b: Brouillon, pack: Pack): Personnage {
  const p = nouveauPersonnage(b.camp)
  const sup = pack.superieurs.find((s) => s.id === b.superieurId)
  p.identite = { ...p.identite, nom: b.nom.trim(), nomCouverture: b.nomCouverture.trim(), superieurId: b.superieurId }
  p.caracs = { ...b.caracs }
  const ppMax = b.caracs.vo + b.profil.ppBonus
  p.pp = { actuel: ppMax, max: ppMax }
  if (sup?.intervention != null) p.invocation = { ...p.invocation, possibilite: String(sup.intervention) }
  p.recuperation = (sup?.recuperation ?? []).map((r) => ({ id: uid(), texte: r.condition, nombre: r.gain }))

  p.talents = Object.entries(b.talents)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => {
      const r = pack.talents.find((t) => t.id === id)!
      return { id: `ref:${id}`, refId: id, nom: r.nom, categorie: r.categorie, diff: r.diff, carac: r.carac, niveau: n, exp: 0 }
    })

  for (const c of b.pouvoirs) {
    const r = c.refId ? pack.pouvoirs.find((x) => x.id === c.refId) : undefined
    const np = { ...nouveauPouvoir(), nom: c.nom, niveau: '1' }
    if (r) Object.assign(np, { refId: r.id, nom: r.nom, type: r.type ?? '', cout: r.cout ?? '', portee: r.portee ?? '', att: r.carac ?? '', def: r.defense ?? '', num: r.d666 ?? '' })
    p.pouvoirs.push(np)
    const prof = profilDe(r)
    if (prof) p.serviteurs.push(serviteurDepuisProfil(prof, np.id))
  }

  p.limitations = b.limitations.map((l) => ({ id: uid(), refId: l.refId, nom: l.nom, notes: l.tirage ? `Tirée au d66 : ${l.tirage}` : '' }))

  const trace = [`Créé avec l'assistant (règles : ${b.profil.nom}) le ${new Date().toLocaleDateString('fr-FR')}.`, ...b.journal]
  p.notes = { ...p.notes, general: trace.join('\n') }
  return p
}
