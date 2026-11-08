// Lecture du coût d'un pouvoir (texte du livre « 2 PP par seconde » ou forme courte « 2/s »).

export type Cout =
  | { genre: 'gratuit' }
  | { genre: 'fixe'; pp: number }
  | { genre: 'duree'; depart: number; parUnite: number; unite: 'seconde' | 'minute' | 'heure' }
  | { genre: 'cible'; parCible: number }
  | { genre: 'tous' }
  | { genre: 'inconnu' }

export function lireCout(texte?: string): Cout {
  const c = (texte ?? '').trim().toLowerCase()
  if (!c) return { genre: 'inconnu' }
  if (c.startsWith('tous')) return { genre: 'tous' }
  // « 0 (1 PP par usage) »
  const usage = c.match(/(\d+)\s*pp\s*par\s*usage/)
  if (usage) return { genre: 'fixe', pp: Number(usage[1]) }
  // « 2 PP, puis 1 PP par minute »
  const mixte = c.match(/^(\d+)\s*pp\s*,?\s*puis\s*(\d+)\s*pp\s*par\s*(seconde|minute|heure)/)
  if (mixte) return { genre: 'duree', depart: Number(mixte[1]), parUnite: Number(mixte[2]), unite: mixte[3] as 'seconde' }
  const duree = c.match(/^(\d+)\s*(?:pp\s*)?(?:par\s*(seconde|minute|heure)|\/(s|min|h))\b/)
  if (duree) {
    const u = duree[2] ?? { s: 'seconde', min: 'minute', h: 'heure' }[duree[3] as 's']
    return { genre: 'duree', depart: 0, parUnite: Number(duree[1]), unite: u as 'seconde' }
  }
  const cible = c.match(/^(\d+)\s*(?:pp\s*)?(?:par\s*(?:personne|objet|cible)|\/cible)/)
  if (cible) return { genre: 'cible', parCible: Number(cible[1]) }
  const n = c.match(/^(\d+)/)
  if (n) return Number(n[1]) === 0 ? { genre: 'gratuit' } : { genre: 'fixe', pp: Number(n[1]) }
  return { genre: 'inconnu' }
}

/** Texte court pour le bouton : « 3 », « 2/s », « 1/cible », « tous », « ? ». */
export function etiquetteCout(c: Cout): string {
  switch (c.genre) {
    case 'fixe':
      return String(c.pp)
    case 'duree':
      return `${c.depart ? `${c.depart}+` : ''}${c.parUnite}/${{ seconde: 's', minute: 'min', heure: 'h' }[c.unite]}`
    case 'cible':
      return `${c.parCible}/cible`
    case 'tous':
      return 'tous'
    case 'gratuit':
      return '0'
    default:
      return '?'
  }
}
