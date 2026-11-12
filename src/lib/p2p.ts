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
import { majPerso, persoActif, subscribe } from './store'
import type { ChatMessage, Groupe, Peer, Profile, ReglesMaison, RelayKind, Role, TableInfo, VuALaTable } from './types'
import { RELAYS } from './types'
import type { DemandeJet, JetSecret } from './jets'
import { nouveauJet } from './jets'

const APP_ID = 'nomina-insmv'

type RelayModule = { joinRoom: JoinRoom; getRelaySockets?: () => unknown }
type VersionPack = { version: string; date: string }
type Hello = { deviceId: string; name: string; role: Role; version: string; pack?: VersionPack | null }
type MsgPayload = { id: string; text: string; at: number; from: string; conv?: string; groupe?: Groupe }

type Actions = {
  hello: MessageAction<JsonValue>
  msg: MessageAction<JsonValue>
  msgAck: MessageAction<JsonValue>
  sheet: MessageAction<JsonValue>
  sheetAck: MessageAction<JsonValue>
  ref: MessageAction<JsonValue>
  refAck: MessageAction<JsonValue>
  refReq: MessageAction<JsonValue>
  annuaire: MessageAction<JsonValue>
  grp: MessageAction<JsonValue>
  grpQuit: MessageAction<JsonValue>
  accord: MessageAction<JsonValue>
  regles: MessageAction<JsonValue>
  jet: MessageAction<JsonValue>
  jetAck: MessageAction<JsonValue>
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
  // Version du référentiel installé, ou déjà reçu et en attente d'installation : inutile de le renvoyer.
  const pk = getState().pack ?? getState().packPropose?.pack
  return { deviceId: p.deviceId, name: p.name, role: p.role, version: __APP_VERSION__, pack: pk ? { version: pk.version, date: pk.date } : null }
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
        const annuaires = { ...s.annuaires }
        delete annuaires[peerId]
        return { peers, contacts, annuaires }
      })
      diffuserAnnuaire()
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
  setState({ status: 'deconnecte', peers: {}, annuaires: {}, relaysOpen: 0, relaysTotal: 0, transfer: null, ...(forget ? { table: null } : {}) })
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
    refReq: r.makeAction<JsonValue>('ref-req'),
    annuaire: r.makeAction<JsonValue>('annuaire'),
    grp: r.makeAction<JsonValue>('grp'),
    grpQuit: r.makeAction<JsonValue>('grp-quit'),
    accord: r.makeAction<JsonValue>('accord'),
    regles: r.makeAction<JsonValue>('regles'),
    jet: r.makeAction<JsonValue>('jet'),
    jetAck: r.makeAction<JsonValue>('jet-ack'),
  }

  // MJ : un joueur demande un jet secret. Les dés sont lancés ici, chez le MJ : le joueur ne voit rien.
  a.jet.onMessage = (d, { peerId }) => {
    if (me().role !== 'mj') return
    const dem = d as unknown as DemandeJet
    if (!dem?.id || typeof dem.valeur !== 'number') return
    void a.jetAck.send({ id: dem.id }, { target: peerId })
    if (getState().jetsSecrets.some((j) => j.id === dem.id)) return
    const jet: JetSecret = {
      ...nouveauJet(
        { quoi: String(dem.quoi ?? ''), valeur: dem.valeur, ligne: dem.ligne ?? 'moyen', decalage: Number(dem.decalage) || 0 },
        { id: dem.id, origine: 'joueur', joueurNom: peerName(peerId), persoNom: String(dem.persoNom ?? ''), note: String(dem.note ?? '') },
      ),
      nouveau: true,
    }
    setState((s) => ({ jetsSecrets: [jet, ...s.jetsSecrets].slice(0, 200), jetOuvert: s.jetOuvert ?? jet.id }))
    navigator.vibrate?.([60, 40, 60])
    log(`Jet secret demandé par ${jet.joueurNom} : ${jet.quoi}.`, 'ok')
  }

  a.jetAck.onMessage = (d) => {
    const { id } = d as { id: string }
    setState((s) => ({ jetsDemandes: { ...s.jetsDemandes, [id]: 'recu' } }))
  }

  // Règles maison publiées par le MJ
  a.regles.onMessage = (d, { peerId }) => {
    if (getState().peers[peerId]?.role !== 'mj') return
    const rm = d as unknown as ReglesMaison
    if (!rm || !Array.isArray(rm.regles)) return
    const avant = getState().reglesMaison
    if (avant && avant.at === rm.at) return
    setState({ reglesMaison: rm })
    if (rm.regles.length || rm.creation)
      setState({
        annonce: {
          titre: 'Règles maison',
          texte: `${rm.de} a publié ses règles${rm.regles.length ? ` : ${rm.regles.length} règle(s) maison, à lire dans Référentiel → Règles` : ''}${rm.creation ? `${rm.regles.length ? ', et ' : ' : '}les règles de création « ${rm.creation.nom} »` : ''}.`,
        },
      })
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
      void a.refAck.send({ ok: false }, { target: peerId })
      return
    }
    const pack = d as unknown as Pack
    // Accusé de réception d'abord : le MJ arrête ses relances.
    void a.refAck.send({ ok: true, version: pack.version }, { target: peerId })
    const cur = getState().pack
    if (cur && cur.version === pack.version && cur.date === pack.date) {
      log(`Référentiel « ${pack.titre} » déjà à jour.`)
    } else {
      // Conservé même si l'appli est fermée avant d'avoir répondu (voir « À faire » à l'accueil).
      setState({ packPropose: { pack, de: peerName(peerId) } })
      log(`Le MJ propose le référentiel « ${pack.titre} » (version ${pack.version}).`, 'ok')
    }
  }

  a.refAck.onMessage = (d, { peerId }) => {
    envoisRef.delete(peerId)
    if ((d as { ok?: boolean })?.ok === false) log(`${peerName(peerId)} n'a pas pu lire le référentiel.`, 'erreur')
    else log(`Référentiel bien reçu par ${peerName(peerId)}.`, 'ok')
  }

  // Liste des appareils auxquels un autre appareil est relié (noms et rôles seulement)
  a.annuaire.onMessage = (d, { peerId }) => {
    const liste = (d as { liste?: VuALaTable[] })?.liste
    if (!Array.isArray(liste)) return
    const propre = liste
      .filter((x) => x && typeof x.deviceId === 'string' && typeof x.name === 'string')
      .map((x) => ({ deviceId: x.deviceId, name: x.name.slice(0, 60), role: x.role === 'mj' ? 'mj' : 'joueur' }) as VuALaTable)
      .slice(0, 50)
    setState((s) => ({ annuaires: { ...s.annuaires, [peerId]: propre } }))
  }

  // Un joueur réclame le référentiel (il n'en a pas, ou la proposition s'est perdue)
  a.refReq.onMessage = (_d, { peerId }) => {
    if (me().role !== 'mj' || !getState().pack) return
    log(`${peerName(peerId)} demande le référentiel.`)
    envoyerReferentielA(peerId, 1)
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
  diffuserAnnuaire()

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
  // Le MJ envoie son référentiel aux joueurs qui n'en ont pas, ou une autre version
  const pk = getState().pack
  if (me().role === 'mj' && h.role === 'joueur' && pk) {
    if (h.pack && h.pack.version === pk.version && h.pack.date === pk.date) log(`${h.name} a déjà le référentiel à jour.`)
    else envoyerReferentielA(peerId, 1)
  }
  // Le joueur sans référentiel le réclame lui-même s'il n'arrive pas (secours si l'envoi s'est perdu)
  if (me().role === 'joueur' && h.role === 'mj') surveillerArriveeReferentiel(peerId)
  // … et ses règles maison
  const rm = getState().reglesMaison
  if (me().role === 'mj' && h.role === 'joueur' && rm) void A?.regles.send(rm as unknown as JsonValue, { target: peerId })
}

