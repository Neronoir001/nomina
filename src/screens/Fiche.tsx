import { mjPeerIds, sendSheet } from '../lib/p2p'
import { heure, setState, useStore } from '../lib/store'
import type { Sheet } from '../lib/types'

const CARACS: { k: keyof Sheet; label: string }[] = [
  { k: 'fo', label: 'Force' },
  { k: 'ag', label: 'Agilité' },
  { k: 'vo', label: 'Volonté' },
  { k: 'pr', label: 'Précision' },
  { k: 'pe', label: 'Perception' },
  { k: 'ap', label: 'Apparence' },
]

export default function Fiche() {
  const s = useStore()
  const f = s.sheet
  const set = (patch: Partial<Sheet>) => setState((st) => ({ sheet: { ...st.sheet, ...patch, updatedAt: Date.now() } }))
  const num = (k: keyof Sheet) => (e: React.ChangeEvent<HTMLInputElement>) => set({ [k]: Number(e.target.value) || 0 } as Partial<Sheet>)
  const mjConnecte = mjPeerIds().length > 0

  return (
    <div className="stack">
      <div className="card note">
        Fiche <b>simplifiée</b> pour le test de synchronisation. Elle est enregistrée automatiquement sur cet appareil.
      </div>

      <section className={`card stack sheet-${f.camp.toLowerCase()}`}>
        <div className="seg">
          <button className={f.camp === 'INS' ? 'on' : ''} onClick={() => set({ camp: 'INS' })}>
            😈 Démon (INS)
          </button>
          <button className={f.camp === 'MV' ? 'on' : ''} onClick={() => set({ camp: 'MV' })}>
            😇 Ange (MV)
          </button>
        </div>
        <label>
          Nom de couverture
          <input value={f.nomCouverture} onChange={(e) => set({ nomCouverture: e.target.value })} />
        </label>
        <div className="grid2">
          <label>
            Nom
            <input value={f.nom} onChange={(e) => set({ nom: e.target.value })} />
          </label>
          <label>
            Grade
            <input value={f.grade} onChange={(e) => set({ grade: e.target.value })} />
          </label>
        </div>
        <label>
          Supérieur
          <input value={f.superieur} onChange={(e) => set({ superieur: e.target.value })} placeholder={f.camp === 'INS' ? 'Prince-Démon' : 'Archange'} />
        </label>
      </section>

      <section className="card">
        <h3>Caractéristiques</h3>
        <div className="grid3">
          {CARACS.map((c) => (
            <label key={c.k} className="carac">
              {c.label}
              <input type="number" inputMode="numeric" min={0} max={9} value={f[c.k] as number} onChange={num(c.k)} />
            </label>
          ))}
        </div>
        <div className="grid3">
          <label className="carac">
            PP actuels
            <input type="number" inputMode="numeric" value={f.pp} onChange={num('pp')} />
          </label>
          <label className="carac">
            PP max
            <input type="number" inputMode="numeric" value={f.ppMax} onChange={num('ppMax')} />
          </label>
          <label className="carac">
            Blessures
            <input type="number" inputMode="numeric" value={f.blessures} onChange={num('blessures')} />
          </label>
        </div>
      </section>

      <section className="card">
        <label>
          Notes
          <textarea rows={4} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </section>

      {s.profile?.role === 'joueur' && (
        <section className="card stack">
          <button className="btn btn-primary" disabled={!mjConnecte} onClick={() => void sendSheet()}>
            Envoyer ma fiche au MJ
          </button>
          <p className="muted small">
            {mjConnecte ? 'Le MJ est connecté.' : "Le MJ n'est pas connecté : rejoins d'abord la Table."}
            {s.sheetAckAt && ` Dernière réception confirmée par le MJ à ${heure(s.sheetAckAt)}.`}
          </p>
        </section>
      )}
    </div>
  )
}
