// Connexion pair-à-pair entre les appareils d'une même « Table ».
// La poignée de main passe par des relais publics (chiffrée avec la clé de la table),
// puis les données circulent directement d'un appareil à l'autre (WebRTC).
import type { JoinRoom, JsonValue, MessageAction, Room } from '@trystero-p2p/nostr'
import { getState, log, setState } from './store'
import { uid } from './storage'
import type { Pack } from './pack'
import { isPack } from './pack'
import type { Personnage } from './personnage'
import { nomAffiche, normaliser, nouveauPouvoir } from './personnage'
import { majPerso, persoActif } from './store'
import type { ChatMessage, Groupe, Peer, Profile, ReglesMaison, RelayKind, Role, TableInfo } from './types'
import { RELAYS } from './types'

const APP_ID = 'nomina-insmv'

type RelayModule = { joinRoom: JoinRoom; getRelaySockets?: () => unknown }
type Hello = { deviceId: string; name: string; role: Role; version: string }
type MsgPayload = { id: string; text: string; at: number; from: string; conv?: string; groupe?: Groupe }

type Actions = {
  hello: MessageAction<JsonValue>
  msg: MessageAction<JsonValue>
  msgAck: MessageAction<JsonValue>
  sheet: MessageAction<JsonValue>
  sheetAck: MessageAction<JsonValue>
  ref: MessageAction<JsonValue>
  refAck: MessageAction<JsonValue>
  grp: MessageAction<JsonValue>
  grpQuit: MessageAction<JsonValue>
  accord: MessageAction<JsonValue>
  regles: MessageAction<JsonValue>
}

let room: Room | null = null
let relayMod: RelayModule | null = null
let A: Actions | null = null
let pollTimer: number | undefined
let joinToken = 0

async function loadRelay(kind: RelayKind): Promise<RelayModule> {
  switch (kind) {
    case 'mqtt':
      return (await import('@trystero-p2p/mqtt')) as unknown as RelayModule
    case 'torrent':
      return (await import('@trystero-p2p/torrent')) as unknown as RelayModule
    default:
      return (await import('@trystero-p2p/nostr')) as unknown as RelayModule
  }
}

function me(): Profile {
  const p = getState().profile
  if (!p) throw new Error('Profil manquant')
  return p
}

function myHello(): Hello {
  const p = me()
  return { deviceId: p.deviceId, name: p.name, role: p.role, version: __APP_VERSION__ }
}

export function roleLabel(r?: Role): string {
  return r === 'mj' ? 'MJ' : 'joueur'
}

function peerName(peerId: string): string {
  return getState().peers[peerId]?.name ?? 'un appareil'
}

export function peerIdFor(deviceId: string): string | undefined {
  return Object.values(getState().peers).find((p) => p.deviceId === deviceId)?.peerId
}

function updatePeer(peerId: string, patch: Partial<Peer>): void {
  setState((s) => {
    const cur = s.peers[peerId]
    if (!cur && !patch.joinedAt) return {}
    return { peers: { ...s.peers, [peerId]: { ...(cur ?? { peerId, joinedAt: Date.now() }), ...patch } } }
  })
}

// ───────────────────────── Rejoindre / quitter ─────────────────────────

export async function joinTable(info: TableInfo): Promise<void> {
  await leaveTable(false)
  const token = ++joinToken
  setState({ table: info, status: 'connexion', peers: {} })
  log(`Connexion à la table « ${info.id} » via ${RELAYS[info.relay]}…`)
  try {
    const mod = await loadRelay(info.relay)
    if (token !== joinToken) return
    relayMod = mod
    const r = mod.joinRoom({ appId: APP_ID, password: info.key }, info.id, {
      onJoinError: (e) =>
        log(`Échec de la poignée de main avec un appareil (${e.error}). La clé de la table est-elle la bonne ?`, 'erreur'),
    })
    room = r
    A = makeActions(r)
    r.onPeerJoin = (peerId) => {
      updatePeer(peerId, { joinedAt: Date.now() })
      log('Un appareil a été trouvé, identification…')
      void A?.hello.send(myHello(), { target: peerId })
    }
    r.onPeerLeave = (peerId) => {
      const p = getState().peers[peerId]
      log(`${p?.name ?? 'Un appareil'} s'est déconnecté.`)
      setState((s) => {
        const peers = { ...s.peers }
        delete peers[peerId]
        const contacts = { ...s.contacts }
        if (p?.deviceId && contacts[p.deviceId]) contacts[p.deviceId] = { ...contacts[p.deviceId], lastSeen: Date.now() }
        return { peers, contacts }
      })
    }
    setState({ status: 'connecte' })
    log('Table ouverte. En attente des autres appareils…', 'ok')
    pollTimer = window.setInterval(refreshRelays, 2000)
    refreshRelays()
  } catch (e) {
    setState({ status: 'erreur' })
    log(`Impossible de se connecter : ${String(e)}`, 'erreur')
  }
}

