// Contenu du guide utilisateur intégré.
// Mise en forme légère : « ## » sous-titre, « - » puce, « 1. » étape, **gras**, ligne vide = nouveau paragraphe.

export type Public = 'tous' | 'joueur' | 'mj'

export type SectionGuide = {
  id: string
  titre: string
  icone: string
  public: Public
  corps: string
}

export const SECTIONS: SectionGuide[] = [
  {
    id: 'premiers-pas',
    titre: 'Premiers pas',
    icone: '🚀',
    public: 'tous',
    corps: `Nomina rassemble tes personnages d'In Nomine Satanis et de Magna Veritas, la Table de jeu et tes messages secrets. Tout est enregistré **sur ton appareil** : rien n'est envoyé sur internet, à part la courte mise en relation avec la Table.

## Installer l'appli
- **iPhone / iPad** : ouvre le lien dans **Safari**, touche **Partager** (carré avec une flèche) puis **« Sur l'écran d'accueil »**.
- **Android** : dans **Chrome**, menu **⋮** puis **« Installer l'application »**.
- **PC** : dans **Chrome** ou **Edge**, clique sur l'icône d'installation à droite de la barre d'adresse.

Ouvre ensuite toujours Nomina **depuis son icône** : sur iPhone, l'appli installée et Safari ne partagent pas leurs données.

## Ton profil
Au premier lancement, indique ton prénom et ton rôle : **Joueur** ou **Maître du jeu**. Tu peux les changer à tout moment en touchant ton nom en haut de l'écran.

## Se repérer
- En bas : **Accueil, Fiche, Référentiel, Table, Messages**.
- En haut à droite : **?** ouvre ce guide à la bonne page, **⚙️** ouvre les réglages.
- Le logo Nomina en haut à gauche ramène à l'accueil.`,
  },
  {
    id: 'accueil',
    titre: "L'accueil",
    icone: '🏠',
    public: 'tous',
    corps: `L'accueil résume tout ce dont tu as besoin en un coup d'œil.

- **À faire** : n'apparaît que s'il reste quelque chose à faire (mise à jour, référentiel à installer, sauvegarde ancienne, installation de l'appli).
- **Mes personnages** : une carte par personnage. Touche-la pour ouvrir la fiche. **＋ Nouveau** crée un démon ou un ange, pas à pas (voir « Créer un personnage »). Une création commencée se reprend avec **▶ Reprendre la création**.
- Le **personnage actif** a ses **PP** et **PV** réglables avec − / +, et la liste de ses pouvoirs avec leur bouton **⚡** : idéal en pleine partie.
- **La Table** : ton état de connexion et un bouton pour l'ouvrir (MJ) ou la rejoindre (joueur).
- **Messages** : les derniers messages reçus.
- **Nouveautés** : ce qui a changé avec la dernière mise à jour.`,
  },
  {
    id: 'fiche',
    titre: 'La fiche de personnage',
    icone: '📜',
    public: 'tous',
    corps: `La fiche reprend la fiche papier, répartie en cinq onglets. **Tout est enregistré automatiquement** à chaque modification.

## Gérer ses personnages
- Le menu en haut de la fiche choisit le personnage affiché.
- **＋** crée un nouveau démon ou ange : création guidée ou fiche vierge.
- **⋯** permet d'**exporter / partager** le personnage (fichier), d'en **importer** un, de le **dupliquer** ou de le **supprimer**.

## Identité
Camp (démon ou ange), nom de couverture, nom, supérieur, grade, description, caractéristiques, **PP** et **PV** (actuels et maximum), équipement et notes. Une fois le supérieur choisi, le **grade** se choisit parmi ceux qu'il accorde.

## Talents
Tous les talents sont listés par catégorie : choisis simplement le **niveau** dans le petit menu.
- La colonne **Moyen** donne le seuil à faire au d666 pour une action de difficulté moyenne.
- Sans niveau, c'est la caractéristique qui sert, en **très difficile (TD)** avec le malus du talent ; « raté » signifie que l'action est impossible.
- Touche un talent pour voir sa colonne surlignée dans la table de potentiel.
- **＋ Ajouter** permet d'ajouter une langue, une spécialisation ou un talent libre.

## Pouvoirs
- **＋ Depuis le référentiel** : liste avec recherche ; le pouvoir arrive tout rempli. **＋ Libre** : un nom tapé à la main se complète tout seul s'il existe dans le référentiel.
- L'étiquette **privilégié** signale les pouvoirs favoris de ton supérieur.
- **Pouvoirs propres** : un joueur ne peut prendre que celui de son supérieur. Si tu changes de supérieur, il est remplacé automatiquement (niveau conservé). Le MJ peut en accorder un autre.
- **⚡ Utiliser** : dépense les PP du pouvoir (voir « Dépenser des PP »).
- Les **limitations** se gèrent en bas de l'onglet.

## Prince / Archange
Choix du supérieur (avec recherche). La **possibilité d'intervention** et la **récupération des PP** se remplissent toutes seules. Ajoute tes **pouvoirs de grade** d'un clic, ainsi que l'arme et l'objet magiques.

## Serviteurs
- Un pouvoir qui donne un serviteur (Zombies, Rat, Majordome…) **le crée automatiquement** avec son profil ; le nombre (3d6 zombies…) est tiré au hasard. Pour un pouvoir déjà présent, utilise **＋ Créer le serviteur** sur sa ligne.
- **Type** et **genre** se choisissent dans des menus, avec « Autre » pour une saisie libre.
- La caractéristique des talents et le coût en PP des pouvoirs se remplissent seuls ; **ⓘ** décrit chaque pouvoir.
- Chaque serviteur a son compteur **PP actuels** et ses boutons **⚡**.`,
  },
  {
    id: 'creation',
    titre: 'Créer un personnage',
    icone: '🧭',
    public: 'tous',
    corps: `À l'accueil, **＋ Nouveau** → **Création guidée**, puis 😈 Démon ou 😇 Ange. L'assistant suit les règles de ton MJ (par défaut, celles de la 3e édition). Tu peux fermer à tout moment : la création est gardée.

1. **Identité** : nom véritable et nom de couverture.
2. **Supérieur** : ton Prince-Démon ou ton Archange, avec son rôle et ses pouvoirs privilégiés.
3. **Caractéristiques** : répartis tes points (18 pour un démon, 20 pour un ange, de 1 à 5 chacune). Le compteur indique ce qu'il reste. Tes PP valent Volonté + 4.
4. **Talents** : choisis un niveau (niveau 1 = 1 point, 2 = 2, 3 = 4, 4 = 8). Un talent ne dépasse jamais sa caractéristique associée. 12 points pour un démon, 8 pour un ange.
5. **Pouvoirs** : choisis d'abord 1 pouvoir parmi les 6 privilégiés de ton supérieur, puis **🎲 lance 1d6** pour un deuxième, et **deux d666** dans la table générale. Un pouvoir déjà obtenu est relancé automatiquement.
6. **Limitation** : **🎲 lance 1d66**.
7. **Récapitulatif** : vérifie, puis **✨ Créer le personnage**.

## Bon à savoir
- Les **serviteurs** donnés par un pouvoir sont créés automatiquement.
- Les **tirages** sont recopiés dans les notes de la fiche, que ton MJ reçoit.
- Tout reste modifiable ensuite sur la fiche ; langues et spécialisations s'y ajoutent.
- Si ton MJ l'a décidé, les pouvoirs et la limitation se **choisissent** au lieu d'être tirés, ou les points sont différents.
- **Fiche vierge** : pour recopier un personnage existant sans assistant.`,
  },
  {
    id: 'pp',
    titre: 'Dépenser des PP',
    icone: '⚡',
    public: 'tous',
    corps: `Le bouton **⚡** affiché sur un pouvoir indique son coût. Un toucher retire les PP du personnage (ou du serviteur).

- **Coût fixe** (⚡ 3) : retrait immédiat.
- **Par durée** (⚡ 1/s, 1/min) ou **par cible** : une fenêtre demande la durée ou le nombre de cibles et affiche le total.
- **Tous les PP** : confirmation, puis les PP tombent à 0.
- **Coût variable** (⚡ ?) : indique toi-même le nombre de PP.

## Sécurités
- Impossible de descendre **sous 0 PP** : le bouton devient rouge et inactif. Le MJ peut passer outre sur ses propres personnages.
- Pendant **8 secondes** après une dépense, un bandeau propose **Annuler**.
- Le **journal des PP** (onglet Pouvoirs) garde l'historique de la séance.

Les compteurs **PP actuels** et **PP max** restent toujours modifiables à la main avec − et +, par exemple quand le MJ t'accorde des PP.`,
  },
  {
    id: 'referentiel',
    titre: 'Le référentiel',
    icone: '📚',
    public: 'tous',
    corps: `Le référentiel contient les princes et archanges, les pouvoirs, les talents, les limitations et la table de potentiel. Il **n'est pas inclus dans l'appli** : le MJ te l'envoie automatiquement quand tu rejoins sa Table (accepte avec **Installer**), ou tu l'importes depuis un fichier (⚙️ → Référentiel).

- Choisis **Démons** ou **Anges**, puis l'onglet voulu.
- La **recherche** fonctionne sur les noms et les descriptions (et le nom du prince pour ses pouvoirs propres).
- Touche un élément pour l'ouvrir. **ⓘ** affiche les mêmes informations depuis la fiche.
- Les descriptions sont des **résumés** : la page du livre est indiquée pour le texte complet.
- **⚑ Signaler une erreur** : note ce qui te semble faux. Tes signalements se retrouvent dans ⚙️ → Signalements.
- **Règles maison** : celles que ton MJ a publiées apparaissent en tête de l'onglet **Règles**. Elles remplacent le livre sur les points concernés.`,
  },
  {
    id: 'table',
    titre: 'La Table de jeu',
    icone: '🕯️',
    public: 'tous',
    corps: `La Table relie les appareils des joueurs et du MJ, directement entre eux.

## Pour le MJ
1. Onglet **Table** → **Ouvrir une nouvelle table**.
2. Montre le **QR « Rejoindre »** aux joueurs. Le **QR « Installer »** permet à un nouveau joueur d'installer l'appli avec l'appareil photo de son téléphone.

## Pour les joueurs
1. Onglet **Table** → **📷 Scanner le QR code**, puis vise le QR du MJ. Utilise bien ce bouton (pas l'appareil photo du téléphone).
2. Sans caméra : **« Saisir le code à la main »** avec le code et la clé affichés sous le QR du MJ (« Saisie manuelle »).

## Ce qui s'échange tout seul
- Ta **fiche** (le personnage affiché) part chez le MJ dès que vous êtes connectés, puis à nouveau quelques secondes après chaque modification.
- Le **référentiel** du MJ t'est proposé si le tien est différent.
- L'appli se **reconnecte** toute seule à la dernière table à l'ouverture.

## Conseils
- Tout le monde sur le **même Wi-Fi** ; à défaut, un partage de connexion depuis un téléphone.
- La mise en relation a besoin d'internet quelques secondes (Wi-Fi ou 4G).
- En cas de souci : ⚙️ → **Diagnostic de connexion**.`,
  },
  {
    id: 'jets',
    titre: 'Les jets secrets',
    icone: '🎲',
    public: 'tous',
    corps: `Les dés physiques servent pour tout, **sauf les jets secrets** : ceux dont seul le MJ doit connaître le résultat.

## Pour le joueur
1. Touche **🎲** en haut de la fiche, ou **🎲 Jet secret** sur la carte du personnage à l'accueil.
2. Choisis le **talent** ou la **caractéristique** testé (les talents que tu n'as pas sont aussi proposés, en très difficile), et ajoute si besoin une précision pour le MJ.
3. **Envoyer au MJ** : les dés sont lancés **sur l'appareil du MJ**. Tu vois seulement « ✓ Le MJ a reçu ta demande ». Les autres joueurs ne savent même pas qu'un jet a eu lieu.

Le MJ doit être connecté à la Table.

## Pour le MJ
- Une demande de joueur ouvre aussitôt une fenêtre avec les **trois dés**, le **résultat** (les deux premiers), le **RU** (le troisième), le seuil et le verdict **Réussite / Échec**. Les **111** et **666** sont signalés.
- La difficulté et le décalage en colonnes restent **modifiables** : le verdict se recalcule tout seul.
- **Jet à l'insu d'un joueur** : Table → Fiches reçues → ouvre la fiche → **🎲 Jet secret**.
- **🎲 Jet libre** (Table → Jets secrets) : pour un PNJ ou toute autre valeur de 1 à 6.
- Le **journal des jets** (onglet Table) garde les 200 derniers ; touche une ligne pour revoir un jet.`,
  },
  {
    id: 'messages',
    titre: 'Les messages',
    icone: '✉️',
    public: 'tous',
    corps: `Les messages vont **directement** aux appareils des destinataires : personne d'autre ne les reçoit, pas même le MJ.

- **Conversation à deux** : touche une personne de la liste (elle apparaît dès que vous avez été connectés à la même table).
- **Groupe** : **＋ 👥 Groupe**, donne un nom et coche les membres. Un groupe sans le MJ lui reste totalement invisible.
- Sous tes messages : ⏳ en attente, ✓ reçu par une partie, ✓✓ reçu (par tous).
- Un destinataire hors ligne reçoit le message quand vous êtes de nouveau connectés en même temps.
- **Supprimer** : touche un message puis « Supprimer », ou ⋯ en haut d'une conversation. La suppression ne vaut **que pour ton appareil**.`,
  },
  {
    id: 'reglages',
    titre: 'Réglages et sauvegardes',
    icone: '⚙️',
    public: 'tous',
    corps: `- **Sauvegardes** : « Sauvegarder tous mes personnages » crée un fichier à garder en lieu sûr (sur téléphone, le menu de partage s'ouvre). Fais-le régulièrement : si l'appli est supprimée, ses données le sont aussi. **Restaurer / importer** relit un fichier.
- **Référentiel** : version installée, installer un autre fichier, et pour le MJ partager le fichier.
- **Signalements** : tes remarques sur le référentiel, à copier pour les transmettre.
- **Rechercher une mise à jour** : vérifie la présence d'une nouvelle version (elle est aussi vérifiée toute seule).
- **Diagnostic** : état de la connexion et journal, avec « Copier le rapport » en cas de problème.`,
  },
  {
    id: 'mj',
    titre: 'Spécial MJ',
    icone: '🎭',
    public: 'mj',
    corps: `## Les fiches de tes joueurs
Onglet **Table** → **Fiches reçues** : chaque fiche arrive automatiquement quand le joueur se connecte, et sa version la plus récente est gardée sur ton appareil.

## Accorder un pouvoir propre
Dans la fiche reçue d'un joueur connecté : **✨ Accorder un pouvoir propre d'un autre supérieur**. Le joueur reçoit une annonce, le pouvoir s'ajoute à sa fiche avec l'étiquette « accordé par le MJ ».

## Le référentiel
- Il est envoyé automatiquement à chaque joueur qui rejoint la table ; **Renvoyer le référentiel** après une mise à jour.
- ⚙️ → **Partager le fichier du référentiel** pour l'envoyer autrement (message, e-mail…).

## Tes propres personnages
Sur tes personnages, tu peux choisir n'importe quel pouvoir propre et dépasser 0 PP après confirmation.

## Jets secrets
Voir la section « Les jets secrets » : les demandes des joueurs s'ouvrent toutes seules chez toi, et tu peux lancer un jet à l'insu d'un joueur depuis sa fiche reçue.

## À venir
Création guidée selon tes règles, validation des fiches.`,
  },
  {
    id: 'espace-mj',
    titre: "L'espace MJ",
    icone: '🔒',
    public: 'mj',
    corps: `L'onglet **MJ** (visible seulement avec le rôle Maître du jeu) rassemble tes secrets de campagne. Tout y est **chiffré** avec ta phrase de passe : sans elle, les données sont illisibles, même pour quelqu'un qui aurait ton appareil.

## Créer l'espace
1. Onglet **MJ** → **Créer mon espace MJ**.
2. Nomina propose une **phrase de passe** facile à retenir (4 mots et un nombre). **🔄 Une autre** en tire une nouvelle, **Choisir la mienne** permet d'en taper une (12 caractères minimum).
3. **Note-la** (papier ou gestionnaire de mots de passe), coche la case, puis valide.

**Important** : une phrase oubliée ne peut pas être retrouvée. Exporte régulièrement ta campagne (onglet 🔑).

## Ce que tu y ranges
- **Campagne** : nom, notes de scénario, aides de jeu.
- **Séances** : le journal de chaque partie, daté.
- **PNJ** : humains, démons, anges, serviteurs… avec caractéristiques, PP et PV réglables en partie, talents, pouvoirs et notes. **📑 Dupliquer** pour créer vite une bande de sbires, **♻️** pour remettre PP et PV au maximum.
- **Règles** : tes règles maison. Coche **Visible des joueurs** puis touche **Publier** : elles leur sont envoyées, et renvoyées à chaque connexion à ta Table. Les autres restent secrètes.
- **Création des personnages** (même onglet) : points de caractéristiques et de talents, limites, nombre de pouvoirs, tirage aux dés ou choix libre, et contrôle **Strict** (bloque), **Conseil** (avertit) ou **Libre**. **↺ Revenir à la 3e édition** remet les règles du livre. Elles partent avec **Publier**.

## Verrouillage
- **🔒 Verrouiller** ferme l'espace ; il faudra la phrase pour le rouvrir.
- Il se verrouille aussi tout seul quand l'appli reste plus de **10 minutes** en arrière-plan.
- Tout est enregistré (chiffré) automatiquement à chaque modification.

## Changer de phrase ou passer la main
- Onglet **🔑** → **Changer la phrase de passe** : tout est rechiffré, l'ancienne ne marche plus sur cet appareil.
- **Passation** : exporte la campagne (le fichier reste chiffré), envoie-le au nouveau MJ et donne-lui la phrase de vive voix. Il l'ouvre avec **Reprendre une campagne**, puis Nomina lui fait choisir **sa propre** phrase. L'ancien MJ garde ce qu'il avait déjà, mais ne peut pas lire ce qui sera ajouté ensuite.`,
  },
  {
    id: 'astuces',
    titre: 'Astuces',
    icone: '💡',
    public: 'tous',
    corps: `- **Texte coupé par « … »** : sur PC, passe la souris dessus ; sur téléphone ou tablette, fais un **appui long** pour le lire en entier.
- **Suggestions de saisie** : en tapant un nom de pouvoir, de talent ou de limitation, l'appli propose ceux du référentiel.
- **Recherche** : dans les listes, plusieurs mots peuvent être tapés, accents et majuscules sont ignorés.
- **Infobulles ⓘ** : présentes sur les talents, les pouvoirs et les limitations du référentiel.`,
  },
]

