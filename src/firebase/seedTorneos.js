import { db } from './config'
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore'
import { generateZonas } from './torneoService'

// ─── Fictional data ───────────────────────────────────────────────────────────

const TORNEOS = [
  {
    id: 'torneo-masc-1ra',
    nombre: 'Copa Villa Padel — Masculino 1ra',
    categoriaId: 'cat-1ra',
    categoriaName: '1ra Categoría',
    categoriaValor: 1,
    costoPorJugador: 18000,
    fechaInicio: '2026-06-07',
    estado: 'En curso',
    duplas: [
      { id: 'd1', jugador1: 'Gonzalo Ruiz',      jugador2: 'Marcos López',     pagoEstado: 'pagado',   pagoMetodo: 'transferencia', montoAbonado: 36000 },
      { id: 'd2', jugador1: 'Diego Torres',      jugador2: 'Andrés Pérez',    pagoEstado: 'pagado',   pagoMetodo: 'efectivo',      montoAbonado: 36000 },
      { id: 'd3', jugador1: 'Rodrigo García',    jugador2: 'Juan Martínez',   pagoEstado: 'pagado',   pagoMetodo: 'transferencia', montoAbonado: 36000 },
      { id: 'd4', jugador1: 'Federico Soto',     jugador2: 'Pablo Navarro',   pagoEstado: 'pendiente',pagoMetodo: null,            montoAbonado: 0     },
      { id: 'd5', jugador1: 'Alejandro Díaz',    jugador2: 'Lucas Fernández', pagoEstado: 'pagado',   pagoMetodo: 'efectivo',      montoAbonado: 36000 },
      { id: 'd6', jugador1: 'Matías Silva',      jugador2: 'Nicolás Castro',  pagoEstado: 'pagado',   pagoMetodo: 'transferencia', montoAbonado: 36000 },
      { id: 'd7', jugador1: 'Gastón Morales',    jugador2: 'Tomás Herrera',   pagoEstado: 'pendiente',pagoMetodo: null,            montoAbonado: 0     },
      { id: 'd8', jugador1: 'Gonzalo Romero',    jugador2: 'Emilio Vargas',   pagoEstado: 'pagado',   pagoMetodo: 'efectivo',      montoAbonado: 36000 },
      { id: 'd9', jugador1: 'Javier Mendoza',    jugador2: 'Ramiro Jiménez',  pagoEstado: 'pagado',   pagoMetodo: 'transferencia', montoAbonado: 36000 },
    ],
    // Partidos precargados con resultados (jornada 1 y 2 finalizados)
    resultadosSimulados: {
      // zonas generadas con duplas 0-8 (9 duplas → 3 zonas de 3)
      // Se calculan dinámicamente abajo
    },
  },
  {
    id: 'torneo-mix',
    nombre: 'Copa Villa Padel — Mixto',
    categoriaId: 'cat-mix',
    categoriaName: 'Mixto',
    categoriaValor: 3,
    costoPorJugador: 14000,
    fechaInicio: '2026-06-14',
    estado: 'En curso',
    duplas: [
      { id: 'dm1', jugador1: 'Valentina Cruz',    jugador2: 'Carlos Reyes',     pagoEstado: 'pagado',   pagoMetodo: 'transferencia', montoAbonado: 28000 },
      { id: 'dm2', jugador1: 'Camila Ortiz',      jugador2: 'Gabriel Guzmán',   pagoEstado: 'pagado',   pagoMetodo: 'efectivo',      montoAbonado: 28000 },
      { id: 'dm3', jugador1: 'Luciana Romero',    jugador2: 'Maximiliano Vidal', pagoEstado: 'pendiente',pagoMetodo: null,            montoAbonado: 0     },
      { id: 'dm4', jugador1: 'Sofía Mendez',      jugador2: 'Rodrigo Delgado',  pagoEstado: 'pagado',   pagoMetodo: 'transferencia', montoAbonado: 28000 },
      { id: 'dm5', jugador1: 'Agustina Peralta',  jugador2: 'Santiago Bravo',   pagoEstado: 'pagado',   pagoMetodo: 'efectivo',      montoAbonado: 28000 },
      { id: 'dm6', jugador1: 'Mariana Gutiérrez', jugador2: 'Fernando Lagos',   pagoEstado: 'pendiente',pagoMetodo: null,            montoAbonado: 0     },
      { id: 'dm7', jugador1: 'Paula Ríos',        jugador2: 'Sebastián Molina', pagoEstado: 'pagado',   pagoMetodo: 'transferencia', montoAbonado: 28000 },
    ],
  },
  {
    id: 'torneo-fem',
    nombre: 'Copa Villa Padel — Femenino A',
    categoriaId: 'cat-fem',
    categoriaName: 'Femenino A',
    categoriaValor: 2,
    costoPorJugador: 14000,
    fechaInicio: '2026-07-05',
    estado: 'Inscripción',
    duplas: [
      { id: 'df1', jugador1: 'Laura Castillo',    jugador2: 'María Fernández',  pagoEstado: 'pagado',   pagoMetodo: 'transferencia', montoAbonado: 28000 },
      { id: 'df2', jugador1: 'Daniela Rojas',     jugador2: 'Antonela Suárez',  pagoEstado: 'pagado',   pagoMetodo: 'efectivo',      montoAbonado: 28000 },
      { id: 'df3', jugador1: 'Carolina Vega',     jugador2: 'Ximena Romero',    pagoEstado: 'pendiente',pagoMetodo: null,            montoAbonado: 0     },
      { id: 'df4', jugador1: 'Natalia Ibáñez',    jugador2: 'Cecilia Torres',   pagoEstado: 'pagado',   pagoMetodo: 'transferencia', montoAbonado: 28000 },
    ],
  },
]