export async function leaveTable(forget = true): Promise<void> {
  joinToken++
  window.clearInterval(pollTimer)
  const r = room
  room = null
  A = null
  relayMod = null
  if (r) {
    try {
      await r.leave()
    } catch {
      /* ignoré */
    }
  }
  setState({ status: 'deconnecte', peers: {}, relaysOpen: 0, relaysTotal: 0, transfer: null, ...(forget ? { table: null } : {}) })
  if (forget) log('Table quittée.')
}

export function resumeIfNeeded(): void {
  const s = getState()
  if (s.table && s.profile) void joinTable(s.table)
}

export function announceProfile(): void {
  if (A && getState().profile) void A.hello.send(myHello())
}

// ───────────────────────── Actions échangées ─────────────────────────

function makeActions(r: Room): Actions {
  const a: Actions = {
    hello: r.makeAction<JsonValue>('hello'),
    msg: r.makeAction<JsonValue>('msg'),
    msgAck: r.makeAction<JsonValue>('msg-ack'),
    sheet: r.makeAction<JsonValue>('sheet'),
    sheetAck: r.makeAction<JsonValue>('sheet-ack'),
    ref: r.makeAction<JsonValue>('referentiel'),
    refAck: r.makeAction<JsonValue>('ref-ack'),
    grp: r.makeAction<JsonValue>('grp'),
    grpQuit: r.makeAction<JsonValue>('grp-quit'),
    accord: r.makeAction<JsonValue>('accord'),
    regles: r.makeAction<JsonValue>('regles'),
  }

  // Règles maison publiées par le MJ
  a.regles.onMessage = (d, { peerId }) => {
    if (getState().peers[peerId]?.role !== 'mj') return
    const rm = d as unknown as ReglesMaison
    if (!rm || !Array.isArray(rm.regles)) return
    const avant = getState().reglesMaison
    if (avant && avant.at === rm.at) return
    setState({ reglesMaison: rm })
    if (rm.regles.length)
      setState({ annonce: { titre: 'Règles maison', texte: `${rm.de} a publié ${rm.regles.length} règle(s) maison. Tu les trouveras dans Référentiel → Règles.` } })
    log(`Règles maison reçues de ${rm.de} (${rm.regles.length}).`, 'ok')
  }

  a.hello.onMessage = (d, { peerId }) => onHello(d as unknown as Hello, peerId)

  a.msg.onMessage = (d, { peerId }) => {
    const m = d as unknown as MsgPayload
    const conv = m.conv ?? `d:${m.from}`
    if (conv.startsWith('g:')) {
      const gid = conv.slice(2)
      if (getState().groupesQuittes.includes(gid)) {
        // Groupe quitté : on le rappelle à l'expéditeur au lieu d'afficher le message
        void a.grpQuit.send({ id: gid, deviceId: me().deviceId }, { target: peerId })
        void a.msgAck.send({ id: m.id }, { target: peerId })
        return
      }
      if (m.groupe) recevoirGroupe(m.groupe)
    }
    setState((s) => {
      if (s.messages.some((x) => x.id === m.id)) return {}
      const msg: ChatMessage = { id: m.id, conv, from: m.from, text: m.text, at: m.at }
      return { messages: [...s.messages, msg], unread: { ...s.unread, [conv]: (s.unread[conv] ?? 0) + 1 } }
    })
    navigator.vibrate?.(60)
    void a.msgAck.send({ id: m.id }, { target: peerId })
  }

  a.msgAck.onMessage = (d, { peerId }) => {
    const { id } = d as { id: string }
    const dev = getState().peers[peerId]?.deviceId
    if (!dev) return
    setState((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, enAttente: (m.enAttente ?? []).filter((x) => x !== dev), recus: [...new Set([...(m.recus ?? []), dev])] } : m,
      ),
    }))
  }

  a.grp.onMessage = (d) => recevoirGroupe(d as unknown as Groupe)

  // Le MJ accorde un pouvoir (exception aux règles) à l'un des personnages de ce joueur
  a.accord.onMessage = (d, { peerId }) => {
    if (getState().peers[peerId]?.role !== 'mj') return
    const { persoId, refId } = d as { persoId: string; refId: string }
    const perso = getState().personnages[persoId]
    const ref = getState().pack?.pouvoirs.find((x) => x.id === refId)
    if (!perso || !ref) {
      log('Le MJ a accordé un pouvoir, mais le personnage ou le pouvoir est introuvable ici.', 'erreur')
      return
    }
    majPerso(persoId, (x) => {
      const existe = x.pouvoirs.find((pw) => pw.refId === refId)
      if (existe) return { ...x, pouvoirs: x.pouvoirs.map((pw) => (pw.refId === refId ? { ...pw, accordeParMJ: true } : pw)) }
      const np = { ...nouveauPouvoir(), refId, nom: ref.nom, type: ref.type ?? '', cout: ref.cout ?? '', portee: ref.portee ?? '', att: ref.carac ?? '', def: ref.defense ?? '', num: ref.d666 ?? '', accordeParMJ: true }
      return { ...x, pouvoirs: [...x.pouvoirs, np] }
    })
    setState({ annonce: { titre: 'Pouvoir accordé par le MJ', texte: `${peerName(peerId)} accorde le pouvoir « ${ref.nom} » à ${nomAffiche(perso)}. Il a été ajouté à la fiche (onglet Pouvoirs).` } })
    log(`Le MJ a accordé « ${ref.nom} » à ${nomAffiche(perso)}.`, 'ok')
    // La fiche mise à jour repart vers le MJ
    if (getState().actifId === persoId) void sendSheet([peerId])
  }

  a.grpQuit.onMessage = (d) => {
    const { id, deviceId } = d as { id: string; deviceId: string }
    const g = getState().groupes[id]
    if (!g || !g.membres.includes(deviceId)) return
    const nom = g.noms[deviceId] ?? getState().contacts[deviceId]?.name ?? 'Un membre'
    majGroupe({ ...g, membres: g.membres.filter((x) => x !== deviceId), majLe: Date.now() }, false)
    // Les messages en attente pour ce membre ne lui seront plus envoyés
    setState((s) => ({
      messages: s.messages.map((m) => (m.conv === `g:${id}` ? { ...m, enAttente: (m.enAttente ?? []).filter((x) => x !== deviceId) } : m)),
    }))
    log(`${nom} a quitté le groupe « ${g.nom} ».`)
  }

  a.sheet.onMessage = (d, { peerId }) => {
    if (me().role !== 'mj') return
    const { perso, name, deviceId } = d as unknown as { perso: Personnage; name: string; deviceId: string }
    const p = normaliser(perso)
    setState((s) => ({ fichesRecues: { ...s.fichesRecues, [deviceId]: { deviceId, name, perso: p, receivedAt: Date.now() } } }))
    log(`Fiche de ${name} reçue et sauvegardée.`, 'ok')
    void a.sheetAck.send({ at: Date.now() }, { target: peerId })
  }

  a.sheetAck.onMessage = (_d, { peerId }) => {
    setState({ sheetAckAt: Date.now() })
    log(`Ta fiche a bien été reçue par ${peerName(peerId)}.`, 'ok')
  }

  a.ref.onReceiveProgress = (p) => setState({ transfer: { label: 'Réception du référentiel', percent: pct(p) } })
  a.ref.onMessage = (d, { peerId }) => {
    setState({ transfer: null })
    if (!isPack(d)) {
      log('Référentiel reçu illisible.', 'erreur')
      return
    }
    const pack = d as unknown as Pack
    const cur = getState().pack
    if (cur && cur.version === pack.version && cur.date === pack.date) {
      log(`Référentiel « ${pack.titre} » déjà à jour.`)
    } else {
      setState({ packPropose: { pack, de: peerName(peerId) } })
      log(`Le MJ propose le référentiel « ${pack.titre} » (version ${pack.version}).`, 'ok')
    }
    void a.refAck.send({ version: pack.version }, { target: peerId })
  }

  a.refAck.onMessage = (_d, { peerId }) => {
    log(`Référentiel bien reçu par ${peerName(peerId)}.`, 'ok')
  }

  return a
}

