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
    version: '0.13.0',
    date: '12 novembre 2026',
    points: [
      'Table : si une personne est à la table mais que ton appareil n’arrive pas à se relier à elle, un encadré « ⚠ Pas reliés à cet appareil » le signale (onglet Table, accueil et Messages), avec qui la voit.',
      'Bouton « 🔄 Réessayer » pour relancer les liaisons après avoir corrigé le réseau (même Wi-Fi, VPN coupé, pare-feu).',
      'Ces personnes apparaissent déjà dans Messages : tu peux leur écrire, le message partira dès que la liaison sera établie.',
    ],
  },
  {
    version: '0.12.1',
    date: '12 novembre 2026',
    points: [
      'Référentiel : envoi plus fiable vers les téléphones. Le MJ le renvoie si le joueur n’en accuse pas réception, et le joueur le redemande tout seul s’il n’arrive pas.',
      'Nouveau bouton « 📥 Demander le référentiel au MJ » (onglet Table et accueil). Une proposition fermée par erreur reste installable depuis « À faire ».',
      'Le MJ n’envoie plus le référentiel à un joueur qui a déjà la même version.',
    ],
  },
  {
    version: '0.12.0',
    date: '10 novembre 2026',
    points: [
      'Téléphone : plus de zoom intempestif sur iPhone quand on touche un champ, et des boutons plus grands, plus faciles à toucher (ⓘ, ⚡, lignes dépliables…).',
      'Quand le clavier s’ouvre, la barre d’onglets du bas se cache pour laisser voir ce que tu écris.',
      'Les fenêtres s’ouvrent en bas de l’écran, à portée de pouce. Sur petit écran, les lignes de pouvoirs et de serviteurs passent sur deux lignes au lieu de déborder.',
      'Démarrage plus rapide : l’appli charge un tiers de données en moins au lancement.',
    ],
  },
  {
    version: '0.11.0',
    date: '9 novembre 2026',
    points: [
      'Côté anges : le référentiel 0.5 contient les 21 Archanges de Magna Veritas, tous les pouvoirs d’anges (table d666 complète) et leurs 36 limitations. Ton MJ te l’envoie à la Table.',
      'La création guidée fonctionne maintenant aussi pour les anges (20 points de caractéristiques, 8 de talents).',
      'Les « distinctions » des Archanges apparaissent comme grades sur la fiche. Les pouvoirs qui donnent des humains à son service (détective, sections de soldats…) créent le serviteur automatiquement.',
    ],
  },
  {
    version: '0.10.0',
    date: '9 novembre 2026',
    points: [
      'Création guidée : « ＋ Nouveau » à l’accueil (ou ＋ sur la fiche) → Création guidée. Sept étapes : identité, supérieur, caractéristiques, talents, pouvoirs, limitation, récapitulatif.',
      'Les points se décomptent tout seuls (18 en caractéristiques et 12 en talents pour un démon), et les pouvoirs et la limitation se tirent aux dés comme dans le livre. Les tirages sont notés sur la fiche.',
      'La création est gardée si tu fermes l’appli : « Reprendre la création » à l’accueil.',
      'MJ : Espace MJ → Règles → « Création des personnages » pour changer les points, choisir les pouvoirs au lieu de les tirer, et régler le contrôle (strict, conseil ou libre).',
    ],
  },
  {
    version: '0.9.1',
    date: '8 novembre 2026',
    points: ['Ta fiche part toute seule chez le MJ quelques secondes après chaque changement (nouveau personnage, modification, PP dépensés…), tant que vous êtes connectés à la même Table.'],
  },
  {
    version: '0.9.0',
    date: '8 novembre 2026',
    points: [
      'Jets secrets : bouton 🎲 sur la fiche et à l’accueil. Choisis un talent ou une caractéristique ; les dés sont lancés chez le MJ, lui seul voit le résultat.',
      'MJ : chaque demande s’ouvre aussitôt avec les dés, le résultat, le RU, le seuil et le verdict (111 et 666 signalés). La difficulté reste modifiable.',
      'MJ : jet secret à l’insu d’un joueur depuis sa fiche reçue (onglet Table), jet libre pour les PNJ, et journal des jets.',
    ],
  },
  {
    version: '0.8.1',
    date: '8 novembre 2026',
    points: ['Correction : l’onglet « MJ » 🎭 était caché sous le bas de l’écran. Il apparaît maintenant à droite de « Messages » (avec le rôle Maître du jeu).'],
  },
  {
    version: '0.8.0',
    date: '8 novembre 2026',
    points: [
      'MJ : nouvel onglet « MJ » 🎭, un espace secret chiffré par une phrase de passe, avec les notes de campagne, le journal des séances, les PNJ et les règles maison.',
      'MJ : changement de phrase de passe et passation de la campagne à un autre MJ, qui choisit aussitôt sa propre phrase.',
      'Joueurs : les règles maison publiées par le MJ apparaissent dans Référentiel → Règles.',
    ],
  },
  {
    version: '0.7.0',
    date: '8 novembre 2026',
    points: [
      'Nouveau guide intégré : touche le bouton « ? » en haut de l’écran, il s’ouvre directement à la page de l’écran affiché.',
      'Le guide propose un parcours « Je suis joueur » ou « Je suis MJ », une recherche, des questions fréquentes, un glossaire, et peut être imprimé ou enregistré en PDF.',
      'Une courte visite guidée présente l’appli au premier lancement ; elle peut être revue depuis le guide.',
    ],
  },
  {
    version: '0.6.0',
    date: '8 novembre 2026',
    points: [
      'Bouton ⚡ sur chaque pouvoir (fiche, serviteurs et accueil) : un toucher dépense ses PP. Pour un coût par seconde, par minute ou par cible, une petite fenêtre demande la durée ou le nombre de cibles.',
      'Impossible de descendre sous 0 PP (le MJ peut passer outre sur ses propres personnages). Un bandeau « Annuler » reste 8 secondes après chaque dépense.',
      'Journal des PP dépensés dans l’onglet Pouvoirs. Les compteurs PP actuels et max restent modifiables à la main avec − et +.',
    ],
  },
  {
    version: '0.5.3',
    date: '8 novembre 2026',
    points: [
      'Serviteurs : le coût en PP de chaque pouvoir se remplit tout seul, et un compteur « PP actuels » avec − et + permet de suivre leurs PP en partie.',
      'Fiche : « Blessures » devient « PV actuels » et « PV max », dans le bloc « Pouvoir et points de vie ».',
    ],
  },
  {
    version: '0.5.2',
    date: '8 novembre 2026',
    points: [
      'Serviteurs : un ⓘ à côté de chaque pouvoir connu du référentiel affiche sa description.',
      'Serviteurs : la caractéristique associée à chaque talent se remplit toute seule, même pour un talent tapé à la main (les langues comptent en Volonté).',
    ],
  },
  {
    version: '0.5.1',
    date: '8 novembre 2026',
    points: [
      'Le serviteur est créé même avec un ancien référentiel, et « Zombie » au singulier est reconnu. Pour un pouvoir déjà sur la fiche, un bouton « ＋ Créer le serviteur » apparaît.',
      'Serviteurs : le type et le genre se choisissent dans des menus (Rat, Chat, Serpent… pour un animal), avec « Autre » pour une saisie libre. « Possédé » devient « Objet possédé ».',
    ],
  },
  {
    version: '0.5.0',
    date: '8 novembre 2026',
    points: [
      'Texte coupé par « … » : sur PC, passe la souris dessus pour le lire en entier ; sur téléphone ou tablette, fais un appui long.',
      'Un pouvoir qui donne un serviteur (Zombies, Rat, Majordome…) le crée tout seul dans l’onglet Serviteurs, avec ses caractéristiques, talents et pouvoirs. Le nombre (ex. 3d6 zombies) est tiré au hasard.',
      'Serviteurs : en plus du type (Animal, Humain, Mort-vivant…), on indique le genre (Rat, Majordome, Zombie…) et le nombre.',
    ],
  },
  {
    version: '0.4.2',
    date: '8 novembre 2026',
    points: [
      'Pouvoirs propres : un joueur ne peut prendre que celui de son supérieur. Seul le MJ peut en accorder un autre (Table → fiche du joueur → « Accorder un pouvoir propre »).',
      'En changeant de supérieur, le pouvoir propre de l’ancien est remplacé automatiquement par celui du nouveau (niveau et notes conservés).',
    ],
  },
  {
    version: '0.4.1',
    date: '8 novembre 2026',
    points: [
      'Fiche, onglet Identité : une fois le supérieur choisi, le grade se choisit dans la liste des grades qu’il accorde (ou « Aucun grade »).',
    ],
  },
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
