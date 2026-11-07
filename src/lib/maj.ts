// Détection des mises à jour de l'appli (service worker).
let reg: ServiceWorkerRegistration | undefined
let surveillanceLancee = false

const INTERVALLE = 15 * 60 * 1000 // vérifie toutes les 15 minutes tant que l'appli est ouverte

function verifierEnSilence(): void {
  reg?.update().catch(() => undefined)
}

/** Appelé une fois le service worker enregistré : lance les vérifications automatiques. */
export function surveillerMisesAJour(r: ServiceWorkerRegistration): void {
  reg = r
  if (surveillanceLancee) return
  surveillanceLancee = true
  window.setInterval(verifierEnSilence, INTERVALLE)
  // À chaque retour sur l'appli (téléphone déverrouillé, fenêtre réaffichée…)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') verifierEnSilence()
  })
  window.addEventListener('online', verifierEnSilence)
}

// ───────── État « mise à jour disponible », partagé entre le bandeau et l'accueil ─────────
let dispo = false
let appliquerFn: (() => void) | null = null
const ecouteurs = new Set<() => void>()

export function signalerMaj(disponible: boolean, appliquer: () => void): void {
  appliquerFn = appliquer
  if (dispo !== disponible) {
    dispo = disponible
    ecouteurs.forEach((l) => l())
  }
}

export function majDisponible(): boolean {
  return dispo
}

export function ecouterMaj(l: () => void): () => void {
  ecouteurs.add(l)
  return () => ecouteurs.delete(l)
}

export function appliquerMaj(): void {
  appliquerFn?.()
}

/** Vérification demandée par l'utilisateur. */
export async function verifierMaj(): Promise<'maj' | 'a-jour' | 'hors-ligne' | 'indisponible'> {
  if (!navigator.onLine) return 'hors-ligne'
  if (!reg) return 'indisponible'
  try {
    await reg.update()
  } catch {
    return 'hors-ligne'
  }
  return reg.waiting || reg.installing ? 'maj' : 'a-jour'
}
