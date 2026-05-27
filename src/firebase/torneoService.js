import { db } from './config'
import {
  collection, doc, addDoc, setDoc, getDocs, getDoc, deleteDoc,
  writeBatch, serverTimestamp, query, orderBy,
} from 'firebase/firestore'

// ─── Zone generation ──────────────────────────────────────────────────────────
// tamanoZona: target pairs per zone (3 or 4, default 4)
// Remainder distributed evenly: some zones get base+1 if n % numGroups > 0
export function generateZonas(duplas, tamanoZona = 4) {
  const shuffled = [...duplas].sort(() => Math.random() - 0.5)
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
export async function createTorneo({ nombre, categoriaId, categoriaName, categoriaValor, costoPorJugador, fechaInicio, tipoTorneo, color, sexo, tamanoZona, clasificadosPorZona }) {
  const today = new Date().toISOString().split('T')[0]
  const estado = fechaInicio > today ? 'Inscripción' : 'En curso'
  const ref = await addDoc(collection(db, 'torneos'), {
    nombre,
    categoriaId,
    categoriaName,
    categoriaValor: Number(categoriaValor),
    costoPorJugador: Number(costoPorJugador),
    fechaInicio,
    estado,
    tipoTorneo: tipoTorneo || 'categoria',
    sexo: sexo || 'masculino',
    color: color || null,
    tamanoZona: Number(tamanoZona) || 4,
    clasificadosPorZona: Number(clasificadosPorZona) || 1,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ─── Update tournament ────────────────────────────────────────────────────────
export async function updateTorneo(id, { nombre, categoriaId, categoriaName, categoriaValor, costoPorJugador, fechaInicio, tipoTorneo, color, sexo, tamanoZona, clasificadosPorZona }) {
  const today = new Date().toISOString().split('T')[0]
  const estado = fechaInicio > today ? 'Inscripción' : 'En curso'
  await setDoc(doc(db, 'torneos', id), {
    nombre, categoriaId, categoriaName,
    categoriaValor: Number(categoriaValor),
    costoPorJugador: Number(costoPorJugador),
    fechaInicio, estado,
    tipoTorneo: tipoTorneo || 'categoria',
    sexo: sexo || 'masculino',
    color: color || null,
    tamanoZona: Number(tamanoZona) || 4,
    clasificadosPorZona: Number(clasificadosPorZona) || 1,
  }, { merge: true })
}

// ─── Delete tournament and all subcollections ─────────────────────────────────
export async function deleteTorneo(id) {
  const batch = writeBatch(db)
  const subcols = ['duplas', 'zonas', 'partidos']
  for (const sub of subcols) {
    const snap = await getDocs(collection(db, 'torneos', id, sub))
    snap.forEach(d => batch.delete(d.ref))
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

  // Delete any existing zonas/partidos
  const oldZonas = await getDocs(collection(db, 'torneos', torneoId, 'zonas'))
  oldZonas.forEach(d => batch.delete(d.ref))
  const oldPartidos = await getDocs(collection(db, 'torneos', torneoId, 'partidos'))
  oldPartidos.forEach(d => batch.delete(d.ref))

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

// ─── Save match result ────────────────────────────────────────────────────────
// APA scoring: Win=2pts, Loss=1pt, W.O.=0pts
export async function saveResultado(torneoId, partidoId, { setsA, setsB, gamesA, gamesB, wo }) {
  const ref = doc(db, 'torneos', torneoId, 'partidos', partidoId)
  let ptsA, ptsB, estado

  if (wo) {
    ptsA = setsA > setsB ? 2 : 0
    ptsB = setsA > setsB ? 0 : 2
    estado = 'W.O.'
  } else {
    ptsA = setsA > setsB ? 2 : 1
    ptsB = setsA > setsB ? 1 : 2
    estado = 'Finalizado'
  }

  await setDoc(ref, {
    resultado: { setsA, setsB, gamesA: gamesA || 0, gamesB: gamesB || 0 },
    ptsA, ptsB, estado,
  }, { merge: true })
}

// ─── Update match status ──────────────────────────────────────────────────────
export async function updateEstado(torneoId, partidoId, estado) {
  await setDoc(doc(db, 'torneos', torneoId, 'partidos', partidoId), { estado }, { merge: true })
}

// ─── Update live scoreboard ───────────────────────────────────────────────────
export async function updateMarcador(torneoId, partidoId, marcador) {
  await setDoc(doc(db, 'torneos', torneoId, 'partidos', partidoId), { marcador }, { merge: true })
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
export async function addJugador({ name, categoryName, categoryColor, categoriaValor, sexo }) {
  await addDoc(collection(db, 'players'), {
    name, categoryName, categoryColor, categoriaValor: Number(categoriaValor),
    sexo: sexo || 'M', ascenso: false,
    createdAt: serverTimestamp(),
  })
}

export async function updateJugador(id, fields) {
  const { name, categoryName, categoryColor, categoriaValor, sexo, ascenso } = fields
  const data = { name, categoryName, categoryColor, categoriaValor: Number(categoriaValor), sexo: sexo || 'M' }
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
// Ensures top seeds can only meet in later rounds (standard seeding)
function getFirstRoundPairs(bracketSize) {
  if (bracketSize === 2)  return [[0, 1]]
  if (bracketSize === 4)  return [[0, 3], [1, 2]]
  if (bracketSize === 8)  return [[0, 7], [3, 4], [1, 6], [2, 5]]
  if (bracketSize === 16) return [[0,15],[7,8],[4,11],[3,12],[1,14],[6,9],[5,10],[2,13]]
  const pairs = []
  for (let i = 0; i < bracketSize / 2; i++) pairs.push([i, bracketSize - 1 - i])
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

  // Seed order: all zone winners first, then runners-up, etc.
  const seededTeams = []
  for (let k = 0; k < clasificadosPorZona; k++) {
    for (const zona of zonasArr) {
      const zonaPartidos = partidosArr.filter(p => p.zonaId === zona.id)
      const standings = computeStandings(zonaPartidos, zona.duplas || [])
      if (standings[k]) {
        seededTeams.push({
          id: standings[k].id,
          jugador1: standings[k].jugador1,
          jugador2: standings[k].jugador2,
        })
      }
    }
  }

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
      ptsA: isBye ? (teamA ? 2 : 0) : null,
      ptsB: isBye ? (teamB ? 2 : 0) : null,
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

// ─── Save bracket match result ────────────────────────────────────────────────
// Saves result and propagates winner to the next bracket match
export async function saveLlaveResultado(torneoId, llaveId, { setsA, setsB, gamesA, gamesB, wo }) {
  const llaveRef = doc(db, 'torneos', torneoId, 'llaves', llaveId)
  const snap = await getDoc(llaveRef)
  const data = snap.data()

  let ptsA, ptsB, estado
  if (wo) {
    ptsA = setsA > setsB ? 2 : 0
    ptsB = setsA > setsB ? 0 : 2
    estado = 'W.O.'
  } else {
    ptsA = setsA > setsB ? 2 : 1
    ptsB = setsA > setsB ? 1 : 2
    estado = 'Finalizado'
  }

  const winner = ptsA > ptsB ? data.duplaA : data.duplaB
  const batch = writeBatch(db)
  batch.update(llaveRef, {
    resultado: { setsA, setsB, gamesA: gamesA || 0, gamesB: gamesB || 0 },
    ptsA, ptsB, estado,
  })

  if (data.nextLlaveId && winner) {
    batch.update(
      doc(db, 'torneos', torneoId, 'llaves', data.nextLlaveId),
      { [data.nextSlot === 'A' ? 'duplaA' : 'duplaB']: winner }
    )
  }

  await batch.commit()
}

// ─── Compute standings from matches ──────────────────────────────────────────
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
    if ((p.ptsA || 0) > (p.ptsB || 0)) { a.PG++; b.PP++ }
    else { b.PG++; a.PP++ }
  }

  return Object.values(stats).sort(
    (a, b) => b.pts - a.pts || (b.setsF - b.setsC) - (a.setsF - a.setsC) || (b.gamesF - b.gamesC) - (a.gamesF - a.gamesC)
  )
}