// Simulate match results for a zone's round robin
function simulateResults(schedule, duplas) {
  return schedule.map(({ jornada, idxA, idxB }) => {
    const rand = Math.random()
    let setsA, setsB, gamesA, gamesB
    if (rand < 0.5) {
      setsA = 2; setsB = Math.floor(Math.random() * 2)
      gamesA = 6 + (setsA === 2 && setsB === 1 ? 0 : 0)
      gamesB = Math.floor(Math.random() * 5) + 1
    } else {
      setsB = 2; setsA = Math.floor(Math.random() * 2)
      gamesB = 6; gamesA = Math.floor(Math.random() * 5) + 1
    }
    const ptsA = setsA > setsB ? 2 : 1
    const ptsB = setsA > setsB ? 1 : 2
    return {
      jornada,
      duplaA: { id: duplas[idxA].id, jugador1: duplas[idxA].jugador1, jugador2: duplas[idxA].jugador2 },
      duplaB: { id: duplas[idxB].id, jugador1: duplas[idxB].jugador1, jugador2: duplas[idxB].jugador2 },
      resultado: { setsA, setsB, gamesA, gamesB },
      ptsA, ptsB,
      estado: 'Finalizado',
    }
  })
}

function roundRobinSchedule(count) {
  const matches = []
  const list = count % 2 === 0
    ? Array.from({ length: count }, (_, i) => i)
    : [...Array.from({ length: count }, (_, i) => i), -1]
  const rounds = list.length - 1
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < list.length / 2; i++) {
      const a = list[i]; const b = list[list.length - 1 - i]
      if (a !== -1 && b !== -1) matches.push({ jornada: round + 1, idxA: a, idxB: b })
    }
    const last = list.pop(); list.splice(1, 0, last)
  }
  return matches
}

export async function seedTorneos() {
  const batch = writeBatch(db)

  for (const torneo of TORNEOS) {
    const torneoRef = doc(db, 'torneos', torneo.id)
    batch.set(torneoRef, {
      nombre: torneo.nombre,
      categoriaId: torneo.categoriaId,
      categoriaName: torneo.categoriaName,
      categoriaValor: torneo.categoriaValor,
      costoPorJugador: torneo.costoPorJugador,
      fechaInicio: torneo.fechaInicio,
      estado: torneo.estado,
      createdAt: Timestamp.now(),
    })

    // Duplas
    for (const dupla of torneo.duplas) {
      const duplaRef = doc(db, 'torneos', torneo.id, 'duplas', dupla.id)
      batch.set(duplaRef, {
        jugador1: dupla.jugador1,
        jugador2: dupla.jugador2,
        pagoEstado: dupla.pagoEstado,
        pagoMetodo: dupla.pagoMetodo,
        montoAbonado: dupla.montoAbonado,
        createdAt: Timestamp.now(),
      })
    }

    // Generate zones + fixtures for active tournaments
    if (torneo.estado === 'En curso') {
      const zonaGroups = generateZonas(torneo.duplas)

      for (let z = 0; z < zonaGroups.length; z++) {
        const zonaDuplas = zonaGroups[z]
        const zonaId = `zona-${torneo.id}-${z + 1}`
        const zonaRef = doc(db, 'torneos', torneo.id, 'zonas', zonaId)
        batch.set(zonaRef, {
          nombre: `Zona ${z + 1}`,
          duplas: zonaDuplas.map(d => ({ id: d.id, jugador1: d.jugador1, jugador2: d.jugador2 })),
          orden: z + 1,
        })

        const schedule = roundRobinSchedule(zonaDuplas.length)
        // Simulate: jornada 1 finished, rest programmed
        const results = simulateResults(schedule.filter(s => s.jornada === 1), zonaDuplas)

        for (const match of schedule) {
          const partidoId = `partido-${torneo.id}-z${z + 1}-j${match.jornada}-${match.idxA}v${match.idxB}`
          const partidoRef = doc(db, 'torneos', torneo.id, 'partidos', partidoId)
          const simResult = results.find(r => r.jornada === match.jornada &&
            r.duplaA.id === zonaDuplas[match.idxA].id)

          if (simResult) {
            batch.set(partidoRef, {
              zonaId, zonaNombre: `Zona ${z + 1}`, jornada: match.jornada,
              duplaA: simResult.duplaA, duplaB: simResult.duplaB,
              resultado: simResult.resultado, ptsA: simResult.ptsA, ptsB: simResult.ptsB,
              estado: 'Finalizado',
            })
          } else {
            batch.set(partidoRef, {
              zonaId, zonaNombre: `Zona ${z + 1}`, jornada: match.jornada,
              duplaA: { id: zonaDuplas[match.idxA].id, jugador1: zonaDuplas[match.idxA].jugador1, jugador2: zonaDuplas[match.idxA].jugador2 },
              duplaB: { id: zonaDuplas[match.idxB].id, jugador1: zonaDuplas[match.idxB].jugador1, jugador2: zonaDuplas[match.idxB].jugador2 },
              resultado: null, ptsA: null, ptsB: null, estado: 'Programado',
            })
          }
        }
      }

      batch.update(torneoRef, { zonas: zonaGroups.length })
    }
  }

  await batch.commit()
  console.log('Torneos seeded!')
}
