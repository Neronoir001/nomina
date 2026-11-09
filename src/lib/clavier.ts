// Téléphone et tablette : quand le clavier s'ouvre (saisie dans un champ texte), on ajoute la classe
// « clavier-ouvert » sur <body> pour masquer la barre d'onglets, qui sinon remonte au-dessus du clavier
// et cache le champ en cours de saisie.

const TYPES_SANS_CLAVIER = new Set(['checkbox', 'radio', 'range', 'file', 'button', 'submit', 'color'])

function ouvreUnClavier(el: EventTarget | null): boolean {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly
  if (el instanceof HTMLInputElement) return !el.readOnly && !TYPES_SANS_CLAVIER.has(el.type)
  return el instanceof HTMLElement && el.isContentEditable
}

export function installerClavier(): void {
  if (!window.matchMedia?.('(pointer: coarse)').matches) return
  let minuteur: number | undefined
  const maj = () => {
    window.clearTimeout(minuteur)
    // Petit délai : passer d'un champ à l'autre ne doit pas faire clignoter la barre.
    minuteur = window.setTimeout(() => {
      document.body.classList.toggle('clavier-ouvert', ouvreUnClavier(document.activeElement))
    }, 80)
  }
  document.addEventListener('focusin', (e) => {
    // Touche « Rechercher » du clavier sur les champs de recherche.
    if (e.target instanceof HTMLInputElement && e.target.type === 'search' && !e.target.enterKeyHint) e.target.enterKeyHint = 'search'
    maj()
  })
  document.addEventListener('focusout', maj)

  // Le champ actif reste visible au-dessus du clavier (certains navigateurs ne le font pas seuls).
  window.visualViewport?.addEventListener('resize', () => {
    const el = document.activeElement
    if (ouvreUnClavier(el) && el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' })
  })
}
