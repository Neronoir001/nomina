import { useState } from 'react'
import { announceProfile } from '../lib/p2p'
import { uid } from '../lib/storage'
import { getState, setState } from '../lib/store'
import type { Role } from '../lib/types'

export default function Profil({ first, onClose }: { first?: boolean; onClose?: () => void }) {
  const cur = getState().profile
  const [name, setName] = useState(cur?.name ?? '')
  const [role, setRole] = useState<Role>(cur?.role ?? 'joueur')

  function valider(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setState({ profile: { deviceId: cur?.deviceId ?? uid(), name: n, role }, ...(first ? { nouveautesVues: __APP_VERSION__ } : {}) })
    announceProfile()
    onClose?.()
  }

  const form = (
    <form className="card stack" onSubmit={valider}>
      {first && (
        <>
          <img className="hero-icon" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={96} height={96} />
          <h1>Bienvenue dans Nomina</h1>
          <p className="muted">
            Tes personnages d'In Nomine Satanis et de Magna Veritas, ta table de jeu et tes messages secrets, au même
            endroit. Pour commencer, présente-toi.
          </p>
        </>
      )}
      {!first && <h2>Mon profil</h2>}
      <label>
        Ton prénom ou pseudo
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Michaël" autoFocus={first} maxLength={30} />
      </label>
      <fieldset className="choices">
        <legend>Sur cet appareil, tu es…</legend>
        <label className={`choice${role === 'joueur' ? ' on' : ''}`}>
          <input type="radio" name="role" checked={role === 'joueur'} onChange={() => setRole('joueur')} />
          Joueur
        </label>
        <label className={`choice${role === 'mj' ? ' on' : ''}`}>
          <input type="radio" name="role" checked={role === 'mj'} onChange={() => setRole('mj')} />
          Maître du jeu
        </label>
      </fieldset>
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
          {first ? 'Commencer' : 'Enregistrer'}
        </button>
        {onClose && (
          <button className="btn" type="button" onClick={onClose}>
            Annuler
          </button>
        )}
      </div>
    </form>
  )

  if (first) return <div className="welcome">{form}</div>
  return (
    <div className="modal" role="dialog" aria-label="Mon profil">
      <div className="modal-box">{form}</div>
    </div>
  )
}