/** Joueur : envoie une demande de jet secret au(x) MJ connecté(s). Renvoie false si aucun MJ n'est là. */
export async function demanderJet(dem: DemandeJet): Promise<boolean> {
  const cibles = mjPeerIds()
  if (!A || cibles.length === 0) return false
  setState((s) => ({ jetsDemandes: { ...s.jetsDemandes, [dem.id]: 'envoye' } }))
  await A.jet.send(dem as unknown as JsonValue, { target: cibles })
  log(`Jet secret envoyé au MJ : ${dem.quoi}.`)
  return true
}

/** MJ : publie les règles maison à tous les joueurs (connectés maintenant, ou à leur prochaine connexion). */
export async function publierRegles(regles: ReglesMaison['regles'], creation?: ReglesMaison['creation']): Promise<number> {
  const rm: ReglesMaison = { regles, at: Date.now(), de: me().name, ...(creation ? { creation } : {}) }
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
  derniereFicheEnvoyee = `${perso.id}:${perso.updatedAt}`
  const p = me()
  await A.sheet.send({ perso, name: p.name, deviceId: p.deviceId } as unknown as JsonValue, { target: targets })
  log('Fiche envoyée au MJ…')
  return true
}

// Joueur : la fiche affichée repart toute seule chez le MJ quand elle change
// (création, changement de personnage, modification, PP dépensés…), quelques secondes après.
let derniereFicheEnvoyee = ''
let ficheEnAttente = ''
let minuteurFiche: number | undefined
subscribe(() => {
  const s = getState()
  if (s.profile?.role !== 'joueur' || !A) return
  const perso = persoActif(s)
  const cle = perso ? `${perso.id}:${perso.updatedAt}` : ''
  // Rien de nouveau, ou envoi déjà programmé pour cette version de la fiche
  if (!cle || cle === derniereFicheEnvoyee || cle === ficheEnAttente) return
  if (!Object.values(s.peers).some((p) => p.role === 'mj')) return
  ficheEnAttente = cle
  window.clearTimeout(minuteurFiche)
  minuteurFiche = window.setTimeout(() => {
    ficheEnAttente = ''
    void sendSheet()
  }, 3000)
})

