import { useEffect, useRef, useState } from 'react'
import {
  ajouterMembres, convDirecte, creerGroupe, markRead, nomDe, peerIdFor, quitterGroupe, renommerGroupe, roleLabel,
  sendMessage, supprimerConversation, supprimerMessage,
} from '../lib/p2p'
import { useStore } from '../lib/store'
import type { ChatMessage, Contact, Groupe } from '../lib/types'
import { Modal } from '../ui'

type ConvInfo = { conv: string; titre: string; sous: string; groupe?: Groupe; contact?: Contact; dernier?: ChatMessage; enLigne: number }

function heureCourte(t: number): string {
  const d = new Date(t)
  const auj = new Date()
  return d.toDateString() === auj.toDateString()
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function Messages() {
  const s = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const [nouveauGroupe, setNouveauGroupe] = useState(false)
  const me = s.profile!.deviceId

  const derniers = new Map<string, ChatMessage>()
  for (const m of s.messages) derniers.set(m.conv, m)

  const convs: ConvInfo[] = [
    ...Object.values(s.groupes).map((g) => ({
      conv: `g:${g.id}`,
      titre: g.nom,
      sous: `${g.membres.length} membres`,
      groupe: g,
      dernier: derniers.get(`g:${g.id}`),
      enLigne: g.membres.filter((d) => d !== me && peerIdFor(d)).length,
    })),
    ...Object.values(s.contacts)
      .filter((c) => c.deviceId !== me)
      .map((c) => ({
        conv: convDirecte(c.deviceId),
        titre: c.name,
        sous: roleLabel(c.role),
        contact: c,
        dernier: derniers.get(convDirecte(c.deviceId)),
        enLigne: peerIdFor(c.deviceId) ? 1 : 0,
      })),
  ].sort((a, b) => (b.dernier?.at ?? 0) - (a.dernier?.at ?? 0) || b.enLigne - a.enLigne || a.titre.localeCompare(b.titre))

  const ouverte = open ? convs.find((c) => c.conv === open) : undefined
  if (ouverte) return <Thread info={ouverte} onBack={() => setOpen(null)} />

  return (
    <div className="stack">
      <div className="card note">
        🔒 Les messages vont <b>directement</b> aux appareils des destinataires. Personne d'autre ne les reçoit : un groupe sans le MJ reste
        invisible pour lui. Ils sont gardés uniquement sur les appareils concernés.
      </div>
      <section className="card">
        <div className="card-head">
          <h3>Conversations</h3>
          <button className="btn btn-small" onClick={() => setNouveauGroupe(true)} disabled={Object.keys(s.contacts).filter((d) => d !== me).length === 0}>
            ＋ 👥 Groupe
          </button>
        </div>
        {convs.length === 0 ? (
          <p className="muted">Les personnes apparaîtront ici dès que vous aurez été connectés à la même table.</p>
        ) : (
          <ul className="list contacts">
            {convs.map((c) => {
              const nonLus = s.unread[c.conv] ?? 0
              return (
                <li key={c.conv}>
                  <button className="contact" onClick={() => setOpen(c.conv)}>
                    {c.groupe ? <span className="avatar-grp">👥</span> : <span className={`dot ${c.enLigne ? 'dot-on' : ''}`} />}
                    <span className="contact-texte">
                      <span>
                        <b>{c.titre}</b> <span className="tag">{c.sous}</span>
                        {c.groupe && c.enLigne > 0 && <span className="muted small"> · {c.enLigne} en ligne</span>}
                        {!c.groupe && !c.enLigne && <span className="muted small"> · hors ligne</span>}
                      </span>
                      {c.dernier && (
                        <span className="muted small apercu tronque">
                          {c.dernier.from === me ? 'Toi : ' : c.groupe ? `${nomDe(c.dernier.from, c.groupe)} : ` : ''}
                          {c.dernier.text}
                        </span>
                      )}
                    </span>
                    {c.dernier && <span className="muted small">{heureCourte(c.dernier.at)}</span>}
                    {nonLus > 0 && <span className="badge inline">{nonLus}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {nouveauGroupe && (
        <ChoixMembres
          titre="Nouveau groupe"
          avecNom
          exclus={[me]}
          valider={(nom, membres) => {
            const conv = creerGroupe(nom, membres)
            setNouveauGroupe(false)
            setOpen(conv)
          }}
          fermer={() => setNouveauGroupe(false)}
        />
      )}
    </div>
  )
}

function Thread({ info, onBack }: { info: ConvInfo; onBack: () => void }) {
  const s = useStore()
  const me = s.profile!.deviceId
  const [text, setText] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [ajout, setAjout] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const msgs = s.messages.filter((m) => m.conv === info.conv)
  const g = info.groupe

  useEffect(() => {
    markRead(info.conv)
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [info.conv, msgs.length])

  const statut = (m: ChatMessage) => {
    const recus = m.recus?.length ?? 0
    const total = recus + (m.enAttente?.length ?? 0)
    if (total === 0) return ''
    if (recus === total) return g ? ' · ✓✓ reçu par tous' : ' · ✓✓ reçu'
    if (recus > 0) return ` · ✓ reçu par ${recus}/${total}`
    return ' · ⏳ en attente'
  }

  return (
    <div className="thread">
      <div className="thread-head">
        <button className="link" onClick={onBack}>
          ← Retour
        </button>
        <b className="thread-titre tronque">{g ? `👥 ${g.nom}` : info.titre}</b>
        {!g && <span className="tag">{info.sous}</span>}
        {!g && <span className={`dot ${info.enLigne ? 'dot-on' : ''}`} title={info.enLigne ? 'connecté' : 'hors ligne'} />}
        <button className="icon-btn" onClick={() => setMenu(true)} title="Options de la conversation" aria-label="Options">
          ⋯
        </button>
      </div>
      {g && (
        <div className="membres">
          {g.membres.map((d) => (
            <span key={d} className="membre">
              <span className={`dot ${d === me || peerIdFor(d) ? 'dot-on' : ''}`} />
              {nomDe(d, g)}
            </span>
          ))}
        </div>
      )}

      <div className="bubbles">
        {msgs.length === 0 && <p className="muted center">Aucun message pour l'instant.</p>}
        {msgs.map((m) => {
          const mine = m.from === me
          return (
            <div key={m.id} className={`bubble-wrap ${mine ? 'mine' : 'theirs'}`}>
              <button className={`bubble ${mine ? 'mine' : 'theirs'}${sel === m.id ? ' sel' : ''}`} onClick={() => setSel(sel === m.id ? null : m.id)}>
                {g && !mine && <div className="auteur">{nomDe(m.from, g)}</div>}
                <div className="pre">{m.text}</div>
                <div className="meta">
                  {heureCourte(m.at)}
                  {mine && statut(m)}
                </div>
              </button>
              {sel === m.id && (
                <div className="bubble-actions">
                  <button className="link small" onClick={() => void navigator.clipboard?.writeText(m.text).then(() => setSel(null))}>
                    Copier
                  </button>
                  <button
                    className="link small danger"
                    onClick={() => {
                      supprimerMessage(m.id)
                      setSel(null)
                    }}
                  >
                    🗑 Supprimer (sur cet appareil)
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {!g && !info.enLigne && <p className="muted small center">{info.titre} est hors ligne : le message partira dès qu'il se reconnectera à la table.</p>}
      {g && g.membres.length <= 1 && <p className="muted small center">Tu es seul dans ce groupe : ajoute des membres avec ⋯.</p>}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          const t = text.trim()
          if (!t) return
          void sendMessage(info.conv, t)
          setText('')
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={g ? `Message au groupe « ${g.nom} »…` : 'Message privé…'} maxLength={2000} />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>
          Envoyer
        </button>
      </form>

      {menu && (
        <Modal title={g ? g.nom : info.titre} onClose={() => setMenu(false)}>
          <div className="stack">
            {g && (
              <>
                <RenommerGroupe g={g} fini={() => setMenu(false)} />
                <button
                  className="btn"
                  onClick={() => {
                    setMenu(false)
                    setAjout(true)
                  }}
                >
                  ＋ Ajouter des membres
                </button>
              </>
            )}
            <p className="muted small">
              La suppression n'efface la conversation que sur <b>ton</b> appareil : les autres gardent leur copie.
            </p>
            {g ? (
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (confirm(`Quitter le groupe « ${g.nom} » et supprimer ses messages de cet appareil ?`)) {
                    supprimerConversation(info.conv)
                    onBack()
                  }
                }}
              >
                🚪 Quitter et supprimer
              </button>
            ) : (
              <button
                className="btn btn-danger"
                disabled={msgs.length === 0}
                onClick={() => {
                  if (confirm(`Supprimer toute la conversation avec ${info.titre} de cet appareil ?`)) {
                    supprimerConversation(info.conv)
                    setMenu(false)
                  }
                }}
              >
                🗑 Supprimer la conversation
              </button>
            )}
            {g && (
              <button
                className="link small"
                onClick={() => {
                  if (confirm(`Quitter « ${g.nom} » en gardant les messages déjà reçus ?`)) {
                    quitterGroupe(g.id)
                    onBack()
                  }
                }}
              >
                Quitter le groupe sans supprimer les messages
              </button>
            )}
          </div>
        </Modal>
      )}

      {ajout && g && (
        <ChoixMembres
          titre={`Ajouter au groupe « ${g.nom} »`}
          exclus={g.membres}
          valider={(_nom, membres) => {
            ajouterMembres(g.id, membres)
            setAjout(false)
          }}
          fermer={() => setAjout(false)}
        />
      )}
    </div>
  )
}

function RenommerGroupe({ g, fini }: { g: Groupe; fini: () => void }) {
  const [nom, setNom] = useState(g.nom)
  return (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault()
        renommerGroupe(g.id, nom)
        fini()
      }}
    >
      <input className="grow" value={nom} onChange={(e) => setNom(e.target.value)} aria-label="Nom du groupe" maxLength={40} />
      <button className="btn" type="submit" disabled={!nom.trim() || nom.trim() === g.nom}>
        Renommer
      </button>
    </form>
  )
}

function ChoixMembres(p: { titre: string; avecNom?: boolean; exclus: string[]; valider: (nom: string, membres: string[]) => void; fermer: () => void }) {
  const s = useStore()
  const [nom, setNom] = useState('')
  const [choisis, setChoisis] = useState<string[]>([])
  const candidats = Object.values(s.contacts)
    .filter((c) => !p.exclus.includes(c.deviceId))
    .sort((a, b) => a.name.localeCompare(b.name))
  const basculer = (d: string) => setChoisis((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))
  return (
    <Modal title={p.titre} onClose={p.fermer}>
      <div className="stack">
        {p.avecNom && (
          <label>
            Nom du groupe
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Les sbires de Baal" maxLength={40} autoFocus />
          </label>
        )}
        <div className="sub-head">Membres</div>
        {candidats.length === 0 && <p className="muted">Personne d'autre à ajouter pour l'instant.</p>}
        <ul className="plain choix-membres">
          {candidats.map((c) => (
            <li key={c.deviceId}>
              <label className={`choice${choisis.includes(c.deviceId) ? ' on' : ''}`}>
                <input type="checkbox" checked={choisis.includes(c.deviceId)} onChange={() => basculer(c.deviceId)} />
                {c.name} <span className="tag">{roleLabel(c.role)}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="muted small">Seules les personnes déjà croisées à la table apparaissent ici.</p>
        <button className="btn btn-primary" disabled={choisis.length === 0} onClick={() => p.valider(nom, choisis)}>
          {p.avecNom ? 'Créer le groupe' : 'Ajouter'}
        </button>
      </div>
    </Modal>
  )
}
