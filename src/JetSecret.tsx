// Jets secrets : demande du joueur, jet du MJ, fenêtre de résultat et journal.
import { useState } from 'react'
import type { JetSecret, LigneDiff, Option, Test } from './lib/jets'
import { DIFFICULTES, nomDifficulte, nouveauJet, optionsDe, verdict } from './lib/jets'
import type { Personnage } from './lib/personnage'
import { nomAffiche } from './lib/personnage'
import { demanderJet, mjPeerIds } from './lib/p2p'
import { uid } from './lib/storage'
import { heure, setState, useStore } from './lib/store'
import { Choix, Field, Modal, Seg, Stepper } from './ui'

function useOptions(perso?: Personnage): Option[] {
  const pack = useStore().pack
  return perso ? optionsDe(perso, pack?.talents ?? []) : []
}

// ───────── Joueur : demander un jet secret ─────────

export function BoutonJetSecret({ perso, className, label }: { perso: Personnage; className?: string; label?: string }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <button className={className ?? 'btn'} onClick={() => setOuvert(true)} title="Jet secret : seul le MJ verra le résultat" aria-label="Jet secret">
        {label ?? '🎲 Jet secret'}
      </button>
      {ouvert && <FenetreDemande perso={perso} onClose={() => setOuvert(false)} />}
    </>
  )
}

