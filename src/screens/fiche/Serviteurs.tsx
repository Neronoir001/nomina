import type { CaracKey } from '../../lib/pack'
import { CARAC_ABBR } from '../../lib/pack'
import type { Personnage, Serviteur } from '../../lib/personnage'
import { nouveauServiteur } from '../../lib/personnage'
import { Area, Card, Empty, Field } from '../../ui'
import type { MajPerso } from './Fiche'

export default function Serviteurs({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const set = (id: string, f: (s: Serviteur) => Serviteur) => maj((x) => ({ ...x, serviteurs: x.serviteurs.map((s) => (s.id === id ? f(s) : s)) }))

  return (
    <div className="stack">
      {p.serviteurs.length === 0 && (
        <Card>
          <Empty>Aucun serviteur pour l'instant.</Empty>
        </Card>
      )}
      {p.serviteurs.map((s, i) => (
        <Card
          key={s.id}
          title={s.nom || `Serviteur ${i + 1}`}
          actions={
            <button
              className="icon-btn"
              title="Retirer ce serviteur"
              onClick={() => confirm(`Retirer « ${s.nom || 'ce serviteur'} » ?`) && maj((x) => ({ ...x, serviteurs: x.serviteurs.filter((y) => y.id !== s.id) }))}
            >
              ✕
            </button>
          }
        >
          <div className="stack">
            <div className="grid2">
              <Field label="Type" value={s.type} onChange={(v) => set(s.id, (x) => ({ ...x, type: v }))} placeholder="familier, humain, mort-vivant…" />
              <Field label="Nom" value={s.nom} onChange={(v) => set(s.id, (x) => ({ ...x, nom: v }))} />
            </div>
            <div className="grid-caracs">
              {(Object.keys(CARAC_ABBR) as CaracKey[]).map((k) => (
                <label key={k}>
                  {CARAC_ABBR[k]}
                  <input className="center" inputMode="numeric" value={s.caracs[k]} onChange={(e) => set(s.id, (x) => ({ ...x, caracs: { ...x.caracs, [k]: e.target.value } }))} />
                </label>
              ))}
              <label>
                PP
                <input className="center" inputMode="numeric" value={s.pp} onChange={(e) => set(s.id, (x) => ({ ...x, pp: e.target.value }))} />
              </label>
            </div>

            <div>
              <div className="sub-head">Talents</div>
              {s.talents.map((t, j) => (
                <div key={j} className="row serv-row">
                  <input className="grow" value={t.nom} placeholder="Talent" onChange={(e) => set(s.id, (x) => ({ ...x, talents: x.talents.map((y, k) => (k === j ? { ...y, nom: e.target.value } : y)) }))} />
                  <input className="mini" value={t.niveau} placeholder="Niv" onChange={(e) => set(s.id, (x) => ({ ...x, talents: x.talents.map((y, k) => (k === j ? { ...y, niveau: e.target.value } : y)) }))} />
                  <input className="mini" value={t.carac} placeholder="Carac" onChange={(e) => set(s.id, (x) => ({ ...x, talents: x.talents.map((y, k) => (k === j ? { ...y, carac: e.target.value } : y)) }))} />
                  <input className="mini" value={t.exp} placeholder="Exp" onChange={(e) => set(s.id, (x) => ({ ...x, talents: x.talents.map((y, k) => (k === j ? { ...y, exp: e.target.value } : y)) }))} />
                  <button className="icon-btn" onClick={() => set(s.id, (x) => ({ ...x, talents: x.talents.filter((_, k) => k !== j) }))} title="Retirer">
                    ✕
                  </button>
                </div>
              ))}
              <button className="link small" onClick={() => set(s.id, (x) => ({ ...x, talents: [...x.talents, { nom: '', niveau: '', carac: '', exp: '' }] }))}>
                ＋ Talent
              </button>
            </div>

            <div>
              <div className="sub-head">Pouvoirs</div>
              {s.pouvoirs.map((pw, j) => (
                <div key={j} className="row serv-row">
                  <input className="grow" value={pw.nom} placeholder="Pouvoir" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, nom: e.target.value } : y)) }))} />
                  <input className="mini" value={pw.pp} placeholder="PP" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, pp: e.target.value } : y)) }))} />
                  <input className="grow" value={pw.notes} placeholder="Notes" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, notes: e.target.value } : y)) }))} />
                  <button className="icon-btn" onClick={() => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.filter((_, k) => k !== j) }))} title="Retirer">
                    ✕
                  </button>
                </div>
              ))}
              <button className="link small" onClick={() => set(s.id, (x) => ({ ...x, pouvoirs: [...x.pouvoirs, { nom: '', pp: '', notes: '' }] }))}>
                ＋ Pouvoir
              </button>
            </div>

            <Area label="Équipement" value={s.equipement} onChange={(v) => set(s.id, (x) => ({ ...x, equipement: v }))} rows={2} />
          </div>
        </Card>
      ))}
      <button className="btn btn-primary" onClick={() => maj((x) => ({ ...x, serviteurs: [...x.serviteurs, nouveauServiteur()] }))}>
        ＋ Ajouter un serviteur
      </button>
      <Card title="Notes">
        <Area label="Notes sur les serviteurs" value={p.notes.serviteurs} onChange={(v) => maj((x) => ({ ...x, notes: { ...x.notes, serviteurs: v } }))} />
      </Card>
    </div>
  )
}
