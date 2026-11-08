import type { CaracKey } from '../lib/pack'
import { CARAC_ABBR } from '../lib/pack'
import type { Personnage } from '../lib/personnage'
import { useStore } from '../lib/store'

/** Vue en lecture seule d'un personnage (utilisée par le MJ pour les fiches reçues). */
export default function PersoResume({ p }: { p: Personnage }) {
  const pack = useStore().pack
  const sup = pack?.superieurs.find((s) => s.id === p.identite.superieurId)
  const talents = p.talents.filter((t) => t.niveau)
  return (
    <div className="stack resume">
      <dl className="dl">
        <dt>Camp</dt>
        <dd>{p.camp === 'INS' ? 'Démon (INS)' : 'Ange (MV)'}</dd>
        <dt>Couverture</dt>
        <dd>{p.identite.nomCouverture || '—'}</dd>
        <dt>Grade</dt>
        <dd>{p.identite.grade || '—'}</dd>
        <dt>Supérieur</dt>
        <dd>{sup ? `${sup.nom}, ${sup.titre}` : p.identite.superieurLibre || '—'}</dd>
        <dt>Caractéristiques</dt>
        <dd>{(Object.keys(CARAC_ABBR) as CaracKey[]).map((k) => `${CARAC_ABBR[k]} ${p.caracs[k]}`).join(' · ')}</dd>
        <dt>PP</dt>
        <dd>
          {p.pp.actuel} / {p.pp.max}
        </dd>
        <dt>Points de vie</dt>
        <dd>
          {p.blessures.actuel} / {p.blessures.max}
        </dd>
        <dt>Talents</dt>
        <dd>{talents.length ? talents.map((t) => `${t.nom} (${t.niveau})`).join(', ') : '—'}</dd>
        <dt>Pouvoirs</dt>
        <dd>{p.pouvoirs.length ? p.pouvoirs.map((x) => `${x.nom}${x.niveau ? ` (${x.niveau})` : ''}`).join(', ') : '—'}</dd>
        <dt>Limitations</dt>
        <dd>{p.limitations.length ? p.limitations.map((x) => x.nom).join(', ') : '—'}</dd>
        <dt>Pouvoirs de grade</dt>
        <dd>{p.pouvoirsGrade.length ? p.pouvoirsGrade.map((x) => x.texte).join(' / ') : '—'}</dd>
        <dt>Serviteurs</dt>
        <dd>{p.serviteurs.length ? p.serviteurs.map((x) => `${x.nom || x.genre || '?'}${x.nombre && x.nombre !== '1' ? ` ×${x.nombre}` : ''} (${[x.type, x.genre].filter(Boolean).join(' – ') || '?'})`).join(', ') : '—'}</dd>
        {p.equipement && (
          <>
            <dt>Équipement</dt>
            <dd className="pre">{p.equipement}</dd>
          </>
        )}
        {p.notes.general && (
          <>
            <dt>Notes</dt>
            <dd className="pre">{p.notes.general}</dd>
          </>
        )}
      </dl>
    </div>
  )
}
