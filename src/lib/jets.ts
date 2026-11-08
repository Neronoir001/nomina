// Jets secrets au d666 : les deux premiers dés forment le résultat (11 à 66), comparé au seuil
// de la table de potentiel ; le troisième est le dé des unités (RU). 111 et 666 sont signalés.
import type { CaracKey, RegleTableUM } from './pack'
import { CARAC_LABEL, seuil } from './pack'
import type { Personnage } from './personnage'
import { uid } from './storage'

export type LigneDiff = RegleTableUM['lignes'][number]['id']

export const DIFFICULTES: { id: LigneDiff; nom: string }[] = [
  { id: 'facile', nom: 'Facile' },
  { id: 'moyen', nom: 'Moyen' },
  { id: 'difficile', nom: 'Difficile' },
  { id: 'tres-difficile', nom: 'Très difficile' },
]

/** Ce qui est testé : un talent, une caractéristique ou une valeur libre. */
export type Test = {
  /** Libellé lisible, ex. « Discrétion (talent 2) » */
  quoi: string
  /** Valeur qui donne la colonne de la table (1 à 6) */
  valeur: number
  /** Difficulté par défaut */
  ligne: LigneDiff
  /** Décalage de colonnes (malus d'un talent non possédé, bonus/malus du MJ) */
  decalage: number
}

/** Demande de jet envoyée par un joueur au MJ (aucun dé n'est lancé chez le joueur). */
export type DemandeJet = Test & { id: string; persoNom: string; note: string }

export type JetSecret = Test & {
  id: string
  at: number
  /** Qui a demandé le jet */
  origine: 'joueur' | 'mj'
  joueurNom: string
  persoNom: string
  note: string
  des: [number, number, number]
  /** Nouveau : pas encore regardé par le MJ */
  nouveau?: boolean
}

export type Verdict = {
  resultat: number
  ru: number
  seuil: number | 'auto' | 'echec' | null
  reussi: boolean | null
  special: '111' | '666' | null
}

function d6(): number {
  const t = new Uint8Array(1)
  do crypto.getRandomValues(t)
  while (t[0] >= 252) // 252 = 6 × 42 : tirage uniforme
  return (t[0] % 6) + 1
}

export function lancerD666(): [number, number, number] {
  return [d6(), d6(), d6()]
}

export function verdict(j: Pick<JetSecret, 'des' | 'valeur' | 'ligne' | 'decalage'>, table?: RegleTableUM): Verdict {
  const [a, b, c] = j.des
  const resultat = a * 10 + b
  const special = a === 1 && b === 1 && c === 1 ? '111' : a === 6 && b === 6 && c === 6 ? '666' : null
  const s = table ? seuil(table, j.valeur, j.ligne, j.decalage) : null
  const reussi = s === 'auto' ? true : s === 'echec' ? false : typeof s === 'number' ? resultat <= s : null
  return { resultat, ru: c, seuil: s, reussi, special }
}

export function nouveauJet(t: Test, extra: { origine: 'joueur' | 'mj'; joueurNom: string; persoNom: string; note?: string; id?: string }): JetSecret {
  return { ...t, id: extra.id ?? uid(), at: Date.now(), origine: extra.origine, joueurNom: extra.joueurNom, persoNom: extra.persoNom, note: extra.note ?? '', des: lancerD666() }
}

// ───────── Ce qu'on peut tester sur une fiche ─────────

export type Option = Test & { id: string; groupe: 'Talents' | 'Talents non possédés' | 'Caractéristiques' }

const CARACS: CaracKey[] = ['fo', 'ag', 'pe', 'vo', 'pr', 'ap']

/** Liste des tests possibles pour un personnage : talents possédés, autres talents (en TD), caractéristiques. */
export function optionsDe(p: Personnage, talentsRef: { id: string; nom: string; carac: string; diff: number | null; special?: string }[]): Option[] {
  const out: Option[] = []
  const possedes = new Set<string>()
  for (const t of p.talents) {
    if (!t.niveau || t.niveau <= 0) continue
    possedes.add(t.refId ?? t.nom)
    out.push({ id: `t:${t.id}`, groupe: 'Talents', quoi: `${t.nom} (talent ${t.niveau})`, valeur: t.niveau, ligne: 'moyen', decalage: 0 })
  }
  for (const r of talentsRef) {
    if (r.special || possedes.has(r.id) || r.diff === null) continue
    const caracs = r.carac.split('-').filter((c) => c in p.caracs) as CaracKey[]
    if (!caracs.length) continue
    const meilleure = Math.max(...caracs.map((c) => p.caracs[c] ?? 0))
    if (meilleure <= 0) continue
    out.push({
      id: `r:${r.id}`, groupe: 'Talents non possédés', quoi: `${r.nom} (sans le talent, ${caracs.map((c) => CARAC_LABEL[c]).join('/')} ${meilleure})`,
      valeur: meilleure, ligne: 'tres-difficile', decalage: r.diff,
    })
  }
  for (const c of CARACS) {
    const v = p.caracs[c] ?? 0
    if (v > 0) out.push({ id: `c:${c}`, groupe: 'Caractéristiques', quoi: `${CARAC_LABEL[c]} ${v}`, valeur: v, ligne: 'moyen', decalage: 0 })
  }
  return out
}

export function nomDifficulte(l: LigneDiff): string {
  return DIFFICULTES.find((d) => d.id === l)?.nom ?? l
}
