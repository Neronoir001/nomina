import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { initInstallCapture } from './lib/install'
import { resumeIfNeeded } from './lib/p2p'

initInstallCapture()

// Demande au système de ne pas effacer les données de l'appli (accepté d'office pour une appli installée).
void navigator.storage?.persist?.().catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Si l'appareil était à une table lors de la dernière utilisation, on s'y reconnecte.
resumeIfNeeded()
