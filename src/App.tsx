import { useState } from 'react'
import { InstallBanner, StatusPill, UpdatePrompt } from './components'
import { parseJoin } from './lib/codes'
import { roleLabel } from './lib/p2p'
import { useStore } from './lib/store'
import type { TableInfo } from './lib/types'
import Diagnostic from './screens/Diagnostic'
import Fiche from './screens/Fiche'
import Messages from './screens/Messages'
import Profil from './screens/Profil'
import Table from './screens/Table'

type Tab = 'fiche' | 'table' | 'messages' | 'diagnostic'

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

  if (!s.profile) return <Profil first />

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
        {tab === 'table' && <Table pendingJoin={pendingJoin} clearPending={() => setPendingJoin(null)} />}
        {tab === 'messages' && <Messages />}
        {tab === 'diagnostic' && <Diagnostic />}
      </main>

      <nav className="tabbar">
        <TabButton id="fiche" cur={tab} set={setTab} label="Fiche" icon="📜" />
        <TabButton id="table" cur={tab} set={setTab} label="Table" icon="🕯️" />
        <TabButton id="messages" cur={tab} set={setTab} label="Messages" icon="✉️" badge={unread} />
        <TabButton id="diagnostic" cur={tab} set={setTab} label="Diagnostic" icon="🩺" />
      </nav>

      {editProfile && <Profil onClose={() => setEditProfile(false)} />}
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