export const FAQ: { q: string; r: string }[] = [
  { q: "L'appli ne trouve pas la Table du MJ.", r: "Vérifie que tout le monde a internet et est sur le même Wi-Fi, puis réessaie. Si ça bloque encore, le MJ peut ouvrir une nouvelle table avec un autre type de relais (MQTT ou BitTorrent), et ⚙️ → Diagnostic donne des indices." },
  { q: 'Le scanner de QR code ne s’ouvre pas.', r: "Autorise la caméra pour Nomina dans les réglages du téléphone, ou utilise « Saisir le code à la main » avec le code et la clé affichés sous le QR du MJ." },
  { q: 'Je ne reçois pas le référentiel du MJ.', r: "Il arrive tout seul quelques secondes après la connexion à la Table ; s'il tarde, l'appli le redemande d'elle-même. Tu peux aussi toucher « 📥 Demander le référentiel au MJ » (onglet Table ou accueil). Si tu avais fermé la fenêtre, le bouton « Installer » t'attend dans « À faire » à l'accueil. En dernier recours, le MJ peut t'envoyer le fichier (⚙️ → Partager le fichier du référentiel)." },
  { q: 'Je ne vois ni princes, ni pouvoirs, ni listes.', r: "Le référentiel n'est pas installé : rejoins la Table de ton MJ (il te sera proposé) ou importe le fichier dans ⚙️ → Référentiel." },
  { q: 'Mes personnages ont disparu.', r: "Vérifie que tu ouvres bien Nomina depuis son icône (et pas depuis le navigateur). Sinon, restaure ta dernière sauvegarde dans ⚙️ → Sauvegardes." },
  { q: 'Comment changer d’appareil ?', r: "Sur l'ancien : ⚙️ → « Sauvegarder tous mes personnages ». Sur le nouveau : installe Nomina puis ⚙️ → « Restaurer / importer un fichier »." },
  { q: 'La mise à jour ne se fait pas.', r: "Touche « Mettre à jour » dans le bandeau, ou ⚙️ → « Rechercher une mise à jour ». Au besoin, ferme complètement l'appli et rouvre-la." },
  { q: 'Un serviteur ne s’est pas créé.', r: "Dans l'onglet Pouvoirs, la ligne du pouvoir affiche « ＋ Créer le serviteur » : touche-le." },
  { q: 'J’ai dépensé des PP par erreur.', r: "Touche « Annuler » dans le bandeau qui reste 8 secondes. Passé ce délai, corrige le compteur PP actuels avec +." },
  { q: 'Le MJ peut-il lire mes messages ?', r: "Non : un message ne va qu'aux appareils de ses destinataires. Un groupe sans le MJ lui est invisible." },
  { q: 'J’ai oublié la phrase de passe de l’espace MJ.', r: "Elle ne peut pas être retrouvée : c'est ce qui protège tes secrets. Si tu as exporté la campagne, réimporte le fichier avec la phrase qui allait avec. Sinon, « Phrase oubliée ? » permet d'effacer l'espace MJ pour en recréer un vide." },
  { q: 'Comment transmettre ma campagne à un autre MJ ?', r: "Onglet MJ → 🔑 → « Exporter la campagne ». Envoie le fichier, donne la phrase de passe de vive voix ; le nouveau MJ l'ouvre avec « Reprendre une campagne » et choisit sa propre phrase." },
  { q: 'Une information du référentiel est fausse.', r: "Ouvre l'élément dans le Référentiel et touche « ⚑ Signaler une erreur » ; envoie ensuite tes signalements depuis ⚙️ → Signalements." },
]

