import { useState, useSyncExternalStore } from 'react'
import { InstallBanner } from '../components'
import { nouveautesNonLues, phraseDuJour, salutation } from '../contenu'
import { newTable } from '../lib/codes'
import { exporterTout, importerFichier } from '../lib/fichiers'
import { isStandalone } from '../lib/install'
import { appliquerMaj, ecouterMaj, majDisponible } from '../lib/maj'
import { joinTable, joueurPeerIds, roleLabel, sendReferentiel } from '../lib/p2p'
import type { Camp } from '../lib/pack'
import type { Personnage } from '../lib/personnage'
import { nomAffiche, nouveauPersonnage } from '../lib/personnage'
import { creerPerso, heure, listePersos, majPerso, setState, useStore } from '../lib/store'
import { Card, FilePick, Stepper } from '../ui'

export type Onglet = 'accueil' | 'fiche' | 'referentiel' | 'table' | 'messages' | 'reglages'

const JOUR = 24 * 3600 * 1000

export default function Accueil({ aller }: { aller: (o: Onglet) => void }) {
  const s = useStore()
  const [phrase] = useState(phraseDuJour)
  const profile = s.profile!
  const isMj = profile.role === 'mj'

  return (
    <div className="stack accueil">
      <header className="accueil-tete">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={64} height={64} />
        <div>
          <h1>{salutation(profile.name)}</h1>
          <p className="muted">{roleLabel(profile.role) === 'MJ' ? 'Maître du jeu' : 'Joueur'}</p>
        </div>
      </header>
      <p className="phrase">« {phrase} »</p>

      <AFaire aller={aller} />
      <Personnages aller={aller} />
      <BlocTable aller={aller} isMj={isMj} />
      <BlocMessages aller={aller} />
      <Nouveautes />

      <p className="muted small center">Nomina {__APP_VERSION__}</p>
    </div>
  )
}

// ───────── À faire ─────────

function AFaire({ aller }: { aller: (o: Onglet) => void }) {
  const s = useStore()
  const maj = useSyncExternalStore(ecouterMaj, majDisponible, majDisponible)
  const [msg, setMsg] = useState<string | null>(null)
  const nb = Object.keys(s.personnages).length
  const ageSauvegarde = s.derniereSauvegarde ? Math.floor((Date.now() - s.derniereSauvegarde) / JOUR) : null
  const sauvegardeAFaire = nb > 0 && (ageSauvegarde === null || ageSauvegarde >= 7)
  const installer = !isStandalone()

  if (!maj && s.pack && !sauvegardeAFaire && !installer && !msg) return null

  return (
    <Card title="⚠ À faire" className="a-faire">
      <ul className="taches">
        {maj && (
          <li>
            <span>Une nouvelle version de Nomina est disponible.</span>
            <button className="btn btn-primary" onClick={appliquerMaj}>
              Mettre à jour
            </button>
          </li>
        )}
        {!s.pack && (
          <li>
            <span>
              Le référentiel (princes, pouvoirs, talents…) n'est pas installé.
              {s.profile?.role === 'joueur' && ' Tu le recevras en rejoignant la Table de ton MJ.'}
            </span>
            <FilePick label="Importer le fichier" onFile={(f) => void importerFichier(f).then(setMsg)} />
          </li>
        )}
        {sauvegardeAFaire && (
          <li>
            <span>
              {ageSauvegarde === null
                ? "Tu n'as encore jamais sauvegardé tes personnages."
                : `Ta dernière sauvegarde date de ${ageSauvegarde} jours.`}
            </span>
            <button className="btn" onClick={() => void exporterTout()}>
              Sauvegarder
            </button>
          </li>
        )}
        {msg && (
          <li>
            <span className="note-ok">{msg}</span>
            <button className="link" onClick={() => aller('referentiel')}>
              Voir le référentiel
            </button>
          </li>
        )}
      </ul>
      {installer && <InstallBanner />}
    </Card>
  )
}

// ───────── Personnages ─────────

