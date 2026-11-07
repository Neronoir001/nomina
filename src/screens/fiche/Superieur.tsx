import type { PouvoirRef, SuperieurRef } from '../../lib/pack'
import type { Personnage, PouvoirPerso } from '../../lib/personnage'
import { uid } from '../../lib/storage'
import { useStore } from '../../lib/store'
import { Area, Card, Choix, Empty, Field } from '../../ui'
import { FicheSuperieur } from '../referentiel/Details'
import type { MajPerso } from './Fiche'
import { LISTES } from './Suggestions'

/**
 * Au changement de supérieur, le pouvoir propre de l'ancien est remplacé par celui du nouveau
 * (niveau et notes conservés). Il est retiré si le nouveau n'en a pas. Les pouvoirs accordés par le MJ ne bougent pas.
 */
function remplacerPouvoirPropre(pouvoirs: PouvoirPerso[], ancien: SuperieurRef | undefined, nouveau: SuperieurRef | undefined, refs: PouvoirRef[]): PouvoirPerso[] {
  if (!ancien || ancien.id === nouveau?.id) return pouvoirs
  const nouveauRef = refs.find((r) => r.id === nouveau?.pouvoirsPropres?.[0])
  let dejaPlace = pouvoirs.some((pw) => pw.refId && pw.refId === nouveauRef?.id)
  return pouvoirs.flatMap((pw) => {
    const ref = pw.refId ? refs.find((r) => r.id === pw.refId) : undefined
    if (!ref || ref.superieur !== ancien.id || pw.accordeParMJ) return [pw]
    if (!nouveauRef || dejaPlace) return []
    dejaPlace = true
    return [
      {
        ...pw,
        refId: nouveauRef.id,
        nom: nouveauRef.nom,
        type: nouveauRef.type ?? '',
        cout: nouveauRef.cout ?? '',
        portee: nouveauRef.portee ?? '',
        att: nouveauRef.carac ?? '',
        def: nouveauRef.defense ?? '',
        num: nouveauRef.d666 ?? '',
      },
    ]
  })
}

