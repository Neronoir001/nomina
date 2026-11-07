import { useState } from 'react'
import { InstallBanner, StatusPill, UpdatePrompt } from './components'
import { ConseilsDemarrage, EcranErreur } from './Erreurs'
import { parseJoin } from './lib/codes'
import { roleLabel } from './lib/p2p'
import { log, setState, useStore } from './lib/store'
import type { TableInfo } from './lib/types'
import Fiche from './screens/fiche/Fiche'
import Messages from './screens/Messages'
import Profil from './screens/Profil'
import Referentiel from './screens/referentiel/Referentiel'
import Reglages from './screens/Reglages'
import Table from './screens/Table'
import { Modal } from './ui'

type Tab = 'fiche' | 'referentiel' | 'table' | 'messages' | 'reglages'

function readPendingJoin(): TableInfo | null {
  const info = parseJoin(location.hash)
  if (info) history.replaceState(null, '', location.pathname)
  return info
}

export default function App() {
  const s = useStore()
  const [pendingJoin, setPendingJoin] = useState<TableInfo | null>(readPendingJoin)
  const [tab, setTab] = useState<Tab>(pendingJoin ? 'table' : 'fiche')
  const [editProfile, setEditProfile] = useState(false)

  // La vérification des mises à jour tourne dès le premier écran.
  if (!s.hydrated) {
    return (
      <div className="welcome">
        <img className="hero-icon pulse" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="Chargement de Nomina" width={96} height={96} />
        <UpdatePrompt />
      </div>
    )
  }
  if (s.erreurDemarrage)
    return (
      <>
        <EcranErreur titre="Nomina n'a pas pu charger tes données" detail={s.erreurDemarrage} conseil={<ConseilsDemarrage />} />
        <UpdatePrompt />
      </>
    )
  if (!s.profile)
    return (
      <>
        <Profil first />
        <UpdatePrompt />
      </>
    )

  const unread = Object.values(s.unread).reduce((a, b) => a + b, 0)
  const peerCount = Object.keys(s.peers).length

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span>Nomina</span>
        </div>
        <StatusPill status={s.status} peers={peerCount} />
        <button className="chip" onClick={() => setEditProfile(true)} title="Modifier mon profil">
          {s.profile.name} · {roleLabel(s.profile.role)}
        </button>
      </header>

      <InstallBanner />

      <main className="content">
        {tab === 'fiche' && <Fiche />}
        {tab === 'referentiel' && <Referentiel />}
        {tab === 'table' && <Table pendingJoin={pendingJoin} clearPending={() => setPendingJoin(null)} />}
        {tab === 'messages' && <Messages />}
        {tab === 'reglages' && <Reglages />}
      </main>

      <nav className="tabbar">
        <TabButton id="fiche" cur={tab} set={setTab} label="Fiche" icon="📜" />
        <TabButton id="referentiel" cur={tab} set={setTab} label="Référentiel" icon="📚" />
        <TabButton id="table" cur={tab} set={setTab} label="Table" icon="🕯️" />
        <TabButton id="messages" cur={tab} set={setTab} label="Messages" icon="✉️" badge={unread} />
        <TabButton id="reglages" cur={tab} set={setTab} label="Réglages" icon="⚙️" />
      </nav>

      {editProfile && <Profil onClose={() => setEditProfile(false)} />}

      {s.packPropose && (
        <Modal title="Référentiel proposé" onClose={() => setState({ packPropose: null })}>
          <div className="stack">
            <p>
              {s.packPropose.de} t'envoie le référentiel <b>« {s.packPropose.pack.titre} »</b> (version {s.packPropose.pack.version}).
            </p>
            {s.pack && (
              <p className="muted small">
                Il remplacera celui installé actuellement (version {s.pack.version}). Tes personnages ne sont pas modifiés.
              </p>
            )}
            <div className="row">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const pack = s.packPropose!.pack
                  setState({ pack, packPropose: null })
                  log(`Référentiel « ${pack.titre} » v${pack.version} installé.`, 'ok')
                }}
              >
                Installer
              </button>
              <button className="btn" onClick={() => setState({ packPropose: null })}>
                Plus tard
              </button>
            </div>
          </div>
        </Modal>
      )}

      <UpdatePrompt />
    </div>
  )
}

function TabButton(p: { id: Tab; cur: Tab; set: (t: Tab) => void; label: string; icon: string; badge?: number }) {
  return (
    <button className={`tab${p.cur === p.id ? ' tab-on' : ''}`} onClick={() => p.set(p.id)} aria-current={p.cur === p.id}>
      <span className="tab-icon" aria-hidden>
        {p.icon}
      </span>
      <span>{p.label}</span>
      {!!p.badge && <span className="badge">{p.badge}</span>}
    </button>
  )
}
