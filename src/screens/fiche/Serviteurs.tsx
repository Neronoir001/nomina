import type { CaracKey } from '../../lib/pack'
import { CARAC_ABBR } from '../../lib/pack'
import type { Personnage, Serviteur } from '../../lib/personnage'
import { nouveauServiteur } from '../../lib/personnage'
import { useStore } from '../../lib/store'
import { Area, Card, Empty, Field } from '../../ui'
import type { MajPerso } from './Fiche'
import { LISTES } from './Suggestions'

export default function Serviteurs({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const pack = useStore().pack
  const set = (id: string, f: (s: Serviteur) => Serviteur) => maj((x) => ({ ...x, serviteurs: x.serviteurs.map((s) => (s.id === id ? f(s) : s)) }))
  // Genres connus du référentiel, pour les suggestions selon le type choisi
  const profils = (pack?.pouvoirs ?? []).filter((r) => r.serviteur && r.camp === p.camp).map((r) => r.serviteur!)

  return (
    <div className="stack">
      {p.serviteurs.length === 0 && (
        <Card>
          <Empty>
            Aucun serviteur pour l'instant. Un pouvoir qui donne un serviteur (Zombies, Rat, Majordome…) le crée automatiquement ici ; tu peux aussi
            en ajouter un à la main.
          </Empty>
        </Card>
      )}
      {p.serviteurs.map((s, i) => {
        const pouvoir = s.pouvoirId ? p.pouvoirs.find((pw) => pw.id === s.pouvoirId) : undefined
        const genres = [...new Set(profils.filter((pr) => !s.type || pr.type === s.type).map((pr) => pr.genre))]
        const listeGenres = `dl-genres-${s.id}`
        const titre = [s.nom || s.genre || `Serviteur ${i + 1}`, s.nombre && s.nombre !== '1' ? `×${s.nombre}` : ''].filter(Boolean).join(' ')
        const sous = [s.type, s.genre && s.genre !== s.nom ? s.genre : ''].filter(Boolean).join(' – ')
        return (
          <Card
            key={s.id}
            title={
              <span className="serviteur-titre">
                <span className="tronque">{titre}</span>
                {sous && <span className="muted small tronque">{sous}</span>}
              </span>
            }
            actions={
              <button
                className="icon-btn"
                title="Retirer ce serviteur"
                onClick={() => confirm(`Retirer « ${s.nom || s.genre || 'ce serviteur'} » ?`) && maj((x) => ({ ...x, serviteurs: x.serviteurs.filter((y) => y.id !== s.id) }))}
              >
                ✕
              </button>
            }
          >
            <div className="stack">
              {pouvoir && <p className="muted small">Donné par le pouvoir « {pouvoir.nom} ».</p>}
              <div className="grid2">
                <Field label="Type" list={LISTES.typesServiteur} value={s.type} onChange={(v) => set(s.id, (x) => ({ ...x, type: v }))} placeholder="Animal, Humain, Mort-vivant…" />
                <label>
                  Genre
                  <input list={listeGenres} value={s.genre} onChange={(e) => set(s.id, (x) => ({ ...x, genre: e.target.value }))} placeholder="Rat, Majordome, Zombie…" />
                  <datalist id={listeGenres}>
                    {genres.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </label>
                <Field label="Nom" value={s.nom} onChange={(v) => set(s.id, (x) => ({ ...x, nom: v }))} />
                <Field label="Nombre" inputMode="numeric" value={s.nombre} onChange={(v) => set(s.id, (x) => ({ ...x, nombre: v }))} />
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
                    <input className="grow" list={LISTES.talents} value={t.nom} placeholder="Talent" onChange={(e) => set(s.id, (x) => ({ ...x, talents: x.talents.map((y, k) => (k === j ? { ...y, nom: e.target.value } : y)) }))} />
                    <input className="mini" value={t.niveau} placeholder="Niv" aria-label="Niveau" onChange={(e) => set(s.id, (x) => ({ ...x, talents: x.talents.map((y, k) => (k === j ? { ...y, niveau: e.target.value } : y)) }))} />
                    <input className="mini" value={t.carac} placeholder="Carac" aria-label="Caractéristique" onChange={(e) => set(s.id, (x) => ({ ...x, talents: x.talents.map((y, k) => (k === j ? { ...y, carac: e.target.value } : y)) }))} />
                    <input className="mini" value={t.exp} placeholder="Exp" aria-label="Expérience" onChange={(e) => set(s.id, (x) => ({ ...x, talents: x.talents.map((y, k) => (k === j ? { ...y, exp: e.target.value } : y)) }))} />
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
                    <input className="grow" list={LISTES.pouvoirs} value={pw.nom} placeholder="Pouvoir" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, nom: e.target.value } : y)) }))} />
                    <input className="mini" value={pw.niveau} placeholder="Niv" aria-label="Niveau" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, niveau: e.target.value } : y)) }))} />
                    <input className="mini" value={pw.pp} placeholder="PP" aria-label="Coût en PP" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, pp: e.target.value } : y)) }))} />
                    <input className="grow" value={pw.notes} placeholder="Notes" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, notes: e.target.value } : y)) }))} />
                    <button className="icon-btn" onClick={() => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.filter((_, k) => k !== j) }))} title="Retirer">
                      ✕
                    </button>
                  </div>
                ))}
                <button className="link small" onClick={() => set(s.id, (x) => ({ ...x, pouvoirs: [...x.pouvoirs, { nom: '', niveau: '', pp: '', notes: '' }] }))}>
                  ＋ Pouvoir
                </button>
              </div>

              <Area label="Équipement, notes" value={s.equipement} onChange={(v) => set(s.id, (x) => ({ ...x, equipement: v }))} rows={2} />
            </div>
          </Card>
        )
      })}
      <button className="btn btn-primary" onClick={() => maj((x) => ({ ...x, serviteurs: [...x.serviteurs, nouveauServiteur()] }))}>
        ＋ Ajouter un serviteur
      </button>
      <Card title="Notes">
        <Area label="Notes sur les serviteurs" value={p.notes.serviteurs} onChange={(v) => maj((x) => ({ ...x, notes: { ...x.notes, serviteurs: v } }))} />
      </Card>
    </div>
  )
}
