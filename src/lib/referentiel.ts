// Recherche souple dans le référentiel, pour relier un nom saisi à la main à sa fiche.
import type { Camp, Pack, PouvoirRef, TalentRef } from './pack'
import { caracLabel } from './pack'
import { norm } from './texte'

/** « petites Griffes » → « griffes », « Zombies » / « zombie »… */
function variantes(nom: string): string[] {
  const n = norm(nom).replace(/\s*\(.*\)$/, '')
  const sansAdjectif = n.replace(/^(petites?|petits?|grandes?|grands?)\s+/, '')
  const out = new Set([n, sansAdjectif])
  for (const v of [n, sansAdjectif]) {
    out.add(v.endsWith('s') ? v.slice(0, -1) : `${v}s`)
  }
  return [...out].filter(Boolean)
}

export function trouverPouvoir(pack: Pack | null | undefined, nom: string, camp?: Camp): PouvoirRef | undefined {
  if (!pack || !nom.trim()) return undefined
  const v = variantes(nom)
  const liste = pack.pouvoirs.filter((p) => !camp || p.camp === camp)
  return liste.find((p) => v.includes(norm(p.nom)))
}

const LANGUES = [
  'anglais', 'espagnol', 'allemand', 'italien', 'portugais', 'russe', 'chinois', 'japonais', 'arabe', 'latin',
  'grec', 'hebreu', 'neerlandais', 'polonais', 'turc', 'hindi', 'coreen', 'suedois', 'norvegien', 'danois',
]

export function trouverTalent(pack: Pack | null | undefined, nom: string): TalentRef | undefined {
  if (!pack || !nom.trim()) return undefined
  const v = variantes(nom)
  const exact = pack.talents.find((t) => v.includes(norm(t.nom)))
  if (exact) return exact
  const n = norm(nom)
  // Langue étrangère (« Anglais », « Espagnol »…)
  if (LANGUES.some((l) => n === l || n.startsWith(`${l} `))) return pack.talents.find((t) => t.special === 'langue')
  // « Survie en milieu arctique » → Survie
  return pack.talents
    .filter((t) => !t.special)
    .sort((a, b) => b.nom.length - a.nom.length)
    .find((t) => n.startsWith(`${norm(t.nom)} `))
}

/** Coût en PP d'un pouvoir, en version courte pour une petite case (« 2 », « 1/min », « 3/s », « tous »…). */
export function coutCourt(cout?: string): string {
  if (!cout) return ''
  const c = cout.trim()
  if (/^tous/i.test(c)) return 'tous'
  const n = c.match(/^(\d+)\s*(PP)?/i)
  if (!n) return c
  if (/par seconde/i.test(c)) return `${n[1]}/s`
  if (/par minute/i.test(c)) return `${n[1]}/min`
  if (/par heure/i.test(c)) return `${n[1]}/h`
  if (/par personne|par objet/i.test(c)) return `${n[1]}/cible`
  return n[1]
}

/** Coût en PP d'un pouvoir du référentiel retrouvé par son nom. */
export function coutDuPouvoir(pack: Pack | null | undefined, nom: string, camp?: Camp): string {
  return coutCourt(trouverPouvoir(pack, nom, camp)?.cout)
}

/** Caractéristique associée à un talent (« Ag », « Vo »…), ou chaîne vide si inconnue. */
export function caracDuTalent(pack: Pack | null | undefined, nom: string): string {
  const t = trouverTalent(pack, nom)
  return t && t.carac !== 'var' ? caracLabel(t.carac) : ''
}
