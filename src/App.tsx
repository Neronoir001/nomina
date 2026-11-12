import { lazy, Suspense, useEffect, useState } from 'react'
import { StatusPill, UpdatePrompt } from './components'
import { BandeauAnnulation } from './BoutonPP'
import { FenetreResultat } from './JetSecret'
import { ConseilsDemarrage, EcranErreur } from './Erreurs'
import { SECTION_PAR_ECRAN } from './guide/ecrans'
import Visite from './guide/Visite'
import { parseJoin } from './lib/codes'
import { roleLabel } from './lib/p2p'
import { installerPackPropose, setState, useStore } from './lib/store'
import type { TableInfo } from './lib/types'
import Accueil, { type Onglet } from './screens/Accueil'
import Fiche from './screens/fiche/Fiche'
import Profil from './screens/Profil'
import { Modal } from './ui'

type Tab = Onglet

// Écrans chargés seulement à la première ouverture : démarrage plus rapide sur téléphone.
const Referentiel = lazy(() => import('./screens/referentiel/Referentiel'))
const Table = lazy(() => import('./screens/Table'))
const Messages = lazy(() => import('./screens/Messages'))
const Reglages = lazy(() => import('./screens/Reglages'))
const EspaceMJ = lazy(() => import('./screens/mj/EspaceMJ'))
const Guide = lazy(() => import('./guide/Guide'))
const Assistant = lazy(() => import('./creation/Assistant'))

function Chargement() {
  return <p className="muted center chargement">Chargement…</p>
}

function readPendingJoin(): TableInfo | null {
  const info = parseJoin(location.hash)
  if (info) history.replaceState(null, '', location.pathname)
  return info
}

export default function App() {
  const s = useStore()
  const [pendingJoin, setPendingJoin] = useState<TableInfo | null>(readPendingJoin)
  const [tab, setTab] = useState<Tab>(pendingJoin ? 'table' : 'accueil')
  const [editProfile, setEditProfile] = useState(false)
  const [guide, setGuide] = useState<string | null>(null)
  const [revoirVisite, setRevoirVisite] = useState(false)
  // Fermer la fenêtre (✕) garde la proposition : elle reste installable depuis l'accueil et la Table.
  const [refMasque, setRefMasque] = useState(false)
  const propositionRef = s.packPropose ? `${s.packPropose.pack.version}|${s.packPropose.pack.date}` : ''
  useEffect(() => setRefMasque(false), [propositionRef])

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
        <button className="brand" onClick={() => setTab('accueil')} title="Accueil">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span>Nomina</span>
        </button>
        <StatusPill status={s.status} peers={peerCount} />
        <button className="chip tronque" onClick={() => setEditProfile(true)} title="Modifier mon profil">
          {s.profile.name} · {roleLabel(s.profile.role)}
        </button>
        <button className="icon-btn aide" data-visite="aide" onClick={() => setGuide(SECTION_PAR_ECRAN[tab] ?? '')} title="Aide : ouvrir le guide" aria-label="Aide">
          ?
        </button>
        <button data-visite="reglages" className={`icon-btn gear${tab === 'reglages' ? ' on' : ''}`} onClick={() => setTab('reglages')} title="Réglages" aria-label="Réglages">
          ⚙️
        </button>
      </header>

      <main className="content">
        <Suspense fallback={<Chargement />}>
        {tab === 'accueil' && <Accueil aller={setTab} />}
        {tab === 'fiche' && <Fiche />}
        {tab === 'referentiel' && <Referentiel />}
        {tab === 'table' && <Table pendingJoin={pendingJoin} clearPending={() => setPendingJoin(null)} />}
        {tab === 'messages' && <Messages />}
        {tab === 'mj' && (s.profile.role === 'mj' ? <EspaceMJ /> : <Accueil aller={setTab} />)}
        {tab === 'reglages' && <Reglages />}
        </Suspense>
      </main>

      <nav className="tabbar" data-visite="onglets">
        <TabButton id="accueil" cur={tab} set={setTab} label="Accueil" icon="🏠" />
        <TabButton id="fiche" cur={tab} set={setTab} label="Fiche" icon="📜" />
        <TabButton id="referentiel" cur={tab} set={setTab} label="Référentiel" icon="📚" />
        <TabButton id="table" cur={tab} set={setTab} label="Table" icon="🕯️" />
        <TabButton id="messages" cur={tab} set={setTab} label="Messages" icon="✉️" badge={unread} />
        {s.profile.role === 'mj' && <TabButton id="mj" cur={tab} set={setTab} label="MJ" icon="🎭" />}
      </nav>

      {editProfile && <Profil onClose={() => setEditProfile(false)} />}

      {s.creationOuverte && (
        <Suspense fallback={null}>
          <Assistant onFini={() => setTab('fiche')} />
        </Suspense>
      )}

      {guide !== null && (
        <Suspense fallback={null}>
        <Guide
          section={guide || undefined}
          onClose={() => setGuide(null)}
          revoirVisite={() => {
            setGuide(null)
            setTab('accueil')
            setRevoirVisite(true)
          }}
        />
        </Suspense>
      )}

      {(revoirVisite || !s.visiteFaite) && !editProfile && !(s.packPropose && !refMasque) && !s.annonce && (
        <Visite
          onFin={() => {
            setRevoirVisite(false)
            setState({ visiteFaite: true })
          }}
        />
      )}

      {s.annonce && (
        <Modal title={s.annonce.titre} onClose={() => setState({ annonce: null })}>
          <div className="stack">
            <p>{s.annonce.texte}</p>
            <button className="btn btn-primary" onClick={() => setState({ annonce: null })}>
              OK
            </button>
          </div>
        </Modal>
      )}

      {s.packPropose && !refMasque && (
        <Modal title="Référentiel proposé" onClose={() => setRefMasque(true)}>
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
                onClick={installerPackPropose}
              >
                Installer
              </button>
              <button className="btn" onClick={() => setState({ packPropose: null })}>
                Refuser
              </button>
            </div>
          </div>
        </Modal>
      )}

      {s.profile.role === 'mj' && <FenetreResultat />}
      <BandeauAnnulation />
      <UpdatePrompt />
    </div>
  )
}

function TabButton(p: { id: Tab; cur: Tab; set: (t: Tab) => void; label: string; icon: string; badge?: number }) {
  return (
    <button data-visite={p.id} className={`tab${p.cur === p.id ? ' tab-on' : ''}`} onClick={() => p.set(p.id)} aria-current={p.cur === p.id}>
      <span className="tab-icon" aria-hidden>
        {p.icon}
      </span>
      <span>{p.label}</span>
      {!!p.badge && <span className="badge">{p.badge}</span>}
    </button>
  )
}
