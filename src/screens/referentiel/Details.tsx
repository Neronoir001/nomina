import { useState } from 'react'
import type { LimitationRef, PouvoirRef, SuperieurRef, TalentRef } from '../../lib/pack'
import { caracLabel, CATEGORIES } from '../../lib/pack'
import { uid } from '../../lib/storage'
import { setState, useStore } from '../../lib/store'

function Ligne({ k, v }: { k: string; v?: string | number | null }) {
  if (v === undefined || v === null || v === '') return null
  return (
    <div className="dl-row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}

export function FichePouvoir({ r }: { r: PouvoirRef }) {
  const pack = useStore().pack
  const sup = r.superieur ? pack?.superieurs.find((s) => s.id === r.superieur) : undefined
  return (
    <div className="stack">
      <dl className="dl">
        <Ligne k="Rubrique" v={r.rubrique} />
        <Ligne k="Tirage d666" v={r.d666} />
        <Ligne k="Type" v={r.type} />
        <Ligne k="Coût" v={r.cout} />
        <Ligne k="Caractéristique" v={r.carac} />
        <Ligne k="Défense" v={r.defense} />
        <Ligne k="Portée" v={r.portee} />
        <Ligne k="Propre à" v={sup ? `${sup.nom}, ${sup.titre}` : undefined} />
      </dl>
      {r.resume && <p>{r.resume}</p>}
      {r.page && <p className="muted small">Texte complet : {r.page}</p>}
      <Signaler cible={`pouvoir:${r.id}`} libelle={`Pouvoir « ${r.nom} »`} />
    </div>
  )
}

export function FicheTalent({ r }: { r: TalentRef }) {
  return (
    <div className="stack">
      <dl className="dl">
        <Ligne k="Catégorie" v={CATEGORIES.find((c) => c.id === r.categorie)?.nom} />
        <Ligne k="Malus sans le talent" v={r.diff === null ? 'variable' : `${r.diff} colonne(s)`} />
        <Ligne k="Caractéristique" v={caracLabel(r.carac)} />
      </dl>
      {r.resume && <p>{r.resume}</p>}
      {r.page && <p className="muted small">Texte complet : {r.page}</p>}
      <Signaler cible={`talent:${r.id}`} libelle={`Talent « ${r.nom} »`} />
    </div>
  )
}

export function FicheLimitation({ r }: { r: LimitationRef }) {
  return (
    <div className="stack">
      <dl className="dl">
        <Ligne k="Tirage" v={r.d66} />
      </dl>
      {r.resume && <p>{r.resume}</p>}
      {r.page && <p className="muted small">Texte complet : {r.page}</p>}
      <Signaler cible={`limitation:${r.id}`} libelle={`Limitation « ${r.nom} »`} />
    </div>
  )
}

const RELATIONS: { k: keyof NonNullable<SuperieurRef['relations']>; label: string }[] = [
  { k: 'allie', label: 'Allié' },
  { k: 'associe', label: 'Associé' },
  { k: 'neutre', label: 'Neutre' },
  { k: 'hostile', label: 'Hostile' },
  { k: 'ennemi', label: 'Ennemi' },
]

export function FicheSuperieur({ s }: { s: SuperieurRef }) {
  const pack = useStore().pack
  const propres = (s.pouvoirsPropres ?? []).map((id) => pack?.pouvoirs.find((p) => p.id === id)).filter(Boolean) as PouvoirRef[]
  return (
    <div className="stack sup-fiche">
      <dl className="dl">
        <Ligne k="Titre" v={s.titre} />
        <Ligne k="Possibilités d'intervention" v={s.intervention} />
      </dl>
      {s.role && <p>{s.role}</p>}
      {s.apparence && <p className="muted">{s.apparence}</p>}

      {!!s.recuperation?.length && (
        <div>
          <div className="sub-head">Récupération des PP</div>
          <ul className="plain">
            {s.recuperation.map((r, i) => (
              <li key={i}>
                {r.condition} <b>{r.gain}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!s.pouvoirsPrivilegies?.length && (
        <div>
          <div className="sub-head">Pouvoirs privilégiés (1d6)</div>
          <ol className="plain numbered">
            {s.pouvoirsPrivilegies.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </div>
      )}

      {propres.length > 0 && (
        <div>
          <div className="sub-head">Pouvoir{propres.length > 1 ? 's' : ''} propre{propres.length > 1 ? 's' : ''}</div>
          {propres.map((p) => (
            <details key={p.id}>
              <summary>
                <b>{p.nom}</b> <span className="muted small">{[p.type, p.cout].filter(Boolean).join(' · ')}</span>
              </summary>
              <FichePouvoir r={p} />
            </details>
          ))}
        </div>
      )}

      {!!s.grades?.length && (
        <div>
          <div className="sub-head">Grades accordés</div>
          <ul className="plain">
            {s.grades.map((g) => (
              <li key={g.titre}>
                <b>{g.titre}</b> — {g.effet}
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.relations && (
        <div>
          <div className="sub-head">Relations</div>
          <dl className="dl">
            {RELATIONS.map((r) => (
              <Ligne key={r.k} k={r.label} v={s.relations?.[r.k]?.join(', ') || undefined} />
            ))}
          </dl>
        </div>
      )}

      {s.avatar && (
        <div>
          <div className="sub-head">Avatar{s.avatar.nom ? ` : ${s.avatar.nom}` : ''}</div>
          {s.avatar.caracs && (
            <p className="mono small">
              {Object.entries(s.avatar.caracs)
                .map(([k, v]) => `${k.toUpperCase()} ${v}`)
                .join(' · ')}
            </p>
          )}
          {!!s.avatar.talents?.length && (
            <p className="small">
              <b>Talents :</b> {s.avatar.talents.map((t) => `${t.nom} (${t.niveau})`).join(', ')}
            </p>
          )}
          {!!s.avatar.pouvoirs?.length && (
            <p className="small">
              <b>Pouvoirs :</b> {s.avatar.pouvoirs.map((t) => `${t.nom} (${t.niveau})`).join(', ')}
            </p>
          )}
        </div>
      )}

      {s.page && <p className="muted small">Texte complet : {s.page}</p>}
      <Signaler cible={`superieur:${s.id}`} libelle={`${s.nom}, ${s.titre}`} />
    </div>
  )
}

/** Bouton « Signaler une erreur » : la remarque est gardée sur l'appareil, puis copiée pour Claude. */
export function Signaler({ cible, libelle }: { cible: string; libelle: string }) {
  const [open, setOpen] = useState(false)
  const [texte, setTexte] = useState('')
  const [ok, setOk] = useState(false)
  if (ok) return <p className="note-ok small">Merci, signalement enregistré (Réglages → Signalements).</p>
  if (!open)
    return (
      <button className="link small signaler" onClick={() => setOpen(true)}>
        ⚑ Signaler une erreur
      </button>
    )
  return (
    <div className="stack signal-box">
      <label>
        Qu'est-ce qui ne va pas ? ({libelle})
        <textarea rows={3} value={texte} onChange={(e) => setTexte(e.target.value)} autoFocus placeholder="ex. Le coût est 2 PP, pas 3 (livre p. 82)" />
      </label>
      <div className="row">
        <button
          className="btn btn-primary"
          disabled={!texte.trim()}
          onClick={() => {
            setState((s) => ({ signalements: [...s.signalements, { id: uid(), at: Date.now(), cible, libelle, texte: texte.trim() }] }))
            setOk(true)
          }}
        >
          Enregistrer
        </button>
        <button className="btn" onClick={() => setOpen(false)}>
          Annuler
        </button>
      </div>
    </div>
  )
}
