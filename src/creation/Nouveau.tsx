// Choix « création guidée » ou « fiche vierge » pour un nouveau personnage.
import type { Camp } from '../lib/pack'
import { nouveauPersonnage } from '../lib/personnage'
import { creerPerso, setState, useStore } from '../lib/store'
import { demarrerCreation } from './Assistant'
import { profilActif } from './profil'

export function ChoixNouveau({ onDone }: { onDone: () => void }) {
  const s = useStore()
  const b = s.brouillonCreation
  const guidee = (camp: Camp) => {
    demarrerCreation(camp)
    onDone()
  }
  const vierge = (camp: Camp) => {
    creerPerso(nouveauPersonnage(camp))
    onDone()
  }
  return (
    <div className="stack">
      {b && (
        <button
          className="btn btn-primary"
          onClick={() => {
            setState({ creationOuverte: true })
            onDone()
          }}
        >
          ▶ Reprendre la création en cours{b.nom || b.nomCouverture ? ` (${b.nom || b.nomCouverture})` : ''}
        </button>
      )}
      <div className="stack-sm">
        <b>🧭 Création guidée</b>
        <span className="muted small">
          Pas à pas, avec les points à répartir{profilActif().tirage === 'des' ? ' et les tirages au dé' : ''}. Règles : {profilActif().nom}.
        </span>
      </div>
      <div className="grid2">
        <button className="btn big-choice ins" onClick={() => guidee('INS')}>
          😈
          <span>Démon</span>
          <small>In Nomine Satanis</small>
        </button>
        <button className="btn big-choice mv" onClick={() => guidee('MV')}>
          😇
          <span>Ange</span>
          <small>Magna Veritas</small>
        </button>
      </div>
      <div className="stack-sm">
        <b>📄 Fiche vierge</b>
        <span className="muted small">Pour recopier un personnage existant ou tout remplir soi-même.</span>
        <div className="row">
          <button className="btn btn-small" onClick={() => vierge('INS')}>
            😈 Démon vierge
          </button>
          <button className="btn btn-small" onClick={() => vierge('MV')}>
            😇 Ange vierge
          </button>
        </div>
      </div>
    </div>
  )
}
