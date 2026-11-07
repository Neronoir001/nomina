// Connexion pair-à-pair entre les appareils d'une même « Table ».
// La poignée de main passe par des relais publics (chiffrée avec la clé de la table),
// puis les données circulent directement d'un appareil à l'autre (WebRTC).
import type { JoinRoom, JsonValue, MessageAction, Room } from '@trystero-p2p/nostr'
import { getState, log, setState } from './store'
import { uid } from './storage'
import type { ChatMessage, Peer, Profile, RelayKind, Role, Sheet, TableInfo } from './types'
import { RELAYS } from './types'

const APP_ID = 'nomina-insmv'
const PACK_SIZE = 1024 * 1024 // 1 Mo : ordre de grandeur du futur pack de données

type RelayModule = { joinRoom: JoinRoom; getRelaySockets?: () => unknown }
type Hello = { deviceId: string; name: string; role: Role; version: string }
type MsgPayload = { id: string; text: string; at: number; from: string }

type Actions = {
  hello: MessageAction<JsonValue>
  msg: MessageAction<JsonValue>
  msgAck: MessageAction<JsonValue>
  sheet: MessageAction<JsonValue>
  sheetAck: MessageAction<JsonValue>
  pack: MessageAction<ArrayBuffer>
  packAck: MessageAction<JsonValue>
}

let room: Room | null = null
let relayMod: RelayModule | null = null
let A: Actions | null = null
let pollTimer: number | undefined
let joinToken = 0
const packStarts = new Map<string, number>()

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
    pack: r.makeAction<ArrayBuffer>('pack'),
    packAck: r.makeAction<JsonValue>('pack-ack'),
  }

  a.hello.onMessage = (d, { peerId }) => onHello(d as unknown as Hello, peerId)

  a.msg.onMessage = (d, { peerId }) => {
    const m = d as unknown as MsgPayload
    const mine = me().deviceId
    setState((s) => {
      if (s.messages.some((x) => x.id === m.id)) return {}
      const msg: ChatMessage = { id: m.id, from: m.from, to: mine, text: m.text, at: m.at, status: 'recu' }
      return { messages: [...s.messages, msg], unread: { ...s.unread, [m.from]: (s.unread[m.from] ?? 0) + 1 } }
    })
    navigator.vibrate?.(60)
    void a.msgAck.send({ id: m.id }, { target: peerId })
  }

  a.msgAck.onMessage = (d) => {
    const { id } = d as { id: string }
    setState((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, status: 'recu' } : m)) }))
  }

  a.sheet.onMessage = (d, { peerId }) => {
    if (me().role !== 'mj') return
    const { sheet, name, deviceId } = d as unknown as { sheet: Sheet; name: string; deviceId: string }
    setState((s) => ({ sheets: { ...s.sheets, [deviceId]: { deviceId, name, sheet, receivedAt: Date.now() } } }))
    log(`Fiche de ${name} reçue et sauvegardée.`, 'ok')
    void a.sheetAck.send({ at: Date.now() }, { target: peerId })
  }

  a.sheetAck.onMessage = (_d, { peerId }) => {
    setState({ sheetAckAt: Date.now() })
    log(`Ta fiche a bien été reçue par ${peerName(peerId)}.`, 'ok')
  }

  a.pack.onReceiveProgress = (p) => setState({ transfer: { label: 'Réception du pack test', percent: pct(p) } })
  a.pack.onMessage = (data, { peerId }) => {
    setState({ transfer: null })
    log(`Pack test reçu de ${peerName(peerId)} (${mo(data.byteLength)}).`, 'ok')
    void a.packAck.send({ bytes: data.byteLength }, { target: peerId })
  }

  a.packAck.onMessage = (d, { peerId }) => {
    const start = packStarts.get(peerId)
    packStarts.delete(peerId)
    if (start === undefined) return
    const secs = (performance.now() - start) / 1000
    const { bytes } = d as { bytes: number }
    const res = `${peerName(peerId)} : ${mo(bytes)} reçus en ${secs.toFixed(1).replace('.', ',')} s`
    setState((s) => ({ packResults: [...s.packResults, res], transfer: packStarts.size ? s.transfer : null }))
    log(res, 'ok')
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

  // Messages en attente pour cet appareil
  for (const m of getState().messages) {
    if (m.to === h.deviceId && m.status === 'en-attente') void transmit(m, peerId)
  }
  // Un joueur envoie automatiquement sa fiche au MJ
  if (me().role === 'joueur' && h.role === 'mj') void sendSheet([peerId])
}

// ───────────────────────── Messagerie ─────────────────────────

export async function sendMessage(to: string, text: string): Promise<void> {
  const m: ChatMessage = { id: uid(), from: me().deviceId, to, text, at: Date.now(), status: 'en-attente' }
  setState((s) => ({ messages: [...s.messages, m] }))
  const pid = peerIdFor(to)
  if (pid) await transmit(m, pid)
}

async function transmit(m: ChatMessage, peerId: string): Promise<void> {
  if (!A) return
  try {
    await A.msg.send({ id: m.id, text: m.text, at: m.at, from: m.from }, { target: peerId })
    setState((s) => ({
      messages: s.messages.map((x) => (x.id === m.id && x.status === 'en-attente' ? { ...x, status: 'envoye' } : x)),
    }))
  } catch (e) {
    log(`Message non envoyé : ${String(e)}`, 'erreur')
  }
}

export function markRead(deviceId: string): void {
  if (getState().unread[deviceId]) setState((s) => ({ unread: { ...s.unread, [deviceId]: 0 } }))
}

// ───────────────────────── Fiches ─────────────────────────

export function mjPeerIds(): string[] {
  return Object.values(getState().peers).filter((p) => p.role === 'mj').map((p) => p.peerId)
}

export async function sendSheet(targets = mjPeerIds()): Promise<boolean> {
  if (!A || targets.length === 0) return false
  const p = me()
  await A.sheet.send({ sheet: getState().sheet, name: p.name, deviceId: p.deviceId } as unknown as JsonValue, { target: targets })
  log('Fiche envoyée au MJ…')
  return true
}

// ───────────────────────── Test de transfert (pack de données) ─────────────────────────

export async function sendPackTest(): Promise<void> {
  if (!A) return
  const targets = Object.values(getState().peers).filter((p) => p.role === 'joueur').map((p) => p.peerId)
  if (targets.length === 0) {
    log('Aucun joueur connecté pour le test.', 'erreur')
    return
  }
  const buf = new Uint8Array(PACK_SIZE)
  for (let i = 0; i < buf.length; i += 65536) crypto.getRandomValues(buf.subarray(i, i + 65536))
  const now = performance.now()
  targets.forEach((t) => packStarts.set(t, now))
  setState({ transfer: { label: 'Envoi du pack test', percent: 0 }, packResults: [] })
  log(`Envoi d'un pack test de ${mo(PACK_SIZE)} à ${targets.length} joueur(s)…`)
  await A.pack.send(buf.buffer, {
    target: targets,
    onProgress: (p) => setState({ transfer: { label: 'Envoi du pack test', percent: pct(p) } }),
  })
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
