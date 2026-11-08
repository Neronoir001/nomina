// Espace MJ : campagne, journal, PNJ et règles maison, chiffrés par une phrase de passe.
import { useEffect, useState } from 'react'
import {
  changerPhrase, effacerCoffre, enveloppeActuelle, initCoffre, majCoffre, NATURES_PNJ, nouveauPNJ, nouvelleRegle, nouvelleSeance,
  useCoffre, verrouiller, type ContenuCoffre, type PNJ, type RegleMaison, type Seance,
} from '../../lib/coffre'
import { partagerFichier } from '../../lib/fichiers'
import { CARAC_ABBR, CARAC_LABEL, type CaracKey } from '../../lib/pack'
import { publierRegles } from '../../lib/p2p'
import { uid } from '../../lib/storage'
import { heure, useStore } from '../../lib/store'
import { correspond } from '../../lib/texte'
import { Area, Card, Empty, Field, Seg, Stepper } from '../../ui'
import { ChoixPhrase, CreationCoffre, Deverrouillage, NouvellePhraseApresPassation } from './Acces'

type Onglet = 'campagne' | 'journal' | 'pnj' | 'regles' | 'securite'

/** Mémorise quels blocs dépliables sont ouverts (et en ouvre un par programme). */
function useOuverts() {
  const [ouverts, setOuverts] = useState<Set<string>>(() => new Set())
  return {
    ouvrir: (id: string) => setOuverts((o) => new Set(o).add(id)),
    props: (id: string) => ({
      open: ouverts.has(id),
      onToggle: (e: React.SyntheticEvent<HTMLDetailsElement>) => {
        const ouvert = e.currentTarget.open
        setOuverts((o) => {
          if (o.has(id) === ouvert) return o
          const n = new Set(o)
          if (ouvert) n.add(id)
          else n.delete(id)
          return n
        })
      },
    }),
  }
}

export default function EspaceMJ() {
  const c = useCoffre()
  useEffect(() => {
    void initCoffre()
  }, [])

  if (c.etat === 'chargement') return <p className="muted center">Chargement…</p>
  if (c.etat === 'absent') return <CreationCoffre />
  if (c.etat === 'verrouille') return <Deverrouillage />
  if (c.etat === 'passation') return <NouvellePhraseApresPassation />
  return <EspaceOuvert contenu={c.contenu!} />
}

function EspaceOuvert({ contenu }: { contenu: ContenuCoffre }) {
  const c = useCoffre()
  const [onglet, setOnglet] = useState<Onglet>('campagne')
  return (
    <div className="stack">
      <div className="row between">
        <h2 className="tronque">🎭 {contenu.campagne.nom || 'Ma campagne'}</h2>
        <button className="btn btn-small" onClick={() => void verrouiller()} title="Verrouiller l'espace MJ">
          🔒 Verrouiller
        </button>
      </div>
      <p className="muted small">
        {c.enregistrement === 'encours' ? 'Enregistrement…' : c.enregistrement === 'erreur' ? '⚠ Échec de l’enregistrement' : `🔐 Chiffré et enregistré${c.majLe ? ` à ${heure(c.majLe)}` : ''}`}
      </p>
      <Seg<Onglet>
        small
        value={onglet}
        onChange={setOnglet}
        options={[
          { id: 'campagne', label: 'Campagne' },
          { id: 'journal', label: 'Séances' },
          { id: 'pnj', label: 'PNJ' },
          { id: 'regles', label: 'Règles' },
          { id: 'securite', label: '🔑' },
        ]}
      />
      {onglet === 'campagne' && <Campagne c={contenu} />}
      {onglet === 'journal' && <Journal liste={contenu.journal} />}
      {onglet === 'pnj' && <ListePNJ liste={contenu.pnj} />}
      {onglet === 'regles' && <Regles liste={contenu.regles} />}
      {onglet === 'securite' && <Securite />}
    </div>
  )
}

// ───────── Campagne ─────────

function Campagne({ c }: { c: ContenuCoffre }) {
  const set = (k: keyof ContenuCoffre['campagne'], v: string) => majCoffre((x) => ({ ...x, campagne: { ...x.campagne, [k]: v } }))
  return (
    <Card>
      <div className="stack">
        <Field label="Nom de la campagne" value={c.campagne.nom} onChange={(v) => set('nom', v)} />
        <Area label="Notes de scénario" rows={10} value={c.campagne.notes} onChange={(v) => set('notes', v)} placeholder="Intrigue, secrets, lieux, indices…" />
        <Area label="Aides de jeu" rows={5} value={c.campagne.aides} onChange={(v) => set('aides', v)} placeholder="Textes à lire, documents, rappels de règles…" />
      </div>
    </Card>
  )
}

