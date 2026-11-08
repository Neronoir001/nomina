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

/** Caractéristique associée à un talent (« Ag », « Vo »…), ou chaîne vide si inconnue. */
export function caracDuTalent(pack: Pack | null | undefined, nom: string): string {
  const t = trouverTalent(pack, nom)
  return t && t.carac !== 'var' ? caracLabel(t.carac) : ''
}
