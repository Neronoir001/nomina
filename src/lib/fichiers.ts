// Export / import de fichiers (sauvegardes, personnages, référentiel).
import { isPack } from './pack'
import type { Personnage } from './personnage'
import { nomAffiche, normaliser } from './personnage'
import { uid } from './storage'
import { getState, log, setState } from './store'

type Sauvegarde = {
  format: 'nomina-sauvegarde'
  version: 1
  date: string
  personnages: Personnage[]
}

type ExportPerso = { format: 'nomina-personnage'; version: 1; date: string; personnage: Personnage }

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'nomina'
}

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Propose le fichier via le menu de partage (téléphone) ou le télécharge (PC). */
export async function partagerFichier(nom: string, contenu: unknown): Promise<void> {
  const blob = new Blob([JSON.stringify(contenu, null, 1)], { type: 'application/json' })
  const file = new File([blob], nom, { type: 'application/json' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1
  if (mobile && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: nom })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export async function exporterTout(): Promise<void> {
  const s: Sauvegarde = {
    format: 'nomina-sauvegarde',
    version: 1,
    date: new Date().toISOString(),
    personnages: Object.values(getState().personnages),
  }
  await partagerFichier(`Nomina-sauvegarde-${aujourdhui()}.json`, s)
}

export async function exporterPerso(p: Personnage): Promise<void> {
  const e: ExportPerso = { format: 'nomina-personnage', version: 1, date: new Date().toISOString(), personnage: p }
  await partagerFichier(`Nomina-${slug(nomAffiche(p))}.json`, e)
}

export async function exporterPack(): Promise<void> {
  const p = getState().pack
  if (p) await partagerFichier(`Nomina-referentiel-${slug(p.titre)}-v${p.version}.json`, p)
}

/** Importe n'importe quel fichier Nomina. Renvoie un message à afficher. */
export async function importerFichier(file: File): Promise<string> {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    return "Ce fichier n'est pas un fichier Nomina lisible."
  }
  const d = data as { format?: string }

  if (isPack(data)) {
    setState({ pack: data })
    log(`Référentiel « ${data.titre} » (version ${data.version}) installé.`, 'ok')
    return `Référentiel « ${data.titre} » installé (${data.superieurs.length} supérieurs, ${data.pouvoirs.length} pouvoirs, ${data.talents.length} talents, ${data.limitations.length} limitations).`
  }

  if (d.format === 'nomina-personnage') {
    const p = normaliser((data as ExportPerso).personnage)
    const existe = getState().personnages[p.id]
    if (existe && !confirm(`« ${nomAffiche(p)} » existe déjà sur cet appareil. Remplacer par la version du fichier ? (Annuler = l'importer comme copie)`)) {
      p.id = uid()
      p.identite = { ...p.identite, nom: `${p.identite.nom || nomAffiche(p)} (copie)` }
    }
    setState((s) => ({ personnages: { ...s.personnages, [p.id]: p }, actifId: p.id }))
    return `Personnage « ${nomAffiche(p)} » importé.`
  }

  if (d.format === 'nomina-sauvegarde') {
    const list = (data as Sauvegarde).personnages.map(normaliser)
    const cur = getState().personnages
    const conflits = list.filter((p) => cur[p.id])
    if (conflits.length && !confirm(`${conflits.length} personnage(s) de la sauvegarde existent déjà ici. Les remplacer par la version de la sauvegarde ?`)) {
      const nouveaux = list.filter((p) => !cur[p.id])
      setState((s) => ({ personnages: { ...s.personnages, ...Object.fromEntries(nouveaux.map((p) => [p.id, p])) } }))
      return `${nouveaux.length} personnage(s) ajouté(s), les autres conservés tels quels.`
    }
    setState((s) => ({
      personnages: { ...s.personnages, ...Object.fromEntries(list.map((p) => [p.id, p])) },
      actifId: s.actifId ?? list[0]?.id ?? null,
    }))
    return `Sauvegarde restaurée : ${list.length} personnage(s).`
  }

  return "Ce fichier n'est pas reconnu par Nomina."
}