// ───────── Journal des séances ─────────

function Journal({ liste }: { liste: Seance[] }) {
  const { ouvrir: setOuvert, props: depli } = useOuverts()
  const maj = (id: string, p: Partial<Seance>) => majCoffre((x) => ({ ...x, journal: x.journal.map((s) => (s.id === id ? { ...s, ...p } : s)) }))
  const tri = [...liste].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="stack">
      <button
        className="btn btn-primary"
        onClick={() => {
          const s = nouvelleSeance()
          majCoffre((x) => ({ ...x, journal: [...x.journal, s] }))
          setOuvert(s.id)
        }}
      >
        ＋ Nouvelle séance
      </button>
      {tri.length === 0 && <Empty>Aucune séance notée pour l'instant.</Empty>}
      {tri.map((s) => (
        <details key={s.id} className="card mj-item" {...depli(s.id)}>
          <summary>
            <b>{s.titre || 'Séance sans titre'}</b> <span className="muted small">{s.date ? new Date(s.date).toLocaleDateString('fr-FR') : ''}</span>
          </summary>
          <div className="stack">
            <div className="grid2">
              <label>
                Date
                <input type="date" value={s.date} onChange={(e) => maj(s.id, { date: e.target.value })} />
              </label>
              <Field label="Titre" value={s.titre} onChange={(v) => maj(s.id, { titre: v })} />
            </div>
            <Area label="Ce qui s'est passé" rows={8} value={s.texte} onChange={(v) => maj(s.id, { texte: v })} />
            <button
              className="link danger small"
              onClick={() => confirm('Supprimer cette séance du journal ?') && majCoffre((x) => ({ ...x, journal: x.journal.filter((y) => y.id !== s.id) }))}
            >
              Supprimer la séance
            </button>
          </div>
        </details>
      ))}
    </div>
  )
}

// ───────── PNJ ─────────

const CARACS: CaracKey[] = ['fo', 'ag', 'pe', 'vo', 'pr', 'ap']

