import { useState } from 'react'
import type { CaracKey, CategorieTalent, RegleTableUM, TalentRef } from '../../lib/pack'
import { CARAC_ABBR, CATEGORIES, caracLabel, colonne, seuil } from '../../lib/pack'
import type { Personnage, TalentPerso } from '../../lib/personnage'
import { uid } from '../../lib/storage'
import { useStore } from '../../lib/store'
import { Area, Card, Info } from '../../ui'
import { TableUM } from '../TableUM'
import type { MajPerso } from './Fiche'

/** Liste affichée : talents du référentiel (fusionnés avec les valeurs du perso) + talents ajoutés. */
function talentsAffiches(p: Personnage, refs: TalentRef[]): (TalentPerso & { ref?: TalentRef })[] {
  const parId = new Map(p.talents.map((t) => [t.id, t]))
  const out: (TalentPerso & { ref?: TalentRef })[] = []
  for (const r of refs) {
    if (r.special) continue
    const id = `ref:${r.id}`
    const t = parId.get(id)
    out.push({ id, refId: r.id, nom: r.nom, categorie: r.categorie, diff: r.diff, carac: r.carac, niveau: t?.niveau ?? null, exp: t?.exp ?? 0, ref: r })
    parId.delete(id)
  }
  for (const t of parId.values()) out.push({ ...t, ref: t.refId ? refs.find((r) => r.id === t.refId) : undefined })
  return out
}

export function seuilTalent(t: TalentPerso, p: Personnage, table?: RegleTableUM): { txt: string; col: number | null; ligne: string } {
  if (!table) return { txt: '', col: null, ligne: 'moyen' }
  if (t.niveau && t.niveau > 0) {
    const v = seuil(table, t.niveau, 'moyen')
    return { txt: String(v ?? '—'), col: colonne(table, t.niveau), ligne: 'moyen' }
  }
  // Talent non possédé : caractéristique associée, ligne « très difficile », décalée du malus
  const caracs = t.carac.split('-').filter((c) => c in p.caracs) as CaracKey[]
  if (caracs.length === 0 || t.diff === null) return { txt: '—', col: null, ligne: 'tres-difficile' }
  const meilleure = Math.max(...caracs.map((c) => p.caracs[c]))
  const v = seuil(table, meilleure, 'tres-difficile', t.diff)
  const col = colonne(table, meilleure, t.diff)
  return { txt: v === 'echec' ? 'raté' : v === 'auto' ? 'réussi' : `TD ${v ?? '—'}`, col, ligne: 'tres-difficile' }
}

export default function Talents({ perso: p, maj }: { perso: Personnage; maj: MajPerso }) {
  const pack = useStore().pack
  const table = pack?.regles?.tableUM
  const liste = talentsAffiches(p, pack?.talents ?? [])
  const [focus, setFocus] = useState<string | null>(null)
  const focused = liste.find((t) => t.id === focus)
  const hl = focused ? seuilTalent(focused, p, table) : null

  const upsert = (t: TalentPerso) =>
    maj((x) => {
      const i = x.talents.findIndex((y) => y.id === t.id)
      const clean: TalentPerso = { id: t.id, refId: t.refId, nom: t.nom, categorie: t.categorie, diff: t.diff, carac: t.carac, niveau: t.niveau, exp: t.exp }
      const talents = i >= 0 ? x.talents.map((y, j) => (j === i ? clean : y)) : [...x.talents, clean]
      return { ...x, talents }
    })
  const retirer = (id: string) => maj((x) => ({ ...x, talents: x.talents.filter((t) => t.id !== id) }))
  const ajouter = (categorie: CategorieTalent) =>
    upsert({ id: uid(), nom: '', categorie, diff: categorie === 'communication' ? -4 : null, carac: categorie === 'communication' ? 'vo' : 'var', niveau: null, exp: 0 })

  return (
    <div className="stack">
      {!pack && <div className="card note">Installe le référentiel (onglet Réglages) pour retrouver la liste complète des talents.</div>}
      <p className="muted small">
        Touchez un talent pour voir sa colonne dans la table. La colonne « Moyen » donne le seuil pour une action de difficulté moyenne ; sans niveau,
        c'est la caractéristique qui sert, en « très difficile » (TD) avec le malus du talent.
      </p>

      {CATEGORIES.map((cat) => {
        const items = liste.filter((t) => t.categorie === cat.id)
        return (
          <Card key={cat.id} title={cat.nom} className="talents-card">
            <div className="talent-grid talent-head">
              <span>Talent</span>
              <span>Diff</span>
              <span>Carac</span>
              <span>Niv</span>
              <span>Exp</span>
              <span>Moyen</span>
            </div>
            {items.map((t) => {
              const st = seuilTalent(t, p, table)
              const libre = !t.refId
              return (
                <div key={t.id} className={`talent-grid${focus === t.id ? ' focus' : ''}${t.niveau ? ' has-level' : ''}`} onClick={() => setFocus(t.id)}>
                  <span className="talent-name">
                    {libre ? (
                      <input value={t.nom} onChange={(e) => upsert({ ...t, nom: e.target.value })} placeholder="Nom (spécialisation, langue…)" />
                    ) : (
                      <>
                        {t.nom}
                        {t.ref?.resume && (
                          <Info title={t.nom}>
                            <p>{t.ref.resume}</p>
                            {t.ref.page && <p className="muted small">Référence : {t.ref.page}</p>}
                          </Info>
                        )}
                      </>
                    )}
                  </span>
                  <span>
                    {libre ? (
                      <input className="mini" value={t.diff ?? ''} inputMode="numeric" onChange={(e) => upsert({ ...t, diff: e.target.value === '' || e.target.value === '-' ? null : Number(e.target.value) || 0 })} />
                    ) : (
                      (t.diff ?? 'Var')
                    )}
                  </span>
                  <span>
                    {libre ? (
                      <select className="mini" value={t.carac} onChange={(e) => upsert({ ...t, carac: e.target.value })}>
                        <option value="var">Var</option>
                        {(Object.keys(CARAC_ABBR) as CaracKey[]).map((k) => (
                          <option key={k} value={k}>
                            {CARAC_ABBR[k]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      caracLabel(t.carac)
                    )}
                  </span>
                  <span>
                    <select className="mini" value={t.niveau ?? ''} onChange={(e) => upsert({ ...t, niveau: e.target.value ? Number(e.target.value) : null })} aria-label={`Niveau de ${t.nom}`}>
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span>
                    <input className="mini" type="number" inputMode="numeric" min={0} value={t.exp || ''} onChange={(e) => upsert({ ...t, exp: Number(e.target.value) || 0 })} aria-label={`Expérience de ${t.nom}`} />
                  </span>
                  <span className="seuil">
                    {st.txt}
                    {libre && (
                      <button className="icon-btn" title="Retirer" onClick={() => retirer(t.id)}>
                        ✕
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
            <button className="link small" onClick={() => ajouter(cat.id)}>
              ＋ Ajouter {cat.id === 'communication' ? 'une langue ou un talent' : 'une spécialisation ou un talent'}
            </button>
          </Card>
        )
      })}

      {table && (
        <Card title={focused ? `Table — ${focused.nom || 'talent'}` : 'Table de potentiel de réussite'}>
          <TableUM table={table} col={hl?.col} ligne={hl?.ligne} />
        </Card>
      )}

      <Card title="Notes">
        <Area label="Notes sur les talents" value={p.notes.talents} onChange={(v) => maj((x) => ({ ...x, notes: { ...x.notes, talents: v } }))} />
      </Card>
    </div>
  )
}
