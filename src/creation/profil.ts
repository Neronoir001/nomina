import { normaliserProfil, type ProfilCreation } from '../lib/creation'
import { getState } from '../lib/store'

/** Règles de création en vigueur : celles publiées par le MJ, sinon la 3e édition. */
export function profilActif(): ProfilCreation {
  return normaliserProfil(getState().reglesMaison?.creation)
}
