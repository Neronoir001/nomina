import { useState } from 'react'
import { exporterPerso, importerFichier } from '../../lib/fichiers'
import type { Camp } from '../../lib/pack'
import type { Personnage } from '../../lib/personnage'
import { nomAffiche, nouveauPersonnage } from '../../lib/personnage'
import { uid } from '../../lib/storage'
import { creerPerso, listePersos, majPerso, persoActif, setState, supprimerPerso, useStore } from '../../lib/store'
import { FilePick, Modal, Seg } from '../../ui'
import { BoutonJetMJ, BoutonJetSecret } from '../../JetSecret'
import Identite from './Identite'
import Pouvoirs from './Pouvoirs'
import Serviteurs from './Serviteurs'
import Suggestions from './Suggestions'
import Superieur from './Superieur'
import Talents from './Talents'

type Onglet = 'identite' | 'talents' | 'pouvoirs' | 'superieur' | 'serviteurs'

export type MajPerso = (f: (p: Personnage) => Personnage) => void

export default function Fiche() {
  const s = useStore()
  const perso = persoActif(s)
  const [onglet, setOnglet] = useState<Onglet>('identite')
  const [menu, setMenu] = useState(false)
  const [creation, setCreation] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!perso) {
    return (
      <div className="stack">
        <section className="card stack center">
          <h2>Aucun personnage</h2>
          <p className="muted">Crée ton premier personnage, ou importe-en un depuis un fichier.</p>
          <NouveauBoutons onDone={() => undefined} />
          <FilePick label="Importer un personnage" onFile={(f) => void importerFichier(f).then(setMsg)} />
          {msg && <p className="note-ok">{msg}</p>}
        </section>
      </div>
    )
  }

  const maj: MajPerso = (f) => majPerso(perso.id, f)
  const persos = listePersos(s)

  return (
    <div className={`stack camp-${perso.camp.toLowerCase()}`}>
      <div className="perso-bar">
        <select
          value={perso.id}
          onChange={(e) => setState({ actifId: e.target.value })}
          aria-label="Personnage affiché"
          className="perso-select"
        >
          {persos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.camp === 'INS' ? '😈' : '😇'} {nomAffiche(p)}
            </option>
          ))}
        </select>
        {s.profile?.role === 'mj' ? (
          <BoutonJetMJ perso={perso} joueurNom="" label="🎲" className="btn" />
        ) : (
          <BoutonJetSecret perso={perso} label="🎲" />
        )}
        <button className="btn" onClick={() => setCreation(true)} title="Nouveau personnage">
          ＋
        </button>
        <button className="btn" onClick={() => setMenu(true)} title="Autres actions">
          ⋯
        </button>
      </div>

      <div className="fiche-tabs">
        <Seg
          small
          value={onglet}
          onChange={setOnglet}
          options={[
            { id: 'identite', label: 'Identité' },
            { id: 'talents', label: 'Talents' },
            { id: 'pouvoirs', label: 'Pouvoirs' },
            { id: 'superieur', label: perso.camp === 'INS' ? 'Prince' : 'Archange' },
            { id: 'serviteurs', label: 'Serviteurs' },
          ]}
        />
      </div>

      {onglet === 'identite' && <Identite perso={perso} maj={maj} />}
      {onglet === 'talents' && <Talents perso={perso} maj={maj} />}
      {onglet === 'pouvoirs' && <Pouvoirs perso={perso} maj={maj} />}
      {onglet === 'superieur' && <Superieur perso={perso} maj={maj} />}
      {onglet === 'serviteurs' && <Serviteurs perso={perso} maj={maj} />}

      <p className="muted small center">Enregistré automatiquement sur cet appareil.</p>
      <Suggestions camp={perso.camp} />

      {creation && (
        <Modal title="Nouveau personnage" onClose={() => setCreation(false)}>
          <NouveauBoutons onDone={() => setCreation(false)} />
        </Modal>
      )}

      {menu && (
        <Modal title={nomAffiche(perso)} onClose={() => setMenu(false)}>
          <div className="stack">
            <button className="btn" onClick={() => void exporterPerso(perso).then(() => setMenu(false))}>
              📤 Exporter / partager ce personnage
            </button>
            <FilePick
              label="📥 Importer un personnage"
              onFile={(f) =>
                void importerFichier(f).then((m) => {
                  setMenu(false)
                  alert(m)
                })
              }
            />
            <button
              className="btn"
              onClick={() => {
                const copie: Personnage = structuredClone(perso)
                copie.id = uid()
                copie.identite.nom = `${nomAffiche(perso)} (copie)`
                copie.createdAt = copie.updatedAt = Date.now()
                creerPerso(copie)
                setMenu(false)
              }}
            >
              📑 Dupliquer
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`Supprimer définitivement « ${nomAffiche(perso)} » de cet appareil ?\n\nConseil : exporte-le d'abord si tu veux en garder une copie.`)) {
                  supprimerPerso(perso.id)
                  setMenu(false)
                }
              }}
            >
              🗑️ Supprimer ce personnage
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function NouveauBoutons({ onDone }: { onDone: () => void }) {
  const creer = (camp: Camp) => {
    creerPerso(nouveauPersonnage(camp))
    onDone()
  }
  return (
    <div className="grid2">
      <button className="btn big-choice ins" onClick={() => creer('INS')}>
        😈
        <span>Démon</span>
        <small>In Nomine Satanis</small>
      </button>
      <button className="btn big-choice mv" onClick={() => creer('MV')}>
        😇
        <span>Ange</span>
        <small>Magna Veritas</small>
      </button>
    </div>
  )
}