function FenetreDemande({ perso, onClose }: { perso: Personnage; onClose: () => void }) {
  const s = useStore()
  const options = useOptions(perso)
  const [choix, setChoix] = useState('')
  const [note, setNote] = useState('')
  const [envoi, setEnvoi] = useState<string | null>(null)
  const mjLa = Object.values(s.peers).some((p) => p.role === 'mj')
  const opt = options.find((o) => o.id === choix)
  const etat = envoi ? s.jetsDemandes[envoi] : undefined

  return (
    <Modal title="🎲 Jet secret" onClose={onClose}>
      <div className="stack">
        <p className="muted small">
          Les dés sont lancés chez le MJ : <b>lui seul</b> verra le résultat. Les autres joueurs ne sauront même pas qu'un jet a eu lieu.
        </p>
        {envoi ? (
          <>
            <p className={etat === 'recu' ? 'note-ok' : 'muted'}>{etat === 'recu' ? '✓ Le MJ a reçu ta demande et lancé les dés.' : '⏳ Envoi au MJ…'}</p>
            <div className="row">
              <button
                className="btn"
                onClick={() => {
                  setEnvoi(null)
                  setNote('')
                }}
              >
                Autre jet
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Fermer
              </button>
            </div>
          </>
        ) : (
          <>
            <Choix
              label="Ce que tu tentes"
              titre="Talent ou caractéristique"
              placeholder="— Choisir un talent ou une caractéristique —"
              options={options.map((o) => ({ id: o.id, label: o.quoi, detail: o.groupe }))}
              value={choix}
              onChange={setChoix}
            />
            <Field label="Précision pour le MJ (facultatif)" value={note} onChange={setNote} placeholder="Ex. : je fouille discrètement le bureau" />
            {!mjLa && <p className="alert">Le MJ doit être connecté à la Table pour recevoir ton jet.</p>}
            <button
              className="btn btn-primary"
              disabled={!opt || !mjLa}
              onClick={async () => {
                if (!opt) return
                const id = uid()
                const ok = await demanderJet({ id, quoi: opt.quoi, valeur: opt.valeur, ligne: opt.ligne, decalage: opt.decalage, persoNom: nomAffiche(perso), note: note.trim() })
                if (ok) setEnvoi(id)
              }}
            >
              Envoyer au MJ
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ───────── MJ : lancer un jet secret pour un joueur (ou un jet libre) ─────────

export function BoutonJetMJ({ perso, joueurNom, label, className }: { perso?: Personnage; joueurNom: string; label?: string; className?: string }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <button className={className ?? 'btn btn-small'} onClick={() => setOuvert(true)}>
        {label ?? '🎲 Jet secret'}
      </button>
      {ouvert && <FenetreJetMJ perso={perso} joueurNom={joueurNom} onClose={() => setOuvert(false)} />}
    </>
  )
}

function FenetreJetMJ({ perso, joueurNom, onClose }: { perso?: Personnage; joueurNom: string; onClose: () => void }) {
  const options = useOptions(perso)
  const [choix, setChoix] = useState('')
  const [libre, setLibre] = useState({ quoi: '', valeur: 3 })
  const [ligne, setLigne] = useState<LigneDiff | null>(null)
  const [decalage, setDecalage] = useState(0)
  const [note, setNote] = useState('')
  const opt = options.find((o) => o.id === choix)
  const base: Test | null = perso ? (opt ?? null) : { quoi: libre.quoi.trim() || `Valeur ${libre.valeur}`, valeur: libre.valeur, ligne: 'moyen', decalage: 0 }
  const ligneFinale = ligne ?? base?.ligne ?? 'moyen'

  return (
    <Modal title={perso ? `🎲 Jet secret pour ${nomAffiche(perso)}` : '🎲 Jet libre'} onClose={onClose}>
      <div className="stack">
        {perso ? (
          <>
            <p className="muted small">Le joueur n'en saura rien.</p>
            <Choix
              label="Ce qui est testé"
              titre="Talent ou caractéristique"
              options={options.map((o) => ({ id: o.id, label: o.quoi, detail: o.groupe }))}
              value={choix}
              onChange={(id) => {
                setChoix(id)
                setLigne(null)
              }}
            />
          </>
        ) : (
          <div className="grid2">
            <Field label="Quoi (PNJ, action…)" value={libre.quoi} onChange={(v) => setLibre({ ...libre, quoi: v })} />
            <Stepper label="Valeur (1 à 6)" value={libre.valeur} min={1} max={6} onChange={(v) => setLibre({ ...libre, valeur: v })} />
          </div>
        )}
        <div className="stack-sm">
          <span className="stepper-label">Difficulté</span>
          <Seg<LigneDiff> small value={ligneFinale} onChange={setLigne} options={DIFFICULTES.map((d) => ({ id: d.id, label: d.nom }))} />
        </div>
        <Stepper label="Bonus / malus en colonnes" value={decalage} min={-10} max={10} onChange={setDecalage} />
        <Field label="Note (facultatif)" value={note} onChange={setNote} />
        <button
          className="btn btn-primary"
          disabled={!base}
          onClick={() => {
            if (!base) return
            const jet = nouveauJet(
              { ...base, ligne: ligneFinale, decalage: base.decalage + decalage },
              { origine: 'mj', joueurNom, persoNom: perso ? nomAffiche(perso) : '', note: note.trim() },
            )
            setState((s) => ({ jetsSecrets: [jet, ...s.jetsSecrets].slice(0, 200), jetOuvert: jet.id }))
            onClose()
          }}
        >
          Lancer les dés
        </button>
      </div>
    </Modal>
  )
}

// ───────── MJ : résultat d'un jet ─────────

function majJet(id: string, p: Partial<JetSecret>): void {
  setState((s) => ({ jetsSecrets: s.jetsSecrets.map((j) => (j.id === id ? { ...j, ...p } : j)) }))
}

export function FenetreResultat() {
  const s = useStore()
  const jet = s.jetsSecrets.find((j) => j.id === s.jetOuvert)
  if (!jet) return null
  const table = s.pack?.regles?.tableUM
  const v = verdict(jet, table)
  const suivant = s.jetsSecrets.find((j) => j.nouveau && j.id !== jet.id)
  const fermer = () => {
    majJet(jet.id, { nouveau: false })
    setState({ jetOuvert: suivant?.id ?? null })
  }

  return (
    <Modal title="🎲 Jet secret" onClose={fermer}>
      <div className="stack">
        <div>
          <b>{jet.persoNom || jet.joueurNom || 'Jet libre'}</b>
          {jet.persoNom && jet.joueurNom && <span className="muted"> ({jet.joueurNom})</span>}
          <span className="muted small"> · {heure(jet.at)} · {jet.origine === 'joueur' ? 'demandé par le joueur' : 'lancé par toi'}</span>
        </div>
        <p>
          <b>{jet.quoi}</b>
        </p>
        {jet.note && <p className="muted">« {jet.note} »</p>}

        <div className="des" aria-label={`Dés : ${jet.des.join(', ')}`}>
          {jet.des.map((d, i) => (
            <span key={i} className={`de${i === 2 ? ' de-ru' : ''}`}>
              {d}
            </span>
          ))}
        </div>
        <p className="center small muted">
          Résultat <b>{v.resultat}</b> · RU <b>{v.ru}</b>
        </p>

        {v.special && <p className={`special special-${v.special}`}>{v.special === '666' ? '666 : intervention diabolique !' : '111 : intervention divine !'}</p>}

        <p className={`verdict ${v.reussi === true ? 'verdict-ok' : v.reussi === false ? 'verdict-ko' : ''}`}>
          {v.reussi === null
            ? table
              ? 'Hors table'
              : 'Pas de table de potentiel (référentiel manquant)'
            : v.reussi
              ? 'Réussite'
              : 'Échec'}
          {typeof v.seuil === 'number' && <span className="small"> (seuil {v.seuil})</span>}
          {v.seuil === 'auto' && <span className="small"> (réussite automatique)</span>}
          {v.seuil === 'echec' && <span className="small"> (impossible)</span>}
        </p>

        <div className="stack-sm">
          <span className="stepper-label">Difficulté (modifiable)</span>
          <Seg<LigneDiff> small value={jet.ligne} onChange={(l) => majJet(jet.id, { ligne: l })} options={DIFFICULTES.map((d) => ({ id: d.id, label: d.nom }))} />
        </div>
        <Stepper label="Décalage en colonnes" value={jet.decalage} min={-12} max={12} onChange={(d) => majJet(jet.id, { decalage: d })} />

        <button className="btn btn-primary" onClick={fermer}>
          {suivant ? `Jet suivant (${suivant.persoNom || suivant.joueurNom})` : 'Fermer'}
        </button>
      </div>
    </Modal>
  )
}

// ───────── MJ : journal des jets ─────────

export function JournalJets() {
  const s = useStore()
  const table = s.pack?.regles?.tableUM
  const [tous, setTous] = useState(false)
  const liste = tous ? s.jetsSecrets : s.jetsSecrets.slice(0, 10)
  const nouveaux = s.jetsSecrets.filter((j) => j.nouveau).length
  return (
    <section className="card stack">
      <div className="row between">
        <h3>🎲 Jets secrets{nouveaux ? ` — ${nouveaux} nouveau${nouveaux > 1 ? 'x' : ''}` : ''}</h3>
        <BoutonJetMJ joueurNom="" label="🎲 Jet libre" />
      </div>
      <p className="muted small">
        Les jets demandés par les joueurs s'ouvrent tout seuls ici. Pour lancer un jet à l'insu d'un joueur, ouvre sa fiche ci-dessous.
        {mjPeerIds().length > 1 && ' Attention : un autre MJ est connecté à cette table.'}
      </p>
      {s.jetsSecrets.length === 0 ? (
        <p className="muted">Aucun jet pour l'instant.</p>
      ) : (
        <ul className="plain journal-jets">
          {liste.map((j) => {
            const v = verdict(j, table)
            return (
              <li key={j.id}>
                <button className={`jet-ligne${j.nouveau ? ' nouveau' : ''}`} onClick={() => setState({ jetOuvert: j.id })}>
                  <span className={`pastille ${v.reussi === true ? 'ok' : v.reussi === false ? 'ko' : ''}`} aria-hidden />
                  <span className="tronque grow">
                    <b>{j.persoNom || j.joueurNom || 'Jet libre'}</b> · {j.quoi}
                  </span>
                  <span className="muted small">
                    {v.resultat}
                    {v.special ? ` ${v.special}` : ''} · {nomDifficulte(j.ligne)} · {heure(j.at)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="row">
        {s.jetsSecrets.length > 10 && (
          <button className="link small" onClick={() => setTous(!tous)}>
            {tous ? 'Voir moins' : `Voir les ${s.jetsSecrets.length} jets`}
          </button>
        )}
        {s.jetsSecrets.length > 0 && (
          <button className="link danger small" onClick={() => confirm('Effacer tout le journal des jets secrets ?') && setState({ jetsSecrets: [], jetOuvert: null })}>
            Effacer le journal
          </button>
        )}
      </div>
    </section>
  )
}