export const GLOSSAIRE: { terme: string; def: string }[] = [
  { terme: 'PP', def: 'Points de pouvoir : ce que coûte l’utilisation des pouvoirs.' },
  { terme: 'PV', def: 'Points de vie du personnage.' },
  { terme: 'd666', def: 'Trois dés à six faces : les deux premiers forment le résultat (de 11 à 66), le troisième donne les unités (RU).' },
  { terme: 'RU', def: 'Résultat des unités : le troisième dé du d666, qui mesure la qualité d’une réussite ou la durée d’un effet.' },
  { terme: 'Table de potentiel (table UM)', def: 'Tableau qui donne le seuil à atteindre selon la valeur utilisée (colonne) et la difficulté (ligne).' },
  { terme: 'Colonne de malus / bonus', def: 'Décalage dans la table de potentiel : vers la gauche c’est plus dur, vers la droite plus facile.' },
  { terme: 'Supérieur', def: 'Le Prince-Démon ou l’Archange que sert le personnage.' },
  { terme: 'Grade', def: 'Rang accordé par le supérieur (chevalier, capitaine, baron), qui donne un pouvoir de grade.' },
  { terme: 'Pouvoir privilégié', def: 'Pouvoir favori d’un supérieur (sa table de 1d6).' },
  { terme: 'Pouvoir propre', def: 'Pouvoir unique d’un supérieur, réservé à ses serviteurs sauf accord du MJ.' },
  { terme: 'Limitation', def: 'Défaut ou contrainte du personnage (phobie, besoin, marque physique…).' },
  { terme: 'Serviteur', def: 'Créature au service du personnage : animal, humain, mort-vivant ou objet possédé.' },
  { terme: 'Table', def: 'La partie en cours qui relie les appareils du MJ et des joueurs.' },
  { terme: 'Référentiel', def: 'Le fichier qui contient tout le contenu de jeu (supérieurs, pouvoirs, talents…).' },
  { terme: 'MJ', def: 'Maître du jeu.' },
  { terme: 'Jet secret', def: 'Jet dont seul le MJ connaît le résultat ; les dés sont lancés sur son appareil.' },
  { terme: '111 / 666', def: 'Triples 1 ou triples 6 au d666 : interventions divine ou diabolique, signalées dans les jets secrets.' },
  { terme: 'PNJ', def: 'Personnage non joueur, joué par le MJ.' },
  { terme: 'Phrase de passe', def: 'Mot de passe fait de plusieurs mots, plus facile à retenir et plus solide qu’un mot de passe court.' },
  { terme: 'Chiffrement', def: 'Transformation des données en charabia illisible sans la bonne phrase de passe.' },
  { terme: 'Passation', def: 'Transmission de la campagne d’un MJ à un autre, avec changement de phrase de passe.' },
  { terme: 'Règles maison', def: 'Règles propres à votre table, choisies par le MJ, qui remplacent celles du livre.' },
]

export { SECTION_PAR_ECRAN } from './ecrans'
