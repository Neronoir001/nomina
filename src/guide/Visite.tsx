import { useEffect, useLayoutEffect, useState } from 'react'
import { useStore } from '../lib/store'

type Etape = { cible?: string; titre: string; texte: string; mj?: boolean }

const ETAPES: Etape[] = [
  {
    titre: 'Bienvenue dans Nomina',
    texte: 'Petit tour du propriétaire en quelques étapes. Tu peux le passer à tout moment et le revoir depuis le guide.',
  },
  { cible: 'accueil', titre: 'Accueil', texte: 'Tes personnages, leurs PP et PV, la Table et tes messages, d’un coup d’œil.' },
  { cible: 'fiche', titre: 'Fiche', texte: 'La fiche complète de ton personnage : identité, talents, pouvoirs, supérieur et serviteurs. Tout s’enregistre tout seul.' },
  { cible: 'referentiel', titre: 'Référentiel', texte: 'Princes et archanges, pouvoirs, talents et limitations, avec recherche. Ton MJ te l’envoie quand tu rejoins sa Table.' },
  { cible: 'table', titre: 'Table', texte: 'Pour rejoindre la partie du MJ en scannant son QR code. Ta fiche lui est alors envoyée automatiquement.' },
  { cible: 'messages', titre: 'Messages', texte: 'Des messages privés, à deux ou en groupe, que seuls les destinataires reçoivent.' },
  { cible: 'mj', mj: true, titre: 'Espace MJ', texte: 'Ton espace secret, chiffré par une phrase de passe : notes de campagne, séances, PNJ et règles maison.' },
  { cible: 'aide', titre: 'Aide', texte: 'Ce bouton ouvre le guide directement à la page de l’écran affiché.' },
  { cible: 'reglages', titre: 'Réglages', texte: 'Sauvegardes, référentiel, mises à jour et diagnostic de connexion.' },
  { titre: 'À toi de jouer !', texte: 'Un conseil : pense à sauvegarder régulièrement tes personnages (⚙️ → Sauvegardes). Bonne partie !' },
]

type Rect = { top: number; left: number; width: number; height: number }

/** Visite guidée : met en lumière chaque zone de l'écran, une étape après l'autre. */
export default function Visite({ onFin }: { onFin: () => void }) {
  const estMj = useStore().profile?.role === 'mj'
  const [etapes] = useState(() => ETAPES.filter((e) => !e.mj || estMj))
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const etape = etapes[i]
  const derniere = i === etapes.length - 1

  useLayoutEffect(() => {
    const mesurer = () => {
      const el = etape.cible ? document.querySelector<HTMLElement>(`[data-visite="${etape.cible}"]`) : null
      if (!el) return setRect(null)
      const r = el.getBoundingClientRect()
      // Halo légèrement plus grand que la zone, sans déborder de l'écran.
      const l = Math.max(2, r.left - 6)
      const t = Math.max(2, r.top - 6)
      const rr = Math.min(window.innerWidth - 2, r.right + 6)
      const b = Math.min(window.innerHeight - 2, r.bottom + 6)
      setRect({ top: t, left: l, width: rr - l, height: b - t })
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [etape])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFin()
      if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, etapes.length - 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onFin, etapes])

  // La bulle se place du côté où il y a le plus de place.
  const enHaut = rect && rect.top + rect.height / 2 > window.innerHeight / 2
  const styleBulle = rect
    ? enHaut
      ? { bottom: window.innerHeight - rect.top + 12 }
      : { top: rect.top + rect.height + 12 }
    : undefined

  return (
    <div className={`visite${rect ? '' : ' visite-centre'}`} role="dialog" aria-modal aria-label="Visite guidée">
      {rect ? <div className="visite-spot" style={rect} /> : <div className="visite-fond" />}
      <div className="visite-bulle" style={styleBulle}>
        <div className="muted small">
          {i + 1} / {etapes.length}
        </div>
        <h3>{etape.titre}</h3>
        <p>{etape.texte}</p>
        <div className="row between">
          {derniere ? (
            <span />
          ) : (
            <button className="link" onClick={onFin}>
              Passer la visite
            </button>
          )}
          <div className="row">
            {i > 0 && (
              <button className="btn" onClick={() => setI(i - 1)}>
                ‹
              </button>
            )}
            <button className="btn btn-primary" onClick={() => (derniere ? onFin() : setI(i + 1))} autoFocus>
              {derniere ? 'Terminer' : 'Suivant ›'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
