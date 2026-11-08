import type { Camp, CaracKey, CategorieTalent, ProfilServiteur } from './pack'
import { uid } from './storage'

export type TalentPerso = {
  /** Identifiant du talent du référentiel, ou absent pour un talent ajouté librement */
  refId?: string
  id: string
  nom: string
  categorie: CategorieTalent
  diff: number | null
  carac: string
  niveau: number | null
  exp: number
}

export type PouvoirPerso = {
  id: string
  refId?: string
  type: string
  nom: string
  cout: string
  niveau: string
  portee: string
  att: string
  def: string
  num: string
  notes: string
  /** Pouvoir propre d'un autre supérieur, accordé par le MJ (exception aux règles) */
  accordeParMJ?: boolean
}

export type LimitationPerso = { id: string; refId?: string; nom: string; notes: string }

export type Serviteur = {
  id: string
  /** Grande famille : Animal, Humain, Mort-vivant, Possédé, Objet… */
  type: string
  /** Précision : Rat, Majordome, Zombie… */
  genre: string
  nom: string
  /** Nombre de créatures (ex. « 11 » pour 3d6 zombies) */
  nombre: string
  caracs: Record<CaracKey, string>
  talents: { nom: string; niveau: string; carac: string; exp: string }[]
  pouvoirs: { nom: string; niveau: string; pp: string; notes: string }[]
  pp: string
  equipement: string
  /** Pouvoir de la fiche qui a donné ce serviteur */
  pouvoirId?: string
}

export type SectionNotes = 'identite' | 'talents' | 'pouvoirs' | 'superieur' | 'serviteurs' | 'general'

export type Personnage = {
  id: string
  camp: Camp
  createdAt: number
  updatedAt: number
  identite: { nomCouverture: string; nom: string; grade: string; superieurId: string; superieurLibre: string }
  description: {
    taille: string
    poids: string
    profession: string
    yeux: string
    cheveux: string
    nationalite: string
    lieuHabitation: string
    revenuMensuel: string
    epargne: string
    armure: string
  }
  caracs: Record<CaracKey, number>
  pp: { actuel: number; max: number }
  blessures: { actuel: number; max: number }
  talents: TalentPerso[]
  pouvoirs: PouvoirPerso[]
  limitations: LimitationPerso[]
  pouvoirsGrade: { id: string; texte: string }[]
  invocation: { possibilite: string; notes: string }
  recuperation: { id: string; texte: string; nombre: string }[]
  armeMagique: { nom: string; carac: string; notes: string }
  objetMagique: { nom: string; pouvoir1: string; pouvoir2: string }
  serviteurs: Serviteur[]
  equipement: string
  notes: Record<SectionNotes, string>
}

export function nouveauPersonnage(camp: Camp = 'INS'): Personnage {
  const now = Date.now()
  return {
    id: uid(),
    camp,
    createdAt: now,
    updatedAt: now,
    identite: { nomCouverture: '', nom: '', grade: '', superieurId: '', superieurLibre: '' },
    description: {
      taille: '', poids: '', profession: '', yeux: '', cheveux: '', nationalite: '',
      lieuHabitation: '', revenuMensuel: '', epargne: '', armure: '',
    },
    caracs: { fo: 2, ag: 2, vo: 2, pr: 2, pe: 2, ap: 2 },
    pp: { actuel: 0, max: 0 },
    blessures: { actuel: 0, max: 0 },
    talents: [],
    pouvoirs: [],
    limitations: [],
    pouvoirsGrade: [],
    invocation: { possibilite: '', notes: '' },
    recuperation: [],
    armeMagique: { nom: '', carac: '', notes: '' },
    objetMagique: { nom: '', pouvoir1: '', pouvoir2: '' },
    serviteurs: [],
    equipement: '',
    notes: { identite: '', talents: '', pouvoirs: '', superieur: '', serviteurs: '', general: '' },
  }
}

export function nouveauPouvoir(): PouvoirPerso {
  return { id: uid(), type: '', nom: '', cout: '', niveau: '', portee: '', att: '', def: '', num: '', notes: '' }
}

export function nouveauServiteur(): Serviteur {
  return {
    id: uid(), type: '', genre: '', nom: '', nombre: '1',
    caracs: { fo: '', ag: '', vo: '', pr: '', pe: '', ap: '' },
    talents: [], pouvoirs: [], pp: '', equipement: '',
  }
}

