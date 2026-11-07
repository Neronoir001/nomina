// Aide à l'installation de l'appli sur l'écran d'accueil.
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function initInstallCapture(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export function onInstallChange(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function canPromptInstall(): boolean {
  return deferred !== null
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  deferred = null
  listeners.forEach((l) => l())
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent)
}
