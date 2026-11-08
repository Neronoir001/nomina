import type { CaracKey } from '../../lib/pack'
import { CARAC_ABBR } from '../../lib/pack'
import type { Personnage, Serviteur } from '../../lib/personnage'
import { nouveauServiteur, profilDe, TYPES_SERVITEUR } from '../../lib/personnage'
import { useEffect } from 'react'
import { caracDuTalent, trouverPouvoir } from '../../lib/referentiel'
import { useStore } from '../../lib/store'
import { Area, Card, Empty, Field, Info, ListeOuLibre } from '../../ui'
import { FichePouvoir } from '../referentiel/Details'
import type { MajPerso } from './Fiche'
import { LISTES } from './Suggestions'

export default function Serviteurs({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const pack = useStore().pack
  const set = (id: string, f: (s: Serviteur) => Serviteur) => maj((x) => ({ ...x, serviteurs: x.serviteurs.map((s) => (s.id === id ? f(s) : s)) }))
  // Genres connus du référentiel, pour les suggestions selon le type choisi
  const profils = (pack?.pouvoirs ?? [])
    .filter((r) => r.camp === p.camp)
    .map((r) => profilDe(r))
    .filter((x): x is NonNullable<typeof x> => !!x)

  // Caractéristique associée remplie automatiquement pour les talents connus du référentiel
  useEffect(() => {
    if (!pack) return
    const manque = p.serviteurs.some((sv) => sv.talents.some((t) => !t.carac && caracDuTalent(pack, t.nom)))
    if (!manque) return
    maj((x) => ({
      ...x,
      serviteurs: x.serviteurs.map((sv) => ({
        ...sv,
        talents: sv.talents.map((t) => (t.carac ? t : { ...t, carac: caracDuTalent(pack, t.nom) })),
      })),
    }))
  }, [p.serviteurs, pack, maj])

  /** Nouveau nom de talent : la caractéristique suit, sauf si elle a été changée à la main. */
  const renommerTalent = (t: Serviteur['talents'][number], nom: string) => {
    const auto = caracDuTalent(pack, t.nom)
    const carac = !t.carac || t.carac === auto ? caracDuTalent(pack, nom) : t.carac
    return { ...t, nom, carac }
  }

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
        const genres = [...new Set(profils.filter((pr) => !s.type || pr.type === s.type).map((pr) => pr.genre))].sort((a, b) => a.localeCompare(b, 'fr'))
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
                <ListeOuLibre label="Type" options={[...TYPES_SERVITEUR]} value={s.type} onChange={(v) =>
                    set(s.id, (x) => ({
                      ...x,
                      type: v,
                      // Un genre de base de l'ancien type n'a plus de sens avec le nouveau
                      genre: profils.some((pr) => pr.type === x.type && pr.genre === x.genre) && !profils.some((pr) => pr.type === v && pr.genre === x.genre) ? '' : x.genre,
                    }))
                  }
                  placeholder="Type de serviteur"
                />
                <ListeOuLibre label="Genre" options={genres} value={s.genre} onChange={(v) => set(s.id, (x) => ({ ...x, genre: v }))} placeholder="Rat, Majordome, Zombie…" />
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
                    <input className="grow" list={LISTES.talents} value={t.nom} placeholder="Talent" onChange={(e) => set(s.id, (x) => ({ ...x, talents: x.talents.map((y, k) => (k === j ? renommerTalent(y, e.target.value) : y)) }))} />
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
                {s.pouvoirs.map((pw, j) => {
                  const ref = trouverPouvoir(pack, pw.nom, p.camp)
                  return (
                  <div key={j} className="row serv-row">
                    {ref ? (
                      <Info title={ref.nom}>
                        <FichePouvoir r={ref} />
                      </Info>
                    ) : (
                      <span className="info-vide" aria-hidden />
                    )}
                    <input className="grow" list={LISTES.pouvoirs} value={pw.nom} placeholder="Pouvoir" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, nom: e.target.value } : y)) }))} />
                    <input className="mini" value={pw.niveau} placeholder="Niv" aria-label="Niveau" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, niveau: e.target.value } : y)) }))} />
                    <input className="mini" value={pw.pp} placeholder="PP" aria-label="Coût en PP" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, pp: e.target.value } : y)) }))} />
                    <input className="grow" value={pw.notes} placeholder="Notes" onChange={(e) => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.map((y, k) => (k === j ? { ...y, notes: e.target.value } : y)) }))} />
                    <button className="icon-btn" onClick={() => set(s.id, (x) => ({ ...x, pouvoirs: x.pouvoirs.filter((_, k) => k !== j) }))} title="Retirer">
                      ✕
                    </button>
                  </div>
                  )
                })}
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
