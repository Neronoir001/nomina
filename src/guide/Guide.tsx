import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { correspond } from '../lib/texte'
import { useStore } from '../lib/store'
import { Seg } from '../ui'
import { FAQ, GLOSSAIRE, SECTIONS, type Public, type SectionGuide } from './contenu'

type Filtre = 'tous' | 'joueur' | 'mj'

/** Guide utilisateur plein écran, ouvert sur une section donnée. */
export default function Guide({ section, onClose, revoirVisite }: { section?: string; onClose: () => void; revoirVisite: () => void }) {
  const role = useStore().profile?.role
  const [filtre, setFiltre] = useState<Filtre>(role === 'mj' ? 'tous' : 'joueur')
  const [q, setQ] = useState('')
  const [impression, setImpression] = useState(false)
  const corps = useRef<HTMLDivElement>(null)

  const visibles = SECTIONS.filter((s) => voit(s.public, filtre))

  // Ouverture directe sur la section demandée.
  useEffect(() => {
    if (!section) return
    const el = document.getElementById(`guide-${section}`)
    el?.scrollIntoView({ block: 'start' })
  }, [section])

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  // Impression : tout est déplié, puis on rend la main.
  useEffect(() => {
    if (!impression) return
    document.body.classList.add('imprime-guide')
    const fin = () => {
      document.body.classList.remove('imprime-guide')
      setImpression(false)
    }
    window.addEventListener('afterprint', fin, { once: true })
    const t = window.setTimeout(() => window.print(), 50)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('afterprint', fin)
    }
  }, [impression])

  const aller = (id: string) => {
    setQ('')
    window.setTimeout(() => document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const recherche = q.trim() && !impression ? q : ''

  return (
    <div className="guide-page" role="dialog" aria-label="Guide de Nomina">
      <header className="guide-tete">
        <h2>📖 Guide</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Fermer le guide">
          ✕
        </button>
      </header>

      <div className="guide-corps" ref={corps}>
        <div className="guide-outils stack">
          <input
            type="search"
            className="guide-recherche"
            placeholder="Rechercher dans le guide (ex. : QR, PP, sauvegarde…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Rechercher dans le guide"
          />
          <Seg<Filtre>
            small
            value={filtre}
            onChange={setFiltre}
            options={[
              { id: 'joueur', label: 'Je suis joueur' },
              { id: 'mj', label: 'Je suis MJ' },
              { id: 'tous', label: 'Tout' },
            ]}
          />
        </div>

        {recherche ? (
          <Resultats q={recherche} sections={visibles} aller={aller} />
        ) : (
          <>
            <nav className="guide-sommaire" aria-label="Sommaire">
              {visibles.map((s) => (
                <button key={s.id} className="guide-lien" onClick={() => aller(s.id)}>
                  <span aria-hidden>{s.icone}</span> {s.titre}
                </button>
              ))}
              <button className="guide-lien" onClick={() => aller('faq')}>
                <span aria-hidden>❓</span> Questions fréquentes
              </button>
              <button className="guide-lien" onClick={() => aller('glossaire')}>
                <span aria-hidden>🔤</span> Glossaire
              </button>
            </nav>

            {visibles.map((s) => (
              <section key={s.id} id={`guide-${s.id}`} className="guide-section">
                <h3>
                  <span aria-hidden>{s.icone}</span> {s.titre}
                  {s.public === 'mj' && <span className="tag tag-mj">MJ</span>}
                </h3>
                <Texte source={s.corps} />
              </section>
            ))}

            <section id="guide-faq" className="guide-section">
              <h3>❓ Questions fréquentes</h3>
              {FAQ.map((f) =>
                impression ? (
                  <div key={f.q} className="guide-faq">
                    <b>{f.q}</b>
                    <p>{f.r}</p>
                  </div>
                ) : (
                  <details key={f.q} className="guide-faq">
                    <summary>{f.q}</summary>
                    <p>{f.r}</p>
                  </details>
                ),
              )}
            </section>

            <section id="guide-glossaire" className="guide-section">
              <h3>🔤 Glossaire</h3>
              <dl className="guide-glossaire">
                {GLOSSAIRE.map((g) => (
                  <Fragment key={g.terme}>
                    <dt>{g.terme}</dt>
                    <dd>{g.def}</dd>
                  </Fragment>
                ))}
              </dl>
            </section>

            <div className="guide-outils row">
              <button className="btn" onClick={revoirVisite}>
                🧭 Revoir la visite guidée
              </button>
              <button className="btn" onClick={() => setImpression(true)}>
                🖨️ Imprimer / PDF
              </button>
            </div>
            <p className="muted small center">Nomina {__APP_VERSION__}</p>
          </>
        )}
      </div>
    </div>
  )
}

function voit(pub: Public, filtre: Filtre): boolean {
  if (filtre === 'tous' || pub === 'tous') return true
  return pub === filtre
}

// ───────── Recherche ─────────

function Resultats({ q, sections, aller }: { q: string; sections: SectionGuide[]; aller: (id: string) => void }) {
  const res = useMemo(() => {
    const parSection = sections
      .map((s) => {
        const tous = blocsDe(s.corps)
        const trouves = tous.filter((b) => correspond(q, b.texte))
        // Si seul le titre correspond, on montre le début de la section.
        return { s, blocs: trouves.length ? trouves : correspond(q, s.titre) ? tous.slice(0, 1) : [] }
      })
      .filter((r) => r.blocs.length > 0)
    const faq = FAQ.filter((f) => correspond(q, f.q, f.r))
    const glo = GLOSSAIRE.filter((g) => correspond(q, g.terme, g.def))
    return { parSection, faq, glo }
  }, [q, sections])

  const vide = res.parSection.length === 0 && res.faq.length === 0 && res.glo.length === 0
  if (vide) return <p className="muted center">Aucun résultat pour « {q} ». Essaie un autre mot, ou choisis « Tout » ci-dessus.</p>

  return (
    <div className="stack">
      {res.parSection.map(({ s, blocs }) => (
        <section key={s.id} className="guide-section">
          <h3>
            <span aria-hidden>{s.icone}</span> {s.titre}
          </h3>
          <Texte source={blocs.map((b) => b.source).join('\n\n')} />
          <button className="link small" onClick={() => aller(s.id)}>
            Lire toute la section ›
          </button>
        </section>
      ))}
      {res.faq.length > 0 && (
        <section className="guide-section">
          <h3>❓ Questions fréquentes</h3>
          {res.faq.map((f) => (
            <div key={f.q} className="guide-faq">
              <b>{f.q}</b>
              <p>{f.r}</p>
            </div>
          ))}
        </section>
      )}
      {res.glo.length > 0 && (
        <section className="guide-section">
          <h3>🔤 Glossaire</h3>
          <dl className="guide-glossaire">
            {res.glo.map((g) => (
              <Fragment key={g.terme}>
                <dt>{g.terme}</dt>
                <dd>{g.def}</dd>
              </Fragment>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}

/** Découpe une section en blocs cherchables : un paragraphe, ou une puce (avec son sous-titre). */
function blocsDe(corps: string): { source: string; texte: string }[] {
  const blocs: { source: string; texte: string }[] = []
  let titre = ''
  for (const ligne of corps.split('\n')) {
    const l = ligne.trim()
    if (!l) continue
    if (l.startsWith('## ')) {
      titre = l.slice(3)
      continue
    }
    blocs.push({ source: titre ? `## ${titre}\n${l}` : l, texte: `${titre} ${l}`.replace(/\*\*/g, '') })
  }
  // Regroupe les puces consécutives sous un même sous-titre pour ne l'afficher qu'une fois.
  const out: { source: string; texte: string }[] = []
  for (const b of blocs) {
    const prev = out[out.length - 1]
    const t = b.source.startsWith('## ') ? b.source.split('\n')[0] : ''
    if (prev && t && prev.source.startsWith(t + '\n')) {
      out[out.length - 1] = { source: prev.source + '\n' + b.source.slice(t.length + 1), texte: prev.texte + ' ' + b.texte }
    } else out.push(b)
  }
  return out
}

// ───────── Mise en forme ─────────

/** Rendu d'un texte du guide : « ## » sous-titre, « - » puce, « 1. » étape, **gras**. */
export function Texte({ source }: { source: string }) {
  const out: ReactNode[] = []
  let liste: { ordonnee: boolean; items: string[] } | null = null
  let para: string[] = []
  let n = 0
  const viderPara = () => {
    if (para.length) out.push(<p key={n++}>{gras(para.join(' '))}</p>)
    para = []
  }
  const viderListe = () => {
    if (!liste) return
    const items = liste.items.map((t, i) => <li key={i}>{gras(t)}</li>)
    out.push(liste.ordonnee ? <ol key={n++}>{items}</ol> : <ul key={n++}>{items}</ul>)
    liste = null
  }
  for (const brut of source.split('\n')) {
    const l = brut.trim()
    const puce = /^-\s+(.*)$/.exec(l)
    const etape = /^\d+\.\s+(.*)$/.exec(l)
    if (!l) {
      viderPara()
      viderListe()
    } else if (l.startsWith('## ')) {
      viderPara()
      viderListe()
      out.push(<h4 key={n++}>{l.slice(3)}</h4>)
    } else if (puce || etape) {
      viderPara()
      const ordonnee = !!etape
      if (liste && liste.ordonnee !== ordonnee) viderListe()
      if (!liste) liste = { ordonnee, items: [] }
      liste.items.push((puce ?? etape)![1])
    } else {
      viderListe()
      para.push(l)
    }
  }
  viderPara()
  viderListe()
  return <div className="guide-texte">{out}</div>
}

function gras(t: string): ReactNode[] {
  return t.split(/\*\*(.+?)\*\*/g).map((bout, i) => (i % 2 ? <b key={i}>{bout}</b> : <Fragment key={i}>{bout}</Fragment>))
}
