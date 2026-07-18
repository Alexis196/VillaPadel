import { useRef, useMemo, useState, useEffect } from 'react'
import { useTorneo } from '../../contexts/TorneoContext'
import { computeStandings, computeGlobalStandings } from '../../firebase/torneoService'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'
import AppSelect from '../ui/AppSelect'
import './StandingsView.css'

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

  const usaTotal = activeTorneo?.cantidadClasificados > 0
  const cantidadClasificados = activeTorneo?.cantidadClasificados || 0
  const [viewMode, setViewMode] = useState('zona')
  useEffect(() => { setViewMode(usaTotal ? 'global' : 'zona') }, [activeTorneo?.id, usaTotal])
  const isGlobal = usaTotal && viewMode === 'global'

  const standings = useMemo(() => {
    if (!activeZona) return []
    const zonaPartidos = partidos.filter(p => p.zonaId === activeZona.id)
    return computeStandings(zonaPartidos, activeZona.duplas || [])
  }, [activeZona, partidos])

  const globalStandings = useMemo(() => {
    if (zonas.length === 0) return []
    return computeGlobalStandings(zonas, partidos)
  }, [zonas, partidos])

  if (loading) return <Spinner />

  const rows = isGlobal ? globalStandings : standings

  const COLS = [
    { key: 'pos',   label: 'Pos',  width: 44 },
    { key: 'dupla', label: 'Dupla', flex: 1, align: 'left' },
    ...(isGlobal ? [{ key: 'zona', label: 'Zona', width: 90 }] : []),
    { key: 'PJ',    label: 'PJ',   width: 44 },
    { key: 'PG',    label: 'PG',   width: 44 },
    { key: 'PP',    label: 'PP',   width: 44 },
    { key: 'setsF', label: 'S+',    width: 44 },
    { key: 'setsC', label: 'S-',    width: 44 },
    { key: 'diff',  label: 'S+/-',  width: 52 },
    { key: 'gdiff', label: 'G+/-',  width: 56 },
    { key: 'pts',   label: 'Pts',   width: 52 },
  ]

  return (
    <div className="view-container-lg">
      <div className="sv-header animate-fadein">
        <div>
          <h1 className="section-title">Tabla de Posiciones</h1>
          {activeTorneo && <p className="section-subtitle">{activeTorneo.nombre}</p>}
        </div>
        <ShareButton targetRef={shareRef} title="Tabla de Posiciones" filename="tabla-posiciones" />
      </div>

      {torneos.length === 0 ? (
        <div className="sv-empty" style={{ padding: 60 }}>No hay torneos activos aún.</div>
      ) : (
        <>
          <div className="sv-selectors">
            {torneos.length > 1 && (
              <StyledSelect
                value={activeTorneo?.id || ''}
                onChange={v => setActiveTorneoId(v)}
                options={torneos.map(t => ({ value: t.id, label: t.nombre + (t.estado === 'En curso' ? ' · En curso' : '') }))}
              />
            )}
            {usaTotal && (
              <div className="sv-mode-toggle">
                <button type="button" className={`sv-mode-btn${viewMode === 'global' ? ' active' : ''}`} onClick={() => setViewMode('global')}>Tabla general</button>
                <button type="button" className={`sv-mode-btn${viewMode === 'zona' ? ' active' : ''}`} onClick={() => setViewMode('zona')}>Por zona</button>
              </div>
            )}
            {!isGlobal && zonas.length > 1 && (
              <StyledSelect
                value={activeZonaId || ''}
                onChange={v => setActiveZonaId(v)}
                options={zonas.map(z => ({ value: z.id, label: z.nombre }))}
              />
            )}
          </div>

          {zonas.length === 0 ? (
            <div className="sv-empty" style={{ padding: 52 }}>
              Este torneo está en inscripción — las posiciones aparecerán cuando se genere el fixture.
            </div>
          ) : (
            <div ref={shareRef}>
              {isMobile ? (
                <div className="sv-mobile-list">
                  {rows.length === 0 ? (
                    <div className="sv-empty" style={{ padding: 36 }}>No hay partidos jugados aún.</div>
                  ) : rows.map((row, idx) => {
                    const pos = idx + 1
                    const diff = row.setsF - row.setsC
                    const gdiff = row.gamesF - row.gamesC
                    const isTop = pos <= 2
                    const clasifica = !isGlobal || pos <= cantidadClasificados
                    return (
                      <div key={row.id}>
                        {isGlobal && pos === cantidadClasificados + 1 && (
                          <div className="sv-cutoff-line">Línea de corte — clasifican los primeros {cantidadClasificados}</div>
                        )}
                        <div className={`standings-mobile-card ${isTop && clasifica ? 'standings-mobile-card-highlight' : 'standings-mobile-card-normal'}`} style={!clasifica ? { opacity: 0.5 } : undefined}>
                          <div className="sv-mobile-card-body">
                            <div className="sv-pos-circle"
                              style={{
                                background: isTop && clasifica ? 'rgba(255,122,0,.12)' : 'rgba(255,255,255,.06)',
                                ...posStyle(pos),
                              }}>
                              {pos}
                            </div>
                            <div className="sv-mobile-name">
                              <div className="sv-mobile-p1">{row.jugador1}</div>
                              <div className="sv-mobile-p2">{row.jugador2}</div>
                              {isGlobal && <div className="sv-mobile-zona">{row.zonaNombre}</div>}
                            </div>
                            <div className="sv-mobile-pts">{row.pts}</div>
                          </div>
                          <div className="sv-mobile-stats-bar">
                            {[['PJ', row.PJ], ['PG', row.PG], ['PP', row.PP], ['S+', row.setsF], ['S-', row.setsC]].map(([label, val]) => (
                              <div key={label} className="sv-mobile-stat">
                                <div className="sv-mobile-stat-label">{label}</div>
                                <div className="sv-mobile-stat-value">{val}</div>
                              </div>
                            ))}
                            <div className="sv-mobile-stat">
                              <div className="sv-mobile-stat-label">S+/-</div>
                              <div className="sv-mobile-stat-value" style={{ color: diff >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{diff > 0 ? `+${diff}` : diff}</div>
                            </div>
                            <div className="sv-mobile-stat">
                              <div className="sv-mobile-stat-label">G+/-</div>
                              <div className="sv-mobile-stat-value" style={{ color: gdiff >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{gdiff > 0 ? `+${gdiff}` : gdiff}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="table-wrap">
                  <div className="scroll-x">
                    <div className="table-header-row">
                      {COLS.map(col => (
                        <div key={col.key} className="table-col-header"
                          style={{ flex: col.flex || 'none', width: col.width, minWidth: col.width, textAlign: col.align || 'center' }}>
                          {col.label}
                        </div>
                      ))}
                    </div>

                    {rows.length === 0 ? (
                      <div style={{ padding: 36, textAlign: 'center', color: 'rgba(255,255,255,.45)' }}>
                        No hay partidos jugados aún.
                      </div>
                    ) : rows.map((row, idx) => {
                      const pos = idx + 1
                      const diff = row.setsF - row.setsC
                      const gdiff = row.gamesF - row.gamesC
                      const isTop = pos <= 2
                      const clasifica = !isGlobal || pos <= cantidadClasificados
                      return (
                        <div key={row.id}>
                          {isGlobal && pos === cantidadClasificados + 1 && (
                            <div className="sv-cutoff-line">Línea de corte — clasifican los primeros {cantidadClasificados}</div>
                          )}
                          <div className={`table-row ${isTop && clasifica ? 'table-row-highlight' : 'table-row-normal'}`}
                            style={{ borderBottom: idx < rows.length - 1 ? '1px solid rgba(255,255,255,.035)' : 'none', opacity: clasifica ? 1 : 0.5 }}>
                            <div style={{ width: 44, minWidth: 44, textAlign: 'center', ...posStyle(pos), fontSize: 14 }}>{pos}</div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ color: 'rgba(255,255,255,.9)', fontSize: 13, fontWeight: 600 }}>{row.jugador1}</div>
                              <div style={{ color: 'rgba(255,255,255,.9)', fontSize: 13, fontWeight: 600 }}>{row.jugador2}</div>
                            </div>
                            {isGlobal && <div className="sv-desktop-stat" style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{row.zonaNombre}</div>}
                            {[row.PJ, row.PG, row.PP, row.setsF, row.setsC].map((v, i) => (
                              <div key={i} className="sv-desktop-stat">{v}</div>
                            ))}
                            <div style={{ width: 52, minWidth: 52, textAlign: 'center', color: diff >= 0 ? '#4ade80' : '#f87171', fontSize: 14, fontWeight: 600 }}>
                              {diff > 0 ? `+${diff}` : diff}
                            </div>
                            <div style={{ width: 56, minWidth: 56, textAlign: 'center', color: gdiff >= 0 ? '#4ade80' : '#f87171', fontSize: 14, fontWeight: 600 }}>
                              {gdiff > 0 ? `+${gdiff}` : gdiff}
                            </div>
                            <div className="sv-desktop-pts">{row.pts}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {rows.length > 0 && (
                <div className="sv-legend">
                  <div className="sv-legend-dot" />
                  <span className="sv-legend-text">
                    {isGlobal
                      ? `Clasifican los primeros ${cantidadClasificados} de la tabla general (sin importar la zona)`
                      : usaTotal
                        ? `Clasifican los primeros ${cantidadClasificados} de todo el torneo — mirá "Tabla general" para ver quiénes son`
                        : `Clasifican a playoffs (top ${activeTorneo?.clasificadosPorZona || 1} por zona)`}
                  </span>
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
    <AppSelect value={value} onChange={onChange} options={options} minWidth={160} />
  )
}
