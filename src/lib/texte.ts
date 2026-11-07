/** Texte sans accents ni majuscules, pour les recherches. */
export function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Vrai si tous les mots recherchés apparaissent dans l'un des textes. */
export function correspond(recherche: string, ...textes: (string | undefined)[]): boolean {
  const mots = norm(recherche).split(/\s+/).filter(Boolean)
  if (mots.length === 0) return true
  const cible = norm(textes.filter(Boolean).join(' '))
  return mots.every((m) => cible.includes(m))
}
