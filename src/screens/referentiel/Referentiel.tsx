import { useMemo, useState } from 'react'
import { importerFichier } from '../../lib/fichiers'
import type { Camp, LimitationRef, PouvoirRef, SuperieurRef, TalentRef } from '../../lib/pack'
import { caracLabel, CATEGORIES } from '../../lib/pack'
import { useStore } from '../../lib/store'
import { Card, Empty, FilePick, Seg } from '../../ui'
import { TableUM } from '../TableUM'
import { FicheLimitation, FichePouvoir, FicheSuperieur, FicheTalent } from './Details'

type Onglet = 'superieurs' | 'pouvoirs' | 'talents' | 'limitations' | 'regles'

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function Referentiel() {
  const s = useStore()
  const pack = s.pack
  const [onglet, setOnglet] = useState<Onglet>('superieurs')
  const [camp, setCamp] = useState<Camp>('INS')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const n = norm(q)
  const match = (...txt: (string | undefined)[]) => !n || txt.some((t) => t && norm(t).includes(n))

  const sups = useMemo(() => (pack?.superieurs ?? []).filter((x) => x.camp === camp), [pack, camp])
  const pouvoirs = useMemo(() => (pack?.pouvoirs ?? []).filter((x) => x.camp === camp), [pack, camp])
  const nomSup = (id?: string) => (id ? pack?.superieurs.find((s) => s.id === id)?.nom : undefined)
  const lims = useMemo(() => (pack?.limitations ?? []).filter((x) => x.camp === camp), [pack, camp])

  if (!pack) {
    return (
      <div className="stack">
        <Card title="Référentiel non installé">
          <div className="stack">
            <p>
              Le référentiel contient les supérieurs, pouvoirs, talents et limitations. Il n'est pas inclus dans l'appli : le MJ le transmet
              automatiquement quand tu rejoins sa Table, ou tu peux l'importer depuis un fichier.
            </p>
            <FilePick label="📥 Importer le fichier du référentiel" className="btn btn-primary" onFile={(f) => void importerFichier(f).then(setMsg)} />
            {msg && <p className="note-ok">{msg}</p>}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="ref-bar">
        <Seg
          value={camp}
          onChange={setCamp}
          options={[
            { id: 'INS', label: '😈 Démons' },
            { id: 'MV', label: '😇 Anges' },
          ]}
        />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans le référentiel…" />
        <Seg
          small
          value={onglet}
          onChange={setOnglet}
          options={[
            { id: 'superieurs', label: camp === 'INS' ? 'Princes' : 'Archanges' },
            { id: 'pouvoirs', label: 'Pouvoirs' },
            { id: 'talents', label: 'Talents' },
            { id: 'limitations', label: 'Limitations' },
            { id: 'regles', label: 'Règles' },
          ]}
        />
      </div>

      {onglet === 'superieurs' && <ListeSup items={sups.filter((x) => match(x.nom, x.titre, x.role, ...(x.pouvoirsPrivilegies ?? [])))} />}
      {onglet === 'pouvoirs' && <ListePouvoirs items={pouvoirs.filter((x) => match(x.nom, x.rubrique, x.resume, nomSup(x.superieur)))} />}
      {onglet === 'talents' && <ListeTalents items={pack.talents.filter((x) => match(x.nom, x.resume))} />}
      {onglet === 'limitations' && <ListeLim items={lims.filter((x) => match(x.nom, x.resume))} />}
      {onglet === 'regles' && (
        <Card title="Table de potentiel de réussite (table UM)">
          {pack.regles?.tableUM ? <TableUM table={pack.regles.tableUM} /> : <Empty>Pas encore dans ce référentiel.</Empty>}
        </Card>
      )}

      <p className="muted small center">
        Référentiel « {pack.titre} », version {pack.version} ({new Date(pack.date).toLocaleDateString('fr-FR')}).
      </p>
    </div>
  )
}

function ListeSup({ items }: { items: SuperieurRef[] }) {
  if (!items.length) return <Empty>Rien à afficher (pas encore extrait, ou aucun résultat).</Empty>
  return (
    <div className="ref-list">
      {items.map((s) => (
        <details key={s.id} className="card ref-item">
          <summary>
            <b>{s.nom}</b> <span className="muted">{s.titre}</span>
            {s.intervention != null && <span className="tag">Interv. {s.intervention}</span>}
          </summary>
          <FicheSuperieur s={s} />
        </details>
      ))}
    </div>
  )
}

function ListePouvoirs({ items }: { items: PouvoirRef[] }) {
  const sups = useStore().pack?.superieurs ?? []
  if (!items.length) return <Empty>Rien à afficher (pas encore extrait, ou aucun résultat).</Empty>
  const rubriques = [...new Set(items.map((p) => p.rubrique ?? 'Divers'))]
  return (
    <div className="stack">
      {rubriques.map((r) => (
        <div key={r}>
          <h3 className="rubrique">{r}</h3>
          <div className="ref-list">
            {items
              .filter((p) => (p.rubrique ?? 'Divers') === r)
              .map((p) => (
                <details key={p.id} className="card ref-item">
                  <summary>
                    <b>{p.nom}</b>
                    {p.superieur && <span className="tag tag-prince">{sups.find((s) => s.id === p.superieur)?.nom ?? p.superieur}</span>}
                    <span className="muted small">{[p.d666, p.type, p.cout].filter(Boolean).join(' · ')}</span>
                  </summary>
                  <FichePouvoir r={p} />
                </details>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ListeTalents({ items }: { items: TalentRef[] }) {
  if (!items.length) return <Empty>Rien à afficher.</Empty>
  return (
    <div className="stack">
      {CATEGORIES.map((c) => {
        const l = items.filter((t) => t.categorie === c.id)
        if (!l.length) return null
        return (
          <div key={c.id}>
            <h3 className="rubrique">{c.nom}</h3>
            <div className="ref-list">
              {l.map((t) => (
                <details key={t.id} className="card ref-item">
                  <summary>
                    <b>{t.nom}</b> <span className="muted small">{[t.diff ?? 'Var', caracLabel(t.carac)].join(' · ')}</span>
                  </summary>
                  <FicheTalent r={t} />
                </details>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListeLim({ items }: { items: LimitationRef[] }) {
  if (!items.length) return <Empty>Rien à afficher (pas encore extrait, ou aucun résultat).</Empty>
  return (
    <div className="ref-list">
      {items.map((l) => (
        <details key={l.id} className="card ref-item">
          <summary>
            <b>{l.nom}</b> {l.d66 && <span className="muted small">{l.d66}</span>}
          </summary>
          <FicheLimitation r={l} />
        </details>
      ))}
    </div>
  )
}
