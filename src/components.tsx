import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import QRCode from 'qrcode'
import QrScanner from 'qr-scanner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { parseJoin } from './lib/codes'
import { canPromptInstall, isAndroid, isIOS, isStandalone, onInstallChange, promptInstall } from './lib/install'
import { surveillerMisesAJour } from './lib/maj'
import type { Status } from './lib/store'
import type { TableInfo } from './lib/types'

// ───────── QR code affiché ─────────
export function QrImage({ text, label }: { text: string; label: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(text, { margin: 1, width: 640, errorCorrectionLevel: 'M', color: { dark: '#141012', light: '#ffffff' } })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''))
    return () => {
      alive = false
    }
  }, [text])
  return (
    <figure className="qr">
      {src ? <img src={src} alt={label} /> : <div className="qr-placeholder">…</div>}
      <figcaption>{label}</figcaption>
    </figure>
  )
}

// ───────── Lecteur de QR code ─────────
export function QrScanModal({ onResult, onClose }: { onResult: (t: TableInfo) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cb = useRef(onResult)
  cb.current = onResult
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let done = false
    const scanner = new QrScanner(
      v,
      (res) => {
        if (done) return
        const info = parseJoin(res.data)
        if (info) {
          done = true
          cb.current(info)
        } else {
          setErr("Ce QR code n'est pas une table Nomina.")
        }
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, preferredCamera: 'environment' },
    )
    scanner.start().catch((e: unknown) => {
      const msg = String(e)
      setErr(
        /NotAllowed|Permission|denied/i.test(msg)
          ? "L'accès à la caméra a été refusé. Autorise la caméra pour Nomina dans les réglages, ou saisis le code à la main."
          : "Impossible d'ouvrir la caméra sur cet appareil. Saisis le code de la table à la main.",
      )
    })
    return () => {
      scanner.stop()
      scanner.destroy()
    }
  }, [])

  return (
    <div className="modal" role="dialog" aria-label="Scanner le QR code de la table">
      <div className="modal-box">
        <h2>Scanner le QR code</h2>
        <p className="muted">Vise le QR code « Rejoindre » affiché sur l'appareil du MJ.</p>
        <div className="scan-zone">
          <video ref={videoRef} playsInline muted />
        </div>
        {err && <p className="alert">{err}</p>}
        <button className="btn" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  )
}

// ───────── Bandeau d'installation ─────────
export function InstallBanner() {
  const canPrompt = useSyncExternalStore(onInstallChange, canPromptInstall, canPromptInstall)
  const [hidden, setHidden] = useState(false)
  if (hidden || isStandalone()) return null
  return (
    <div className="banner">
      <strong>Installe Nomina sur cet appareil</strong>
      {canPrompt ? (
        <p>
          <button className="btn btn-primary" onClick={() => void promptInstall()}>
            Installer l'appli
          </button>
        </p>
      ) : isIOS() ? (
        <p>
          Dans <b>Safari</b>, touche le bouton <b>Partager</b> (carré avec une flèche), puis <b>« Sur l'écran d'accueil »</b>.
          Ensuite, ouvre toujours Nomina depuis son icône.
        </p>
      ) : isAndroid() ? (
        <p>
          Dans <b>Chrome</b>, ouvre le menu <b>⋮</b> puis <b>« Installer l'application »</b> (ou « Ajouter à l'écran d'accueil »).
        </p>
      ) : (
        <p>
          Dans <b>Chrome</b> ou <b>Edge</b>, clique sur l'icône d'installation à droite de la barre d'adresse.
        </p>
      )}
      <button className="link" onClick={() => setHidden(true)}>
        Plus tard
      </button>
    </div>
  )
}

// ───────── Mise à jour disponible ─────────
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, r) => {
      if (r) surveillerMisesAJour(r)
    },
  })
  useEffect(() => {
    if (!offlineReady) return
    const t = window.setTimeout(() => setOfflineReady(false), 5000)
    return () => window.clearTimeout(t)
  }, [offlineReady, setOfflineReady])
  if (needRefresh) {
    return (
      <div className="toast">
        <span>Nouvelle version de Nomina disponible.</span>
        <button
          className="btn btn-primary"
          onClick={() => {
            void updateServiceWorker(true)
            // Filet de sécurité : si la page n'a pas été rechargée automatiquement, on la recharge.
            window.setTimeout(() => location.reload(), 2500)
          }}
        >
          Mettre à jour
        </button>
        <button className="link" onClick={() => setNeedRefresh(false)}>
          Plus tard
        </button>
      </div>
    )
  }
  if (offlineReady) {
    return (
      <div className="toast">
        <span>Nomina est prête à fonctionner hors ligne.</span>
        <button className="link" onClick={() => setOfflineReady(false)}>
          OK
        </button>
      </div>
    )
  }
  return null
}

// ───────── Pastille d'état de connexion ─────────
export function StatusPill({ status, peers }: { status: Status; peers: number }) {
  const txt =
    status === 'connecte'
      ? peers > 0
        ? `${peers} appareil${peers > 1 ? 's' : ''}`
        : 'En attente'
      : status === 'connexion'
        ? 'Connexion…'
        : status === 'erreur'
          ? 'Erreur'
          : 'Hors table'
  return <span className={`pill pill-${status}${status === 'connecte' && peers > 0 ? ' pill-live' : ''}`}>{txt}</span>
}