function onHello(h: Hello, peerId: string): void {
  setState((s) => {
    // Un même appareil qui revient avec un nouvel identifiant de connexion : on retire l'ancien.
    const peers: Record<string, Peer> = {}
    for (const [id, p] of Object.entries(s.peers)) if (id === peerId || p.deviceId !== h.deviceId) peers[id] = p
    peers[peerId] = { ...(peers[peerId] ?? { peerId, joinedAt: Date.now() }), deviceId: h.deviceId, name: h.name, role: h.role, version: h.version }
    return {
      peers,
      contacts: { ...s.contacts, [h.deviceId]: { deviceId: h.deviceId, name: h.name, role: h.role, lastSeen: Date.now() } },
    }
  })
  log(`${h.name} (${roleLabel(h.role)}) est connecté.`, 'ok')

  // Groupes dont il fait partie, puis messages en attente pour lui
  for (const g of Object.values(getState().groupes)) {
    if (g.membres.includes(h.deviceId)) void A?.grp.send(g as unknown as JsonValue, { target: peerId })
  }
  const moi = me().deviceId
  for (const m of getState().messages) {
    if (m.from === moi && m.enAttente?.includes(h.deviceId)) void transmit(m, h.deviceId)
  }
  // Un joueur envoie automatiquement sa fiche au MJ
  if (me().role === 'joueur' && h.role === 'mj') void sendSheet([peerId])
  // Le MJ envoie automatiquement son référentiel aux joueurs
  if (me().role === 'mj' && h.role === 'joueur' && getState().pack) void sendReferentiel([peerId])
  // … et ses règles maison
  const rm = getState().reglesMaison
  if (me().role === 'mj' && h.role === 'joueur' && rm) void A?.regles.send(rm as unknown as JsonValue, { target: peerId })
}

