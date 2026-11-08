import { useMemo } from 'react'
import type { Camp } from '../../lib/pack'
import { CARAC_LABEL } from '../../lib/pack'
import { useStore } from '../../lib/store'

/**
 * Listes de suggestions proposées pendant la frappe dans les champs libres
 * (éléments <datalist> du navigateur, reliés aux champs par leur identifiant).
 */
export const LISTES = {
  pouvoirs: 'dl-pouvoirs',
  talents: 'dl-talents',
  limitations: 'dl-limitations',
  caracs: 'dl-caracs',
  typesPouvoir: 'dl-types-pouvoir',
  typesServiteur: 'dl-types-serviteur',
  portees: 'dl-portees',
} as const

function uniques(noms: (string | undefined)[]): string[] {
  const vus = new Map<string, string>()
  for (const n of noms) {
    const t = n?.trim()
    if (t && !t.toLowerCase().startsWith('tous les') && !vus.has(t.toLowerCase())) vus.set(t.toLowerCase(), t)
  }
  return [...vus.values()].sort((a, b) => a.localeCompare(b, 'fr'))
}

export default function Suggestions({ camp }: { camp: Camp }) {
  const pack = useStore().pack
  const l = useMemo(() => {
    const sups = (pack?.superieurs ?? []).filter((s) => s.camp === camp)
    const pouvoirs = (pack?.pouvoirs ?? []).filter((p) => p.camp === camp)
    return {
      // Pouvoirs du référentiel + pouvoirs cités par les supérieurs (privilégiés, avatars)
      pouvoirs: uniques([
        ...pouvoirs.map((p) => p.nom),
        ...sups.flatMap((s) => s.pouvoirsPrivilegies ?? []).filter((n) => !n.includes('(')),
        ...sups.flatMap((s) => s.avatar?.pouvoirs?.map((x) => x.nom) ?? []),
      ]),
      talents: uniques([...(pack?.talents ?? []).map((t) => t.nom), ...sups.flatMap((s) => s.avatar?.talents?.map((x) => x.nom) ?? [])]),
      limitations: uniques((pack?.limitations ?? []).filter((x) => x.camp === camp).map((x) => x.nom)),
      portees: uniques(pouvoirs.map((p) => p.portee)),
    }
  }, [pack, camp])

  const dl = (id: string, items: string[]) => (
    <datalist id={id}>
      {items.map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
  )

  return (
    <>
      {dl(LISTES.pouvoirs, l.pouvoirs)}
      {dl(LISTES.talents, l.talents)}
      {dl(LISTES.limitations, l.limitations)}
      {dl(LISTES.portees, l.portees)}
      {dl(LISTES.caracs, Object.values(CARAC_LABEL))}
      {dl(LISTES.typesPouvoir, ['Physique', 'Mental', 'Permanent', 'Unique', 'Physique, permanent', 'Mental, permanent', 'Mental, unique'])}
      {dl(LISTES.typesServiteur, ['Animal', 'Humain', 'Mort-vivant', 'Possédé', 'Objet', 'Familier'])}
    </>
  )
}
