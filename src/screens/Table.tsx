import { useState } from 'react'
import { QrImage, QrScanModal } from '../components'
import { appUrl, joinUrl, newTable, parseJoin } from '../lib/codes'
import { accorderPouvoir, joinTable, joueurPeerIds, leaveTable, mjPeerIds, peerIdFor, roleLabel, sendReferentiel, sendSheet } from '../lib/p2p'
import { nomAffiche } from '../lib/personnage'
import { heure, persoActif, setState, useStore } from '../lib/store'
import type { FicheRecue, RelayKind, TableInfo } from '../lib/types'
import { Chooser } from './fiche/Pouvoirs'
import PersoResume from './PersoResume'
import { BoutonJetMJ, JournalJets } from '../JetSecret'
import { RELAYS } from '../lib/types'

export default function Table({ pendingJoin, clearPending }: { pendingJoin: TableInfo | null; clearPending: () => void }) {
  const s = useStore()
  const isMj = s.profile?.role === 'mj'
  const inTable = s.table && s.status !== 'deconnecte'

  if (!inTable) return <HorsTable isMj={isMj} pendingJoin={pendingJoin} clearPending={clearPending} />

  const t = s.table!
  const peers = Object.values(s.peers).sort((a, b) => a.joinedAt - b.joinedAt)

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row between">
          <div>
            <div className="muted small">Table</div>
            <div className="table-code">{t.id}</div>
          </div>
          <button className="btn btn-danger" onClick={() => void leaveTable()}>
            Quitter
          </button>
        </div>
        <p className="muted small">
          Relais : {RELAYS[t.relay]} · Relais joints : {s.relaysTotal ? `${s.relaysOpen}/${s.relaysTotal}` : '…'}
        </p>
        {s.status === 'erreur' && <p className="alert">La connexion a échoué. Va voir l'onglet Diagnostic.</p>}
      </section>

      {isMj && <InviteCard table={t} />}

      <section className="card">
        <h3>Appareils connectés ({peers.length})</h3>
        {peers.length === 0 ? (
          <p className="muted">Personne pour l'instant… Les autres appareils apparaîtront ici dès qu'ils auront rejoint la table.</p>
        ) : (
          <ul className="list">
            {peers.map((p) => (
              <li key={p.peerId}>
                <span className="dot dot-on" />
                <b>{p.name ?? 'Identification…'}</b>
                {p.role && <span className="tag">{roleLabel(p.role)}</span>}
                {p.link && <span className="muted small"> · {p.link}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isMj ? <MjTools /> : <PlayerTools />}
    </div>
  )
}

function InviteCard({ table }: { table: TableInfo }) {
  const [show, setShow] = useState<'rejoindre' | 'installer'>('rejoindre')
  return (
    <section className="card stack center">
      <div className="seg">
        <button className={show === 'rejoindre' ? 'on' : ''} onClick={() => setShow('rejoindre')}>
          QR « Rejoindre »
        </button>
        <button className={show === 'installer' ? 'on' : ''} onClick={() => setShow('installer')}>
          QR « Installer »
        </button>
      </div>
      {show === 'rejoindre' ? (
        <>
          <QrImage text={joinUrl(table)} label="À scanner avec le bouton « Scanner » de l'appli Nomina" />
          <details className="small">
            <summary>Saisie manuelle (sans caméra)</summary>
            <p>
              Code de la table : <code>{table.id}</code>
              <br />
              Clé : <code>{table.key}</code>
              <br />
              Relais : {RELAYS[table.relay]}
            </p>
          </details>
        </>
      ) : (
        <QrImage text={appUrl()} label="À scanner avec l'appareil photo du téléphone pour installer Nomina" />
      )}
    </section>
  )
}

function MjTools() {
  const s = useStore()
  const fiches = Object.values(s.fichesRecues).sort((a, b) => b.receivedAt - a.receivedAt)
  const nbJoueurs = joueurPeerIds().length
  return (
    <>
      <JournalJets />

      <section className="card stack">
        <h3>Référentiel</h3>
        {s.pack ? (
          <>
            <p className="muted small">
              « {s.pack.titre} » v{s.pack.version} est envoyé automatiquement à chaque joueur qui rejoint la table. Utilise le bouton après une
              mise à jour du référentiel.
            </p>
            <button className="btn" onClick={() => void sendReferentiel()} disabled={!!s.transfer || nbJoueurs === 0}>
              Renvoyer le référentiel aux joueurs ({nbJoueurs})
            </button>
          </>
        ) : (
          <p className="muted small">Aucun référentiel installé sur ton appareil (Réglages).</p>
        )}
        <Progress />
      </section>

      <section className="card">
        <h3>Fiches reçues ({fiches.length})</h3>
        {fiches.length === 0 ? (
          <p className="muted">Les fiches des joueurs arrivent automatiquement quand ils rejoignent la table.</p>
        ) : (
          fiches.map((r) => (
            <details key={r.deviceId} className="fiche-recue">
              <summary>
                <b>{nomAffiche(r.perso)}</b> — {r.name} · reçue à {heure(r.receivedAt)}
              </summary>
              <PersoResume p={r.perso} />
              <div className="row">
                <BoutonJetMJ perso={r.perso} joueurNom={r.name} />
              </div>
              <AccorderPouvoir fiche={r} />
            </details>
          ))
        )}
      </section>
    </>
  )
}

/** MJ : accorder au personnage d'un joueur un pouvoir propre d'un autre supérieur (exception aux règles). */
function AccorderPouvoir({ fiche }: { fiche: FicheRecue }) {
  const s = useStore()
  const [ouvert, setOuvert] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  if (!s.pack) return null
  const pack = s.pack
  const enLigne = !!peerIdFor(fiche.deviceId)
  const propres = pack.pouvoirs.filter((r) => r.superieur && r.camp === fiche.perso.camp && r.superieur !== fiche.perso.identite.superieurId)
  return (
    <div className="stack accorder">
      <button className="btn btn-small" disabled={!enLigne} onClick={() => setOuvert(true)} title={enLigne ? '' : 'Le joueur doit être connecté à la table'}>
        ✨ Accorder un pouvoir propre d'un autre supérieur
      </button>
      {!enLigne && <p className="muted small">Le joueur doit être connecté à la table.</p>}
      {msg && <p className="note-ok">{msg}</p>}
      {ouvert && (
        <Chooser
          title={`Accorder un pouvoir à ${nomAffiche(fiche.perso)}`}
          items={propres}
          sub={(r) => [`Pouvoir de ${pack.superieurs.find((x) => x.id === r.superieur)?.nom ?? r.superieur}`, r.cout, r.type].filter(Boolean).join(' · ')}
          onPick={(r) => {
            setOuvert(false)
            void accorderPouvoir(fiche.deviceId, fiche.perso.id, r.id).then((ok) =>
              setMsg(ok ? `« ${r.nom} » accordé : la fiche mise à jour va revenir.` : "Envoi impossible : le joueur n'est plus connecté."),
            )
          }}
          onClose={() => setOuvert(false)}
        />
      )}
    </div>
  )
}

function PlayerTools() {
  const s = useStore()
  const mj = mjPeerIds().length > 0
  const perso = persoActif(s)
  return (
    <section className="card stack">
      <h3>Ma fiche</h3>
      <p className="muted small">
        {perso ? <>Le personnage affiché (« {nomAffiche(perso)} ») est envoyé automatiquement au MJ quand vous êtes connectés.</> : "Tu n'as pas encore de personnage."}
        {s.sheetAckAt && ` Dernière réception confirmée à ${heure(s.sheetAckAt)}.`}
      </p>
      <button className="btn" disabled={!mj || !perso} onClick={() => void sendSheet()}>
        Renvoyer ma fiche maintenant
      </button>
      <Progress />
    </section>
  )
}

function Progress() {
  const t = useStore().transfer
  if (!t) return null
  return (
    <div className="progress" aria-label={t.label}>
      <div className="progress-bar" style={{ width: `${t.percent}%` }} />
      <span>
        {t.label} — {t.percent} %
      </span>
    </div>
  )
}

function HorsTable({ isMj, pendingJoin, clearPending }: { isMj: boolean; pendingJoin: TableInfo | null; clearPending: () => void }) {
  const s = useStore()
  const [scan, setScan] = useState(false)
  const [manual, setManual] = useState(false)
  const [code, setCode] = useState('')
  const [cle, setCle] = useState('')
  const [relay, setRelay] = useState<RelayKind>(s.preferredRelay)

  const rejoindre = (t: TableInfo) => {
    clearPending()
    setScan(false)
    void joinTable(t)
  }

  return (
    <div className="stack">
      {pendingJoin && (
        <section className="card stack highlight">
          <h3>Invitation reçue</h3>
          <p>
            Rejoindre la table <b>{pendingJoin.id}</b> ?
          </p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => rejoindre(pendingJoin)}>
              Rejoindre
            </button>
            <button className="btn" onClick={clearPending}>
              Ignorer
            </button>
          </div>
        </section>
      )}

      {isMj && (
        <section className="card stack">
          <h3>Ouvrir une table</h3>
          <p className="muted small">
            Ton appareil devient la Table de jeu. Les joueurs la rejoignent en scannant le QR code qui s'affichera.
          </p>
          <label>
            Type de relais pour la mise en relation
            <select
              value={relay}
              onChange={(e) => {
                const r = e.target.value as RelayKind
                setRelay(r)
                setState({ preferredRelay: r })
              }}
            >
              {Object.entries(RELAYS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={() => void joinTable(newTable(relay))}>
            Ouvrir une nouvelle table
          </button>
        </section>
      )}

      <section className="card stack">
        <h3>{isMj ? 'Rejoindre une table existante' : 'Rejoindre la table du MJ'}</h3>
        <button className="btn btn-primary" onClick={() => setScan(true)}>
          📷 Scanner le QR code
        </button>
        <button className="link" onClick={() => setManual(!manual)}>
          {manual ? 'Masquer la saisie manuelle' : 'Pas de caméra ? Saisir le code à la main'}
        </button>
        {manual && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault()
              const t = parseJoin(new URLSearchParams({ table: code, cle, relais: relay }).toString())
              if (t) rejoindre(t)
            }}
          >
            <label>
              Code de la table
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex. corbeau-soufre-42" autoCapitalize="none" />
            </label>
            <label>
              Clé
              <input value={cle} onChange={(e) => setCle(e.target.value)} placeholder="ex. velours-braise-lys-17" autoCapitalize="none" />
            </label>
            <label>
              Relais
              <select value={relay} onChange={(e) => setRelay(e.target.value as RelayKind)}>
                {Object.entries(RELAYS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" type="submit" disabled={!code.trim() || !cle.trim()}>
              Rejoindre
            </button>
          </form>
        )}
      </section>

      {s.table && (
        <section className="card stack">
          <p className="muted small">Dernière table : {s.table.id}</p>
          <button className="btn" onClick={() => void joinTable(s.table!)}>
            Se reconnecter à cette table
          </button>
        </section>
      )}

      {scan && <QrScanModal onResult={rejoindre} onClose={() => setScan(false)} />}
    </div>
  )
}
