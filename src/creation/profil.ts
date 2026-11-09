import type { Camp } from '../lib/pack'
import { normaliserProfil, nouveauBrouillon, type ProfilCreation } from '../lib/creation'
import { getState, setState } from '../lib/store'

/** Règles de création en vigueur : celles publiées par le MJ, sinon la 3e édition. */
export function profilActif(): ProfilCreation {
  return normaliserProfil(getState().reglesMaison?.creation)
}

/** Ouvre l'assistant de création (en reprenant ou remplaçant une création en cours). */
export function demarrerCreation(camp: Camp): void {
  const cur = getState().brouillonCreation
  if (cur && !confirm('Une création est déjà en cours. La remplacer par une nouvelle ?')) {
    setState({ creationOuverte: true })
    return
  }
  setState({ brouillonCreation: nouveauBrouillon(camp, profilActif()), creationOuverte: true })
}
