// Écrans d'accès à l'espace MJ : création, déverrouillage, passation, nouvelle phrase de passe.
import { useState } from 'react'
import {
  annulerPassation, changerPhrase, creerCoffre, effacerCoffre, estEnveloppe, etatCoffre, genererPhrase, importerCampagne,
  ouvrirCoffre, type Enveloppe,
} from '../../lib/coffre'
import { Card, FilePick } from '../../ui'

/** Champ de phrase de passe : pas de majuscule automatique ni de correction au téléphone. */
export function ChampPhrase(p: { label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean; onEntree?: () => void }) {
  const [voir, setVoir] = useState(false)
  return (
    <label>
      {p.label}
      <div className="row champ-phrase">
        <input
          className="grow mono"
          type={voir ? 'text' : 'password'}
          value={p.value}
          onChange={(e) => p.onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && p.onEntree?.()}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          autoFocus={p.autoFocus}
        />
        <button type="button" className="icon-btn" onClick={() => setVoir(!voir)} aria-label={voir ? 'Masquer' : 'Afficher'} title={voir ? 'Masquer' : 'Afficher'}>
          {voir ? '🙈' : '👁️'}
        </button>
      </div>
    </label>
  )
}

/** Choix d'une phrase de passe : générée (recommandé) ou personnelle. */
export function ChoixPhrase({ bouton, onValider, annuler }: { bouton: string; onValider: (phrase: string) => Promise<void>; annuler?: () => void }) {
  const [phrase, setPhrase] = useState(genererPhrase)
  const [perso, setPerso] = useState(false)
  const [maPhrase, setMaPhrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notee, setNotee] = useState(false)
  const [encours, setEncours] = useState(false)

  const finale = perso ? maPhrase.trim() : phrase
  const erreur = perso
    ? maPhrase.trim().length < 12
      ? 'Au moins 12 caractères (plusieurs mots, c’est plus facile à retenir).'
      : maPhrase !== confirm
        ? 'Les deux saisies ne correspondent pas.'
        : null
    : null

  return (
    <div className="stack">
      {!perso ? (
        <>
          <p className="muted small">Voici ta phrase de passe. Note-la sur papier ou dans un gestionnaire de mots de passe :</p>
          <div className="phrase-passe mono" aria-live="polite">
            {phrase}
          </div>
          <div className="row">
            <button type="button" className="btn btn-small" onClick={() => setPhrase(genererPhrase())}>
              🔄 Une autre
            </button>
            <button type="button" className="btn btn-small" onClick={() => void navigator.clipboard?.writeText(phrase)}>
              📋 Copier
            </button>
            <button type="button" className="link small" onClick={() => setPerso(true)}>
              Choisir la mienne
            </button>
          </div>
        </>
      ) : (
        <>
          <ChampPhrase label="Ma phrase de passe" value={maPhrase} onChange={setMaPhrase} autoFocus />
          <ChampPhrase label="Encore une fois" value={confirm} onChange={setConfirm} />
          {erreur && (maPhrase || confirm) && <p className="muted small">{erreur}</p>}
          <button type="button" className="link small" onClick={() => setPerso(false)}>
            Revenir à une phrase générée
          </button>
        </>
      )}

      <label className="row case">
        <input type="checkbox" checked={notee} onChange={(e) => setNotee(e.target.checked)} />
        <span>J'ai noté ma phrase de passe. Sans elle, personne ne pourra rouvrir l'espace MJ, pas même moi.</span>
      </label>

      <div className="row">
        <button
          className="btn btn-primary"
          disabled={!notee || !!erreur || encours}
          onClick={async () => {
            setEncours(true)
            try {
              await onValider(finale)
            } finally {
              setEncours(false)
            }
          }}
        >
          {encours ? 'Chiffrement…' : bouton}
        </button>
        {annuler && (
          <button className="btn" onClick={annuler}>
            Annuler
          </button>
        )}
      </div>
    </div>
  )
}

// ───────── Aucun espace sur cet appareil ─────────

export function CreationCoffre() {
  const [creer, setCreer] = useState(false)
  return (
    <div className="stack">
      <Card title="🔒 Espace MJ">
        <div className="stack">
          <p>
            Ici, tu prépares ta campagne en secret : notes de scénario, journal des séances, PNJ et règles maison. Tout est <b>chiffré</b> avec une phrase de passe : sans elle, ces données sont illisibles, même en fouillant l'appareil.
          </p>
          {!creer ? (
            <button className="btn btn-primary" onClick={() => setCreer(true)}>
              Créer mon espace MJ
            </button>
          ) : (
            <ChoixPhrase bouton="Créer l'espace MJ" onValider={creerCoffre} annuler={() => setCreer(false)} />
          )}
        </div>
      </Card>
      <Passation />
    </div>
  )
}

// ───────── Espace verrouillé ─────────

