import type { RegleTableUM } from '../lib/pack'

/** Affiche la table de potentiel de réussite, avec une colonne et une ligne mises en évidence. */
export function TableUM({ table, col, ligne }: { table: RegleTableUM; col?: number | null; ligne?: string }) {
  return (
    <div className="table-um-wrap">
      <table className="table-um">
        <thead>
          <tr>
            <th>Difficulté</th>
            {table.colonnes.map((c, i) => (
              <th key={i} className={i === col ? 'hl' : ''}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.lignes.map((l) => (
            <tr key={l.id} className={l.id === ligne ? 'hl-row' : ''}>
              <th>{l.nom}</th>
              {l.seuils.map((v, i) => (
                <td key={i} className={i === col ? (l.id === ligne ? 'hl-cell' : 'hl') : ''}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        La colonne dépend de la valeur du talent, du pouvoir ou de la caractéristique (1 à 6, en gras). Il faut faire au plus le nombre indiqué avec
        les deux premiers dés du d666 ; le troisième dé (les unités) mesure la qualité du résultat.
      </p>
    </div>
  )
}