/** Choix du supérieur avec recherche ; remplit les cases liées si elles sont vides ou non modifiées. */
export function ChoixSuperieur({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const pack = useStore().pack
  const superieurs = pack?.superieurs.filter((s) => s.camp === p.camp) ?? []

  const choisir = (id: string) => {
    const s = superieurs.find((x) => x.id === id)
    maj((x) => {
      const ancien = superieurs.find((y) => y.id === x.identite.superieurId)
      // Un grade du supérieur précédent n'a plus de sens avec le nouveau
      const gradeAncien = !!ancien?.grades?.some((g) => g.titre === x.identite.grade)
      const n = { ...x, identite: { ...x.identite, superieurId: id, grade: gradeAncien ? '' : x.identite.grade } }
      const invocationAuto = !x.invocation.possibilite || (ancien && x.invocation.possibilite === String(ancien.intervention))
      if (s && invocationAuto && s.intervention != null) n.invocation = { ...x.invocation, possibilite: String(s.intervention) }
      const recupAncien = (ancien?.recuperation ?? []).map((r) => `${r.condition}|${r.gain}`).join('§')
      const recupActuel = x.recuperation.map((r) => `${r.texte}|${r.nombre}`).join('§')
      const recupAuto = x.recuperation.length === 0 || (ancien && recupActuel === recupAncien)
      if (s && recupAuto) n.recuperation = (s.recuperation ?? []).map((r) => ({ id: uid(), texte: r.condition, nombre: r.gain }))
      n.pouvoirs = remplacerPouvoirPropre(x.pouvoirs, ancien, s, pack?.pouvoirs ?? [])
      return n
    })
  }

  return (
    <Choix
      label="Supérieur"
      titre={p.camp === 'INS' ? 'Choisir un Prince-Démon' : 'Choisir un Archange'}
      value={p.identite.superieurId}
      onChange={choisir}
      options={superieurs.map((s) => ({
        id: s.id,
        label: s.nom,
        detail: s.titre,
        recherche: [s.role, ...(s.pouvoirsPrivilegies ?? [])].join(' '),
      }))}
    />
  )
}

export default function Superieur({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const pack = useStore().pack
  const superieurs = pack?.superieurs.filter((s) => s.camp === p.camp) ?? []
  const sup = superieurs.find((s) => s.id === p.identite.superieurId)
  const libelle = p.camp === 'INS' ? 'Prince-Démon' : 'Archange'

  const reprendre = (s: SuperieurRef) =>
    maj((x) => ({
      ...x,
      invocation: { ...x.invocation, possibilite: s.intervention != null ? String(s.intervention) : x.invocation.possibilite },
      recuperation: (s.recuperation ?? []).map((r) => ({ id: uid(), texte: r.condition, nombre: r.gain })),
    }))

  const setRecup = (id: string, patch: Partial<Personnage['recuperation'][number]>) =>
    maj((x) => ({ ...x, recuperation: x.recuperation.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
  const setGrade = (id: string, texte: string) => maj((x) => ({ ...x, pouvoirsGrade: x.pouvoirsGrade.map((g) => (g.id === id ? { ...g, texte } : g)) }))
  const ajouterGrade = (texte = '') => maj((x) => ({ ...x, pouvoirsGrade: [...x.pouvoirsGrade, { id: uid(), texte }] }))

  return (
    <div className="stack">
      <Card title={libelle}>
        {superieurs.length > 0 ? (
          <ChoixSuperieur perso={p} maj={maj} />
        ) : (
          <Field label="Supérieur" value={p.identite.superieurLibre} onChange={(v) => maj((x) => ({ ...x, identite: { ...x.identite, superieurLibre: v } }))} />
        )}
        {sup && (
          <details className="sup-details">
            <summary>Tout savoir sur {sup.nom}</summary>
            <FicheSuperieur s={sup} />
          </details>
        )}
      </Card>

      <Card title="Invocation de son supérieur" actions={sup && <button className="link small" onClick={() => reprendre(sup)}>Reprendre du référentiel</button>}>
        <div className="stack">
          <Field label="Possibilité d'intervention" value={p.invocation.possibilite} onChange={(v) => maj((x) => ({ ...x, invocation: { ...x.invocation, possibilite: v } }))} inputMode="numeric" />
          <Area label="Notes" value={p.invocation.notes} onChange={(v) => maj((x) => ({ ...x, invocation: { ...x.invocation, notes: v } }))} rows={2} />
        </div>
      </Card>

      <Card title="Récupération des PP">
        {p.recuperation.length === 0 && <Empty>{sup ? 'Choisis ton supérieur ou utilise « Reprendre du référentiel ».' : 'Aucune ligne.'}</Empty>}
        {p.recuperation.map((r) => (
          <div key={r.id} className="row recup-row">
            <input className="grow" value={r.texte} onChange={(e) => setRecup(r.id, { texte: e.target.value })} placeholder="Condition" />
            <input className="mini" value={r.nombre} onChange={(e) => setRecup(r.id, { nombre: e.target.value })} placeholder="+1" aria-label="Nombre" />
            <button className="icon-btn" title="Retirer" onClick={() => maj((x) => ({ ...x, recuperation: x.recuperation.filter((y) => y.id !== r.id) }))}>
              ✕
            </button>
          </div>
        ))}
        <button className="link small" onClick={() => maj((x) => ({ ...x, recuperation: [...x.recuperation, { id: uid(), texte: '', nombre: '' }] }))}>
          ＋ Ajouter une ligne
        </button>
      </Card>

      <Card title="Pouvoirs de grade">
        {p.pouvoirsGrade.length === 0 && <Empty>Aucun pouvoir de grade.</Empty>}
        {p.pouvoirsGrade.map((g) => (
          <div key={g.id} className="row">
            <textarea className="grow" rows={2} value={g.texte} onChange={(e) => setGrade(g.id, e.target.value)} />
            <button className="icon-btn" title="Retirer" onClick={() => maj((x) => ({ ...x, pouvoirsGrade: x.pouvoirsGrade.filter((y) => y.id !== g.id) }))}>
              ✕
            </button>
          </div>
        ))}
        <div className="row">
          {sup?.grades?.map((g) => (
            <button key={g.titre} className="chip-btn" onClick={() => ajouterGrade(`${g.titre} : ${g.effet}`)} title={g.effet}>
              ＋ {g.titre}
            </button>
          ))}
          <button className="link small" onClick={() => ajouterGrade()}>
            ＋ Ligne libre
          </button>
        </div>
      </Card>

      <Card title="Arme et objet magiques">
        <div className="stack">
          <div className="grid2">
            <Field label="Arme magique" value={p.armeMagique.nom} onChange={(v) => maj((x) => ({ ...x, armeMagique: { ...x.armeMagique, nom: v } }))} />
            <Field label="Caractéristique" list={LISTES.caracs} value={p.armeMagique.carac} onChange={(v) => maj((x) => ({ ...x, armeMagique: { ...x.armeMagique, carac: v } }))} />
          </div>
          <Field label="Notes sur l'arme" value={p.armeMagique.notes} onChange={(v) => maj((x) => ({ ...x, armeMagique: { ...x.armeMagique, notes: v } }))} />
          <Field label="Objet magique" value={p.objetMagique.nom} onChange={(v) => maj((x) => ({ ...x, objetMagique: { ...x.objetMagique, nom: v } }))} />
          <div className="grid2">
            <Field label="1er pouvoir" list={LISTES.pouvoirs} value={p.objetMagique.pouvoir1} onChange={(v) => maj((x) => ({ ...x, objetMagique: { ...x.objetMagique, pouvoir1: v } }))} />
            <Field label="2e pouvoir" list={LISTES.pouvoirs} value={p.objetMagique.pouvoir2} onChange={(v) => maj((x) => ({ ...x, objetMagique: { ...x.objetMagique, pouvoir2: v } }))} />
          </div>
        </div>
      </Card>

      <Card title="Notes">
        <Area label={`Notes sur le supérieur, les missions…`} value={p.notes.superieur} onChange={(v) => maj((x) => ({ ...x, notes: { ...x.notes, superieur: v } }))} />
      </Card>
    </div>
  )
}
