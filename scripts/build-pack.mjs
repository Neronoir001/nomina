// Assemble le référentiel à partir des fichiers de travail du dossier ../pack (jamais publié).
// Usage : npm run pack   →  écrit « ../Nomina - Referentiel.json »
import { readFile, writeFile, access, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', '..', 'pack')
const out = join(here, '..', '..', 'Nomina - Referentiel.json')

async function lire(nom, defaut) {
  const f = join(src, nom)
  try {
    await access(f)
  } catch {
    return defaut
  }
  return JSON.parse(await readFile(f, 'utf8'))
}

const meta = await lire('meta.json', {})
const pack = {
  format: 'nomina-pack',
  version: meta.version ?? '0',
  titre: meta.titre ?? 'Référentiel',
  date: new Date().toISOString(),
  regles: await lire('regles.json', {}),
  talents: await lire('talents.json', []),
  superieurs: await lirePrefixe('superieurs'),
  pouvoirs: await lirePrefixe('pouvoirs'),
  limitations: await lirePrefixe('limitations'),
}

/** Concatène tous les fichiers « prefixe*.json » (ex. superieurs-ins-1.json, superieurs-ins-2.json…). */
async function lirePrefixe(prefixe) {
  const noms = (await readdir(src)).filter((n) => n.startsWith(prefixe) && n.endsWith('.json')).sort()
  const tout = []
  for (const n of noms) tout.push(...(await lire(n, [])))
  return tout
}

// Contrôles de cohérence
const erreurs = []
for (const k of ['talents', 'superieurs', 'pouvoirs', 'limitations']) {
  const vus = new Set()
  for (const x of pack[k]) {
    if (!x.id) erreurs.push(`${k} : élément sans id (${x.nom})`)
    if (vus.has(x.id)) erreurs.push(`${k} : id en double « ${x.id} »`)
    vus.add(x.id)
  }
}
const idsPouvoirs = new Set(pack.pouvoirs.map((p) => p.id))
for (const s of pack.superieurs) {
  for (const id of s.pouvoirsPropres ?? []) if (!idsPouvoirs.has(id)) erreurs.push(`${s.nom} : pouvoir propre inconnu « ${id} »`)
}
if (erreurs.length) {
  console.error('✗ Problèmes :\n  ' + erreurs.join('\n  '))
  process.exit(1)
}

await writeFile(out, JSON.stringify(pack))
console.log(
  `✓ ${out}\n  ${pack.superieurs.length} supérieurs · ${pack.pouvoirs.length} pouvoirs · ${pack.talents.length} talents · ${pack.limitations.length} limitations`,
)
