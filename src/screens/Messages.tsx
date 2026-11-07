import { useEffect, useRef, useState } from 'react'
import { markRead, peerIdFor, roleLabel, sendMessage } from '../lib/p2p'
import { useStore } from '../lib/store'

export default function Messages() {
  const s = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const me = s.profile!.deviceId
  const contacts = Object.values(s.contacts)
    .filter((c) => c.deviceId !== me)
    .sort((a, b) => Number(!!peerIdFor(b.deviceId)) - Number(!!peerIdFor(a.deviceId)) || a.name.localeCompare(b.name))

  if (open && s.contacts[open]) return <Thread deviceId={open} onBack={() => setOpen(null)} />

  return (
    <div className="stack">
      <div className="card note">
        🔒 Les messages vont <b>directement</b> de ton appareil à celui du destinataire. Personne d'autre ne les reçoit, pas
        même le MJ. Ils restent enregistrés uniquement sur vos deux appareils.
      </div>
      <section className="card">
        <h3>Conversations</h3>
        {contacts.length === 0 ? (
          <p className="muted">Les personnes apparaîtront ici dès que vous aurez été connectés à la même table.</p>
        ) : (
          <ul className="list contacts">
            {contacts.map((c) => {
              const online = !!peerIdFor(c.deviceId)
              const unread = s.unread[c.deviceId] ?? 0
              return (
                <li key={c.deviceId}>
                  <button className="contact" onClick={() => setOpen(c.deviceId)}>
                    <span className={`dot ${online ? 'dot-on' : ''}`} />
                    <b>{c.name}</b>
                    <span className="tag">{roleLabel(c.role)}</span>
                    {!online && <span className="muted small">hors ligne</span>}
                    {unread > 0 && <span className="badge inline">{unread}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function Thread({ deviceId, onBack }: { deviceId: string; onBack: () => void }) {
  const s = useStore()
  const me = s.profile!.deviceId
  const c = s.contacts[deviceId]
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const msgs = s.messages.filter((m) => (m.from === me && m.to === deviceId) || (m.from === deviceId && m.to === me))
  const online = !!peerIdFor(deviceId)

  useEffect(() => {
    markRead(deviceId)
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [deviceId, msgs.length])

  return (
    <div className="thread">
      <div className="thread-head">
        <button className="link" onClick={onBack}>
          ← Retour
        </button>
        <b>{c.name}</b>
        <span className="tag">{roleLabel(c.role)}</span>
        <span className={`dot ${online ? 'dot-on' : ''}`} title={online ? 'connecté' : 'hors ligne'} />
      </div>
      <div className="bubbles">
        {msgs.length === 0 && <p className="muted center">Aucun message pour l'instant.</p>}
        {msgs.map((m) => {
          const mine = m.from === me
          return (
            <div key={m.id} className={`bubble ${mine ? 'mine' : 'theirs'}`}>
              <div className="pre">{m.text}</div>
              <div className="meta">
                {new Date(m.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {mine && (m.status === 'recu' ? ' · ✓✓ reçu' : m.status === 'envoye' ? ' · ✓ envoyé' : ' · ⏳ en attente')}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      {!online && <p className="muted small center">{c.name} est hors ligne : le message partira dès qu'il se reconnectera à la table.</p>}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          const t = text.trim()
          if (!t) return
          void sendMessage(deviceId, t)
          setText('')
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message privé…" maxLength={2000} />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>
          Envoyer
        </button>
      </form>
    </div>
  )
}