/** MJ : publie les règles maison à tous les joueurs (connectés maintenant, ou à leur prochaine connexion). */
export async function publierRegles(regles: ReglesMaison['regles']): Promise<number> {
  const rm: ReglesMaison = { regles, at: Date.now(), de: me().name }
  setState({ reglesMaison: rm })
  const cibles = joueurPeerIds()
  if (A && cibles.length) await A.regles.send(rm as unknown as JsonValue, { target: cibles })
  log(`Règles maison publiées (${regles.length}), envoyées à ${cibles.length} joueur(s) connecté(s).`, 'ok')
  return cibles.length
}

// ───────────────────────── Messagerie ─────────────────────────

/** MJ : accorde un pouvoir (ex. pouvoir propre d'un autre supérieur) au personnage d'un joueur connecté. */
export async function accorderPouvoir(deviceId: string, persoId: string, refId: string): Promise<boolean> {
  const pid = peerIdFor(deviceId)
  if (!A || !pid || me().role !== 'mj') return false
  await A.accord.send({ persoId, refId }, { target: pid })
  log('Pouvoir accordé envoyé au joueur.', 'ok')
  return true
}

export function convDirecte(deviceId: string): string {
  return `d:${deviceId}`
}

/** Appareils qui doivent recevoir les messages d'une conversation (sauf soi-même). */
export function destinataires(conv: string): string[] {
  const moi = me().deviceId
  if (conv.startsWith('d:')) return [conv.slice(2)]
  const g = getState().groupes[conv.slice(2)]
  return (g?.membres ?? []).filter((x) => x !== moi)
}

export function nomDe(deviceId: string, groupe?: Groupe): string {
  if (deviceId === getState().profile?.deviceId) return 'Moi'
  return getState().contacts[deviceId]?.name ?? groupe?.noms[deviceId] ?? '?'
}

