import { useMemo, useState } from 'react'
import type { LimitationRef, PouvoirRef } from '../../lib/pack'
import type { LimitationPerso, Personnage, PouvoirPerso } from '../../lib/personnage'
import { nouveauPouvoir, profilDe, serviteurDepuisProfil } from '../../lib/personnage'
import { uid } from '../../lib/storage'
import { norm } from '../../lib/texte'
import { useStore } from '../../lib/store'
import { Area, Card, Empty, Info, Modal } from '../../ui'
import { FichePouvoir } from '../referentiel/Details'
import type { MajPerso } from './Fiche'
import { BoutonPP } from '../../BoutonPP'
import { Stepper } from '../../ui'
import { LISTES } from './Suggestions'

const COLS: { k: keyof PouvoirPerso; label: string; list?: string }[] = [
  { k: 'type', label: 'Type', list: LISTES.typesPouvoir },
  { k: 'cout', label: 'Coût' },
  { k: 'niveau', label: 'Niv.' },
  { k: 'portee', label: 'Portée', list: LISTES.portees },
  { k: 'att', label: 'Att.', list: LISTES.caracs },
  { k: 'def', label: 'Déf.' },
  { k: 'num', label: 'Num' },
]


export default function Pouvoirs({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const st = useStore()
  const pack = st.pack
  const estMj = st.profile?.role === 'mj'
  const [choix, setChoix] = useState<'pouvoir' | 'limitation' | null>(null)
  const sup = pack?.superieurs.find((s) => s.id === p.identite.superieurId)
  const privilegies = new Set((sup?.pouvoirsPrivilegies ?? []).map(norm))
  const nomSup = (id?: string) => pack?.superieurs.find((s) => s.id === id)?.nom ?? id
  /** Un joueur n'a droit qu'au pouvoir propre de son supérieur (sauf accord du MJ). */
  const autorise = (r: PouvoirRef) => estMj || !r.superieur || r.superieur === p.identite.superieurId
  /** Pouvoir propre d'un autre supérieur, présent sur la fiche sans accord du MJ. */
  const horsRegle = (pw: PouvoirPerso): PouvoirRef | undefined => {
    if (estMj || pw.accordeParMJ) return undefined
    const r = pw.refId ? pack?.pouvoirs.find((x) => x.id === pw.refId) : pack?.pouvoirs.find((x) => x.camp === p.camp && x.superieur && norm(x.nom) === norm(pw.nom))
    return r && !autorise(r) ? r : undefined
  }

  const setPouvoir = (id: string, patch: Partial<PouvoirPerso>) =>
    maj((x) => ({ ...x, pouvoirs: x.pouvoirs.map((y) => (y.id === id ? { ...y, ...patch } : y)) }))
  const setLim = (id: string, patch: Partial<LimitationPerso>) =>
    maj((x) => ({ ...x, limitations: x.limitations.map((y) => (y.id === id ? { ...y, ...patch } : y)) }))

  const ajouterPouvoir = (r?: PouvoirRef) => {
    const np = nouveauPouvoir()
    if (r) Object.assign(np, { refId: r.id, nom: r.nom, type: r.type ?? '', cout: r.cout ?? '', portee: r.portee ?? '', att: r.carac ?? '', def: r.defense ?? '', num: r.d666 ?? '' })
    const prof = profilDe(r)
    maj((x) => ({ ...x, pouvoirs: [...x.pouvoirs, np], serviteurs: prof ? [...x.serviteurs, serviteurDepuisProfil(prof, np.id)] : x.serviteurs }))
    if (r && prof) annoncerServiteur(r)
    setChoix(null)
  }
  const [info, setInfo] = useState<string | null>(null)
  const annoncerServiteur = (r: PouvoirRef) =>
    setInfo(`« ${r.nom} » donne un serviteur : il a été créé dans l'onglet Serviteurs avec son profil${profilDe(r)?.nombre !== '1' ? ` (nombre tiré au hasard : ${profilDe(r)?.nombre})` : ''}.`)
  /** Crée le serviteur d'un pouvoir déjà présent sur la fiche. */
  const creerServiteur = (pw: PouvoirPerso, r: PouvoirRef) => {
    const prof = profilDe(r)
    if (!prof) return
    maj((x) => ({ ...x, serviteurs: [...x.serviteurs, serviteurDepuisProfil(prof, pw.id)] }))
    annoncerServiteur(r)
  }
  /** Retire un pouvoir, et propose de retirer aussi le serviteur qu'il avait donné. */
  const retirerPouvoir = (pw: PouvoirPerso) => {
    if (!confirm(`Retirer « ${pw.nom || 'ce pouvoir'} » ?`)) return
    const lies = p.serviteurs.filter((sv) => sv.pouvoirId === pw.id)
    const aussi = lies.length > 0 && confirm(`Retirer aussi le serviteur lié (${lies.map((sv) => sv.nom || sv.genre).join(', ')}) ?`)
    maj((x) => ({
      ...x,
      pouvoirs: x.pouvoirs.filter((y) => y.id !== pw.id),
      serviteurs: aussi ? x.serviteurs.filter((sv) => sv.pouvoirId !== pw.id) : x.serviteurs.map((sv) => (sv.pouvoirId === pw.id ? { ...sv, pouvoirId: undefined } : sv)),
    }))
  }
  /** Si le nom tapé correspond exactement à un pouvoir du référentiel, on complète les cases vides. */
  const nommerPouvoir = (pw: PouvoirPerso, nom: string) => {
    // Nom exact, ou au singulier / pluriel près (« Zombie » → « Zombies »)
    const n = norm(nom)
    const r =
      pack?.pouvoirs.find((x) => x.camp === p.camp && norm(x.nom) === n) ??
      (n.length > 2 ? pack?.pouvoirs.find((x) => x.camp === p.camp && (norm(x.nom) === `${n}s` || norm(x.nom) === n.replace(/s$/, ''))) : undefined)
    if (r && !autorise(r)) return setPouvoir(pw.id, { nom, refId: undefined })
    if (!r) return setPouvoir(pw.id, { nom, refId: pw.refId && pack?.pouvoirs.find((x) => x.id === pw.refId)?.nom === nom ? pw.refId : undefined })
    const prof = profilDe(r)
    if (prof && !p.serviteurs.some((sv) => sv.pouvoirId === pw.id)) {
      maj((x) => ({ ...x, serviteurs: [...x.serviteurs, serviteurDepuisProfil(prof, pw.id)] }))
      annoncerServiteur(r)
    }
    setPouvoir(pw.id, {
      nom: r.nom,
      refId: r.id,
      type: pw.type || r.type || '',
      cout: pw.cout || r.cout || '',
      portee: pw.portee || r.portee || '',
      att: pw.att || r.carac || '',
      def: pw.def || r.defense || '',
      num: pw.num || r.d666 || '',
    })
  }
  const nommerLim = (id: string, nom: string) => {
    const r = pack?.limitations.find((x) => x.camp === p.camp && norm(x.nom) === norm(nom))
    setLim(id, r ? { nom: r.nom, refId: r.id } : { nom, refId: undefined })
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
        <Stepper
          label={`PP actuels (max ${p.pp.max})`}
          value={p.pp.actuel}
          min={0}
          onChange={(v) => maj((x) => ({ ...x, pp: { ...x.pp, actuel: v } }))}
          className="pp-pouvoirs"
        />
        <p className="muted small">Touche ⚡ sur un pouvoir pour l'utiliser : ses PP sont retirés tout seuls (annulable quelques secondes).</p>
        {p.pouvoirs.length === 0 && <Empty>Aucun pouvoir pour l'instant.</Empty>}
        {info && (
          <p className="note-ok" onClick={() => setInfo(null)}>
            {info}
          </p>
        )}
        <div className="stack">
          {p.pouvoirs.map((pw) => {
            const ref = pw.refId ? pack?.pouvoirs.find((r) => r.id === pw.refId) : undefined
            return (
              <div key={pw.id} className="pouvoir-row">
                <div className="row">
                  <input className="pouvoir-nom" list={LISTES.pouvoirs} value={pw.nom} onChange={(e) => nommerPouvoir(pw, e.target.value)} placeholder="Nom du pouvoir (suggestions en tapant)" aria-label="Nom du pouvoir" />
                  {ref?.superieur && <span className="tag tag-prince">{nomSup(ref.superieur)}</span>}
                  {p.serviteurs.some((sv) => sv.pouvoirId === pw.id) ? (
                    <span className="tag" title="Ce pouvoir a donné un serviteur (onglet Serviteurs)">👥 serviteur</span>
                  ) : (
                    ref &&
                    profilDe(ref) && (
                      <button className="chip-btn" onClick={() => creerServiteur(pw, ref)} title="Ajouter dans l'onglet Serviteurs la créature donnée par ce pouvoir">
                        ＋ Créer le serviteur
                      </button>
                    )
                  )}
                  {pw.accordeParMJ && <span className="tag tag-mj" title="Exception accordée par le MJ">accordé par le MJ</span>}
                  {privilegies.has(norm(pw.nom)) && <span className="tag" title="Pouvoir privilégié de ton supérieur">privilégié</span>}
                  {ref && (
                    <Info title={ref.nom}>
                      <FichePouvoir r={ref} />
                    </Info>
                  )}
                  <BoutonPP persoId={p.id} pouvoir={pw.nom || 'Pouvoir'} cout={pw.cout} ppActuels={p.pp.actuel} />
                  <button
                    className="icon-btn"
                    title="Retirer ce pouvoir"
                    onClick={() => retirerPouvoir(pw)}
                  >
                    ✕
                  </button>
                </div>
                <div className="pouvoir-cols">
                  {COLS.map((c) => (
                    <label key={c.k}>
                      {c.label}
                      <input list={c.list} value={pw[c.k] as string} onChange={(e) => setPouvoir(pw.id, { [c.k]: e.target.value })} />
                    </label>
                  ))}
                </div>
                {horsRegle(pw) && (
                  <p className="alert small">
                    Pouvoir propre de {nomSup(horsRegle(pw)!.superieur)} : seul le MJ peut te l'accorder. Il ne compte pas tant que ton MJ ne l'a pas validé.
                  </p>
                )}
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
              <input list={LISTES.limitations} value={l.nom} onChange={(e) => nommerLim(l.id, e.target.value)} placeholder="Limitation" className="grow" />
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

      <JournalPP perso={p} maj={maj} />

      <Card title="Notes">
        <Area label="Notes sur les pouvoirs" value={p.notes.pouvoirs} onChange={(v) => maj((x) => ({ ...x, notes: { ...x.notes, pouvoirs: v } }))} />
      </Card>

      {choix === 'pouvoir' && pack && (
        <Chooser
          title="Ajouter un pouvoir"
          items={pack.pouvoirs.filter((r) => r.camp === p.camp && autorise(r))}
          sub={(r) => [r.superieur ? `Pouvoir de ${nomSup(r.superieur)}` : r.rubrique, r.cout, r.type].filter(Boolean).join(' · ')}
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

export function Chooser<T extends { id: string; nom: string; resume?: string }>(p: {
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
              {i.resume && <span className="muted small pick-resume tronque">{i.resume}</span>}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="muted">Aucun résultat.</li>}
      </ul>
    </Modal>
  )
}

/** Journal des PP dépensés (personnage et serviteurs). */
function JournalPP({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const lignes = [...p.journalPP].reverse()
  if (lignes.length === 0) return null
  const total = lignes.reduce((a, d) => a + d.montant, 0)
  return (
    <Card
      title={`Journal des PP (${total} dépensés)`}
      actions={
        <button className="link small" onClick={() => confirm('Vider le journal des dépenses de PP ?') && maj((x) => ({ ...x, journalPP: [] }))}>
          Vider
        </button>
      }
    >
      <ul className="plain small journal-pp">
        {lignes.slice(0, 30).map((d) => (
          <li key={d.id}>
            <span className="muted">{new Date(d.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span> {d.pouvoir}
            {d.serviteurNom ? <span className="muted"> ({d.serviteurNom})</span> : null} <b>−{d.montant} PP</b>
          </li>
        ))}
      </ul>
    </Card>
  )
}
