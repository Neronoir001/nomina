import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { GardeErreur } from './Erreurs'
import './styles.css'
import './styles-fiche.css'
import './styles-mobile.css'
import { installerClavier } from './lib/clavier'
import { initInstallCapture } from './lib/install'
import { installerInfobulles } from './lib/infobulles'
import { resumeIfNeeded } from './lib/p2p'
import { flush, initStore, log } from './lib/store'

initInstallCapture()
installerInfobulles()
installerClavier()

// Demande au système de ne pas effacer les données de l'appli (accepté d'office pour une appli installée).
void navigator.storage?.persist?.().catch(() => undefined)

// Enregistre les dernières modifications quand l'appli passe en arrière-plan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush()
})
window.addEventListener('pagehide', flush)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GardeErreur>
      <App />
    </GardeErreur>
  </StrictMode>,
)

// Toute erreur imprévue est notée dans le journal (visible dans Diagnostic).
window.addEventListener('error', (e) => log(`Erreur : ${e.message}`, 'erreur'))
window.addEventListener('unhandledrejection', (e) => log(`Erreur : ${String(e.reason)}`, 'erreur'))

void initStore().then(() => {
  // Si l'appareil était à une table lors de la dernière utilisation, on s'y reconnecte.
  resumeIfNeeded()
})
