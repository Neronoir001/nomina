import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './styles-fiche.css'
import { initInstallCapture } from './lib/install'
import { resumeIfNeeded } from './lib/p2p'
import { flush, initStore } from './lib/store'

initInstallCapture()

// Demande au système de ne pas effacer les données de l'appli (accepté d'office pour une appli installée).
void navigator.storage?.persist?.().catch(() => undefined)

// Enregistre les dernières modifications quand l'appli passe en arrière-plan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush()
})
window.addEventListener('pagehide', flush)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

void initStore().then(() => {
  // Si l'appareil était à une table lors de la dernière utilisation, on s'y reconnecte.
  resumeIfNeeded()
})
