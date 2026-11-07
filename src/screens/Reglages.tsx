import { useState } from 'react'
import { exporterPack, exporterTout, importerFichier } from '../lib/fichiers'
import { verifierMaj } from '../lib/maj'
import { roleLabel } from '../lib/p2p'
import { setState, useStore } from '../lib/store'
import { Card, Empty, FilePick } from '../ui'
import Diagnostic from './Diagnostic'
import Profil from './Profil'

export default function Reglages() {
  const s = useStore()
  const [msg, setMsg] = useState<string | null>(null)
  const [profil, setProfil] = useState(false)
  const [diag, setDiag] = useState(false)
  const [copie, setCopie] = useState(false)
  const nb = Object.keys(s.personnages).length

  if (diag)
    return (
      <div className="stack">
        <button className="link" onClick={() => setDiag(false)}>
          ← Retour aux réglages
        </button>
        <Diagnostic />
      </div>
    )

  const importer = (f: File) => void importerFichier(f).then(setMsg)

  const texteSignalements = () =>
    [`Signalements Nomina (${s.profile?.name}) — ${new Date().toLocaleString('fr-FR')}`, ...s.signalements.map((x) => `- [${x.cible}] ${x.libelle} : ${x.texte}`)].join('\n')

  return (
    <div className="stack">
      <Card title="Mon profil" actions={<button className="btn" onClick={() => setProfil(true)}>Modifier</button>}>
        <p>
          {s.profile?.name} · {roleLabel(s.profile?.role)}
        </p>
      </Card>

      <Card title="Sauvegardes">
        <div className="stack">
          <p className="muted small">
            {nb} personnage(s) sur cet appareil. Pense à faire une sauvegarde de temps en temps : si l'appli est supprimée, ses données le sont aussi.
          </p>
          <button className="btn btn-primary" onClick={() => void exporterTout()} disabled={nb === 0}>
            📤 Sauvegarder tous mes personnages
          </button>
          <FilePick label="📥 Restaurer / importer un fichier" onFile={importer} />
          {msg && <p className="note-ok">{msg}</p>}
        </div>
      </Card>

      <Card title="Référentiel">
        {s.pack ? (
          <div className="stack">
            <p>
              <b>{s.pack.titre}</b> — version {s.pack.version} du {new Date(s.pack.date).toLocaleDateString('fr-FR')}
            </p>
            <p className="muted small">
              {s.pack.superieurs.length} supérieurs · {s.pack.pouvoirs.length} pouvoirs · {s.pack.talents.length} talents · {s.pack.limitations.length} limitations
            </p>
            <FilePick label="📥 Installer un autre fichier de référentiel" onFile={importer} />
            {s.profile?.role === 'mj' && (
              <button className="btn" onClick={() => void exporterPack()}>
                📤 Partager le fichier du référentiel
              </button>
            )}
            <p className="muted small">
              Le référentiel n'est jamais publié en ligne : il passe d'appareil à appareil (Table du MJ ou fichier).
            </p>
          </div>
        ) : (
          <div className="stack">
            <Empty>Aucun référentiel installé.</Empty>
            <FilePick label="📥 Importer le fichier du référentiel" className="btn btn-primary" onFile={importer} />
          </div>
        )}
      </Card>

      <Card title={`Signalements (${s.signalements.length})`}>
        {s.signalements.length === 0 ? (
          <Empty>Utilise « ⚑ Signaler une erreur » dans le référentiel quand une information te semble fausse.</Empty>
        ) : (
          <div className="stack">
            <ul className="plain small">
              {s.signalements.map((x) => (
                <li key={x.id}>
                  <b>{x.libelle}</b> : {x.texte}
                </li>
              ))}
            </ul>
            <div className="row">
              <button
                className="btn btn-primary"
                onClick={() =>
                  void navigator.clipboard.writeText(texteSignalements()).then(() => {
                    setCopie(true)
                    setTimeout(() => setCopie(false), 2500)
                  })
                }
              >
                {copie ? 'Copié ✅' : 'Copier pour Claude'}
              </button>
              <button className="btn" onClick={() => confirm('Effacer tous les signalements ?') && setState({ signalements: [] })}>
                Vider
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Assistance">
        <div className="stack">
          <button className="btn" onClick={() => setDiag(true)}>
            🩺 Diagnostic de connexion
          </button>
          <MiseAJour />
        </div>
      </Card>

      {profil && <Profil onClose={() => setProfil(false)} />}
    </div>
  )
}

function MiseAJour() {
  const [etat, setEtat] = useState<'' | 'en-cours' | 'maj' | 'a-jour' | 'hors-ligne' | 'indisponible'>('')
  const messages = {
    '': '',
    'en-cours': 'Recherche en cours…',
    maj: 'Une nouvelle version arrive : touche « Mettre à jour » dans le bandeau qui va apparaître en haut.',
    'a-jour': 'Nomina est à jour.',
    'hors-ligne': "Pas de connexion internet : impossible de vérifier pour l'instant.",
    indisponible: "La vérification n'est possible que dans l'appli publiée (pas dans cet aperçu).",
  }
  return (
    <div className="stack">
      <p className="muted small">Nomina version {__APP_VERSION__}.</p>
      <button
        className="btn"
        disabled={etat === 'en-cours'}
        onClick={() => {
          setEtat('en-cours')
          void verifierMaj().then(setEtat)
        }}
      >
        🔄 Rechercher une mise à jour
      </button>
      {etat && <p className={etat === 'a-jour' || etat === 'maj' ? 'note-ok' : 'muted small'}>{messages[etat]}</p>}
    </div>
  )
}
