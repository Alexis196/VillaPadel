import { db, auth } from './config'
import {
  collection, doc, addDoc, setDoc, updateDoc, getDocs, getDoc, deleteDoc,
  writeBatch, serverTimestamp, query, orderBy, where, arrayUnion, arrayRemove,
} from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'

// ─── American tournament set winner ──────────────────────────────────────────
// First to 9 games; if tied at 8-8, win by 2
export function checkAmericanSetWinner(gA, gB) {
  if (gA >= 9 && gA - gB >= 2) return 'A'
  if (gB >= 9 && gB - gA >= 2) return 'B'
  return null
}

// Fisher–Yates: uniform random shuffle. (`array.sort(() => Math.random() - 0.5)`
// is a common anti-pattern — comparator-based shuffles are biased.)
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Zone generation ──────────────────────────────────────────────────────────
// tamanoZona: target pairs per zone (3 or 4, default 4)
// Remainder distributed evenly: some zones get base+1 if n % numGroups > 0
export function generateZonas(duplas, tamanoZona = 4) {
  const shuffled = shuffle(duplas)
  const n = shuffled.length
  if (n < 2) return [shuffled]

  const numGroups = Math.max(1, Math.round(n / tamanoZona))
  const base = Math.floor(n / numGroups)
  const extra = n % numGroups

  const zones = []
  let start = 0
  for (let i = 0; i < numGroups; i++) {
    const size = base + (i < extra ? 1 : 0)
    zones.push(shuffled.slice(start, start + size))
    start += size
  }
  return zones
}

// ─── Fixture generation (Round Robin) ────────────────────────────────────────
// Returns array of { jornada, idxA, idxB } for a zone of `count` duplas
function roundRobinSchedule(count) {
  const matches = []
  if (count < 2) return matches

  // Circle algorithm: fix index 0, rotate 1..n-1
  const teams = Array.from({ length: count }, (_, i) => i)
  const rounds = count % 2 === 0 ? count - 1 : count
  const list = count % 2 === 0 ? teams : [...teams, -1] // -1 = bye

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < list.length / 2; i++) {
      const a = list[i]
      const b = list[list.length - 1 - i]
      if (a !== -1 && b !== -1) {
        matches.push({ jornada: round + 1, idxA: a, idxB: b })
      }
    }
    // Rotate: keep list[0] fixed, rotate rest
    const last = list.pop()
    list.splice(1, 0, last)
  }

  return matches
}