export async function sendMessage(conv: string, text: string): Promise<void> {
  const dest = destinataires(conv)
  const m: ChatMessage = { id: uid(), conv, from: me().deviceId, text, at: Date.now(), enAttente: dest, recus: [] }
  setState((s) => ({ messages: [...s.messages, m] }))
  for (const d of dest) void transmit(m, d)
}

async function transmit(m: ChatMessage, deviceId: string): Promise<void> {
  const pid = peerIdFor(deviceId)
  if (!A || !pid) return
  const groupe = m.conv.startsWith('g:') ? getState().groupes[m.conv.slice(2)] : undefined
  const payload: MsgPayload = { id: m.id, text: m.text, at: m.at, from: m.from }
  if (groupe) Object.assign(payload, { conv: m.conv, groupe })
  try {
    await A.msg.send(payload as unknown as JsonValue, { target: pid })
  } catch (e) {
    log(`Message non envoyé : ${String(e)}`, 'erreur')
  }
}

export function markRead(conv: string): void {
  if (getState().unread[conv]) setState((s) => ({ unread: { ...s.unread, [conv]: 0 } }))
}

export function supprimerMessage(id: string): void {
  setState((s) => ({ messages: s.messages.filter((m) => m.id !== id) }))
}

/** Supprime une conversation de CET appareil (les autres gardent leur copie). Pour un groupe : le quitte aussi. */
export function supprimerConversation(conv: string): void {
  if (conv.startsWith('g:')) quitterGroupe(conv.slice(2))
  setState((s) => {
    const unread = { ...s.unread }
    delete unread[conv]
    return { messages: s.messages.filter((m) => m.conv !== conv), unread }
  })
}

// ───────────────────────── Groupes ─────────────────────────

function envoyerGroupe(g: Groupe, cibles = g.membres): void {
  if (!A) return
  const moi = me().deviceId
  const pids = cibles.filter((d) => d !== moi).map(peerIdFor).filter(Boolean) as string[]
  if (pids.length) void A.grp.send(g as unknown as JsonValue, { target: pids })
}

function majGroupe(g: Groupe, diffuser = true, cibles?: string[]): void {
  setState((s) => ({ groupes: { ...s.groupes, [g.id]: g } }))
  if (diffuser) envoyerGroupe(g, cibles)
}

function recevoirGroupe(g: Groupe): void {
  if (!g?.id || !Array.isArray(g.membres)) return
  const st = getState()
  if (st.groupesQuittes.includes(g.id)) return
  const cur = st.groupes[g.id]
  if (cur && cur.majLe >= g.majLe) return
  if (!cur && !g.membres.includes(me().deviceId)) return
  majGroupe({ ...g, noms: { ...(cur?.noms ?? {}), ...g.noms } }, false)
  if (!cur) log(`Tu as été ajouté au groupe « ${g.nom} ».`, 'ok')
}

export function creerGroupe(nom: string, membres: string[]): string {
  const p = me()
  const tous = [...new Set([p.deviceId, ...membres])]
  const noms: Record<string, string> = { [p.deviceId]: p.name }
  for (const d of membres) noms[d] = getState().contacts[d]?.name ?? '?'
  const g: Groupe = { id: uid(), nom: nom.trim() || 'Groupe', membres: tous, noms, createur: p.deviceId, majLe: Date.now() }
  majGroupe(g)
  return `g:${g.id}`
}

export function ajouterMembres(gid: string, nouveaux: string[]): void {
  const g = getState().groupes[gid]
  if (!g) return
  const noms = { ...g.noms }
  for (const d of nouveaux) noms[d] = getState().contacts[d]?.name ?? noms[d] ?? '?'
  majGroupe({ ...g, membres: [...new Set([...g.membres, ...nouveaux])], noms, majLe: Date.now() })
}

export function renommerGroupe(gid: string, nom: string): void {
  const g = getState().groupes[gid]
  if (g && nom.trim()) majGroupe({ ...g, nom: nom.trim(), majLe: Date.now() })
}

