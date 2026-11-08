// Dépense des PP quand un pouvoir est utilisé, avec annulation possible et journal.
import type { DepensePP } from './personnage'
import { uid } from './storage'
import { getState, majPerso, setState } from './store'

const JOURNAL_MAX = 100

export type Annulation = { persoId: string; depense: DepensePP; jusqua: number }

/** Retire `montant` PP au personnage (ou à l'un de ses serviteurs) et note la dépense. */
export function depenserPP(persoId: string, pouvoir: string, montant: number, serviteurId?: string): void {
  if (montant <= 0) return
  const perso = getState().personnages[persoId]
  if (!perso) return
  const serv = serviteurId ? perso.serviteurs.find((s) => s.id === serviteurId) : undefined
  const depense: DepensePP = { id: uid(), at: Date.now(), pouvoir, montant, serviteurId, serviteurNom: serv ? serv.nom || serv.genre : undefined }
  majPerso(persoId, (x) => ({
    ...x,
    pp: serviteurId ? x.pp : { ...x.pp, actuel: x.pp.actuel - montant },
    serviteurs: serviteurId ? x.serviteurs.map((s) => (s.id === serviteurId ? { ...s, ppActuel: s.ppActuel - montant } : s)) : x.serviteurs,
    journalPP: [...x.journalPP, depense].slice(-JOURNAL_MAX),
  }))
  setState({ annulation: { persoId, depense, jusqua: Date.now() + 8000 } })
}

/** Annule la dernière dépense : les PP reviennent et la ligne du journal disparaît. */
export function annulerDepense(): void {
  const a = getState().annulation
  if (!a) return
  const { persoId, depense: d } = a
  majPerso(persoId, (x) => ({
    ...x,
    pp: d.serviteurId ? x.pp : { ...x.pp, actuel: x.pp.actuel + d.montant },
    serviteurs: d.serviteurId ? x.serviteurs.map((s) => (s.id === d.serviteurId ? { ...s, ppActuel: s.ppActuel + d.montant } : s)) : x.serviteurs,
    journalPP: x.journalPP.filter((j) => j.id !== d.id),
  }))
  setState({ annulation: null })
}
