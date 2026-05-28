import { useRef, useMemo, useState, useEffect } from 'react'
import { useTorneo } from '../../contexts/TorneoContext'
import { computeStandings } from '../../firebase/torneoService'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'

function posStyle(pos) {
  if (pos === 1) return { color: '#ff9d2f', fontWeight: 700 }
  if (pos === 2) return { color: '#a78bfa', fontWeight: 600 }
  return { color: 'rgba(255,255,255,.45)' }
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
    <div className="view-container-lg">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }} className="animate-fadein">
        <div>
          <h1 className="section-title">Tabla de Posiciones</h1>
          {activeTorneo && (
            <p className="section-subtitle">{activeTorneo.nombre}</p>
          )}
        </div>
        <ShareButton targetRef={shareRef} title="Tabla de Posiciones" filename="tabla-posiciones" />
      </div>

      {torneos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'rgba(17,24,39,.5)', backdropFilter: 'blur(10px)', borderRadius: 20, border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.45)' }}>
          No hay torneos activos aún.
        </div>
      ) : (
        <>
          {/* Selectors */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
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
            <div style={{ textAlign: 'center', padding: 52, background: 'rgba(17,24,39,.5)', backdropFilter: 'blur(10px)', borderRadius: 20, border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.45)' }}>
              Este torneo está en inscripción — las posiciones aparecerán cuando se genere el fixture.
            </div>
          ) : (
            <div ref={shareRef}>
              {isMobile ? (
                /* Mobile: premium cards */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {standings.length === 0 ? (
                    <div style={{ padding: 36, textAlign: 'center', color: 'rgba(255,255,255,.45)', background: 'rgba(17,24,39,.5)', borderRadius: 16, border: '1px solid rgba(255,255,255,.06)' }}>
                      No hay partidos jugados aún.
                    </div>
                  ) : standings.map((row, idx) => {
                    const pos = idx + 1
                    const diff = row.setsF - row.setsC
                    const isTop = pos <= 2
                    return (
                      <div
                        key={row.id}
                        className={`standings-mobile-card ${isTop ? 'standings-mobile-card-highlight' : 'standings-mobile-card-normal'}`}
                      >
                        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: isTop ? 'rgba(255,122,0,.12)' : 'rgba(255,255,255,.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            ...posStyle(pos), fontSize: 13,
                          }}>
                            {pos}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{row.jugador1}</div>
                            <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, lineHeight: 1.3 }}>{row.jugador2}</div>
                          </div>
                          <div style={{ color: 'var(--orange-light)', fontWeight: 800, fontSize: 22, minWidth: 24, textAlign: 'right', fontFamily: 'var(--font-display)' }}>
                            {row.pts}
                          </div>
                        </div>
                        <div style={{ padding: '7px 16px 12px', borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', gap: 16 }}>
                          {[['PJ', row.PJ], ['PG', row.PG], ['PP', row.PP], ['S+', row.setsF], ['S-', row.setsC]].map(([label, val]) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                              <div style={{ color: 'rgba(255,157,47,.6)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{label}</div>
                              <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 13, fontWeight: 600 }}>{val}</div>
                            </div>
                          ))}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: 'rgba(255,157,47,.6)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Diff</div>
                            <div style={{ color: diff >= 0 ? '#4ade80' : '#f87171', fontSize: 13, fontWeight: 700 }}>{diff > 0 ? `+${diff}` : diff}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Desktop: premium table */
                <div className="table-wrap">
                  <div className="scroll-x">
                    {/* Column headers */}
                    <div className="table-header-row">
                      {COLS.map(col => (
                        <div
                          key={col.key}
                          className="table-col-header"
                          style={{ flex: col.flex || 'none', width: col.width, minWidth: col.width, textAlign: col.align || 'center' }}
                        >
                          {col.label}
                        </div>
                      ))}
                    </div>

                    {standings.length === 0 ? (
                      <div style={{ padding: 36, textAlign: 'center', color: 'rgba(255,255,255,.45)' }}>
                        No hay partidos jugados aún.
                      </div>
                    ) : standings.map((row, idx) => {
                      const pos = idx + 1
                      const diff = row.setsF - row.setsC
                      const isTop = pos <= 2
                      return (
                        <div
                          key={row.id}
                          className={`table-row ${isTop ? 'table-row-highlight' : 'table-row-normal'}`}
                          style={{ borderBottom: idx < standings.length - 1 ? '1px solid rgba(255,255,255,.035)' : 'none' }}
                        >
                          <div style={{ width: 44, minWidth: 44, textAlign: 'center', ...posStyle(pos), fontSize: 14 }}>{pos}</div>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ color: 'rgba(255,255,255,.9)', fontSize: 13 }}>{row.jugador1}</div>
                            <div style={{ color: 'rgba(255,255,255,.48)', fontSize: 12 }}>{row.jugador2}</div>
                          </div>
                          {[row.PJ, row.PG, row.PP, row.setsF, row.setsC].map((v, i) => (
                            <div key={i} style={{ width: 44, minWidth: 44, textAlign: 'center', color: 'rgba(255,255,255,.75)', fontSize: 14 }}>{v}</div>
                          ))}
                          <div style={{ width: 52, minWidth: 52, textAlign: 'center', color: diff >= 0 ? '#4ade80' : '#f87171', fontSize: 14, fontWeight: 600 }}>
                            {diff > 0 ? `+${diff}` : diff}
                          </div>
                          <div style={{ width: 52, minWidth: 52, textAlign: 'center', color: 'var(--orange-light)', fontWeight: 700, fontSize: 14 }}>
                            {row.pts}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {standings.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--orange-main)', flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,.38)', fontSize: 12 }}>Clasifican a playoffs (top 2 por zona)</span>
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
      <select value={value} onChange={onChange} className="select-premium">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 11, pointerEvents: 'none', color: 'var(--orange-light)', fontSize: 11 }}>▾</span>
    </div>
  )
}
