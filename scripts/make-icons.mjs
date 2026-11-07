// Génère les icônes de l'appli à partir de scripts/icon-source.svg.
// Usage : npm run icons
import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', 'public')
await mkdir(out, { recursive: true })

const carre = await readFile(join(here, 'icon-source.svg'), 'utf8')
// Version « arrondie » pour les endroits qui affichent l'icône telle quelle.
const arrondi = carre.replace('<rect id="fond-forme" width="512" height="512"', '<rect id="fond-forme" width="512" height="512" rx="112"')

const rendus = [
  { fichier: 'icon-192.png', svg: arrondi, taille: 192 },
  { fichier: 'icon-512.png', svg: arrondi, taille: 512 },
  { fichier: 'icon-maskable-512.png', svg: carre, taille: 512 },
  { fichier: 'apple-touch-icon-180x180.png', svg: carre, taille: 180 },
]
for (const { fichier, svg, taille } of rendus) {
  await sharp(Buffer.from(svg)).resize(taille, taille).png().toFile(join(out, fichier))
  console.log('✓', fichier)
}
await writeFile(join(out, 'favicon.svg'), arrondi)
console.log('✓ favicon.svg')
