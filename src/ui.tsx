// Petits composants d'interface réutilisables.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { correspond } from './lib/texte'

export function Field(p: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  list?: string
  inputMode?: 'text' | 'numeric' | 'decimal'
}) {
  return (
    <label className={p.className}>
      {p.label}
      <input value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} list={p.list} inputMode={p.inputMode} />
    </label>
  )
}

export function Area(p: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <label>
      {p.label}
      <textarea rows={p.rows ?? 3} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} />
    </label>
  )
}

/** Champ numérique avec boutons − / + (pratique au téléphone). */
export function Stepper(p: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; className?: string }) {
  const clamp = (v: number) => Math.max(p.min ?? -99, Math.min(p.max ?? 999, v))
  return (
    <div className={`stepper ${p.className ?? ''}`}>
      <span className="stepper-label">{p.label}</span>
      <div className="stepper-row">
        <button type="button" onClick={() => p.onChange(clamp(p.value - 1))} aria-label={`${p.label} moins un`}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={Number.isFinite(p.value) ? p.value : 0}
          onChange={(e) => p.onChange(clamp(Number(e.target.value) || 0))}
          aria-label={p.label}
        />
        <button type="button" onClick={() => p.onChange(clamp(p.value + 1))} aria-label={`${p.label} plus un`}>
          +
        </button>
      </div>
    </div>
  )
}

export function Card(p: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`card ${p.className ?? ''}`}>
      {(p.title || p.actions) && (
        <div className="card-head">
          {p.title && <h3>{p.title}</h3>}
          {p.actions && <div className="row">{p.actions}</div>}
        </div>
      )}
      {p.children}
    </section>
  )
}

export function Modal(p: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && p.onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [p])
  return (
    <div className="modal" role="dialog" aria-label={p.title} onClick={(e) => e.target === e.currentTarget && p.onClose()}>
      <div className={`modal-box${p.wide ? ' wide' : ''}`}>
        <div className="modal-head">
          <h2>{p.title}</h2>
          <button className="icon-btn" onClick={p.onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        {p.children}
      </div>
    </div>
  )
}

/** Bouton « ⓘ » qui ouvre une infobulle lisible au doigt comme à la souris. */
export function Info(p: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="info-btn" onClick={() => setOpen(true)} title={p.title} aria-label={`Infos : ${p.title}`}>
        ⓘ
      </button>
      {open && (
        <Modal title={p.title} onClose={() => setOpen(false)}>
          {p.children}
        </Modal>
      )}
    </>
  )
}

export function Seg<T extends string>(p: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className={`seg${p.small ? ' seg-small' : ''}`} role="tablist">
      {p.options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={p.value === o.id} className={p.value === o.id ? 'on' : ''} onClick={() => p.onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Bouton d'import de fichier. */
export function FilePick(p: { label: string; onFile: (f: File) => void; className?: string; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={p.className ?? 'btn'} onClick={() => ref.current?.click()}>
        {p.label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={p.accept ?? '.json,application/json'}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) p.onFile(f)
          e.target.value = ''
        }}
      />
    </>
  )
}

export type OptionChoix = { id: string; label: string; detail?: string; recherche?: string }

/**
 * Menu de choix avec recherche : un bouton qui affiche la valeur choisie
 * et ouvre une liste filtrable (au doigt comme à la souris).
 */
export function Choix(p: {
  label: string
  options: OptionChoix[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  titre?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const cur = p.options.find((o) => o.id === p.value)
  const liste = p.options.filter((o) => correspond(q, o.label, o.detail, o.recherche))
  const choisir = (id: string) => {
    p.onChange(id)
    setOpen(false)
    setQ('')
  }
  return (
    <div className="choix">
      <span className="choix-label">{p.label}</span>
      <button type="button" className="choix-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className={cur ? '' : 'muted'}>{cur ? cur.label : (p.placeholder ?? '— Choisir —')}</span>
        {cur?.detail && <span className="muted small"> {cur.detail}</span>}
        <span className="choix-fleche" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <Modal title={p.titre ?? p.label} onClose={() => setOpen(false)} wide>
          <input
            type="search"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && liste.length === 1 && choisir(liste[0].id)}
            placeholder="Rechercher…"
          />
          <ul className="pick-list">
            {liste.map((o) => (
              <li key={o.id}>
                <button className={o.id === p.value ? 'on' : ''} onClick={() => choisir(o.id)}>
                  <b>{o.label}</b>
                  {o.detail && <span className="muted small"> {o.detail}</span>}
                </button>
              </li>
            ))}
            {liste.length === 0 && <li className="muted">Aucun résultat.</li>}
            {p.value && (
              <li>
                <button className="muted" onClick={() => choisir('')}>
                  Aucun (retirer le choix)
                </button>
              </li>
            )}
          </ul>
        </Modal>
      )}
    </div>
  )
}

/** Menu déroulant d'une liste de base, avec « Autre » pour une saisie libre. */
export function ListeOuLibre(p: { label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const horsListe = !!p.value && !p.options.includes(p.value)
  const [libre, setLibre] = useState(horsListe)
  const enLibre = libre || horsListe
  return (
    <label>
      {p.label}
      <select
        value={enLibre ? '__autre' : p.value}
        onChange={(e) => {
          if (e.target.value === '__autre') {
            setLibre(true)
          } else {
            setLibre(false)
            p.onChange(e.target.value)
          }
        }}
      >
        <option value="">— Choisir —</option>
        {p.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value="__autre">Autre (saisie libre)…</option>
      </select>
      {enLibre && <input value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder ?? 'Saisir…'} aria-label={`${p.label} (saisie libre)`} autoFocus={libre && !horsListe} />}
    </label>
  )
}

export function Empty(p: { children: ReactNode }) {
  return <p className="muted empty">{p.children}</p>
}
