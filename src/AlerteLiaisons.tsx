// Personnes présentes à la table mais pas reliées directement à cet appareil.
import { useState } from 'react'
import { nonRelies, reessayerLiaisons, roleLabel } from './lib/p2p'
import { useStore } from './lib/store'

export function AlerteLiaisons({ compact }: { compact?: boolean }) {
  const s = useStore()
  const [encours, setEncours] = useState(false)
  const liste = nonRelies(s)
  if (liste.length === 0 || !s.table) return null

  const reessayer = async () => {
    setEncours(true)
    try {
      await reessayerLiaisons()
    } finally {
      // Laisse le temps aux appareils de se retrouver avant de réactiver le bouton.
      window.setTimeout(() => setEncours(false), 8000)
    }
  }

  const noms = liste.map((x) => x.name).join(', ')
  const bouton = (
    <button className="btn btn-small" onClick={() => void reessayer()} disabled={encours}>
      {encours ? 'Connexion…' : '🔄 Réessayer'}
    </button>
  )

  if (compact) {
    return (
      <div className="alerte-liaisons compact">
        <span>
          ⚠ <b>{noms}</b> {liste.length > 1 ? 'sont' : 'est'} à la table mais pas relié{liste.length > 1 ? 's' : ''} à cet appareil.
        </span>
        {bouton}
      </div>
    )
  }

  return (
    <section className="card alerte-liaisons stack">
      <h3>⚠ Pas reliés à cet appareil ({liste.length})</h3>
      <ul className="plain stack-sm">
        {liste.map((x) => (
          <li key={x.deviceId}>
            <b>{x.name}</b> <span className="tag">{roleLabel(x.role)}</span>
            <span className="muted small"> · vu par {x.via.join(', ')}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">
        {liste.length > 1 ? 'Ces personnes sont' : 'Cette personne est'} bien à la table, mais la liaison directe avec cet appareil n'a pas pu s'établir :
        vous ne vous voyez pas dans Messages, et vos messages attendent. Souvent : un appareil sur un autre réseau, un VPN ou un pare-feu.
      </p>
      <ul className="small">
        <li>Mettez tous les appareils sur le même Wi-Fi.</li>
        <li>Coupez le VPN de cet appareil s'il y en a un.</li>
        <li>Puis touchez « Réessayer » (les autres liaisons se rétablissent en quelques secondes).</li>
      </ul>
      <div className="row">{bouton}</div>
    </section>
  )
}