function Personnages({ aller }: { aller: (o: Onglet) => void }) {
  const s = useStore()
  const persos = listePersos(s)
  const ouvrir = (p: Personnage) => {
    setState({ actifId: p.id })
    aller('fiche')
  }
  const creer = (camp: Camp) => {
    creerPerso(nouveauPersonnage(camp))
    aller('fiche')
  }
  return (
    <Card
      title="📜 Mes personnages"
      actions={
        <>
          <button className="btn btn-small" onClick={() => creer('INS')} title="Nouveau démon">
            ＋ 😈
          </button>
          <button className="btn btn-small" onClick={() => creer('MV')} title="Nouvel ange">
            ＋ 😇
          </button>
        </>
      }
    >
      {persos.length === 0 && <p className="muted">Aucun personnage pour l'instant. Crée un démon ou un ange avec les boutons ci-dessus.</p>}
      <div className="stack">
        {persos.map((p) => (
          <CartePerso key={p.id} p={p} actif={p.id === s.actifId} ouvrir={() => ouvrir(p)} />
        ))}
      </div>
    </Card>
  )
}

function CartePerso({ p, actif, ouvrir }: { p: Personnage; actif: boolean; ouvrir: () => void }) {
  const pack = useStore().pack
  const sup = pack?.superieurs.find((x) => x.id === p.identite.superieurId)
  const supNom = sup?.nom ?? p.identite.superieurLibre
  const details = [supNom, p.identite.grade].filter(Boolean).join(' · ')
  return (
    <div className={`carte-perso camp-${p.camp.toLowerCase()}${actif ? ' actif' : ''}`}>
      <button className="carte-perso-tete" onClick={ouvrir}>
        <span className="carte-perso-icone" aria-hidden>
          {p.camp === 'INS' ? '😈' : '😇'}
        </span>
        <span className="carte-perso-nom">
          <b className="tronque">{nomAffiche(p)}</b>
          <span className="muted small tronque">{details || (p.camp === 'INS' ? 'Démon' : 'Ange')}</span>
        </span>
        <span className="carte-perso-ouvrir" aria-hidden>
          ›
        </span>
      </button>
      {actif ? (
        <div className="grid2 carte-perso-jauges">
          <Stepper label={`PP (max ${p.pp.max})`} value={p.pp.actuel} min={0} onChange={(v) => majPerso(p.id, (x) => ({ ...x, pp: { ...x.pp, actuel: v } }))} />
          <Stepper label={`PV (max ${p.blessures.max})`} value={p.blessures.actuel} min={0} onChange={(v) => majPerso(p.id, (x) => ({ ...x, blessures: { ...x.blessures, actuel: v } }))} />
        </div>
      ) : (
        <p className="muted small carte-perso-resume">
          PP {p.pp.actuel}/{p.pp.max} · PV {p.blessures.actuel}/{p.blessures.max}
        </p>
      )}
    </div>
  )
}

// ───────── Table ─────────

function BlocTable({ aller, isMj }: { aller: (o: Onglet) => void; isMj: boolean }) {
  const s = useStore()
  const enTable = !!s.table && s.status !== 'deconnecte'
  const peers = Object.values(s.peers)
  const fiches = Object.values(s.fichesRecues).sort((a, b) => b.receivedAt - a.receivedAt).slice(0, 3)

  return (
    <Card title="🕯️ La Table">
      {enTable ? (
        <div className="stack">
          <p>
            Table <b>{s.table!.id}</b> —{' '}
            {s.status === 'connexion' ? 'connexion…' : peers.length ? `${peers.length} appareil(s) connecté(s)` : 'en attente des autres'}
          </p>
          {peers.length > 0 && <p className="muted small">{peers.map((p) => p.name ?? '…').join(', ')}</p>}
          {isMj && fiches.length > 0 && (
            <p className="muted small">
              Dernières fiches reçues : {fiches.map((f) => `${nomAffiche(f.perso)} (${f.name}, ${heure(f.receivedAt)})`).join(' · ')}
            </p>
          )}
          <div className="row">
            <button className="btn btn-primary" onClick={() => aller('table')}>
              Voir la Table
            </button>
            {isMj && s.pack && joueurPeerIds().length > 0 && (
              <button className="btn" onClick={() => void sendReferentiel()}>
                Envoyer le référentiel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">Tu n'es à aucune table pour l'instant.</p>
          <div className="row">
            {isMj ? (
              <button
                className="btn btn-primary"
                onClick={() => {
                  void joinTable(newTable(s.preferredRelay))
                  aller('table')
                }}
              >
                Ouvrir une table
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => aller('table')}>
                📷 Rejoindre la table
              </button>
            )}
            {s.table && (
              <button className="btn" onClick={() => void joinTable(s.table!)}>
                Reprendre « {s.table.id} »
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

// ───────── Messages ─────────

function BlocMessages({ aller }: { aller: (o: Onglet) => void }) {
  const s = useStore()
  const me = s.profile!.deviceId
  const nonLus = Object.values(s.unread).reduce((a, b) => a + b, 0)
  const recus = s.messages.filter((m) => m.from !== me).slice(-3).reverse()
  if (recus.length === 0 && nonLus === 0) return null
  return (
    <Card title={`✉️ Messages${nonLus ? ` — ${nonLus} non lu${nonLus > 1 ? 's' : ''}` : ''}`}>
      <ul className="plain apercu-messages">
        {recus.map((m) => (
          <li key={m.id} className="tronque">
            <b>{s.contacts[m.from]?.name ?? '?'}</b> : <span className="muted">{m.text.length > 70 ? `${m.text.slice(0, 70)}…` : m.text}</span>
          </li>
        ))}
      </ul>
      <button className="link" onClick={() => aller('messages')}>
        Ouvrir les messages
      </button>
    </Card>
  )
}

// ───────── Nouveautés ─────────

function Nouveautes() {
  const s = useStore()
  const liste = nouveautesNonLues(s.nouveautesVues)
  if (liste.length === 0) return null
  return (
    <Card title="✨ Nouveautés" className="nouveautes" actions={<button className="link small" onClick={() => setState({ nouveautesVues: __APP_VERSION__ })}>Masquer</button>}>
      {liste.map((n) => (
        <div key={n.version} className="stack-sm">
          <div className="muted small">
            Version {n.version} — {n.date}
          </div>
          <ul>
            {n.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  )
}