// ─── Create tournament ────────────────────────────────────────────────────────
export async function createTorneo({ nombre, categoriaId, categoriaName, categoriaValor, costoPorJugador, fechaInicio, fechaFin, tipoTorneo, modalidadTorneo, color, sexo, tamanoZona, clasificadosPorZona, tercerSetDesde, ownerUid, ownerEmail }) {
  const today = new Date().toISOString().split('T')[0]
  const estado = fechaInicio > today ? 'Inscripción' : 'En curso'
  const ref = await addDoc(collection(db, 'torneos'), {
    nombre,
    categoriaId,
    categoriaName,
    categoriaValor: Number(categoriaValor),
    costoPorJugador: Number(costoPorJugador),
    fechaInicio,
    fechaFin: fechaFin || null,
    estado,
    tipoTorneo: tipoTorneo || 'categoria',
    modalidadTorneo: modalidadTorneo || 'tradicional',
    sexo: sexo || 'masculino',
    color: color || null,
    tamanoZona: Number(tamanoZona) || 4,
    clasificadosPorZona: Number(clasificadosPorZona) || 1,
    tercerSetDesde: tercerSetDesde || 'semifinal',
    repartoCampeonPct: 70,
    ownerUid: ownerUid || null,
    ownerEmail: ownerEmail || null,
    colaboradores: [],
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ─── Update tournament collaborators ─────────────────────────────────────────
export async function updateColaboradores(torneoId, colaboradores) {
  await setDoc(doc(db, 'torneos', torneoId), { colaboradores }, { merge: true })
}

// ─── Manually override tournament status ─────────────────────────────────────
export async function updateTorneoEstado(torneoId, estado) {
  await setDoc(doc(db, 'torneos', torneoId), { estado }, { merge: true })
}

// ─── Prize transparency (admin-only for now) ──────────────────────────────────
export async function addGasto(torneoId, { descripcion, monto }) {
  await addDoc(collection(db, 'torneos', torneoId, 'gastos'), {
    descripcion: descripcion.trim(),
    monto: Number(monto) || 0,
    createdAt: serverTimestamp(),
  })
}

export async function deleteGasto(torneoId, gastoId) {
  await deleteDoc(doc(db, 'torneos', torneoId, 'gastos', gastoId))
}

export async function updateRepartoCampeon(torneoId, repartoCampeonPct) {
  await setDoc(doc(db, 'torneos', torneoId), { repartoCampeonPct: Number(repartoCampeonPct) }, { merge: true })
}

// recaudado = suma de pagos ya marcados como 'pagado' en cada dupla (no lo que
// falta cobrar). premioNeto = recaudado - gastos, repartido según repartoCampeonPct.
export async function getPremioInfo(torneoId) {
  const [duplasSnap, gastosSnap, torneoSnap] = await Promise.all([
    getDocs(collection(db, 'torneos', torneoId, 'duplas')),
    getDocs(query(collection(db, 'torneos', torneoId, 'gastos'), orderBy('createdAt', 'desc'))),
    getDoc(doc(db, 'torneos', torneoId)),
  ])

  const recaudado = duplasSnap.docs.reduce((sum, d) => {
    const { pago1, pago2 } = d.data()
    const m1 = pago1?.estado === 'pagado' ? Number(pago1.monto) || 0 : 0
    const m2 = pago2?.estado === 'pagado' ? Number(pago2.monto) || 0 : 0
    return sum + m1 + m2
  }, 0)

  const gastos = gastosSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const totalGastos = gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0)
  const premioNeto = Math.max(0, recaudado - totalGastos)
  const repartoCampeonPct = torneoSnap.data()?.repartoCampeonPct ?? 70
  const montoCampeon = Math.round(premioNeto * repartoCampeonPct / 100)
  const montoSubcampeon = premioNeto - montoCampeon

  return { recaudado, gastos, totalGastos, premioNeto, repartoCampeonPct, montoCampeon, montoSubcampeon }
}

// ─── Update tournament ────────────────────────────────────────────────────────
// estado is only recomputed from fechaInicio while the tournament is still in
// Inscripción — once it has moved on (En curso/Llave/Finalizado), a routine edit
// (fixing the name, tweaking the cost, setting tercerSetDesde) must not silently
// regress it back.
export async function updateTorneo(id, { nombre, categoriaId, categoriaName, categoriaValor, costoPorJugador, fechaInicio, fechaFin, tipoTorneo, modalidadTorneo, color, sexo, tamanoZona, clasificadosPorZona, tercerSetDesde }) {
  const currentSnap = await getDoc(doc(db, 'torneos', id))
  const currentEstado = currentSnap.data()?.estado
  const data = {
    nombre, categoriaId, categoriaName,
    categoriaValor: Number(categoriaValor),
    costoPorJugador: Number(costoPorJugador),
    fechaInicio, fechaFin: fechaFin || null,
    tipoTorneo: tipoTorneo || 'categoria',
    modalidadTorneo: modalidadTorneo || 'tradicional',
    sexo: sexo || 'masculino',
    color: color || null,
    tamanoZona: Number(tamanoZona) || 4,
    clasificadosPorZona: Number(clasificadosPorZona) || 1,
    tercerSetDesde: tercerSetDesde || 'semifinal',
  }
  if (!currentEstado || currentEstado === 'Inscripción') {
    const today = new Date().toISOString().split('T')[0]
    data.estado = fechaInicio > today ? 'Inscripción' : 'En curso'
  }
  await setDoc(doc(db, 'torneos', id), data, { merge: true })
}

// ─── Delete tournament and all subcollections ─────────────────────────────────
export async function deleteTorneo(id) {
  const batch = writeBatch(db)
  const subcols = ['duplas', 'zonas', 'partidos', 'llaves', 'buscandoDupla', 'gastos']
  for (const sub of subcols) {
    const snap = await getDocs(collection(db, 'torneos', id, sub))
    snap.forEach(d => batch.delete(d.ref))
  }
  const busquedasSnap = await getDocs(collection(db, 'torneos', id, 'buscandoDupla'))
  for (const busquedaDoc of busquedasSnap.docs) {
    const comentariosSnap = await getDocs(collection(busquedaDoc.ref, 'comentarios'))
    comentariosSnap.forEach(d => batch.delete(d.ref))
  }
  batch.delete(doc(db, 'torneos', id))
  await batch.commit()
}

// ─── Delete dupla from tournament ────────────────────────────────────────────
export async function deleteDupla(torneoId, duplaId) {
  await deleteDoc(doc(db, 'torneos', torneoId, 'duplas', duplaId))
}

// ─── Add dupla to tournament ──────────────────────────────────────────────────
export async function addDupla(torneoId, { jugador1, jugador2, pago1, pago2 }) {
  await addDoc(collection(db, 'torneos', torneoId, 'duplas'), {
    jugador1: jugador1.trim(),
    jugador2: jugador2.trim(),
    pago1: { estado: pago1?.estado || 'pendiente', metodo: pago1?.metodo || null, monto: Number(pago1?.monto) || 0 },
    pago2: { estado: pago2?.estado || 'pendiente', metodo: pago2?.metodo || null, monto: Number(pago2?.monto) || 0 },
    createdAt: serverTimestamp(),
  })
}

// ─── Buscar dupla (public board — jugadores sueltos buscando pareja) ─────────
export async function addBusquedaDupla(torneoId, { nombre, apellido, mensaje }) {
  return addDoc(collection(db, 'torneos', torneoId, 'buscandoDupla'), {
    nombre: nombre.trim(),
    apellido: apellido.trim(),
    mensaje: mensaje?.trim() || '',
    createdAt: serverTimestamp(),
  })
}

export async function deleteBusquedaDupla(torneoId, busquedaId) {
  const busquedaRef = doc(db, 'torneos', torneoId, 'buscandoDupla', busquedaId)
  const comentariosSnap = await getDocs(collection(busquedaRef, 'comentarios'))
  const batch = writeBatch(db)
  comentariosSnap.forEach(d => batch.delete(d.ref))
  batch.delete(busquedaRef)
  await batch.commit()
}

export async function addComentarioBusqueda(torneoId, busquedaId, { nombre, mensaje }) {
  await addDoc(collection(db, 'torneos', torneoId, 'buscandoDupla', busquedaId, 'comentarios'), {
    nombre: nombre.trim(),
    mensaje: mensaje.trim(),
    createdAt: serverTimestamp(),
  })
}

export async function deleteComentarioBusqueda(torneoId, busquedaId, comentarioId) {
  await deleteDoc(doc(db, 'torneos', torneoId, 'buscandoDupla', busquedaId, 'comentarios', comentarioId))
}

// ─── Generate zones + fixture for a tournament ───────────────────────────────
export async function generateFixture(torneoId) {
  const [duplasSnap, torneoSnap] = await Promise.all([
    getDocs(collection(db, 'torneos', torneoId, 'duplas')),
    getDoc(doc(db, 'torneos', torneoId)),
  ])
  const duplas = duplasSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const torneoData = torneoSnap.data() || {}
  const tamanoZona = torneoData.tamanoZona || 4
  const clasificadosPorZona = torneoData.clasificadosPorZona || 1

  if (duplas.length < 2) throw new Error('Se necesitan al menos 2 duplas para generar el fixture.')

  const zonaGroups = generateZonas(duplas, tamanoZona)
  const batch = writeBatch(db)

  // Delete any existing zonas/partidos/llaves — a fixture regenerated from scratch
  // invalidates any bracket built from the previous zonas/partidos.
  const oldZonas = await getDocs(collection(db, 'torneos', torneoId, 'zonas'))
  oldZonas.forEach(d => batch.delete(d.ref))
  const oldPartidos = await getDocs(collection(db, 'torneos', torneoId, 'partidos'))
  oldPartidos.forEach(d => batch.delete(d.ref))
  const oldLlaves = await getDocs(collection(db, 'torneos', torneoId, 'llaves'))
  oldLlaves.forEach(d => batch.delete(d.ref))

  // Create zonas and their partidos
  for (let z = 0; z < zonaGroups.length; z++) {
    const zonaDuplas = zonaGroups[z]
    const zonaRef = doc(collection(db, 'torneos', torneoId, 'zonas'))
    batch.set(zonaRef, {
      nombre: `Zona ${z + 1}`,
      duplas: zonaDuplas.map(d => ({ id: d.id, jugador1: d.jugador1, jugador2: d.jugador2 })),
      orden: z + 1,
    })

    const schedule = roundRobinSchedule(zonaDuplas.length)
    for (const match of schedule) {
      const partidoRef = doc(collection(db, 'torneos', torneoId, 'partidos'))
      batch.set(partidoRef, {
        zonaId: zonaRef.id,
        zonaNombre: `Zona ${z + 1}`,
        jornada: match.jornada,
        duplaA: { id: zonaDuplas[match.idxA].id, jugador1: zonaDuplas[match.idxA].jugador1, jugador2: zonaDuplas[match.idxA].jugador2 },
        duplaB: { id: zonaDuplas[match.idxB].id, jugador1: zonaDuplas[match.idxB].jugador1, jugador2: zonaDuplas[match.idxB].jugador2 },
        resultado: null,
        estado: 'Programado',
        ptsA: null,
        ptsB: null,
      })
    }
  }

  // Update torneo status
  batch.update(doc(db, 'torneos', torneoId), { estado: 'En curso', zonas: zonaGroups.length, clasificadosPorZona })

  await batch.commit()
}

// ─── Delete fixture and revert tournament back to Inscripción ────────────────
export async function deleteFixture(torneoId) {
  const batch = writeBatch(db)
  const subcols = ['zonas', 'partidos', 'llaves']
  for (const sub of subcols) {
    const snap = await getDocs(collection(db, 'torneos', torneoId, sub))
    snap.forEach(d => batch.delete(d.ref))
  }
  batch.update(doc(db, 'torneos', torneoId), { estado: 'Inscripción', zonas: 0 })
  await batch.commit()
}

// ─── Match result computation ─────────────────────────────────────────────────
// Single source of truth for turning a scoreline into points + estado, shared by
// manual entry, the live scoreboard, and both saveResultado/saveLlaveResultado —
// so a tie can't sneak through in one path and not the other.
// Scoring: Win=3pts, Loss=0pts (W.O. counts the same as a normal win/loss).
// A tie is never a valid outcome.
export function computeMatchResult(setsA, setsB, wo = false) {
  const a = Number(setsA)
  const b = Number(setsB)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    throw new Error('Los sets tienen que ser números enteros positivos.')
  }
  if (a === b) {
    throw new Error('El resultado no puede quedar empatado — tiene que haber un ganador.')
  }
  const aWins = a > b
  return {
    ptsA: aWins ? 3 : 0,
    ptsB: aWins ? 0 : 3,
    estado: wo ? 'W.O.' : 'Finalizado',
    aWins,
  }
}

// ─── Save match result ────────────────────────────────────────────────────────
// historialSets: optional [{ gA, gB }, ...] per-set game breakdown. gamesA/gamesB
// stay as the match-wide total (used for the standings tiebreak either way).
export async function saveResultado(torneoId, partidoId, { setsA, setsB, gamesA, gamesB, historialSets, wo }) {
  const ref = doc(db, 'torneos', torneoId, 'partidos', partidoId)
  const { ptsA, ptsB, estado } = computeMatchResult(setsA, setsB, wo)

  await setDoc(ref, {
    resultado: { setsA, setsB, gamesA: gamesA || 0, gamesB: gamesB || 0, historialSets: historialSets || [] },
    ptsA, ptsB, estado,
  }, { merge: true })
}

// ─── Update match status ──────────────────────────────────────────────────────
export async function updateEstado(torneoId, partidoId, estado) {
  await setDoc(doc(db, 'torneos', torneoId, 'partidos', partidoId), { estado }, { merge: true })
}

export async function updateLlaveEstado(torneoId, llaveId, estado) {
  await setDoc(doc(db, 'torneos', torneoId, 'llaves', llaveId), { estado }, { merge: true })
}

// ─── Update live scoreboard ───────────────────────────────────────────────────
export async function updateMarcador(torneoId, partidoId, marcador) {
  await setDoc(doc(db, 'torneos', torneoId, 'partidos', partidoId), { marcador }, { merge: true })
}

export async function updateLlaveMarcador(torneoId, llaveId, marcador) {
  await setDoc(doc(db, 'torneos', torneoId, 'llaves', llaveId), { marcador }, { merge: true })
}

// ─── Update match schedule (horario) ─────────────────────────────────────────
export async function updateHorario(torneoId, partidoId, { fecha, hora, cancha }) {
  await setDoc(doc(db, 'torneos', torneoId, 'partidos', partidoId), {
    fecha: fecha || null, hora: hora || null, cancha: cancha || null,
  }, { merge: true })
}

// ─── Update dupla payment info (per player) ───────────────────────────────────
export async function updateDuplaPago(torneoId, duplaId, { pago1, pago2 }) {
  await setDoc(doc(db, 'torneos', torneoId, 'duplas', duplaId), {
    pago1: { estado: pago1.estado, metodo: pago1.metodo || null, monto: Number(pago1.monto) || 0 },
    pago2: { estado: pago2.estado, metodo: pago2.metodo || null, monto: Number(pago2.monto) || 0 },
  }, { merge: true })
}

// ─── Player CRUD (categorization) ────────────────────────────────────────────
function normalizeLocalidad(str) {
  if (!str) return ''
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function addJugador({ name, categoryName, categoryColor, categoriaValor, sexo, localidad }) {
  await addDoc(collection(db, 'players'), {
    name, categoryName, categoryColor, categoriaValor: Number(categoriaValor),
    sexo: sexo || 'M', ascenso: false,
    localidad: normalizeLocalidad(localidad),
    createdAt: serverTimestamp(),
  })
}

export async function updateJugador(id, fields) {
  const { name, categoryName, categoryColor, categoriaValor, sexo, ascenso, localidad } = fields
  const data = {
    name, categoryName, categoryColor, categoriaValor: Number(categoriaValor),
    sexo: sexo || 'M',
    localidad: normalizeLocalidad(localidad),
  }
  if (ascenso !== undefined) data.ascenso = ascenso
  await setDoc(doc(db, 'players', id), data, { merge: true })
}

export async function toggleAscenso(id, value) {
  await setDoc(doc(db, 'players', id), { ascenso: value }, { merge: true })
}

export async function deleteJugador(id) {
  await deleteDoc(doc(db, 'players', id))
}

// ─── Bracket: first-round pairings (0-indexed seeds) ─────────────────────────
// Ensures top seeds can only meet in later rounds (standard seeding), for any
// bracket size (power of 2) — not just the 2/4/8/16 cases used in practice.
function seedOrder(n) {
  if (n === 1) return [1]
  const prev = seedOrder(n / 2)
  const result = []
  for (const s of prev) result.push(s, n + 1 - s)
  return result
}

function getFirstRoundPairs(bracketSize) {
  const order = seedOrder(bracketSize)
  const pairs = []
  for (let i = 0; i < order.length; i += 2) pairs.push([order[i] - 1, order[i + 1] - 1])
  return pairs
}

const ROUND_NAMES_TABLE = {
  1: ['Final'],
  2: ['Semifinal', 'Final'],
  3: ['Cuartos de Final', 'Semifinal', 'Final'],
  4: ['Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final'],
}

// ─── Generate bracket from zone standings ────────────────────────────────────
export async function generateBracket(torneoId) {
  const [partidosSnap, zonasSnap, torneoSnap] = await Promise.all([
    getDocs(collection(db, 'torneos', torneoId, 'partidos')),
    getDocs(query(collection(db, 'torneos', torneoId, 'zonas'), orderBy('orden'))),
    getDoc(doc(db, 'torneos', torneoId)),
  ])

  const torneoData = torneoSnap.data() || {}
  const clasificadosPorZona = torneoData.clasificadosPorZona || 1
  const zonasArr = zonasSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const partidosArr = partidosSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Seed order: every qualifier ranked globally by merit (points → sets won →
  // game difference), across all zones — not "all zone winners, then all
  // runners-up" regardless of how those winners/runners-up actually performed.
  // This is what decides who gets a bye straight to the next round when the
  // qualifier count isn't a clean power of two: the best teams overall, not
  // just whoever happened to finish 1st in their own zone.
  const qualifiers = []
  for (const zona of zonasArr) {
    const zonaPartidos = partidosArr.filter(p => p.zonaId === zona.id)
    const standings = computeStandings(zonaPartidos, zona.duplas || [])
    for (let k = 0; k < clasificadosPorZona; k++) {
      if (standings[k]) qualifiers.push(standings[k])
    }
  }

  const seededTeams = [...qualifiers].sort((a, b) =>
    b.pts - a.pts || b.setsF - a.setsF || b.gamesF - a.gamesF
  )

  const N = seededTeams.length
  if (N < 2) throw new Error('Se necesitan al menos 2 clasificados para generar la llave.')

  let bracketSize = 2
  while (bracketSize < N) bracketSize *= 2

  const totalRounds = Math.log2(bracketSize)
  const roundNames = ROUND_NAMES_TABLE[totalRounds] ||
    Array.from({ length: totalRounds }, (_, i) => i === totalRounds - 1 ? 'Final' : `Ronda ${i + 1}`)

  const batch = writeBatch(db)
  const oldLlaves = await getDocs(collection(db, 'torneos', torneoId, 'llaves'))
  oldLlaves.forEach(d => batch.delete(d.ref))

  // Pre-generate all document refs so we can cross-link nextLlaveId
  const roundRefs = []
  for (let r = 0; r < totalRounds; r++) {
    const count = bracketSize / Math.pow(2, r + 1)
    roundRefs.push(Array.from({ length: count }, () => doc(collection(db, 'torneos', torneoId, 'llaves'))))
  }

  const firstRoundPairs = getFirstRoundPairs(bracketSize)
  const byeAdvances = []

  for (let i = 0; i < roundRefs[0].length; i++) {
    const [sA, sB] = firstRoundPairs[i]
    const teamA = sA < N ? { id: seededTeams[sA].id, jugador1: seededTeams[sA].jugador1, jugador2: seededTeams[sA].jugador2, seed: sA + 1 } : null
    const teamB = sB < N ? { id: seededTeams[sB].id, jugador1: seededTeams[sB].jugador1, jugador2: seededTeams[sB].jugador2, seed: sB + 1 } : null
    const nextRef = totalRounds > 1 ? roundRefs[1][Math.floor(i / 2)] : null
    const nextSlot = i % 2 === 0 ? 'A' : 'B'
    const isBye = !teamA || !teamB

    batch.set(roundRefs[0][i], {
      round: 1, roundName: roundNames[0], matchIndex: i,
      duplaA: teamA, duplaB: teamB, resultado: null,
      estado: isBye ? 'BYE' : 'Programado',
      ptsA: isBye ? (teamA ? 3 : 0) : null,
      ptsB: isBye ? (teamB ? 3 : 0) : null,
      nextLlaveId: nextRef?.id || null,
      nextSlot: nextRef ? nextSlot : null,
    })

    if (isBye && nextRef) byeAdvances.push({ ref: nextRef, slot: nextSlot, winner: teamA || teamB })
  }

  for (let r = 1; r < totalRounds; r++) {
    for (let i = 0; i < roundRefs[r].length; i++) {
      const nextRef = r + 1 < totalRounds ? roundRefs[r + 1][Math.floor(i / 2)] : null
      const nextSlot = i % 2 === 0 ? 'A' : 'B'
      batch.set(roundRefs[r][i], {
        round: r + 1, roundName: roundNames[r], matchIndex: i,
        duplaA: null, duplaB: null, resultado: null, estado: 'Pendiente',
        ptsA: null, ptsB: null,
        nextLlaveId: nextRef?.id || null,
        nextSlot: nextRef ? nextSlot : null,
      })
    }
  }

  batch.update(doc(db, 'torneos', torneoId), { estado: 'Llave' })
  await batch.commit()

  if (byeAdvances.length > 0) {
    const byeBatch = writeBatch(db)
    for (const { ref, slot, winner } of byeAdvances) {
      byeBatch.update(ref, { [slot === 'A' ? 'duplaA' : 'duplaB']: winner })
    }
    await byeBatch.commit()
  }
}

// ─── Delete bracket and revert tournament back to group stage ────────────────
export async function deleteBracket(torneoId) {
  const llavesSnap = await getDocs(collection(db, 'torneos', torneoId, 'llaves'))
  const batch = writeBatch(db)
  llavesSnap.forEach(d => batch.delete(d.ref))
  batch.update(doc(db, 'torneos', torneoId), { estado: 'En curso' })
  await batch.commit()
}

// ─── Save bracket match result ────────────────────────────────────────────────
// Saves result and propagates winner to the next bracket match.
// When both teams are now set in the next match, changes its estado to 'Programado'.
export async function saveLlaveResultado(torneoId, llaveId, { setsA, setsB, gamesA, gamesB, historialSets, wo }) {
  const llaveRef = doc(db, 'torneos', torneoId, 'llaves', llaveId)
  const snap = await getDoc(llaveRef)
  const data = snap.data()

  const { ptsA, ptsB, estado, aWins } = computeMatchResult(setsA, setsB, wo)
  const winner = aWins ? data.duplaA : data.duplaB
  const batch = writeBatch(db)
  batch.update(llaveRef, {
    resultado: { setsA, setsB, gamesA: gamesA || 0, gamesB: gamesB || 0, historialSets: historialSets || [] },
    ptsA, ptsB, estado,
  })

  if (data.nextLlaveId && winner) {
    const nextRef = doc(db, 'torneos', torneoId, 'llaves', data.nextLlaveId)
    const nextSnap = await getDoc(nextRef)
    const nextData = nextSnap.data() || {}
    const slotKey = data.nextSlot === 'A' ? 'duplaA' : 'duplaB'
    const otherSlotKey = data.nextSlot === 'A' ? 'duplaB' : 'duplaA'
    const nextUpdate = { [slotKey]: winner }
    if (nextData[otherSlotKey]) nextUpdate.estado = 'Programado'
    batch.update(nextRef, nextUpdate)
  }

  await batch.commit()
}

// ─── Compute standings from matches ──────────────────────────────────────────
// Rules:
//   - If a dupla lost ALL their group matches (PG === 0), they get 0 points total.
//   - Tiebreaker cascade: pts DESC → head-to-head → setsF DESC (sets won) → gamesF DESC (total games won)
export function computeStandings(partidos, duplas) {
  const stats = {}
  for (const d of duplas) {
    stats[d.id] = {
      id: d.id,
      jugador1: d.jugador1,
      jugador2: d.jugador2,
      PJ: 0, PG: 0, PP: 0,
      setsF: 0, setsC: 0,
      gamesF: 0, gamesC: 0,
      pts: 0,
    }
  }

  const headToHead = {}
  for (const p of partidos) {
    if (!p.resultado || p.estado === 'Programado') continue
    const a = stats[p.duplaA.id]
    const b = stats[p.duplaB.id]
    if (!a || !b) continue

    const { setsA, setsB, gamesA, gamesB } = p.resultado
    a.PJ++; b.PJ++
    a.setsF += setsA; a.setsC += setsB
    b.setsF += setsB; b.setsC += setsA
    a.gamesF += gamesA || 0; a.gamesC += gamesB || 0
    b.gamesF += gamesB || 0; b.gamesC += gamesA || 0
    a.pts += p.ptsA || 0
    b.pts += p.ptsB || 0
    const winnerId = (p.ptsA || 0) > (p.ptsB || 0) ? p.duplaA.id : p.duplaB.id
    headToHead[`${p.duplaA.id}_${p.duplaB.id}`] = winnerId
    headToHead[`${p.duplaB.id}_${p.duplaA.id}`] = winnerId
    if ((p.ptsA || 0) > (p.ptsB || 0)) { a.PG++; b.PP++ }
    else { b.PG++; a.PP++ }
  }

  // Duplas that lost all their matches get 0 points
  for (const stat of Object.values(stats)) {
    if (stat.PJ > 0 && stat.PG === 0) stat.pts = 0
  }

  return Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const h2hWinner = headToHead[`${a.id}_${b.id}`]
    if (h2hWinner === a.id) return -1
    if (h2hWinner === b.id) return 1
    return b.setsF - a.setsF || b.gamesF - a.gamesF
  })
}

// ─── Champions history ─────────────────────────────────────────────────────────
// Derives the champion/runner-up from the Final bracket match, plus the
// champion's full path through the bracket (opponent + score per round).
// Nothing new to store — it's all already in llaves. Checked against the
// Final's own result rather than requiring torneo.estado === 'Finalizado' —
// admins generate the bracket and finish playing it, but don't necessarily
// remember to also flip the tournament's own status label afterwards, so
// requiring that label would silently hide champions that are already decided
// (this mirrors how BracketView already shows the trophy card).
export async function getCampeones() {
  // Sorted client-side instead of orderBy('createdAt') in the query — combining
  // that with where('estado', ...) needs a composite index created manually in
  // the Firebase console, which isn't worth the setup step for this.
  const torneosSnap = await getDocs(query(collection(db, 'torneos'), where('estado', 'in', ['Llave', 'Finalizado'])))
  const torneos = torneosSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))

  const campeones = []
  for (const t of torneos) {
    const llavesSnap = await getDocs(collection(db, 'torneos', t.id, 'llaves'))
    const llaves = llavesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (llaves.length === 0) continue

    const maxRound = Math.max(...llaves.map(l => l.round || 0))
    const final = llaves.find(l => l.round === maxRound && l.resultado)
    if (!final?.duplaA || !final?.duplaB) continue

    const aWon = (final.ptsA || 0) > (final.ptsB || 0)
    const campeon = aWon ? final.duplaA : final.duplaB
    const subcampeon = aWon ? final.duplaB : final.duplaA

    const camino = llaves
      .filter(l => l.resultado && (l.duplaA?.id === campeon.id || l.duplaB?.id === campeon.id))
      .sort((a, b) => (a.round || 0) - (b.round || 0))
      .map(l => {
        const isA = l.duplaA?.id === campeon.id
        return {
          roundName: l.roundName,
          rival: isA ? l.duplaB : l.duplaA,
          setsCampeon: isA ? l.resultado.setsA : l.resultado.setsB,
          setsRival: isA ? l.resultado.setsB : l.resultado.setsA,
        }
      })

    campeones.push({
      torneoId: t.id,
      torneoNombre: t.nombre,
      categoriaName: t.categoriaName,
      color: t.color,
      fecha: t.fechaFin || t.fechaInicio,
      campeon, subcampeon, camino,
    })
  }
  return campeones
}

