// Bouton « ⚡ Utiliser » : dépense les PP d'un pouvoir, avec blocage sous 0.
import { useEffect, useState } from 'react'
import type { Cout } from './lib/cout'
import { etiquetteCout, lireCout } from './lib/cout'
import { annulerDepense, depenserPP } from './lib/pp'
import { setState, useStore } from './lib/store'
import { Modal, Stepper } from './ui'

const UNITE: Record<'seconde' | 'minute' | 'heure', [string, string]> = {
  seconde: ['seconde', 'secondes'],
  minute: ['minute', 'minutes'],
  heure: ['heure', 'heures'],
}

/** Coût total pour une quantité donnée (durée, nombre de cibles ou montant libre). */
function total(c: Cout, q: number, ppActuels: number): number {
  switch (c.genre) {
    case 'fixe':
      return c.pp
    case 'duree':
      return c.depart + c.parUnite * q
    case 'cible':
      return c.parCible * q
    case 'tous':
      return Math.max(0, ppActuels)
    case 'inconnu':
      return q
    default:
      return 0
  }
}

export function BoutonPP(p: { persoId: string; pouvoir: string; cout?: string; ppActuels: number; serviteurId?: string; compact?: boolean }) {
  const estMj = useStore().profile?.role === 'mj'
  const c = lireCout(p.cout)
  const [ouvert, setOuvert] = useState(false)
  if (c.genre === 'gratuit') return null

  const fixe = c.genre === 'fixe'
  const manque = fixe && c.pp > p.ppActuels
  const vide = p.ppActuels <= 0 && c.genre !== 'fixe'
  const bloque = (manque || vide) && !estMj

  const utiliser = () => {
    if (fixe) {
      if (manque && !confirm(`PP insuffisants (${c.pp} requis, ${p.ppActuels} restants). Dépenser quand même ? (réservé au MJ)`)) return
      depenserPP(p.persoId, p.pouvoir, c.pp, p.serviteurId)
    } else setOuvert(true)
  }

  return (
    <>
      <button
        type="button"
        className={`btn-pp${p.compact ? ' compact' : ''}${manque || vide ? ' insuffisant' : ''}`}
        disabled={bloque}
        onClick={utiliser}
        title={bloque ? (fixe ? `PP insuffisants (${c.pp} requis, ${p.ppActuels} restants)` : 'Plus de PP') : `Utiliser « ${p.pouvoir} » et dépenser ses PP`}
        aria-label={`Utiliser ${p.pouvoir}`}
      >
        ⚡ {etiquetteCout(c)}
      </button>
      {ouvert && <FenetreDepense {...p} cout={c} estMj={estMj} fermer={() => setOuvert(false)} />}
    </>
  )
}

function FenetreDepense(p: { persoId: string; pouvoir: string; cout: Cout; ppActuels: number; serviteurId?: string; estMj: boolean; fermer: () => void }) {
  const c = p.cout
  const [q, setQ] = useState(c.genre === 'inconnu' ? 1 : 1)
  const t = total(c, q, p.ppActuels)
  const depasse = t > p.ppActuels
  // Plus grande quantité payable
  let maxQ = 99
  if (c.genre === 'duree' && c.parUnite > 0) maxQ = Math.max(0, Math.floor((p.ppActuels - c.depart) / c.parUnite))
  if (c.genre === 'cible' && c.parCible > 0) maxQ = Math.floor(p.ppActuels / c.parCible)
  if (c.genre === 'inconnu') maxQ = Math.max(0, p.ppActuels)
  const borne = p.estMj ? 99 : maxQ

  const libelle =
    c.genre === 'duree' ? `Durée (${UNITE[c.unite][1]})` : c.genre === 'cible' ? 'Nombre de cibles' : c.genre === 'inconnu' ? 'PP à dépenser' : ''

  return (
    <Modal title={`Utiliser « ${p.pouvoir} »`} onClose={p.fermer}>
      <div className="stack">
        {c.genre === 'duree' && (
          <p className="muted small">
            {c.depart ? `${c.depart} PP au départ, puis ` : ''}
            {c.parUnite} PP par {UNITE[c.unite][0]}.
          </p>
        )}
        {c.genre === 'cible' && <p className="muted small">{c.parCible} PP par cible.</p>}
        {c.genre === 'inconnu' && <p className="muted small">Le coût de ce pouvoir est variable : indique combien de PP tu dépenses.</p>}
        {c.genre === 'tous' && <p>Ce pouvoir coûte tous tes PP restants ({p.ppActuels}).</p>}
        {libelle && <Stepper label={libelle} value={q} min={c.genre === 'inconnu' ? 1 : 1} max={Math.max(1, borne)} onChange={setQ} />}
        <p className={depasse ? 'alert' : ''}>
          Total : <b>{t} PP</b> · il te restera {p.ppActuels - t} PP
          {depasse && !p.estMj && ` — c'est trop : tu peux aller jusqu'à ${maxQ} ${c.genre === 'duree' ? UNITE[c.unite][maxQ > 1 ? 1 : 0] : ''}.`}
          {depasse && p.estMj && ' — dépassement autorisé pour le MJ.'}
        </p>
        <div className="row">
          <button
            className="btn btn-primary"
            disabled={t <= 0 || (depasse && !p.estMj)}
            onClick={() => {
              depenserPP(p.persoId, p.pouvoir, t, p.serviteurId)
              p.fermer()
            }}
          >
            ⚡ Dépenser {t} PP
          </button>
          <button className="btn" onClick={p.fermer}>
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Bandeau « −3 PP pour Invisibilité · Annuler », 8 secondes après une dépense. */
export function BandeauAnnulation() {
  const a = useStore().annulation
  useEffect(() => {
    if (!a) return
    const t = window.setTimeout(() => setState({ annulation: null }), Math.max(0, a.jusqua - Date.now()))
    return () => window.clearTimeout(t)
  }, [a])
  if (!a) return null
  return (
    <div className="toast toast-pp" role="status">
      <span>
        −{a.depense.montant} PP pour <b>{a.depense.pouvoir}</b>
        {a.depense.serviteurNom ? ` (${a.depense.serviteurNom})` : ''}
      </span>
      <button className="btn btn-primary" onClick={annulerDepense}>
        Annuler
      </button>
    </div>
  )
}
