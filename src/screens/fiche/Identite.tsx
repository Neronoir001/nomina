import type { CaracKey } from '../../lib/pack'
import { CARAC_LABEL } from '../../lib/pack'
import type { Personnage } from '../../lib/personnage'
import { useStore } from '../../lib/store'
import { Area, Card, Field, Seg, Stepper } from '../../ui'
import { TableUM } from '../TableUM'
import type { MajPerso } from './Fiche'
import { ChoixSuperieur } from './Superieur'

const DESCRIPTION: { k: keyof Personnage['description']; label: string }[] = [
  { k: 'taille', label: 'Taille' },
  { k: 'poids', label: 'Poids' },
  { k: 'yeux', label: 'Yeux' },
  { k: 'cheveux', label: 'Cheveux' },
  { k: 'profession', label: 'Profession' },
  { k: 'nationalite', label: 'Nationalité' },
  { k: 'lieuHabitation', label: "Lieu d'habitation" },
  { k: 'revenuMensuel', label: 'Revenu mensuel' },
  { k: 'epargne', label: 'Épargne' },
  { k: 'armure', label: 'Armure' },
]

const RANG_NUM: Record<string, number> = { chevalier: 1, capitaine: 2, baron: 3 }

/** Grade : menu des grades accordés par le supérieur choisi, sinon saisie libre. */
function ChoixGrade({ perso: p, onChange }: { perso: Personnage; onChange: (v: string) => void }) {
  const pack = useStore().pack
  const sup = pack?.superieurs.find((s) => s.id === p.identite.superieurId)
  const grades = sup?.grades ?? []
  if (grades.length === 0) return <Field label="Grade" value={p.identite.grade} onChange={onChange} />
  const connu = !p.identite.grade || grades.some((g) => g.titre === p.identite.grade)
  return (
    <label>
      Grade
      <select value={p.identite.grade} onChange={(e) => onChange(e.target.value)}>
        <option value="">Aucun grade</option>
        {grades.map((g) => (
          <option key={g.titre} value={g.titre}>
            {g.titre}
            {RANG_NUM[g.rang] ? ` (grade ${RANG_NUM[g.rang]})` : ''}
          </option>
        ))}
        {!connu && <option value={p.identite.grade}>{p.identite.grade} (saisie précédente)</option>}
      </select>
    </label>
  )
}

export default function Identite({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const pack = useStore().pack
  const superieurs = pack?.superieurs.filter((x) => x.camp === p.camp) ?? []
  const setId = (k: keyof Personnage['identite'], v: string) => maj((x) => ({ ...x, identite: { ...x.identite, [k]: v } }))
  const setDesc = (k: keyof Personnage['description'], v: string) => maj((x) => ({ ...x, description: { ...x.description, [k]: v } }))
  const setCarac = (k: CaracKey, v: number) => maj((x) => ({ ...x, caracs: { ...x.caracs, [k]: v } }))

  return (
    <div className="stack">
      <Card className={`sheet-${p.camp.toLowerCase()}`}>
        <div className="stack">
          <Seg
            value={p.camp}
            onChange={(camp) => maj((x) => ({ ...x, camp }))}
            options={[
              { id: 'INS', label: '😈 Démon (INS)' },
              { id: 'MV', label: '😇 Ange (MV)' },
            ]}
          />
          <Field label="Nom de couverture" value={p.identite.nomCouverture} onChange={(v) => setId('nomCouverture', v)} />
          <div className="grid2">
            <Field label="Nom" value={p.identite.nom} onChange={(v) => setId('nom', v)} />
            <ChoixGrade perso={p} onChange={(v) => setId('grade', v)} />
          </div>
          {superieurs.length > 0 ? (
            <ChoixSuperieur perso={p} maj={maj} />
          ) : (
            <Field
              label="Supérieur"
              value={p.identite.superieurLibre}
              onChange={(v) => setId('superieurLibre', v)}
              placeholder={p.camp === 'INS' ? 'Prince-Démon' : 'Archange'}
            />
          )}
          {superieurs.length === 0 && <p className="muted small">Installe le référentiel pour choisir dans la liste (onglet Réglages).</p>}
        </div>
      </Card>

      <Card title="Caractéristiques">
        <div className="grid3">
          {(Object.keys(CARAC_LABEL) as CaracKey[]).map((k) => (
            <Stepper key={k} label={CARAC_LABEL[k]} value={p.caracs[k]} onChange={(v) => setCarac(k, v)} min={0} max={20} className="carac" />
          ))}
        </div>
      </Card>

      <Card title="Pouvoir et blessures">
        <div className="grid2">
          <Stepper label="PP actuels" value={p.pp.actuel} onChange={(v) => maj((x) => ({ ...x, pp: { ...x.pp, actuel: v } }))} min={0} />
          <Stepper label="PP maximum" value={p.pp.max} onChange={(v) => maj((x) => ({ ...x, pp: { ...x.pp, max: v } }))} min={0} />
          <Stepper label="Blessures" value={p.blessures.actuel} onChange={(v) => maj((x) => ({ ...x, blessures: { ...x.blessures, actuel: v } }))} min={0} />
          <Stepper label="Blessures max" value={p.blessures.max} onChange={(v) => maj((x) => ({ ...x, blessures: { ...x.blessures, max: v } }))} min={0} />
        </div>
      </Card>

      {pack?.regles?.tableUM && (
        <details className="card">
          <summary>
            <b>Table de potentiel de réussite</b>
          </summary>
          <TableUM table={pack.regles.tableUM} />
        </details>
      )}

      <Card title="Description">
        <div className="grid2">
          {DESCRIPTION.map((d) => (
            <Field key={d.k} label={d.label} value={p.description[d.k]} onChange={(v) => setDesc(d.k, v)} />
          ))}
        </div>
      </Card>

      <Card title="Équipement">
        <Area label="Équipement, possessions" value={p.equipement} onChange={(v) => maj((x) => ({ ...x, equipement: v }))} rows={4} />
      </Card>

      <Card title="Notes">
        <div className="stack">
          <Area label="Notes sur l'identité, l'histoire, la couverture…" value={p.notes.identite} onChange={(v) => maj((x) => ({ ...x, notes: { ...x.notes, identite: v } }))} />
          <Area label="Notes générales" value={p.notes.general} onChange={(v) => maj((x) => ({ ...x, notes: { ...x.notes, general: v } }))} rows={5} />
        </div>
      </Card>
    </div>
  )
}