// ───────────────────────── Diffusion du référentiel ─────────────────────────

export function joueurPeerIds(): string[] {
  return Object.values(getState().peers).filter((p) => p.role === 'joueur').map((p) => p.peerId)
}

export async function sendReferentiel(targets = joueurPeerIds()): Promise<void> {
  for (const t of targets) envoyerReferentielA(t, 1)
}

const RELANCE_REF_MS = 45_000
const ESSAIS_REF = 3
/** Envois de référentiel en attente d'accusé de réception, par appareil. */
const envoisRef = new Map<string, number>()

/** MJ : envoie le référentiel à un joueur, et le renvoie s'il n'en accuse pas réception. */
function envoyerReferentielA(peerId: string, essai: number): void {
  const pack = getState().pack
  if (!A || !pack) return
  const ko = Math.round(JSON.stringify(pack).length / 1024)
  setState({ transfer: { label: 'Envoi du référentiel', percent: 0 } })
  log(`Envoi du référentiel à ${peerName(peerId)} (${ko} Ko${essai > 1 ? `, essai ${essai}` : ''})…`)
  window.clearTimeout(envoisRef.get(peerId))
  envoisRef.set(
    peerId,
    window.setTimeout(() => {
      if (!envoisRef.has(peerId) || !getState().peers[peerId]) return envoisRef.delete(peerId) && undefined
      if (essai >= ESSAIS_REF) {
        envoisRef.delete(peerId)
        log(`${peerName(peerId)} n'a pas confirmé la réception du référentiel. Utilise « Partager le fichier du référentiel » (Réglages).`, 'erreur')
        return
      }
      envoyerReferentielA(peerId, essai + 1)
    }, RELANCE_REF_MS),
  )
  A.ref
    .send(pack as unknown as JsonValue, {
      target: peerId,
      onProgress: (p) => setState({ transfer: { label: 'Envoi du référentiel', percent: pct(p) } }),
    })
    .catch((e: unknown) => log(`Échec de l'envoi du référentiel à ${peerName(peerId)} : ${String(e)}`, 'erreur'))
    .finally(() => setState({ transfer: null }))
}

const ATTENTE_REF_MS = 20_000
let minuteurAttenteRef: number | undefined

/** Joueur : si, après la connexion au MJ, aucun référentiel n'est arrivé, on le réclame. */
function surveillerArriveeReferentiel(peerMj: string): void {
  window.clearTimeout(minuteurAttenteRef)
  minuteurAttenteRef = window.setTimeout(() => {
    const s = getState()
    if (s.pack || s.packPropose || s.transfer || !s.peers[peerMj]) return
    log("Le référentiel n'est pas arrivé : demande au MJ…")
    void demanderReferentiel()
  }, ATTENTE_REF_MS)
}

/** Joueur : demande le référentiel au(x) MJ connecté(s). Renvoie false si aucun MJ n'est là. */
export async function demanderReferentiel(): Promise<boolean> {
  const cibles = mjPeerIds()
  if (!A || cibles.length === 0) return false
  await A.refReq.send({ at: Date.now() }, { target: cibles })
  log('Référentiel demandé au MJ.')
  return true
}

// ───────────────────────── Liaisons manquantes ─────────────────────────

let minuteurAnnuaire: number | undefined
/** Envoie à tous les appareils reliés la liste des appareils auxquels celui-ci est relié. */
function diffuserAnnuaire(): void {
  window.clearTimeout(minuteurAnnuaire)
  minuteurAnnuaire = window.setTimeout(() => {
    if (!A) return
    const liste: VuALaTable[] = Object.values(getState().peers)
      .filter((p) => p.deviceId && p.name && p.role)
      .map((p) => ({ deviceId: p.deviceId!, name: p.name!, role: p.role! }))
    const cibles = Object.keys(getState().peers)
    if (cibles.length) void A.annuaire.send({ liste } as unknown as JsonValue, { target: cibles }).catch(() => undefined)
  }, 800)
}

export type NonRelie = VuALaTable & { via: string[] }

/** Appareils présents à la table (vus par d'autres) mais pas reliés directement à celui-ci. */
export function nonRelies(s = getState()): NonRelie[] {
  const moi = s.profile?.deviceId
  const relies = new Set(Object.values(s.peers).map((p) => p.deviceId))
  const out = new Map<string, NonRelie>()
  for (const [peerId, liste] of Object.entries(s.annuaires)) {
    const par = s.peers[peerId]?.name
    if (!par) continue
    for (const x of liste) {
      if (x.deviceId === moi || relies.has(x.deviceId)) continue
      const deja = out.get(x.deviceId)
      if (deja) deja.via.push(par)
      else out.set(x.deviceId, { ...x, via: [par] })
    }
  }
  return [...out.values()]
}

/** Relance toutes les liaisons en quittant puis en rejoignant la même table. */
export async function reessayerLiaisons(): Promise<void> {
  const t = getState().table
  if (!t) return
  log('Nouvelle tentative de liaison avec tous les appareils de la table…')
  await joinTable(t)
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
