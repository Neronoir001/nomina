import { useMemo, useState } from 'react'
import type { LimitationRef, PouvoirRef } from '../../lib/pack'
import type { LimitationPerso, Personnage, PouvoirPerso } from '../../lib/personnage'
import { nouveauPouvoir } from '../../lib/personnage'
import { uid } from '../../lib/storage'
import { useStore } from '../../lib/store'
import { Area, Card, Empty, Info, Modal } from '../../ui'
import { FichePouvoir } from '../referentiel/Details'
import type { MajPerso } from './Fiche'

const COLS: { k: keyof PouvoirPerso; label: string; w?: string }[] = [
  { k: 'type', label: 'Type' },
  { k: 'cout', label: 'Coût' },
  { k: 'niveau', label: 'Niv.' },
  { k: 'portee', label: 'Portée' },
  { k: 'att', label: 'Att.' },
  { k: 'def', label: 'Déf.' },
  { k: 'num', label: 'Num' },
]

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function Pouvoirs({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const pack = useStore().pack
  const [choix, setChoix] = useState<'pouvoir' | 'limitation' | null>(null)
  const sup = pack?.superieurs.find((s) => s.id === p.identite.superieurId)
  const privilegies = new Set((sup?.pouvoirsPrivilegies ?? []).map(norm))

  const setPouvoir = (id: string, patch: Partial<PouvoirPerso>) =>
    maj((x) => ({ ...x, pouvoirs: x.pouvoirs.map((y) => (y.id === id ? { ...y, ...patch } : y)) }))
  const setLim = (id: string, patch: Partial<LimitationPerso>) =>
    maj((x) => ({ ...x, limitations: x.limitations.map((y) => (y.id === id ? { ...y, ...patch } : y)) }))

  const ajouterPouvoir = (r?: PouvoirRef) => {
    const np = nouveauPouvoir()
    if (r) Object.assign(np, { refId: r.id, nom: r.nom, type: r.type ?? '', cout: r.cout ?? '', portee: r.portee ?? '', att: r.carac ?? '', def: r.defense ?? '', num: r.d666 ?? '' })
    maj((x) => ({ ...x, pouvoirs: [...x.pouvoirs, np] }))
    setChoix(null)
  }
  const ajouterLim = (r?: LimitationRef) => {
    maj((x) => ({ ...x, limitations: [...x.limitations, { id: uid(), refId: r?.id, nom: r?.nom ?? '', notes: '' }] }))
    setChoix(null)
  }

  return (
    <div className="stack">
      <Card
        title={`Pouvoirs (${p.pouvoirs.length})`}
        actions={
          <>
            {pack && (
              <button className="btn btn-primary" onClick={() => setChoix('pouvoir')}>
                ＋ Depuis le référentiel
              </button>
            )}
            <button className="btn" onClick={() => ajouterPouvoir()}>
              ＋ Libre
            </button>
          </>
        }
      >
        {p.pouvoirs.length === 0 && <Empty>Aucun pouvoir pour l'instant.</Empty>}
        <div className="stack">
          {p.pouvoirs.map((pw) => {
            const ref = pw.refId ? pack?.pouvoirs.find((r) => r.id === pw.refId) : undefined
            return (
              <div key={pw.id} className="pouvoir-row">
                <div className="row">
                  <input className="pouvoir-nom" value={pw.nom} onChange={(e) => setPouvoir(pw.id, { nom: e.target.value })} placeholder="Nom du pouvoir" aria-label="Nom du pouvoir" />
                  {privilegies.has(norm(pw.nom)) && <span className="tag" title="Pouvoir privilégié de ton supérieur">privilégié</span>}
                  {ref && (
                    <Info title={ref.nom}>
                      <FichePouvoir r={ref} />
                    </Info>
                  )}
                  <button
                    className="icon-btn"
                    title="Retirer ce pouvoir"
                    onClick={() => confirm(`Retirer « ${pw.nom || 'ce pouvoir'} » ?`) && maj((x) => ({ ...x, pouvoirs: x.pouvoirs.filter((y) => y.id !== pw.id) }))}
                  >
                    ✕
                  </button>
                </div>
                <div className="pouvoir-cols">
                  {COLS.map((c) => (
                    <label key={c.k}>
                      {c.label}
                      <input value={pw[c.k] as string} onChange={(e) => setPouvoir(pw.id, { [c.k]: e.target.value })} />
                    </label>
                  ))}
                </div>
                <input className="pouvoir-notes" value={pw.notes} onChange={(e) => setPouvoir(pw.id, { notes: e.target.value })} placeholder="Notes (choix faits, variantes…)" />
              </div>
            )
          })}
        </div>
      </Card>

      <Card
        title={`Limitations (${p.limitations.length})`}
        actions={
          <>
            {pack && pack.limitations.length > 0 && (
              <button className="btn" onClick={() => setChoix('limitation')}>
                ＋ Référentiel
              </button>
            )}
            <button className="btn" onClick={() => ajouterLim()}>
              ＋ Libre
            </button>
          </>
        }
      >
        {p.limitations.length === 0 && <Empty>Aucune limitation.</Empty>}
        {p.limitations.map((l) => {
          const ref = l.refId ? pack?.limitations.find((r) => r.id === l.refId) : undefined
          return (
            <div key={l.id} className="row lim-row">
              <input value={l.nom} onChange={(e) => setLim(l.id, { nom: e.target.value })} placeholder="Limitation" className="grow" />
              {ref?.resume && (
                <Info title={ref.nom}>
                  <p>{ref.resume}</p>
                  {ref.page && <p className="muted small">Référence : {ref.page}</p>}
                </Info>
              )}
              <input value={l.notes} onChange={(e) => setLim(l.id, { notes: e.target.value })} placeholder="Notes" className="grow" />
              <button className="icon-btn" title="Retirer" onClick={() => maj((x) => ({ ...x, limitations: x.limitations.filter((y) => y.id !== l.id) }))}>
                ✕
              </button>
            </div>
          )
        })}
      </Card>

      <Card title="Notes">
        <Area label="Notes sur les pouvoirs" value={p.notes.pouvoirs} onChange={(v) => maj((x) => ({ ...x, notes: { ...x.notes, pouvoirs: v } }))} />
      </Card>

      {choix === 'pouvoir' && pack && (
        <Chooser
          title="Ajouter un pouvoir"
          items={pack.pouvoirs.filter((r) => r.camp === p.camp)}
          sub={(r) => [r.rubrique, r.cout, r.type].filter(Boolean).join(' · ')}
          mark={(r) => privilegies.has(norm(r.nom)) || r.superieur === p.identite.superieurId}
          onPick={ajouterPouvoir}
          onClose={() => setChoix(null)}
        />
      )}
      {choix === 'limitation' && pack && (
        <Chooser
          title="Ajouter une limitation"
          items={pack.limitations.filter((r) => r.camp === p.camp)}
          sub={(r) => r.d66 ?? ''}
          onPick={ajouterLim}
          onClose={() => setChoix(null)}
        />
      )}
    </div>
  )
}

function Chooser<T extends { id: string; nom: string; resume?: string }>(p: {
  title: string
  items: T[]
  sub: (t: T) => string
  mark?: (t: T) => boolean
  onPick: (t: T) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const n = norm(q)
    return p.items.filter((i) => !n || norm(i.nom).includes(n) || norm(i.resume ?? '').includes(n)).slice(0, 200)
  }, [q, p.items])
  return (
    <Modal title={p.title} onClose={p.onClose} wide>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" />
      <ul className="pick-list">
        {list.map((i) => (
          <li key={i.id}>
            <button onClick={() => p.onPick(i)}>
              <b>{i.nom}</b>
              {p.mark?.(i) && <span className="tag">privilégié</span>}
              <span className="muted small"> {p.sub(i)}</span>
              {i.resume && <span className="muted small pick-resume">{i.resume}</span>}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="muted">Aucun résultat.</li>}
      </ul>
    </Modal>
  )
}