/** Lance des dés écrits « 3d6 » (ou renvoie le nombre tel quel). */
export function lancerDes(expr: string): { total: number; detail: string } {
  const m = expr.trim().match(/^(\d+)d(\d+)$/i)
  if (!m) return { total: Number(expr) || 1, detail: '' }
  const des = Array.from({ length: Number(m[1]) }, () => 1 + (crypto.getRandomValues(new Uint32Array(1))[0] % Number(m[2])))
  return { total: des.reduce((a, b) => a + b, 0), detail: `${expr} : ${des.join(' + ')}` }
}

/** Serviteur créé à partir du profil d'un pouvoir du référentiel. */
export function serviteurDepuisProfil(prof: ProfilServiteur, pouvoirId: string): Serviteur {
  const s = nouveauServiteur()
  const n = lancerDes(prof.nombre)
  const v = (k: CaracKey) => (prof.caracs[k] !== undefined ? String(prof.caracs[k]) : '')
  return {
    ...s,
    type: prof.type,
    genre: prof.genre,
    nom: prof.genre,
    nombre: String(n.total),
    caracs: { fo: v('fo'), ag: v('ag'), vo: v('vo'), pr: v('pr'), pe: v('pe'), ap: v('ap') },
    pp: prof.caracs.pp !== undefined ? String(prof.caracs.pp) : '',
    talents: prof.talents.map((t) => ({ nom: t.nom, niveau: String(t.niveau ?? ''), carac: '', exp: '' })),
    pouvoirs: prof.pouvoirs.map((p) => ({ nom: p.nom, niveau: String(p.niveau ?? ''), pp: '', notes: '' })),
    equipement: n.detail ? `Nombre tiré au hasard (${n.detail}).` : '',
    pouvoirId,
  }
}

export function nomAffiche(p: Personnage): string {
  return p.identite.nom || p.identite.nomCouverture || 'Personnage sans nom'
}

/** Complète un personnage venu d'une version plus ancienne ou d'un fichier importé. */
export function normaliser(entree: Partial<Personnage> | null | undefined): Personnage {
  const x: Partial<Personnage> = entree && typeof entree === 'object' ? entree : {}
  const base = nouveauPersonnage(x.camp === 'MV' ? 'MV' : 'INS')
  return {
    ...base,
    ...x,
    identite: { ...base.identite, ...x.identite },
    description: { ...base.description, ...x.description },
    caracs: { ...base.caracs, ...x.caracs },
    pp: { ...base.pp, ...x.pp },
    blessures: { ...base.blessures, ...x.blessures },
    invocation: { ...base.invocation, ...x.invocation },
    armeMagique: { ...base.armeMagique, ...x.armeMagique },
    objetMagique: { ...base.objetMagique, ...x.objetMagique },
    notes: { ...base.notes, ...x.notes },
    talents: liste(x.talents),
    pouvoirs: liste(x.pouvoirs),
    limitations: liste(x.limitations),
    pouvoirsGrade: liste(x.pouvoirsGrade),
    recuperation: liste(x.recuperation),
    serviteurs: liste(x.serviteurs).map((s) => {
      const b = nouveauServiteur()
      return {
        ...b,
        ...s,
        caracs: { ...b.caracs, ...s.caracs },
        talents: liste(s.talents),
        pouvoirs: liste(s.pouvoirs).map((p) => ({ ...p, niveau: p.niveau ?? '' })),
      }
    }),
    id: typeof x.id === 'string' && x.id ? x.id : base.id,
  } as Personnage
}

function liste<T>(v: T[] | undefined): T[] {
  return Array.isArray(v) ? v.filter((e) => e && typeof e === 'object') : []
}

/** Fiche simplifiée du prototype (étape 0) → personnage complet. */
export function depuisFicheProto(s: {
  nomCouverture?: string; nom?: string; camp?: Camp; superieur?: string; grade?: string
  fo?: number; ag?: number; vo?: number; pr?: number; pe?: number; ap?: number
  pp?: number; ppMax?: number; blessures?: number; notes?: string
} = {}): Personnage {
  s = s && typeof s === 'object' ? s : {}
  const p = nouveauPersonnage(s.camp === 'MV' ? 'MV' : 'INS')
  p.identite = { ...p.identite, nomCouverture: s.nomCouverture ?? '', nom: s.nom ?? '', grade: s.grade ?? '', superieurLibre: s.superieur ?? '' }
  p.caracs = { fo: s.fo ?? 2, ag: s.ag ?? 2, vo: s.vo ?? 2, pr: s.pr ?? 2, pe: s.pe ?? 2, ap: s.ap ?? 2 }
  p.pp = { actuel: s.pp ?? 0, max: s.ppMax ?? 0 }
  p.blessures = { actuel: s.blessures ?? 0, max: 0 }
  p.notes.general = s.notes ?? ''
  return p
}
