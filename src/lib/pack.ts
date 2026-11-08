// Format du « pack de données » (référentiel) : il contient tout le contenu de jeu.
// Il n'est JAMAIS inclus dans le code publié : il arrive sur l'appareil par import ou par la Table.

export type Camp = 'INS' | 'MV'
export type CaracKey = 'fo' | 'ag' | 'vo' | 'pr' | 'pe' | 'ap'
export type CategorieTalent = 'physique' | 'communication' | 'combat' | 'artistique' | 'scientifique' | 'ruse'

export type TalentRef = {
  id: string
  nom: string
  categorie: CategorieTalent
  /** Malus en colonnes quand le talent n'est pas possédé (ex. -3). null = variable. */
  diff: number | null
  /** Caractéristique(s) associée(s), ex. "ag" ou "ag-pr" ; "var" si variable. */
  carac: string
  /** Talent « conteneur » : spécialisations, langues… */
  special?: 'specialisation' | 'langue'
  resume?: string
  page?: string
}

export type PouvoirRef = {
  id: string
  nom: string
  camp: Camp
  /** Rubrique du livre, ex. « Attaque corporelle » */
  rubrique?: string
  /** Numéros du tirage aléatoire, ex. « 111-112 » */
  d666?: string
  type?: string
  cout?: string
  carac?: string
  defense?: string
  portee?: string
  /** Résumé rédigé pour l'appli (le texte complet est dans le livre, voir `page`). */
  resume?: string
  page?: string
  /** Pouvoir propre à un supérieur */
  superieur?: string
  /** Pouvoir qui donne un serviteur (familier, mort-vivant…) : son profil */
  serviteur?: ProfilServiteur
}

export type ProfilServiteur = {
  type: string
  genre: string
  /** Nombre de créatures : « 1 », ou des dés à lancer (« 3d6 ») */
  nombre: string
  caracs: Partial<Record<CaracKey | 'pp', number>>
  talents: { nom: string; niveau: number | string }[]
  pouvoirs: { nom: string; niveau: number | string }[]
}

export type LimitationRef = {
  id: string
  nom: string
  camp: Camp
  d66?: string
  resume?: string
  page?: string
}

export type GradeRef = { rang: 'chevalier' | 'capitaine' | 'baron' | string; titre: string; effet: string }

export type AvatarRef = {
  nom?: string
  caracs?: Partial<Record<CaracKey | 'pp', number>>
  talents?: { nom: string; niveau: number | string }[]
  pouvoirs?: { nom: string; niveau: number | string }[]
}

export type SuperieurRef = {
  id: string
  camp: Camp
  nom: string
  titre: string
  /** Possibilités d'intervention (table UM) */
  intervention?: number | null
  recuperation?: { condition: string; gain: string }[]
  /** Pouvoirs privilégiés, dans l'ordre du d6 */
  pouvoirsPrivilegies?: string[]
  /** Pouvoirs propres à ce supérieur (identifiants de pouvoirs) */
  pouvoirsPropres?: string[]
  grades?: GradeRef[]
  relations?: Partial<Record<'ennemi' | 'hostile' | 'neutre' | 'associe' | 'allie', string[]>>
  role?: string
  apparence?: string
  avatar?: AvatarRef
  page?: string
}

export type RegleTableUM = {
  /** Libellés des colonnes (ex. « - », « 1 », « 2 », « - »…) */
  colonnes: string[]
  /** Index de colonne correspondant à chaque valeur 1 à 6 */
  colonneDeValeur: Record<string, number>
  lignes: { id: 'tres-difficile' | 'difficile' | 'moyen' | 'facile'; nom: string; seuils: number[] }[]
}

export type Pack = {
  format: 'nomina-pack'
  version: string
  titre: string
  date: string
  regles?: { tableUM?: RegleTableUM }
  talents: TalentRef[]
  superieurs: SuperieurRef[]
  pouvoirs: PouvoirRef[]
  limitations: LimitationRef[]
}

export function isPack(x: unknown): x is Pack {
  const p = x as Pack
  return !!p && p.format === 'nomina-pack' && Array.isArray(p.talents) && Array.isArray(p.superieurs) && Array.isArray(p.pouvoirs)
}

export const CARAC_LABEL: Record<CaracKey, string> = {
  fo: 'Force',
  ag: 'Agilité',
  vo: 'Volonté',
  pr: 'Précision',
  pe: 'Perception',
  ap: 'Apparence',
}

export const CARAC_ABBR: Record<CaracKey, string> = { fo: 'Fo', ag: 'Ag', vo: 'Vo', pr: 'Pr', pe: 'Pe', ap: 'App' }

export const CATEGORIES: { id: CategorieTalent; nom: string }[] = [
  { id: 'physique', nom: 'Physique' },
  { id: 'communication', nom: 'Communication' },
  { id: 'combat', nom: 'Combat' },
  { id: 'artistique', nom: 'Artistique' },
  { id: 'scientifique', nom: 'Scientifique' },
  { id: 'ruse', nom: 'Ruse' },
]

export function caracLabel(c: string): string {
  if (c === 'var') return 'Var'
  return c
    .split('-')
    .map((k) => CARAC_ABBR[k as CaracKey] ?? k)
    .join('-')
}

// ───────── Table UM ─────────

/** Seuil de réussite (à faire au plus avec les deux premiers dés du d666), ou null si hors table. */
export function seuil(t: RegleTableUM, valeur: number, ligne: RegleTableUM['lignes'][number]['id'], decalage = 0): number | 'auto' | 'echec' | null {
  if (valeur <= 0) return null
  const base = t.colonneDeValeur[String(Math.min(6, Math.round(valeur)))]
  if (base === undefined) return null
  const col = base + decalage
  if (col < 0) return 'echec'
  if (col >= t.colonnes.length) return 'auto'
  return t.lignes.find((l) => l.id === ligne)?.seuils[col] ?? null
}

export function colonne(t: RegleTableUM, valeur: number, decalage = 0): number | null {
  const base = t.colonneDeValeur[String(Math.min(6, Math.round(valeur)))]
  return base === undefined ? null : base + decalage
}
