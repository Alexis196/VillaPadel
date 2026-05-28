import { useRef, useMemo, useState, useEffect } from 'react'
import { useTorneo } from '../../contexts/TorneoContext'
import { computeStandings } from '../../firebase/torneoService'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'

function posStyle(pos) {
  if (pos === 1) return { color: '#f97316', fontWeight: 700 }
  if (pos === 2) return { color: '#a855f7', fontWeight: 600 }
  return { color: '#9999b0' }
}

export default function StandingsView() {
  const { torneos, activeTorneo, setActiveTorneoId, zonas, partidos, loading } = useTorneo()
  const isMobile = useIsMobile()
  const shareRef = useRef(null)

  const [activeZonaId, setActiveZonaId] = useManagedZona(zonas)

  const activeZona = zonas.find(z => z.id === activeZonaId) || zonas[0] || null

  const standings = useMemo(() => {
    if (!activeZona) return []
    const zonaPartidos = partidos.filter(p => p.zonaId === activeZona.id)
    return computeStandings(zonaPartidos, activeZona.duplas || [])
  }, [activeZona, partidos])

  if (loading) return <Spinner />

  const COLS = [
    { key: 'pos',   label: 'Pos',  width: 44 },
    { key: 'dupla', label: 'Dupla', flex: 1, align: 'left' },
    { key: 'PJ',    label: 'PJ',   width: 44 },
    { key: 'PG',    label: 'PG',   width: 44 },
    { key: 'PP',    label: 'PP',   width: 44 },
    { key: 'setsF', label: 'S+',   width: 44 },
    { key: 'setsC', label: 'S-',   width: 44 },
    { key: 'diff',  label: 'Diff', width: 52 },
    { key: 'pts',   label: 'Pts',  width: 52 },
  ]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
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
          {/* Selectors */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {torneos.length > 1 && (
              <StyledSelect
                value={activeTorneo?.id || ''}
                onChange={e => setActiveTorneoId(e.target.value)}
                options={torneos.map(t => ({ value: t.id, label: t.nombre + (t.estado === 'En curso' ? ' · En curso' : '') }))}
              />
            )}
            {zonas.length > 1 && (
              <StyledSelect
                value={activeZonaId || ''}
                onChange={e => setActiveZonaId(e.target.value)}
                options={zonas.map(z => ({ value: z.id, label: z.nombre }))}
              />
            )}
          </div>

          {zonas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', color: '#9999b0' }}>
              Este torneo está en inscripción — las posiciones aparecerán cuando se genere el fixture.
            </div>
          ) : (
            <div ref={shareRef}>
              {isMobile ? (
                /* Mobile: cards */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {standings.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#9999b0', background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38' }}>No hay partidos jugados aún.</div>
                  ) : standings.map((row, idx) => {
                    const pos = idx + 1
                    const diff = row.setsF - row.setsC
                    return (
                      <div key={row.id} style={{
                        background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden',
                        borderLeft: pos <= 2 ? '4px solid #f97316' : '4px solid transparent',
                      }}>
                        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: pos <= 2 ? 'rgba(249,115,22,0.12)' : '#2a2a38', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...posStyle(pos) }}>
                            {pos}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{row.jugador1}</div>
                            <div style={{ color: '#9999b0', fontSize: 12, lineHeight: 1.3 }}>{row.jugador2}</div>
                          </div>
                          <div style={{ color: '#f97316', fontWeight: 800, fontSize: 20, minWidth: 24, textAlign: 'right' }}>{row.pts}</div>
                        </div>
                        <div style={{ padding: '6px 14px 10px', borderTop: '1px solid #20202c', display: 'flex', gap: 14 }}>
                          {[['PJ', row.PJ], ['PG', row.PG], ['PP', row.PP], ['S+', row.setsF], ['S-', row.setsC]].map(([label, val]) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                              <div style={{ color: '#6666a0', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                              <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600 }}>{val}</div>
                            </div>
                          ))}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#6666a0', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Diff</div>
                            <div style={{ color: diff >= 0 ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 700 }}>{diff > 0 ? `+${diff}` : diff}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Desktop: table */
                <div style={{ background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}>
                  <div className="scroll-x">
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 44, borderBottom: '1px solid #2a2a38', background: '#16161e' }}>
                      {COLS.map(col => (
                        <div key={col.key} style={{ flex: col.flex || 'none', width: col.width, minWidth: col.width, textAlign: col.align || 'center', color: '#6666a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {col.label}
                        </div>
                      ))}
                    </div>
                    {standings.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', color: '#9999b0' }}>No hay partidos jugados aún.</div>
                    ) : standings.map((row, idx) => {
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
                          <div style={{ width: 44, minWidth: 44, textAlign: 'center', ...posStyle(pos) }}>{pos}</div>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ color: '#f1f1f5', fontSize: 13 }}>{row.jugador1}</div>
                            <div style={{ color: '#f1f1f5', fontSize: 13 }}>{row.jugador2}</div>
                          </div>
                          {[row.PJ, row.PG, row.PP, row.setsF, row.setsC].map((v, i) => (
                            <div key={i} style={{ width: 44, minWidth: 44, textAlign: 'center', color: '#f1f1f5', fontSize: 14 }}>{v}</div>
                          ))}
                          <div style={{ width: 52, minWidth: 52, textAlign: 'center', color: diff >= 0 ? '#22c55e' : '#ef4444', fontSize: 14, fontWeight: 600 }}>
                            {diff > 0 ? `+${diff}` : diff}
                          </div>
                          <div style={{ width: 52, minWidth: 52, textAlign: 'center', color: '#f97316', fontWeight: 700, fontSize: 14 }}>{row.pts}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {standings.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: '#f97316' }} />
                  <span style={{ color: '#9999b0', fontSize: 12 }}>Clasifican a playoffs (top 2 por zona)</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function useManagedZona(zonas) {
  const [activeZonaId, setActiveZonaId] = useState(null)
  useEffect(() => {
    if (zonas.length > 0 && !zonas.find(z => z.id === activeZonaId)) {
      setActiveZonaId(zonas[0]?.id || null)
    }
  }, [zonas])
  return [activeZonaId, setActiveZonaId]
}

function StyledSelect({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select value={value} onChange={onChange} style={{ background: '#13131a', border: '1px solid #3a3a50', borderRadius: 8, color: '#f1f1f5', fontSize: 13, fontWeight: 500, padding: '8px 32px 8px 12px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: '#f97316', fontSize: 11 }}>▾</span>
    </div>
  )
}
