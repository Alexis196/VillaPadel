import { useState, useEffect, useMemo, useRef } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { computeStandings } from '../../firebase/torneoService'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'

function posStyle(pos) {
  if (pos === 1) return { color: '#f97316', fontWeight: 700 }
  if (pos === 2) return { color: '#a855f7', fontWeight: 600 }
  return { color: '#9999b0' }
}

export default function StandingsView() {
  const [torneos, setTorneos] = useState([])
  const [activeTorneo, setActiveTorneo] = useState(null)
  const [zonas, setZonas] = useState([])
  const [partidos, setPartidos] = useState([])
  const [activeZona, setActiveZona] = useState(null)
  const [loading, setLoading] = useState(true)
  const shareRef = useRef(null)

  useEffect(() => { loadTorneos() }, [])

  useEffect(() => {
    if (activeTorneo) loadData(activeTorneo.id)
  }, [activeTorneo])

  async function loadTorneos() {
    const snap = await getDocs(query(collection(db, 'torneos'), orderBy('createdAt', 'desc')))
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setTorneos(list)
    const active = list.find(t => t.estado === 'En curso') || list[0]
    if (active) setActiveTorneo(active)
    else setLoading(false)
  }

  async function loadData(torneoId) {
    setLoading(true)
    const [zonasSnap, partidosSnap] = await Promise.all([
      getDocs(query(collection(db, 'torneos', torneoId, 'zonas'), orderBy('orden'))),
      getDocs(collection(db, 'torneos', torneoId, 'partidos')),
    ])
    const z = zonasSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    setZonas(z)
    setPartidos(partidosSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setActiveZona(z[0] || null)
    setLoading(false)
  }

  const standings = useMemo(() => {
    if (!activeZona) return []
    const zonaDuplas = activeZona.duplas || []
    const zonaPartidos = partidos.filter(p => p.zonaId === activeZona.id)
    return computeStandings(zonaPartidos, zonaDuplas)
  }, [activeZona, partidos])

  if (loading) return <Spinner />

  const COLS = [
    { key: 'pos',   label: 'Pos',   width: 50 },
    { key: 'dupla', label: 'Dupla', flex: 1, align: 'left' },
    { key: 'PJ',    label: 'PJ',    width: 50 },
    { key: 'PG',    label: 'PG',    width: 50 },
    { key: 'PP',    label: 'PP',    width: 50 },
    { key: 'setsF', label: 'S+',    width: 50 },
    { key: 'setsC', label: 'S-',    width: 50 },
    { key: 'diff',  label: 'Diff',  width: 60 },
    { key: 'pts',   label: 'Pts',   width: 60 },
  ]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Tabla de Posiciones
          </h1>
          {activeTorneo && (
            <p style={{ color: '#9999b0', fontSize: 14, margin: 0 }}>{activeTorneo.nombre}</p>
          )}
        </div>
        <ShareButton targetRef={shareRef} title="Tabla de Posiciones" filename="tabla-posiciones" />
      </div>

      {torneos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', color: '#9999b0' }}>
          No hay torneos activos aún.
        </div>
      ) : (
        <>
          {/* Selectors row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {torneos.length > 1 && (
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <select
                  value={activeTorneo?.id || ''}
                  onChange={e => setActiveTorneo(torneos.find(t => t.id === e.target.value))}
                  style={{ background: '#13131a', border: '1px solid #3a3a50', borderRadius: 8, color: '#f1f1f5', fontSize: 13, fontWeight: 500, padding: '8px 32px 8px 12px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
                >
                  {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.estado === 'En curso' ? ' · En curso' : ''}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: '#f97316', fontSize: 11 }}>▾</span>
              </div>
            )}
            {zonas.length > 1 && (
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <select
                  value={activeZona?.id || ''}
                  onChange={e => setActiveZona(zonas.find(z => z.id === e.target.value))}
                  style={{ background: '#13131a', border: '1px solid #3a3a50', borderRadius: 8, color: '#f1f1f5', fontSize: 13, fontWeight: 500, padding: '8px 32px 8px 12px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
                >
                  {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: '#f97316', fontSize: 11 }}>▾</span>
              </div>
            )}
          </div>

          {/* Table */}
          {zonas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', color: '#9999b0' }}>
              Este torneo está en inscripción — las posiciones aparecerán cuando se genere el fixture.
            </div>
          ) : (
            <div ref={shareRef} style={{ background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}>
              <div className="scroll-x">
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 44, borderBottom: '1px solid #2a2a38', background: '#16161e' }}>
                {COLS.map(col => (
                  <div key={col.key} style={{ flex: col.flex || 'none', width: col.width, minWidth: col.width, textAlign: col.align || 'center', color: '#6666a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {col.label}
                  </div>
                ))}
              </div>

              {standings.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#9999b0' }}>No hay partidos jugados aún.</div>
              ) : (
                standings.map((row, idx) => {
                  const pos = idx + 1
                  const diff = row.setsF - row.setsC
                  return (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '0 20px', height: 58,
                        borderBottom: idx < standings.length - 1 ? '1px solid #20202c' : 'none',
                        borderLeft: pos <= 2 ? '3px solid #f97316' : '3px solid transparent',
                        transition: 'background 0.15s', cursor: 'default',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#20202c'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 50, minWidth: 50, textAlign: 'center', ...posStyle(pos) }}>{pos}</div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ color: '#f1f1f5', fontSize: 13 }}>{row.jugador1}</div>
                        <div style={{ color: '#f1f1f5', fontSize: 13 }}>{row.jugador2}</div>
                      </div>
                      {[row.PJ, row.PG, row.PP, row.setsF, row.setsC].map((v, i) => (
                        <div key={i} style={{ width: 50, minWidth: 50, textAlign: 'center', color: '#f1f1f5', fontSize: 14 }}>{v}</div>
                      ))}
                      <div style={{ width: 60, minWidth: 60, textAlign: 'center', color: diff >= 0 ? '#22c55e' : '#ef4444', fontSize: 14, fontWeight: 600 }}>
                        {diff > 0 ? `+${diff}` : diff}
                      </div>
                      <div style={{ width: 60, minWidth: 60, textAlign: 'center', color: '#f97316', fontWeight: 700, fontSize: 14 }}>{row.pts}</div>
                    </div>
                  )
                })
              )}
              </div>{/* end scroll-x */}
            </div>
          )}

          {/* Legend */}
          {standings.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: '#f97316' }} />
              <span style={{ color: '#9999b0', fontSize: 12 }}>Clasifican a semifinales (top 2 por zona)</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
