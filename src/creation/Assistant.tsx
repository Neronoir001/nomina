// Assistant de création pas à pas, selon le profil de règles du MJ (3e édition par défaut).
import { useEffect, useRef } from 'react'
import type { Brouillon, ChoixPouvoir } from '../lib/creation'
import {
  CARACS_ORDRE, construirePersonnage, coutTalent, d6, d66, d666, dansPlage, ETAPES, limitationsDu, plafondTalent,
  pointsCaracs, pointsTalents, privilegies, problemes, tableGenerale,
} from '../lib/creation'
import type { Pack, PouvoirRef } from '../lib/pack'
import { CARAC_ABBR, CARAC_LABEL, caracLabel, CATEGORIES } from '../lib/pack'
import { uid } from '../lib/storage'
import { creerPerso, getState, setState, useStore } from '../lib/store'
import { FicheLimitation, FichePouvoir } from '../screens/referentiel/Details'
import { Card, Choix, Empty, Field, Info, Stepper } from '../ui'

function majB(f: (b: Brouillon) => Brouillon): void {
  const b = getState().brouillonCreation
  if (b) setState({ brouillonCreation: f(b) })
}

export default function Assistant({ onFini }: { onFini: () => void }) {
  const s = useStore()
  const b = s.brouillonCreation
  const corps = useRef<HTMLDivElement>(null)
  // Bloc sans valeur de retour : dans les Chrome récents, scrollTo renvoie une promesse,
  // que React prendrait pour une fonction de nettoyage.
  useEffect(() => {
    corps.current?.scrollTo({ top: 0 })
  }, [b?.etape])
  if (!b) return null
  const pack = s.pack
  const fermer = () => setState({ creationOuverte: false })

  const p = b.profil
  const pbs = pack ? problemes(b, pack, b.etape) : []
  const bloque = p.controle === 'strict' && pbs.length > 0 && b.etape < ETAPES.length - 1
  const aller = (e: number) => majB((x) => ({ ...x, etape: e }))

  return (
    <div className="guide-page creation" role="dialog" aria-label="Création guidée">
      <header className="guide-tete">
        <div className="stack-sm">
          <span className="muted small">
            Étape {b.etape + 1} / {ETAPES.length}
          </span>
          <h2>{ETAPES[b.etape]}</h2>
        </div>
        <button className="icon-btn" onClick={fermer} aria-label="Fermer (la création est gardée)" title="Fermer : la création est gardée, tu pourras la reprendre">
          ✕
        </button>
      </header>
      <div className="creation-progres" aria-hidden>
        {ETAPES.map((_, i) => (
          <span key={i} className={i < b.etape ? 'fait' : i === b.etape ? 'en-cours' : ''} />
        ))}
      </div>

      <div className="guide-corps" ref={corps}>
        {!pack ? (
          <Card>
            <p>Le référentiel est nécessaire pour la création guidée. Rejoins la Table de ton MJ ou importe-le depuis ⚙️ → Référentiel.</p>
          </Card>
        ) : (
          <>
            {b.etape === 0 && <EtapeIdentite b={b} />}
            {b.etape === 1 && <EtapeSuperieur b={b} pack={pack} />}
            {b.etape === 2 && <EtapeCaracs b={b} />}
            {b.etape === 3 && <EtapeTalents b={b} pack={pack} />}
            {b.etape === 4 && <EtapePouvoirs b={b} pack={pack} />}
            {b.etape === 5 && <EtapeLimitation b={b} pack={pack} />}
            {b.etape === 6 && <EtapeRecap b={b} pack={pack} onFini={onFini} />}

            {pbs.length > 0 && p.controle !== 'libre' && b.etape < ETAPES.length - 1 && (
              <ul className={`creation-alertes ${p.controle === 'strict' ? 'bloquant' : ''}`}>
                {pbs.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <footer className="creation-pied">
        <button className="btn" disabled={b.etape === 0} onClick={() => aller(b.etape - 1)}>
          ‹ Précédent
        </button>
        {b.etape < ETAPES.length - 1 && (
          <button className="btn btn-primary" disabled={bloque || !pack} onClick={() => aller(b.etape + 1)}>
            Suivant ›
          </button>
        )}
      </footer>
    </div>
  )
}

// ───────── 1. Identité ─────────

function EtapeIdentite({ b }: { b: Brouillon }) {
  return (
    <Card>
      <div className="stack">
        <p className="muted small">
          {b.camp === 'INS' ? '😈 Tu crées un démon' : '😇 Tu crées un ange'}, selon les règles « {b.profil.nom} ».
        </p>
        <Field label="Nom (véritable)" value={b.nom} onChange={(v) => majB((x) => ({ ...x, nom: v }))} />
        <Field label="Nom de couverture (humain)" value={b.nomCouverture} onChange={(v) => majB((x) => ({ ...x, nomCouverture: v }))} />
        <p className="muted small">Le reste de l'identité (description, profession…) se remplit ensuite sur la fiche.</p>
      </div>
    </Card>
  )
}

// ───────── 2. Supérieur ─────────

function EtapeSuperieur({ b, pack }: { b: Brouillon; pack: Pack }) {
  const sups = pack.superieurs.filter((x) => x.camp === b.camp)
  const sup = sups.find((x) => x.id === b.superieurId)
  const verrou = b.pouvoirs.length > 0
  if (sups.length === 0) return <Empty>Le référentiel ne contient pas encore les supérieurs de ce camp.</Empty>
  return (
    <div className="stack">
      <Card>
        <div className="stack">
          {verrou ? (
            <p className="muted small">Le supérieur ne peut plus changer : des pouvoirs ont déjà été choisis ou tirés.</p>
          ) : (
            <Choix
              label={b.camp === 'INS' ? 'Prince-Démon' : 'Archange'}
              titre={b.camp === 'INS' ? 'Choisis ton Prince-Démon' : 'Choisis ton Archange'}
              options={sups.map((x) => ({ id: x.id, label: x.nom, detail: x.titre, recherche: `${x.role ?? ''} ${(x.pouvoirsPrivilegies ?? []).join(' ')}` }))}
              value={b.superieurId}
              onChange={(id) => majB((x) => ({ ...x, superieurId: id }))}
            />
          )}
        </div>
      </Card>
      {sup && (
        <Card title={`${sup.nom}, ${sup.titre}`}>
          <div className="stack">
            {sup.role && <p>{sup.role}</p>}
            {sup.pouvoirsPrivilegies?.length ? (
              <p className="small">
                <b>Pouvoirs privilégiés :</b> {sup.pouvoirsPrivilegies.join(', ')}
              </p>
            ) : null}
            {sup.recuperation?.length ? (
              <p className="small">
                <b>Récupération des PP :</b> {sup.recuperation.map((r) => `${r.condition} (${r.gain})`).join(' ; ')}
              </p>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  )
}

// ───────── 3. Caractéristiques ─────────

function EtapeCaracs({ b }: { b: Brouillon }) {
  const p = b.profil
  const total = p.budgets[b.camp].caracPoints
  const reste = total - pointsCaracs(b)
  const libre = p.controle === 'libre'
  return (
    <Card>
      <div className="stack">
        <Compteur reste={reste} total={total} unite="points de caractéristiques" />
        <p className="muted small">
          De {p.caracMin} à {p.caracMax} par caractéristique. Les talents ne pourront pas dépasser leur caractéristique associée.
        </p>
        <div className="grid2">
          {CARACS_ORDRE.map((k) => (
            <Stepper
              key={k}
              label={CARAC_LABEL[k]}
              value={b.caracs[k]}
              min={libre ? 0 : p.caracMin}
              max={libre ? 9 : p.caracMax}
              onChange={(v) => majB((x) => ({ ...x, caracs: { ...x.caracs, [k]: v } }))}
            />
          ))}
        </div>
        <p className="small">
          PP maximum : Volonté ({b.caracs.vo}) + {p.ppBonus} = <b>{b.caracs.vo + p.ppBonus}</b>
        </p>
      </div>
    </Card>
  )
}

function Compteur({ reste, total, unite }: { reste: number; total: number; unite: string }) {
  return (
    <div className={`compteur ${reste === 0 ? 'ok' : reste < 0 ? 'ko' : ''}`}>
      <b>{reste}</b> / {total} {unite} restant{Math.abs(reste) > 1 ? 's' : ''}
    </div>
  )
}

// ───────── 4. Talents ─────────

function EtapeTalents({ b, pack }: { b: Brouillon; pack: Pack }) {
  const p = b.profil
  const total = p.budgets[b.camp].talentPoints
  const reste = total - pointsTalents(b)
  const talents = pack.talents.filter((t) => !t.special)
  const niveaux = Array.from({ length: p.talentMax + 1 }, (_, i) => i)
  return (
    <div className="stack">
      <Card>
        <div className="stack-sm">
          <Compteur reste={reste} total={total} unite="points de talents" />
          <p className="muted small">
            Niveau 1 = 1 point, 2 = 2 points, 3 = 4 points, 4 = 8 points. Un talent ne peut pas dépasser sa caractéristique associée. Langues et spécialisations
            s'ajoutent ensuite sur la fiche.
          </p>
        </div>
      </Card>
      {CATEGORIES.map((c) => (
        <Card key={c.id} title={c.nom}>
          <ul className="plain creation-talents">
            {talents
              .filter((t) => t.categorie === c.id)
              .map((t) => {
                const n = b.talents[t.id] ?? 0
                const plafond = plafondTalent(t, b.caracs)
                const strict = p.controle === 'strict'
                return (
                  <li key={t.id} className={n > 0 ? 'pris' : ''}>
                    <span className="tronque grow">
                      {t.nom} <span className="muted small">({caracLabel(t.carac)})</span>
                    </span>
                    {t.resume && (
                      <Info title={t.nom}>
                        <p>{t.resume}</p>
                      </Info>
                    )}
                    <select
                      value={n}
                      aria-label={`Niveau de ${t.nom}`}
                      onChange={(e) => majB((x) => ({ ...x, talents: { ...x.talents, [t.id]: Number(e.target.value) } }))}
                    >
                      {niveaux.map((v) => (
                        <option key={v} value={v} disabled={strict && v > 0 && ((plafond !== null && v > plafond) || coutTalent(v) - coutTalent(n) > reste)}>
                          {v === 0 ? '—' : `${v} (${coutTalent(v)} pt${coutTalent(v) > 1 ? 's' : ''})`}
                        </option>
                      ))}
                    </select>
                  </li>
                )
              })}
          </ul>
        </Card>
      ))}
    </div>
  )
}

// ───────── 5. Pouvoirs ─────────

function libelleRef(pack: Pack, refId?: string): PouvoirRef | undefined {
  return refId ? pack.pouvoirs.find((x) => x.id === refId) : undefined
}

function dejaPris(b: Brouillon, refId: string | undefined, nom: string): boolean {
  return b.pouvoirs.some((x) => (refId && x.refId === refId) || x.nom === nom)
}

function EtapePouvoirs({ b, pack }: { b: Brouillon; pack: Pack }) {
  const p = b.profil
  const sup = pack.superieurs.find((x) => x.id === b.superieurId)
  const privs = privilegies(pack, sup)
  const generale = tableGenerale(pack, b.camp)
  const choisis = b.pouvoirs.filter((x) => x.origine === 'choisi')
  const tiresD6 = b.pouvoirs.filter((x) => x.origine === 'd6')
  const tiresGen = b.pouvoirs.filter((x) => x.origine === 'd666')
  const desActifs = p.tirage === 'des'
  const choixFaits = choisis.length >= p.privChoisis

  const ajouter = (c: Omit<ChoixPouvoir, 'cle'>, trace?: string) =>
    majB((x) => ({ ...x, pouvoirs: [...x.pouvoirs, { ...c, cle: uid() }], journal: trace ? [...x.journal, trace] : x.journal }))
  const retirer = (cle: string) => majB((x) => ({ ...x, pouvoirs: x.pouvoirs.filter((y) => y.cle !== cle) }))

  const lancerD6 = () => {
    const essais: string[] = []
    for (let i = 0; i < 30; i++) {
      const v = d6()
      const pv = privs[v - 1]
      if (!pv) {
        essais.push(`${v} (vide)`)
        continue
      }
      if (dejaPris(getState().brouillonCreation!, pv.ref?.id, pv.nom)) {
        essais.push(`${v} = ${pv.nom} (déjà pris, relancé)`)
        continue
      }
      essais.push(`${v} = ${pv.nom}`)
      ajouter({ refId: pv.ref?.id, nom: pv.ref?.nom ?? pv.nom, origine: 'd6', tirage: String(v) }, `Pouvoir privilégié au d6 : ${essais.join(' → ')}.`)
      return
    }
  }

  const lancerD666 = () => {
    const essais: string[] = []
    for (let i = 0; i < 60; i++) {
      const code = d666()
      const r = generale.find((g) => dansPlage(code, g.d666))
      if (!r) {
        essais.push(`${code} (absent du référentiel, relancé)`)
        continue
      }
      if (dejaPris(getState().brouillonCreation!, r.id, r.nom)) {
        essais.push(`${code} = ${r.nom} (déjà pris, relancé)`)
        continue
      }
      essais.push(`${code} = ${r.nom}`)
      ajouter({ refId: r.id, nom: r.nom, origine: 'd666', tirage: code }, `Pouvoir de la table générale au d666 : ${essais.join(' → ')}.`)
      return
    }
  }

  return (
    <div className="stack">
      <Card title={`Pouvoir${p.privChoisis > 1 ? 's' : ''} choisi${p.privChoisis > 1 ? 's' : ''} (${choisis.length} / ${p.privChoisis})`}>
        <div className="stack">
          <p className="muted small">
            Choisis {p.privChoisis} pouvoir{p.privChoisis > 1 ? 's' : ''} parmi les privilégiés de {sup?.nom ?? 'ton supérieur'}.
            {desActifs && ' Fais ton choix avant de lancer les dés.'}
          </p>
          <ul className="plain creation-pouvoirs">
            {privs.map((pv, i) => {
              const pris = choisis.find((c) => c.nom === (pv.ref?.nom ?? pv.nom))
              const ailleurs = !pris && dejaPris(b, pv.ref?.id, pv.ref?.nom ?? pv.nom)
              const verrou = desActifs && (tiresD6.length > 0 || tiresGen.length > 0)
              return (
                <li key={i}>
                  <span className="de-mini" aria-label={`d6 : ${i + 1}`}>
                    {i + 1}
                  </span>
                  <span className="grow tronque">{pv.ref?.nom ?? pv.nom}</span>
                  {pv.ref && <InfoPouvoir r={pv.ref} />}
                  {pris ? (
                    <button className="btn btn-small btn-primary" disabled={verrou} onClick={() => retirer(pris.cle)}>
                      ✓ Choisi
                    </button>
                  ) : (
                    <button
                      className="btn btn-small"
                      disabled={choixFaits || ailleurs || verrou}
                      onClick={() => ajouter({ refId: pv.ref?.id, nom: pv.ref?.nom ?? pv.nom, origine: 'choisi' })}
                    >
                      {ailleurs ? 'Déjà obtenu' : 'Choisir'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </Card>

      {p.privTires > 0 && (
        <Card title={`${desActifs ? 'Tiré' : 'Choisi'}${p.privTires > 1 ? 's' : ''} parmi les privilégiés (${tiresD6.length} / ${p.privTires})`}>
          <div className="stack">
            {tiresD6.map((c) => (
              <LignePouvoir key={c.cle} c={c} pack={pack} onRetirer={desActifs ? undefined : () => retirer(c.cle)} />
            ))}
            {tiresD6.length < p.privTires &&
              (desActifs ? (
                <button className="btn btn-primary" disabled={!choixFaits} onClick={lancerD6}>
                  🎲 Lancer 1d6
                </button>
              ) : (
                <Choix
                  label="Pouvoir privilégié"
                  options={privs.filter((pv) => !dejaPris(b, pv.ref?.id, pv.ref?.nom ?? pv.nom)).map((pv) => ({ id: pv.ref?.id ?? pv.nom, label: pv.ref?.nom ?? pv.nom }))}
                  value=""
                  onChange={(id) => {
                    const pv = privs.find((x) => (x.ref?.id ?? x.nom) === id)
                    if (pv) ajouter({ refId: pv.ref?.id, nom: pv.ref?.nom ?? pv.nom, origine: 'd6' })
                  }}
                />
              ))}
          </div>
        </Card>
      )}

      {p.generauxTires > 0 && (
        <Card title={`${desActifs ? 'Tirés' : 'Choisis'} dans la table générale (${tiresGen.length} / ${p.generauxTires})`}>
          <div className="stack">
            {tiresGen.map((c) => (
              <LignePouvoir key={c.cle} c={c} pack={pack} onRetirer={desActifs ? undefined : () => retirer(c.cle)} />
            ))}
            {tiresGen.length < p.generauxTires &&
              (desActifs ? (
                <button className="btn btn-primary" disabled={!choixFaits} onClick={lancerD666}>
                  🎲 Lancer un d666
                </button>
              ) : (
                <Choix
                  label="Pouvoir de la table générale"
                  options={generale.filter((r) => !dejaPris(b, r.id, r.nom)).map((r) => ({ id: r.id, label: r.nom, detail: r.d666 }))}
                  value=""
                  onChange={(id) => {
                    const r = generale.find((x) => x.id === id)
                    if (r) ajouter({ refId: r.id, nom: r.nom, origine: 'd666' })
                  }}
                />
              ))}
            {desActifs && <p className="muted small">Un pouvoir déjà obtenu est relancé automatiquement, comme le prévoit le livre.</p>}
          </div>
        </Card>
      )}
    </div>
  )
}

function InfoPouvoir({ r }: { r: PouvoirRef }) {
  return (
    <Info title={r.nom}>
      <FichePouvoir r={r} />
    </Info>
  )
}

function LignePouvoir({ c, pack, onRetirer }: { c: ChoixPouvoir; pack: Pack; onRetirer?: () => void }) {
  const r = libelleRef(pack, c.refId)
  return (
    <div className="row creation-tire">
      {c.tirage && <span className="de-mini large">{c.tirage}</span>}
      <b className="grow">{c.nom}</b>
      {r && <InfoPouvoir r={r} />}
      {onRetirer && (
        <button className="icon-btn" onClick={onRetirer} aria-label={`Retirer ${c.nom}`}>
          ✕
        </button>
      )}
    </div>
  )
}

// ───────── 6. Limitation ─────────

function EtapeLimitation({ b, pack }: { b: Brouillon; pack: Pack }) {
  const p = b.profil
  const lims = limitationsDu(pack, b.camp)
  const desActifs = p.tirage === 'des'
  const lancer = () => {
    const essais: string[] = []
    for (let i = 0; i < 60; i++) {
      const code = d66()
      const l = lims.find((x) => dansPlage(code, x.d66))
      if (!l) {
        essais.push(`${code} (absent, relancé)`)
        continue
      }
      if (getState().brouillonCreation!.limitations.some((x) => x.refId === l.id)) {
        essais.push(`${code} = ${l.nom} (déjà prise, relancé)`)
        continue
      }
      essais.push(`${code} = ${l.nom}`)
      majB((x) => ({ ...x, limitations: [...x.limitations, { cle: uid(), refId: l.id, nom: l.nom, tirage: code }], journal: [...x.journal, `Limitation au d66 : ${essais.join(' → ')}.`] }))
      return
    }
  }
  if (p.limitations === 0) return <Empty>Ton MJ a choisi de ne pas imposer de limitation à la création.</Empty>
  if (lims.length === 0) return <Empty>Le référentiel ne contient pas encore les limitations de ce camp.</Empty>
  return (
    <Card title={`Limitation${p.limitations > 1 ? 's' : ''} (${b.limitations.length} / ${p.limitations})`}>
      <div className="stack">
        {b.limitations.map((l) => {
          const r = lims.find((x) => x.id === l.refId)
          return (
            <div key={l.cle} className="row creation-tire">
              {l.tirage && <span className="de-mini large">{l.tirage}</span>}
              <b className="grow">{l.nom}</b>
              {r && (
                <Info title={r.nom}>
                  <FicheLimitation r={r} />
                </Info>
              )}
              {!desActifs && (
                <button className="icon-btn" aria-label={`Retirer ${l.nom}`} onClick={() => majB((x) => ({ ...x, limitations: x.limitations.filter((y) => y.cle !== l.cle) }))}>
                  ✕
                </button>
              )}
            </div>
          )
        })}
        {b.limitations.length < p.limitations &&
          (desActifs ? (
            <button className="btn btn-primary" onClick={lancer}>
              🎲 Lancer 1d66
            </button>
          ) : (
            <Choix
              label="Limitation"
              options={lims.filter((l) => !b.limitations.some((x) => x.refId === l.id)).map((l) => ({ id: l.id, label: l.nom, detail: l.d66 }))}
              value=""
              onChange={(id) => {
                const l = lims.find((x) => x.id === id)
                if (l) majB((x) => ({ ...x, limitations: [...x.limitations, { cle: uid(), refId: l.id, nom: l.nom }] }))
              }}
            />
          ))}
      </div>
    </Card>
  )
}

// ───────── 7. Récapitulatif ─────────

function EtapeRecap({ b, pack, onFini }: { b: Brouillon; pack: Pack; onFini: () => void }) {
  const p = b.profil
  const sup = pack.superieurs.find((x) => x.id === b.superieurId)
  const tous = [0, 1, 2, 3, 4, 5].flatMap((e) => problemes(b, pack, e).map((x) => ({ e, x })))
  const bloque = p.controle === 'strict' && tous.length > 0
  const talents = Object.entries(b.talents).filter(([, n]) => n > 0)

  const creer = () => {
    if (tous.length && p.controle === 'conseil' && !confirm(`Il reste ${tous.length} point(s) à revoir. Créer quand même le personnage ?`)) return
    const perso = construirePersonnage(b, pack)
    creerPerso(perso)
    setState({ brouillonCreation: null, creationOuverte: false })
    onFini()
  }

  return (
    <div className="stack">
      <Card title={`${b.camp === 'INS' ? '😈' : '😇'} ${b.nom || b.nomCouverture || 'Sans nom'}`}>
        <dl className="dl">
          {b.nomCouverture && <Ligne t="Couverture" v={b.nomCouverture} />}
          <Ligne t="Supérieur" v={sup ? `${sup.nom}, ${sup.titre}` : '—'} />
          <Ligne t="Caractéristiques" v={CARACS_ORDRE.map((k) => `${CARAC_ABBR[k]} ${b.caracs[k]}`).join(' · ')} />
          <Ligne t="PP" v={`${b.caracs.vo + p.ppBonus}`} />
          <Ligne t="Talents" v={talents.length ? talents.map(([id, n]) => `${pack.talents.find((t) => t.id === id)?.nom ?? id} ${n}`).join(', ') : '—'} />
          <Ligne t="Pouvoirs (niveau 1)" v={b.pouvoirs.map((x) => x.nom).join(', ') || '—'} />
          <Ligne t="Limitation" v={b.limitations.map((x) => x.nom).join(', ') || '—'} />
        </dl>
      </Card>
      {b.journal.length > 0 && (
        <Card title="🎲 Tirages">
          <ul className="small">
            {b.journal.map((j, i) => (
              <li key={i}>{j}</li>
            ))}
          </ul>
          <p className="muted small">Ils seront recopiés dans les notes de la fiche, que ton MJ recevra.</p>
        </Card>
      )}
      {tous.length > 0 && (
        <ul className={`creation-alertes ${bloque ? 'bloquant' : ''}`}>
          {tous.map(({ e, x }) => (
            <li key={x}>
              <button className="link" onClick={() => majB((y) => ({ ...y, etape: e }))}>
                {ETAPES[e]}
              </button>{' '}
              : {x}
            </li>
          ))}
        </ul>
      )}
      <button className="btn btn-primary" disabled={bloque} onClick={creer}>
        ✨ Créer le personnage
      </button>
      <p className="muted small center">Tout reste modifiable ensuite sur la fiche.</p>
    </div>
  )
}

function Ligne({ t, v }: { t: string; v: string }) {
  return (
    <div className="dl-row">
      <dt>{t}</dt>
      <dd>{v}</dd>
    </div>
  )
}