export function Deverrouillage() {
  const [phrase, setPhrase] = useState('')
  const [erreur, setErreur] = useState(false)
  const [encours, setEncours] = useState(false)
  const [oubli, setOubli] = useState(false)

  const ouvrir = async () => {
    if (!phrase.trim() || encours) return
    setEncours(true)
    setErreur(false)
    const ok = await ouvrirCoffre(phrase)
    setEncours(false)
    if (!ok) setErreur(true)
    else setPhrase('')
  }

  return (
    <div className="stack">
      <Card title="🔒 Espace MJ verrouillé">
        <div className="stack">
          <ChampPhrase label="Phrase de passe" value={phrase} onChange={setPhrase} autoFocus onEntree={() => void ouvrir()} />
          {erreur && <p className="alert">Phrase de passe incorrecte. Vérifie les tirets et l'orthographe.</p>}
          <div className="row between">
            <button className="btn btn-primary" disabled={!phrase.trim() || encours} onClick={() => void ouvrir()}>
              {encours ? 'Ouverture…' : 'Ouvrir'}
            </button>
            <button className="link small" onClick={() => setOubli(!oubli)}>
              Phrase oubliée ?
            </button>
          </div>
          {oubli && <Oubli />}
        </div>
      </Card>
      <Passation existe />
    </div>
  )
}

function Oubli() {
  const [texte, setTexte] = useState('')
  return (
    <div className="stack signal-box">
      <p className="small">
        Sans la phrase de passe, l'espace MJ ne peut pas être ouvert : c'est ce qui le protège. Si tu as un fichier de campagne exporté et sa phrase, tu peux le réimporter ci-dessous. Sinon, il ne reste qu'à <b>effacer</b> l'espace MJ de cet appareil pour en recréer un vide.
      </p>
      <label>
        Pour effacer, tape EFFACER
        <input value={texte} onChange={(e) => setTexte(e.target.value)} autoCapitalize="characters" />
      </label>
      <button className="btn btn-danger" disabled={texte.trim().toUpperCase() !== 'EFFACER'} onClick={() => void effacerCoffre()}>
        🗑️ Effacer l'espace MJ de cet appareil
      </button>
    </div>
  )
}

// ───────── Passation ─────────

function Passation({ existe }: { existe?: boolean }) {
  const [env, setEnv] = useState<Enveloppe | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [phrase, setPhrase] = useState('')
  const [encours, setEncours] = useState(false)

  const lire = async (f: File) => {
    setMsg(null)
    try {
      const d: unknown = JSON.parse(await f.text())
      if (!estEnveloppe(d)) return setMsg("Ce fichier n'est pas une campagne Nomina.")
      setEnv(d)
    } catch {
      setMsg("Ce fichier n'est pas lisible.")
    }
  }

  const ouvrir = async () => {
    if (!env || encours) return
    if (existe && !confirm("Un espace MJ existe déjà sur cet appareil. La campagne importée le remplacera dès que tu auras choisi ta nouvelle phrase de passe. Continuer ?")) return
    setEncours(true)
    const ok = await importerCampagne(env, phrase)
    setEncours(false)
    if (!ok) setMsg('Phrase de passe incorrecte pour ce fichier.')
  }

  return (
    <Card title="📦 Reprendre une campagne (passation)">
      <div className="stack">
        <p className="muted small">
          Un autre MJ te confie sa campagne ? Importe le fichier qu'il t'a envoyé et tape la phrase de passe qu'il t'a donnée. Nomina te fera ensuite choisir une <b>nouvelle</b> phrase : l'ancienne ne permettra plus d'ouvrir ta copie.
        </p>
        {!env ? (
          <FilePick label="📥 Importer un fichier de campagne" onFile={(f) => void lire(f)} accept=".json,.nomina,application/json" />
        ) : (
          <>
            <p className="small">
              Campagne exportée le <b>{new Date(env.majLe).toLocaleString('fr-FR')}</b>.
            </p>
            <ChampPhrase label="Phrase de passe de l'ancien MJ" value={phrase} onChange={setPhrase} autoFocus onEntree={() => void ouvrir()} />
            <div className="row">
              <button className="btn btn-primary" disabled={!phrase.trim() || encours} onClick={() => void ouvrir()}>
                {encours ? 'Ouverture…' : 'Ouvrir la campagne'}
              </button>
              <button className="btn" onClick={() => setEnv(null)}>
                Annuler
              </button>
            </div>
          </>
        )}
        {msg && <p className="alert">{msg}</p>}
      </div>
    </Card>
  )
}

/** Après une passation : on impose une nouvelle phrase de passe avant d'enregistrer quoi que ce soit. */
export function NouvellePhraseApresPassation() {
  const nom = etatCoffre().contenu?.campagne.nom
  return (
    <Card title="🔑 Nouvelle phrase de passe">
      <div className="stack">
        <p>
          La campagne {nom ? <b>« {nom} »</b> : ''} est ouverte. Choisis maintenant <b>ta</b> phrase de passe : la copie de cet appareil sera rechiffrée avec elle, et l'ancienne phrase ne l'ouvrira plus.
        </p>
        <p className="muted small">L'ancien MJ garde ce qu'il possédait déjà, mais ne pourra pas lire ce que tu ajoutes ensuite.</p>
        <ChoixPhrase bouton="Rechiffrer et enregistrer" onValider={changerPhrase} annuler={annulerPassation} />
      </div>
    </Card>
  )
}
