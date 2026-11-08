// Textes coupés : infobulle au survol de la souris (PC), appui long pour tout lire (tablette, téléphone).

const CIBLES = 'input:not([type=checkbox]):not([type=radio]):not([type=file]), select, .tronque'

function texteDe(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) return el.value
  if (el instanceof HTMLSelectElement) return el.selectedOptions[0]?.text ?? ''
  return el.dataset.plein ?? el.innerText ?? ''
}

function deborde(el: HTMLElement): boolean {
  if (el instanceof HTMLSelectElement) return texteDe(el).length > 22
  return el.scrollWidth > el.clientWidth + 1
}

function cible(t: EventTarget | null): HTMLElement | null {
  return t instanceof Element ? (t.closest(CIBLES) as HTMLElement | null) : null
}

// ───────── PC : infobulle native au survol, seulement si le texte est coupé ─────────
function survol(e: PointerEvent): void {
  if (e.pointerType !== 'mouse') return
  const el = cible(e.target)
  if (!el) return
  if (el.title && !el.dataset.titreAuto) return // infobulle déjà prévue par l'appli
  const t = texteDe(el).trim()
  if (t && deborde(el)) {
    el.title = t
    el.dataset.titreAuto = '1'
  } else if (el.dataset.titreAuto) {
    el.removeAttribute('title')
    delete el.dataset.titreAuto
  }
}

// ───────── Tactile : appui long = fenêtre avec le texte complet ─────────
let minuteur: number | undefined
let depart: { x: number; y: number } | null = null
let ignorerClic = false

function afficherBulle(texte: string): void {
  document.querySelector('.bulle-texte')?.remove()
  const fond = document.createElement('div')
  fond.className = 'bulle-texte'
  fond.setAttribute('role', 'dialog')
  fond.setAttribute('aria-label', 'Texte complet')
  const boite = document.createElement('div')
  boite.className = 'bulle-texte-boite'
  const p = document.createElement('p')
  p.textContent = texte
  const b = document.createElement('button')
  b.className = 'btn'
  b.textContent = 'Fermer'
  boite.append(p, b)
  fond.append(boite)
  fond.addEventListener('click', () => fond.remove())
  document.body.append(fond)
}

function appuiDebut(e: PointerEvent): void {
  if (e.pointerType === 'mouse') return
  const el = cible(e.target)
  if (!el || el === document.activeElement) return // champ en cours de saisie : on le laisse faire
  depart = { x: e.clientX, y: e.clientY }
  window.clearTimeout(minuteur)
  minuteur = window.setTimeout(() => {
    const t = texteDe(el).trim()
    if (!t || !deborde(el)) return
    ignorerClic = true
    window.setTimeout(() => (ignorerClic = false), 800)
    navigator.vibrate?.(20)
    afficherBulle(t)
  }, 550)
}

function appuiFin(): void {
  window.clearTimeout(minuteur)
  depart = null
}

function appuiBouge(e: PointerEvent): void {
  if (depart && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 10) appuiFin()
}

export function installerInfobulles(): void {
  document.addEventListener('pointerover', survol, true)
  document.addEventListener('pointerdown', appuiDebut, true)
  document.addEventListener('pointerup', appuiFin, true)
  document.addEventListener('pointercancel', appuiFin, true)
  document.addEventListener('pointermove', appuiBouge, true)
  // Après un appui long, on n'ouvre ni le menu contextuel ni l'action du bouton
  document.addEventListener('contextmenu', (e) => ignorerClic && e.preventDefault(), true)
  document.addEventListener(
    'click',
    (e) => {
      if (ignorerClic && !(e.target instanceof Element && e.target.closest('.bulle-texte'))) {
        e.preventDefault()
        e.stopPropagation()
        ignorerClic = false
      }
    },
    true,
  )
}