export function quitterGroupe(gid: string): void {
  const g = getState().groupes[gid]
  const moi = me().deviceId
  if (g) {
    const restant = { ...g, membres: g.membres.filter((x) => x !== moi), majLe: Date.now() }
    envoyerGroupe(restant, g.membres)
  }
  setState((s) => {
    const groupes = { ...s.groupes }
    delete groupes[gid]
    return { groupes, groupesQuittes: [...new Set([...s.groupesQuittes, gid])] }
  })
}

// ───────────────────────── Fiches ─────────────────────────

export function mjPeerIds(): string[] {
  return Object.values(getState().peers).filter((p) => p.role === 'mj').map((p) => p.peerId)
}

export async function sendSheet(targets = mjPeerIds()): Promise<boolean> {
  const perso = persoActif()
  if (!A || targets.length === 0 || !perso) return false
  const p = me()
  await A.sheet.send({ perso, name: p.name, deviceId: p.deviceId } as unknown as JsonValue, { target: targets })
  log('Fiche envoyée au MJ…')
  return true
}

// ───────────────────────── Diffusion du référentiel ─────────────────────────

export function joueurPeerIds(): string[] {
  return Object.values(getState().peers).filter((p) => p.role === 'joueur').map((p) => p.peerId)
}

export async function sendReferentiel(targets = joueurPeerIds()): Promise<void> {
  const pack = getState().pack
  if (!A || !pack || targets.length === 0) return
  setState({ transfer: { label: 'Envoi du référentiel', percent: 0 } })
  log(`Envoi du référentiel à ${targets.length} joueur(s)…`)
  try {
    await A.ref.send(pack as unknown as JsonValue, {
      target: targets,
      onProgress: (p) => setState({ transfer: { label: 'Envoi du référentiel', percent: pct(p) } }),
    })
  } finally {
    setState({ transfer: null })
  }
}

// ───────────────────────── Diagnostic ─────────────────────────

function refreshRelays(): void {
  const raw = relayMod?.getRelaySockets?.()
  if (!raw || typeof raw !== 'object') return
  const list = Object.values(raw as Record<string, unknown>) as Array<{
    readyState?: number
    socket?: { readyState?: number }
    connected?: boolean
  }>
  const open = list.filter((s) => s?.readyState === 1 || s?.socket?.readyState === 1 || s?.connected === true).length
  const st = getState()
  if (st.relaysOpen !== open || st.relaysTotal !== list.length) setState({ relaysOpen: open, relaysTotal: list.length })
}

export async function probePeers(): Promise<void> {
  if (!room) return
  const pcs = room.getPeers()
  for (const [peerId, pc] of Object.entries(pcs)) {
    let ping: number | undefined
    try {
      ping = await Promise.race([room.ping(peerId), new Promise<number>((_, rej) => setTimeout(() => rej(new Error('délai')), 3000))])
    } catch {
      ping = undefined
    }
    const link = await linkType(pc)
    updatePeer(peerId, { ping: ping === undefined ? undefined : Math.round(ping), link })
  }
}

async function linkType(pc: RTCPeerConnection): Promise<string> {
  try {
    const stats = await pc.getStats()
    let pairId: string | undefined
    stats.forEach((r) => {
      if (r.type === 'transport' && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId
    })
    let pair: { localCandidateId?: string; remoteCandidateId?: string } | undefined
    stats.forEach((r) => {
      if (r.type !== 'candidate-pair') return
      if (pairId ? r.id === pairId : r.selected || (r.nominated && r.state === 'succeeded')) pair = r
    })
    if (!pair) return 'inconnu'
    const loc = pair.localCandidateId ? stats.get(pair.localCandidateId)?.candidateType : undefined
    const rem = pair.remoteCandidateId ? stats.get(pair.remoteCandidateId)?.candidateType : undefined
    if (loc === 'relay' || rem === 'relay') return 'via un relais'
    if (loc === 'host' && (rem === 'host' || rem === 'prflx')) return 'local (même réseau)'
    if (rem === 'host' && loc === 'prflx') return 'local (même réseau)'
    return 'direct via internet'
  } catch {
    return 'inconnu'
  }
}

function pct(p: number): number {
  return Math.min(100, Math.round(p <= 1 ? p * 100 : p))
}

export function mo(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}
