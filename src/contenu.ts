// Textes de l'appli : phrases d'ambiance de l'accueil et nouveautés de chaque version.

export const PHRASES = [
  'Le Grand Jeu continue. Pensez à hydrater votre démon.',
  "Aucun ange n'a été blessé pendant la fabrication de cette appli. Enfin, presque.",
  'Rappel : la paperasse infernale se remplit toujours en trois exemplaires.',
  "Un 666 n'est jamais une coïncidence. Un 111 non plus, d'ailleurs.",
  'Votre supérieur vous observe. Faites semblant de travailler.',
  "Le Paradis a un service client. L'Enfer aussi, mais il facture.",
  'Les dés ne mentent jamais. Les joueurs, si.',
  "Note de service : merci de ne pas invoquer votre Prince pour une panne de Wi-Fi.",
  'Les auréoles se portent légèrement inclinées cette saison.',
  'Un démon prévoyant fait des sauvegardes. Un ange aussi, mais il prie pour ne pas en avoir besoin.',
  "Le MJ a toujours raison. Sauf quand il a tort, auquel cas il a quand même raison.",
  "Ce soir, le Bien et le Mal s'affrontent. Les chips sont dans le placard.",
  'Votre couverture tient toujours. Évitez juste les bénitiers.',
  "Les cornes, c'est comme les clés : on les perd toujours au mauvais moment.",
  "Statistiquement, quelqu'un va rater son jet de Discrétion ce soir.",
  'Satan vous salue. Il précise que vous lui devez encore une âme.',
  "Le Diable est dans les détails. Il les a d'ailleurs écrits en tout petit.",
  'Garantie anti-exorcisme non incluse.',
  'Mission du jour : semer le chaos, mais poliment.',
  'Les anges ont des ailes, les démons ont des excuses.',
  'Si votre personnage meurt, vous gardez la fiche en souvenir.',
  'Un bon serviteur ne pose pas de questions. Un bon joueur, si.',
  "Les PP ne poussent pas sur les arbres. Sauf chez certains Princes.",
  "Pour les réclamations, adressez-vous au bureau d'affectation. Prévoyez l'éternité.",
  'Ici, même le café est damné.',
]

export function phraseDuJour(): string {
  return PHRASES[Math.floor(Math.random() * PHRASES.length)]
}

export function salutation(prenom: string): string {
  const h = new Date().getHours()
  if (h >= 1 && h < 5) return `Encore debout, ${prenom} ? Les démons approuvent.`
  if (h >= 5 && h < 18) return `Bonjour, ${prenom}`
  return `Bonsoir, ${prenom}`
}

export type Nouveaute = { version: string; date: string; points: string[] }

/** Du plus récent au plus ancien. Écrit pour les joueurs, en langage simple. */
export const NOUVEAUTES: Nouveaute[] = [
  {
    version: '0.4.0',
    date: '8 novembre 2026',
    points: [
      'Conversations de groupe : touche « ＋ 👥 Groupe » dans Messages, donne un nom et choisis les membres. Seuls les membres reçoivent les messages.',
      'Pour chaque message envoyé à un groupe, tu vois combien de membres l’ont reçu.',
      'Supprimer un message : touche-le puis « Supprimer ». Supprimer une conversation ou quitter un groupe : bouton ⋯ en haut de la conversation.',
      'Attention : une suppression ne vaut que pour ton appareil, les autres gardent leur copie.',
    ],
  },
  {
    version: '0.3.0',
    date: '7 novembre 2026',
    points: [
      "Nouvelle page d'accueil : tes personnages, la Table, tes messages et ce qu'il reste à faire, d'un coup d'œil.",
      'Les réglages sont maintenant dans le bouton ⚙️ en haut à droite.',
      "Depuis l'accueil, tu peux ajuster les PP et les blessures de ton personnage sans ouvrir la fiche.",
    ],
  },
  {
    version: '0.2.5',
    date: '7 novembre 2026',
    points: [
      'Recherche dans le choix du prince (par nom, titre, rôle ou pouvoir privilégié).',
      'Suggestions pendant la frappe pour les pouvoirs, talents et limitations ; un pouvoir connu se remplit tout seul.',
      'Le nom du prince apparaît sur ses pouvoirs propres.',
    ],
  },
  {
    version: '0.2.4',
    date: '7 novembre 2026',
    points: ["Correction d'un blocage au démarrage, et l'appli vérifie seule les mises à jour."],
  },
]

/** Nouveautés pas encore lues depuis la version `vue`. */
export function nouveautesNonLues(vue: string | null): Nouveaute[] {
  if (!vue) return NOUVEAUTES.slice(0, 1)
  return NOUVEAUTES.filter((n) => comparer(n.version, vue) > 0)
}

function comparer(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
  return 0
}
