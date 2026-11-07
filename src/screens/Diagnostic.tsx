import { useEffect, useState } from 'react'
import { isStandalone } from '../lib/install'
import { probePeers, roleLabel } from '../lib/p2p'
import { heure, useStore } from '../lib/store'
import { RELAYS } from '../lib/types'

type StorageInfo = { persisted: boolean | null; usage: number | null; quota: number | null }

export default function Diagnostic() {
  const s = useStore()
  const [online, setOnline] = useState(navigator.onLine)
  const [storage, setStorage] = useState<StorageInfo>({ persisted: null, usage: null, quota: null })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const up = () => setOnline(navigator.onLine)
    window.addEventListener('online', up)
    window.addEventListener('offline', up)
    void readStorage().then(setStorage)
    void probePeers()
    const t = window.setInterval(() => void probePeers(), 3000)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', up)
      window.clearInterval(t)
    }
  }, [])

  const peers = Object.values(s.peers)
  const rows: [string, string][] = [
    ['Version', `${__APP_VERSION__} (${new Date(__BUILD_DATE__).toLocaleString('fr-FR')})`],
    ['Mode', isStandalone() ? 'Appli installée ✅' : 'Navigateur (pas installée)'],
    ['Appareil', shortUA()],
    ['Internet', online ? 'Oui' : 'Non'],
    ['WebRTC', typeof RTCPeerConnection !== 'undefined' ? 'Disponible ✅' : 'Indisponible ❌'],
    ['Caméra', typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'Accessible' : 'Indisponible'],
    [
      'Stockage protégé',
      storage.persisted === null ? 'Inconnu' : storage.persisted ? 'Oui ✅' : 'Non (peut être effacé par le système)',
    ],
    ['Espace utilisé', storage.usage === null ? 'Inconnu' : `${(storage.usage / 1024).toFixed(0)} Ko`],
    ['Table', s.table ? `${s.table.id} (${RELAYS[s.table.relay]})` : 'Aucune'],
    ['État', { deconnecte: 'Hors table', connexion: 'Connexion en cours', connecte: 'À la table', erreur: 'Erreur' }[s.status]],
    ['Relais joints', s.relaysTotal ? `${s.relaysOpen} sur ${s.relaysTotal}` : '—'],
  ]

  function rapport(): string {
    const lines = [
      `Rapport Nomina — ${new Date().toLocaleString('fr-FR')}`,
      `Profil : ${s.profile?.name} (${roleLabel(s.profile?.role)})`,
      ...rows.map(([k, v]) => `${k} : ${v}`),
      `Appareils connectés : ${peers.length}`,
      ...peers.map((p) => `  - ${p.name ?? '?'} (${roleLabel(p.role)}) v${p.version ?? '?'} · ${p.link ?? '?'} · ping ${p.ping ?? '?'} ms`),
      `Navigateur : ${navigator.userAgent}`,
      '— Journal —',
      ...s.logs.map((l) => `${heure(l.at)} [${l.level}] ${l.text}`),
    ]
    return lines.join('\n')
  }

  async function copier() {
    const txt = rapport()
    try {
      await navigator.clipboard.writeText(txt)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = txt
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="stack">
      <section className="card">
        <h3>Cet appareil</h3>
        <dl className="dl">
          {rows.map(([k, v]) => (
            <div key={k} className="dl-row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {storage.persisted === false && (
          <button
            className="btn"
            onClick={() =>
              void navigator.storage
                ?.persist?.()
                .then(() => readStorage())
                .then(setStorage)
            }
          >
            Demander la protection du stockage
          </button>
        )}
      </section>

      <section className="card">
        <h3>Connexions ({peers.length})</h3>
        {peers.length === 0 ? (
          <p className="muted">Aucun appareil connecté.</p>
        ) : (
          <ul className="list">
            {peers.map((p) => (
              <li key={p.peerId}>
                <b>{p.name ?? 'Identification…'}</b> <span className="tag">{roleLabel(p.role)}</span>
                <div className="muted small">
                  Liaison : {p.link ?? 'mesure…'} · Délai : {p.ping !== undefined ? `${p.ping} ms` : '…'} · Version {p.version ?? '?'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack">
        <div className="row between">
          <h3>Journal</h3>
          <button className="btn" onClick={() => void copier()}>
            {copied ? 'Copié ✅' : 'Copier le rapport'}
          </button>
        </div>
        <p className="muted small">En cas de souci, copie le rapport et colle-le dans la conversation avec Claude.</p>
        <ol className="logs">
          {s.logs.length === 0 && <li className="muted">Rien pour l'instant.</li>}
          {[...s.logs].reverse().map((l, i) => (
            <li key={i} className={`log-${l.level}`}>
              <time>{heure(l.at)}</time> {l.text}
            </li>
          ))}
        </ol>
      </section>

      <section className="card stack">
        <h3>Zone de test</h3>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm('Effacer toutes les données de Nomina sur cet appareil (profil, fiche, messages) ?')) {
              try {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith('nomina:'))
                  .forEach((k) => localStorage.removeItem(k))
              } catch {
                /* ignoré */
              }
              location.reload()
            }
          }}
        >
          Réinitialiser l'appli sur cet appareil
        </button>
      </section>
    </div>
  )
}

async function readStorage(): Promise<StorageInfo> {
  try {
    const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null
    const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null
    return { persisted, usage: est?.usage ?? null, quota: est?.quota ?? null }
  } catch {
    return { persisted: null, usage: null, quota: null }
  }
}

function shortUA(): string {
  const ua = navigator.userAgent
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iPhone/iPad'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac/.test(ua)
          ? navigator.maxTouchPoints > 1
            ? 'iPad'
            : 'Mac'
          : 'Autre'
  const br = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur'
  return `${os} · ${br}`
}