// ─── Solicitudes de acceso admin ──────────────────────────────────────────────

export async function createSolicitud({ nombre, apellido, email }) {
  return addDoc(collection(db, 'solicitudes'), {
    nombre, apellido, email,
    status: 'pendiente',
    createdAt: serverTimestamp(),
  })
}

export async function getSolicitudes() {
  const snap = await getDocs(query(collection(db, 'solicitudes'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function createAuthUserViaRest(email) {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  const tempPassword = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(-16)) + 'A1!'
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: tempPassword, returnSecureToken: false }),
    }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.localId
}

export async function approveSolicitud(solicitudId, { email, nombre, apellido }) {
  const emailLower = email.toLowerCase()

  // 1. Marcar solicitud como aprobada
  await setDoc(doc(db, 'solicitudes', solicitudId), { status: 'aprobado', reviewedAt: serverTimestamp() }, { merge: true })
  // 2. Agregar a config/admins
  await setDoc(doc(db, 'config', 'admins'), { emails: arrayUnion(emailLower) }, { merge: true })

  // 3. Buscar si ya existe en users
  const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', emailLower)))
  if (!usersSnap.empty) {
    await updateDoc(usersSnap.docs[0].ref, { rol: 'admin' })
    return
  }

  // 4. No existe → crear cuenta en Firebase Auth y doc en Firestore
  try {
    const uid = await createAuthUserViaRest(emailLower)
    await setDoc(doc(db, 'users', uid), {
      email: emailLower,
      displayName: `${nombre} ${apellido}`.trim(),
      photoURL: null,
      rol: 'admin',
      createdAt: new Date(),
    })
    // Enviar email para que el usuario establezca su contraseña
    await sendPasswordResetEmail(auth, emailLower)
  } catch (err) {
    if (err.message !== 'EMAIL_EXISTS') throw err
    // Si ya existe en Auth pero no en Firestore, config/admins lo resuelve al iniciar sesión
  }
}