function ListePNJ({ liste }: { liste: PNJ[] }) {
  const pack = useStore().pack
  const [q, setQ] = useState('')
  const { ouvrir: setOuvert, props: depli } = useOuverts()
  const maj = (id: string, f: (p: PNJ) => PNJ) => majCoffre((x) => ({ ...x, pnj: x.pnj.map((p) => (p.id === id ? f(p) : p)) }))
  const visibles = liste.filter((p) => correspond(q, p.nom, p.nature, p.role, p.superieur, p.notes))

  return (
    <div className="stack">
      <div className="row">
        <input className="grow" type="search" placeholder="Rechercher un PNJ…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un PNJ" />
        <button
          className="btn btn-primary"
          onClick={() => {
            const p = nouveauPNJ()
            majCoffre((x) => ({ ...x, pnj: [p, ...x.pnj] }))
            setOuvert(p.id)
            setQ('')
          }}
        >
          ＋ PNJ
        </button>
      </div>
      {liste.length === 0 && <Empty>Aucun PNJ. Ajoute tes humains, anges, démons et serviteurs avec « ＋ PNJ ».</Empty>}
      <datalist id="mj-superieurs">
        {pack?.superieurs.map((s) => <option key={s.id} value={s.nom} />)}
      </datalist>
      {visibles.map((p) => (
        <details key={p.id} className="card mj-item" {...depli(p.id)}>
          <summary>
            <b>{p.nom || 'PNJ sans nom'}</b> <span className="tag">{p.nature}</span>
            {p.role && <span className="muted small"> {p.role}</span>}
            <span className="muted small mj-jauges">
              {' '}
              PP {p.pp.actuel}/{p.pp.max} · PV {p.pv.actuel}/{p.pv.max}
            </span>
          </summary>
          <div className="stack">
            <div className="grid2">
              <Field label="Nom" value={p.nom} onChange={(v) => maj(p.id, (x) => ({ ...x, nom: v }))} />
              <label>
                Nature
                <select value={p.nature} onChange={(e) => maj(p.id, (x) => ({ ...x, nature: e.target.value }))}>
                  {NATURES_PNJ.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <Field label="Rôle" value={p.role} onChange={(v) => maj(p.id, (x) => ({ ...x, role: v }))} placeholder="Commissaire, indic, rival…" />
              {(p.nature === 'Démon' || p.nature === 'Ange') && (
                <>
                  <Field label="Supérieur" value={p.superieur} list="mj-superieurs" onChange={(v) => maj(p.id, (x) => ({ ...x, superieur: v }))} />
                  <Field label="Grade" value={p.grade} onChange={(v) => maj(p.id, (x) => ({ ...x, grade: v }))} />
                </>
              )}
            </div>
            <div className="grid-caracs mj-caracs">
              {CARACS.map((k) => (
                <label key={k} title={CARAC_LABEL[k]}>
                  {CARAC_ABBR[k]}
                  <input
                    type="number"
                    inputMode="numeric"
                    value={p.caracs[k] ?? ''}
                    onChange={(e) => maj(p.id, (x) => ({ ...x, caracs: { ...x.caracs, [k]: e.target.value === '' ? undefined : Number(e.target.value) } }))}
                  />
                </label>
              ))}
            </div>
            <div className="grid2">
              <Stepper label="PP actuels" value={p.pp.actuel} min={0} onChange={(v) => maj(p.id, (x) => ({ ...x, pp: { ...x.pp, actuel: v } }))} />
              <Stepper label="PP max" value={p.pp.max} min={0} onChange={(v) => maj(p.id, (x) => ({ ...x, pp: { ...x.pp, max: v } }))} />
              <Stepper label="PV actuels" value={p.pv.actuel} min={0} onChange={(v) => maj(p.id, (x) => ({ ...x, pv: { ...x.pv, actuel: v } }))} />
              <Stepper label="PV max" value={p.pv.max} min={0} onChange={(v) => maj(p.id, (x) => ({ ...x, pv: { ...x.pv, max: v } }))} />
            </div>
            <Area label="Talents" value={p.talents} onChange={(v) => maj(p.id, (x) => ({ ...x, talents: v }))} placeholder="Discussion +2, Arme de poing +1…" />
            <Area label="Pouvoirs" value={p.pouvoirs} onChange={(v) => maj(p.id, (x) => ({ ...x, pouvoirs: v }))} />
            <Area label="Notes (secrets, motivations…)" rows={4} value={p.notes} onChange={(v) => maj(p.id, (x) => ({ ...x, notes: v }))} />
            <div className="row">
              <button
                className="btn btn-small"
                onClick={() => {
                  const copie = { ...structuredClone(p), id: uid(), nom: `${p.nom || 'PNJ'} (copie)` }
                  majCoffre((x) => ({ ...x, pnj: [copie, ...x.pnj] }))
                  setOuvert(copie.id)
                }}
              >
                📑 Dupliquer
              </button>
              <button className="btn btn-small" onClick={() => maj(p.id, (x) => ({ ...x, pp: { ...x.pp, actuel: x.pp.max }, pv: { ...x.pv, actuel: x.pv.max } }))}>
                ♻️ Remettre PP et PV au max
              </button>
              <button
                className="link danger small"
                onClick={() => confirm(`Supprimer « ${p.nom || 'ce PNJ'} » ?`) && majCoffre((x) => ({ ...x, pnj: x.pnj.filter((y) => y.id !== p.id) }))}
              >
                Supprimer
              </button>
            </div>
          </div>
        </details>
      ))}
    </div>
  )
}

// ───────── Règles maison ─────────

function Regles({ liste }: { liste: RegleMaison[] }) {
  const s = useStore()
  const [msg, setMsg] = useState<string | null>(null)
  const maj = (id: string, p: Partial<RegleMaison>) => majCoffre((x) => ({ ...x, regles: x.regles.map((r) => (r.id === id ? { ...r, ...p } : r)) }))
  const publiques = liste.filter((r) => r.publique && (r.titre.trim() || r.texte.trim()))
  const publie = s.reglesMaison

  return (
    <div className="stack">
      <Card className="note">
        Les règles cochées « Visible des joueurs » leur sont envoyées quand tu touches <b>Publier</b>, puis à chaque connexion à ta Table. Les autres restent secrètes dans ton espace MJ.
      </Card>
      <button
        className="btn btn-primary"
        onClick={() => {
          setMsg(null)
          majCoffre((x) => ({ ...x, regles: [...x.regles, nouvelleRegle()] }))
        }}
      >
        ＋ Nouvelle règle
      </button>
      {liste.length === 0 && <Empty>Aucune règle maison. Les règles de la 3e édition s'appliquent.</Empty>}
      {liste.map((r) => (
        <div key={r.id} className="card stack">
          <Field label="Titre" value={r.titre} onChange={(v) => maj(r.id, { titre: v })} placeholder="Ex. : Récupération des PP" />
          <Area label="Règle" rows={4} value={r.texte} onChange={(v) => maj(r.id, { texte: v })} />
          <div className="row between">
            <label className="row case">
              <input type="checkbox" checked={r.publique} onChange={(e) => maj(r.id, { publique: e.target.checked })} />
              <span>Visible des joueurs</span>
            </label>
            <button className="link danger small" onClick={() => confirm('Supprimer cette règle ?') && majCoffre((x) => ({ ...x, regles: x.regles.filter((y) => y.id !== r.id) }))}>
              Supprimer
            </button>
          </div>
        </div>
      ))}
      <Card title="📢 Publication">
        <div className="stack">
          <p className="small">
            {publie
              ? `Dernière publication : ${new Date(publie.at).toLocaleString('fr-FR')} (${publie.regles.length} règle(s)).`
              : 'Aucune règle publiée pour l’instant.'}
          </p>
          <button
            className="btn"
            onClick={async () => {
              const n = await publierRegles(publiques.map(({ id, titre, texte }) => ({ id, titre, texte })))
              setMsg(
                n
                  ? `${publiques.length} règle(s) publiée(s) et envoyée(s) à ${n} joueur(s) connecté(s).`
                  : `${publiques.length} règle(s) publiée(s). Les joueurs les recevront à leur prochaine connexion à ta Table.`,
              )
            }}
          >
            Publier les {publiques.length} règle(s) visibles
          </button>
          {msg && <p className="note-ok small">{msg}</p>}
        </div>
      </Card>
    </div>
  )
}

// ───────── Sécurité et passation ─────────

function Securite() {
  const [changer, setChanger] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [effacer, setEffacer] = useState('')

  const exporter = async () => {
    const env = await enveloppeActuelle()
    if (!env) return
    const d = new Date().toISOString().slice(0, 10)
    await partagerFichier(`Nomina-campagne-MJ-${d}.json`, env)
    setOk('Fichier de campagne créé. Il reste chiffré : il faut la phrase de passe pour l’ouvrir.')
  }

  return (
    <div className="stack">
      <Card title="🔑 Phrase de passe">
        <div className="stack">
          <p className="muted small">L'espace MJ se verrouille tout seul quand l'appli reste en arrière-plan plus de 10 minutes.</p>
          {!changer ? (
            <button className="btn" onClick={() => setChanger(true)}>
              Changer la phrase de passe
            </button>
          ) : (
            <ChoixPhrase
              bouton="Rechiffrer avec la nouvelle phrase"
              onValider={async (p) => {
                await changerPhrase(p)
                setChanger(false)
                setOk('Nouvelle phrase de passe enregistrée. L’ancienne ne fonctionne plus sur cet appareil.')
              }}
              annuler={() => setChanger(false)}
            />
          )}
        </div>
      </Card>

      <Card title="📦 Sauvegarde et passation">
        <div className="stack">
          <p className="small">Le fichier de campagne sert de sauvegarde, ou à confier la campagne à un autre MJ :</p>
          <ol className="small">
            <li>Exporte la campagne et envoie le fichier au nouveau MJ.</li>
            <li>Donne-lui la phrase de passe, de vive voix de préférence.</li>
            <li>Il ouvre le fichier dans son Espace MJ (« Reprendre une campagne ») et choisit aussitôt une nouvelle phrase de passe.</li>
          </ol>
          <p className="muted small">L'ancien MJ garde la copie de ce qu'il possédait, mais ne pourra pas lire ce que le nouveau MJ ajoutera ensuite.</p>
          <button className="btn" onClick={() => void exporter()}>
            📤 Exporter la campagne (chiffrée)
          </button>
        </div>
      </Card>

      {ok && <p className="note-ok">{ok}</p>}

      <Card title="🗑️ Effacer l'espace MJ">
        <div className="stack">
          <p className="muted small">Supprime définitivement l'espace MJ de cet appareil (les personnages et la Table ne sont pas touchés). Exporte la campagne avant si tu veux la garder.</p>
          <label>
            Pour confirmer, tape EFFACER
            <input value={effacer} onChange={(e) => setEffacer(e.target.value)} autoCapitalize="characters" />
          </label>
          <button className="btn btn-danger" disabled={effacer.trim().toUpperCase() !== 'EFFACER'} onClick={() => void effacerCoffre()}>
            Effacer définitivement
          </button>
        </div>
      </Card>
    </div>
  )
}
