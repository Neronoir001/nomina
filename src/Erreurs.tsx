import { Component, useState, type ReactNode } from 'react'
import { getState, heure } from './lib/store'

function rapport(titre: string, detail: string): string {
  return [
    `${titre} — Nomina ${__APP_VERSION__} — ${new Date().toLocaleString('fr-FR')}`,
    detail,
    `Navigateur : ${navigator.userAgent}`,
    '— Journal —',
    ...getState().logs.map((l) => `${heure(l.at)} [${l.level}] ${l.text}`),
  ].join('\n')
}

/** Écran affiché quand l'appli ne peut pas démarrer, au lieu d'un écran figé. */
export function EcranErreur({ titre, detail, conseil }: { titre: string; detail: string; conseil: ReactNode }) {
  const [copie, setCopie] = useState(false)
  return (
    <div className="welcome">
      <div className="card stack" style={{ maxWidth: 520 }}>
        <h2>{titre}</h2>
        <p className="alert">{detail}</p>
        <div className="muted">{conseil}</div>
        <div className="row">
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Réessayer
          </button>
          <button
            className="btn"
            onClick={() =>
              void navigator.clipboard
                .writeText(rapport(titre, detail))
                .then(() => setCopie(true))
                .catch(() => setCopie(false))
            }
          >
            {copie ? 'Copié ✅' : 'Copier le détail pour Claude'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConseilsDemarrage() {
  return (
    <>
      <p>Tes données n'ont pas été touchées : par sécurité, rien n'est enregistré tant que ce problème n'est pas réglé.</p>
      <ol>
        <li>Ferme toutes les fenêtres de Nomina, ainsi que les onglets du navigateur ouverts sur Nomina.</li>
        <li>Rouvre Nomina depuis son icône.</li>
        <li>Si le message revient, copie le détail et envoie-le à Claude.</li>
      </ol>
    </>
  )
}

/** Attrape les plantages d'affichage pour montrer un message plutôt qu'un écran vide. */
export class GardeErreur extends Component<{ children: ReactNode }, { erreur: Error | null }> {
  state = { erreur: null as Error | null }
  static getDerivedStateFromError(erreur: Error) {
    return { erreur }
  }
  render() {
    if (this.state.erreur) {
      const e = this.state.erreur
      return (
        <EcranErreur
          titre="Nomina a rencontré un problème"
          detail={`${e.name} : ${e.message}`}
          conseil={<p>Touche « Réessayer ». Si le problème revient, copie le détail et envoie-le à Claude.</p>}
        />
      )
    }
    return this.props.children
  }
}