export async function rejectSolicitud(solicitudId) {
  await setDoc(doc(db, 'solicitudes', solicitudId), { status: 'rechazado', reviewedAt: serverTimestamp() }, { merge: true })
}

export async function updateSolicitud(solicitudId, { nombre, apellido, email, status }) {
  await setDoc(doc(db, 'solicitudes', solicitudId), { nombre, apellido, email, status }, { merge: true })
}

export async function deleteSolicitud(solicitudId) {
  await deleteDoc(doc(db, 'solicitudes', solicitudId))
}

// ─── Gestión de admins ────────────────────────────────────────────────────────

export async function getAdmins() {
  const [usersSnap, configSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('rol', '==', 'admin'))),
    getDoc(doc(db, 'config', 'admins')),
  ])

  const activeAdmins = usersSnap.docs.map(d => ({ uid: d.id, ...d.data(), pending: false }))
  const activeEmails = new Set(activeAdmins.map(u => u.email?.toLowerCase()))

  const preApproved = (configSnap.exists() ? configSnap.data().emails || [] : [])
    .filter(email => !activeEmails.has(email.toLowerCase()))
    .map(email => ({ uid: null, email, displayName: null, photoURL: null, pending: true }))

  return [...activeAdmins, ...preApproved]
}

export async function revokeAdmin(uid, email) {
  if (uid) await updateDoc(doc(db, 'users', uid), { rol: 'viewer' })
  await setDoc(doc(db, 'config', 'admins'), { emails: arrayRemove(email.toLowerCase()) }, { merge: true })
}
