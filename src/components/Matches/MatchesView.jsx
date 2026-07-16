import { useState, useMemo, useRef, useEffect } from 'react'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'
import './MatchesView.css'

const PTS_LABELS = ['0', '15', '30', '40']
const ROUND_ORDER = { 'Octavos de Final': 1, 'Cuartos de Final': 2, 'Semifinal': 3, 'Final': 4 }

const STATUS_CFG = {
  Finalizado:   { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
  'W.O.':       { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  Programado:   { bg: 'rgba(249,115,22,0.12)',  color: '#f97316' },
  'En juego':   { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
  Demorado:     { bg: 'rgba(234,179,8,0.12)',   color: '#eab308' },
  Reprogramado: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  _default:     { bg: 'rgba(249,115,22,0.12)',  color: '#f97316' },
}

function LiveScore({ marcador }) {
  if (!marcador) return null
  const {
    setsA = 0, setsB = 0, historialSets = [],
    gamesA = 0, gamesB = 0,
    puntosA = 0, puntosB = 0, enOroDePunto = false,
    enTiebreak, tbPuntosA = 0, tbPuntosB = 0, tiebreakTipo,
  } = marcador
  const tbTarget = tiebreakTipo === 'supertb' ? 11 : 7
  const showPoints = !enTiebreak && (puntosA > 0 || puntosB > 0 || enOroDePunto)
  const ptLabelA = enOroDePunto ? 'ORO' : PTS_LABELS[puntosA]
  const ptLabelB = enOroDePunto ? 'ORO' : PTS_LABELS[puntosB]

  return (
    <div className="mv-live-score">
      {historialSets.length > 0 && (
        <div className="mv-set-history">
          {historialSets.map((s, i) => (
            <span key={i} className="mv-set-chip">{s.gA}–{s.gB}</span>
          ))}
        </div>
      )}
      <div className="mv-score-grid">
        <div className="mv-score-side">
          <div className="mv-sets-num" style={{ color: setsA > setsB ? '#f97316' : '#f1f1f5' }}>{setsA}</div>
          <div className="mv-sets-label">SETS</div>
          {showPoints && <div className="mv-pts-label" style={{ color: enOroDePunto ? '#f59e0b' : '#f1f1f5' }}>{ptLabelA}</div>}
        </div>
        <div className="mv-score-center">
          <div className="mv-score-dash">–</div>
          {enTiebreak ? (
            <span className="mv-tb-badge">TB {tbPuntosA}–{tbPuntosB}</span>
          ) : (
            <>
              <span className="mv-games-badge">{gamesA}–{gamesB}</span>
              {enOroDePunto && <span className="mv-gold-badge">★ ORO</span>}
            </>
          )}
        </div>
        <div className="mv-score-side">
          <div className="mv-sets-num" style={{ color: setsB > setsA ? '#f97316' : '#f1f1f5' }}>{setsB}</div>
          <div className="mv-sets-label">SETS</div>
          {showPoints && <div className="mv-pts-label" style={{ color: enOroDePunto ? '#f59e0b' : '#f1f1f5' }}>{ptLabelB}</div>}
        </div>
      </div>
      {enTiebreak && (
        <div className="mv-tb-footer">
          {tiebreakTipo === 'supertb' ? `Super Tiebreak · primero a ${tbTarget}` : `Tiebreak · primero a ${tbTarget}`}
        </div>
      )}
    </div>
  )
}

function ScheduleChips({ match }) {
  if (!match.fecha && !match.hora && !match.cancha) {
    return (
      <div className="mv-schedule-wrap">
        <span className="mv-chip-orange-lg">📅 Por jugar</span>
      </div>
    )
  }
  return (
    <div className="mv-schedule-wrap">
      <div className="mv-chips">
        {match.fecha && (
          <span className="mv-chip-orange">
            📅 {new Date(match.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {match.hora && <span className="mv-chip-blue">🕐 {match.hora}</span>}
        {match.cancha && <span className="mv-chip-purple">🎾 {match.cancha}</span>}
      </div>
    </div>
  )
}

function CardBody({ duplaA, duplaB, fin, live, aWon, bWon, resultado, marcador }) {
  return (
    <div className="mv-card-body">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ color: aWon ? '#f1f1f5' : '#9999b0', fontSize: 13 }}>{duplaA?.jugador1}</div>
          <div style={{ color: aWon ? '#f1f1f5' : '#9999b0', fontSize: 13 }}>{duplaA?.jugador2}</div>
        </div>
        {fin && <span className="mv-score-num" style={{ color: aWon ? '#f97316' : '#6666a0' }}>{resultado?.setsA}</span>}
      </div>
      <div className="mv-divider-wrap">
        {fin && <span className="mv-vs">VS</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: bWon ? '#f1f1f5' : '#9999b0', fontSize: 13 }}>{duplaB?.jugador1}</div>
          <div style={{ color: bWon ? '#f1f1f5' : '#9999b0', fontSize: 13 }}>{duplaB?.jugador2}</div>
        </div>
        {fin && <span className="mv-score-num" style={{ color: bWon ? '#f97316' : '#6666a0' }}>{resultado?.setsB}</span>}
      </div>
      {live && <LiveScore marcador={marcador} />}
    </div>
  )
}

function MatchCard({ match }) {
  const fin = match.estado === 'Finalizado' || match.estado === 'W.O.'
  const live = match.estado === 'En juego'
  const aWon = fin && (match.ptsA || 0) > (match.ptsB || 0)
  const bWon = fin && (match.ptsB || 0) > (match.ptsA || 0)
  const statusCfg = STATUS_CFG[match.estado] || STATUS_CFG._default

  return (
    <div className="mv-card">
      <div className="mv-card-header">
        <span className="mv-card-meta">{match.zonaNombre} · Jornada {match.jornada}</span>
        <span className="mv-card-status" style={{ background: statusCfg.bg, color: statusCfg.color }}>
          {live && <span className="mv-live-dot" />}
          {match.estado}
        </span>
      </div>
      <CardBody duplaA={match.duplaA} duplaB={match.duplaB} fin={fin} live={live} aWon={aWon} bWon={bWon} resultado={match.resultado} marcador={match.marcador} />
      {!fin && !live && <ScheduleChips match={match} />}
    </div>
  )
}

function LlaveMatchCard({ llave }) {
  const fin = llave.estado === 'Finalizado' || llave.estado === 'W.O.'
  const live = llave.estado === 'En juego'
  const aWon = fin && (llave.ptsA || 0) > (llave.ptsB || 0)
  const bWon = fin && (llave.ptsB || 0) > (llave.ptsA || 0)
  const statusCfg = STATUS_CFG[llave.estado] || STATUS_CFG._default

  return (
    <div className="mv-card">
      <div className="mv-card-header">
        <span className="mv-card-meta-purple">🏆 {llave.roundName}</span>
        <span className="mv-card-status" style={{ background: statusCfg.bg, color: statusCfg.color }}>
          {live && <span className="mv-live-dot" />}
          {llave.estado}
        </span>
      </div>
      <CardBody duplaA={llave.duplaA} duplaB={llave.duplaB} fin={fin} live={live} aWon={aWon} bWon={bWon} resultado={llave.resultado} marcador={llave.marcador} />
      {!fin && !live && <ScheduleChips match={llave} />}
    </div>
  )
}

function StyledSelect({ value, onChange, options, groups }) {
  return (
    <div className="mv-select-wrap">
      <select value={value} onChange={onChange} className="mv-select">
        {groups
          ? groups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            ))
          : options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
        }
      </select>
      <span className="mv-select-arrow">▾</span>
    </div>
  )
}

export default function MatchesView() {
  const { torneos, activeTorneo, setActiveTorneoId, zonas, partidos, llaves, loading } = useTorneo()
  const isMobile = useIsMobile()
  const shareRef = useRef(null)
  const [activeZona, setActiveZona] = useState('all')
  const [activeFecha, setActiveFecha] = useState('all')
  const [playerSearch, setPlayerSearch] = useState('')

  useEffect(() => {
    setActiveZona('all')
    setActiveFecha('all')
    setPlayerSearch('')
  }, [activeTorneo?.id])

  const fechas = useMemo(() => [...new Set(partidos.map(p => p.fecha).filter(Boolean))].sort(), [partidos])
  const hasSinFecha = useMemo(() => partidos.some(p => !p.fecha), [partidos])
  const isRoundFilter = activeFecha !== 'all' && ROUND_ORDER[activeFecha] != null

  const filtered = useMemo(() => {
    if (isRoundFilter) return []
    const q = playerSearch.trim().toLowerCase()
    return partidos
      .filter(p => {
        if (activeZona !== 'all' && p.zonaId !== activeZona) return false
        if (activeFecha === 'sin-fecha' && p.fecha) return false
        if (activeFecha !== 'all' && activeFecha !== 'sin-fecha' && p.fecha !== activeFecha) return false
        if (q) {
          const names = [p.duplaA?.jugador1, p.duplaA?.jugador2, p.duplaB?.jugador1, p.duplaB?.jugador2]
          if (!names.some(n => n?.toLowerCase().includes(q))) return false
        }
        return true
      })
      .sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || a.jornada - b.jornada || (a.zonaNombre || '').localeCompare(b.zonaNombre || ''))
  }, [partidos, activeZona, activeFecha, playerSearch, isRoundFilter])

  const grouped = useMemo(() => filtered.reduce((acc, m) => {
    const key = m.fecha || 'sin-fecha'
    ;(acc[key] = acc[key] || []).push(m)
    return acc
  }, {}), [filtered])

  const allVisibleLlaves = useMemo(() =>
    llaves.filter(l => l.estado !== 'BYE' && l.estado !== 'Pendiente' && (l.duplaA || l.duplaB)),
    [llaves]
  )

  const llaveRounds = useMemo(() => {
    const rounds = [...new Set(allVisibleLlaves.map(l => l.roundName))]
    return rounds.sort((a, b) => (ROUND_ORDER[a] || 99) - (ROUND_ORDER[b] || 99))
  }, [allVisibleLlaves])

  const visibleLlaves = useMemo(() =>
    isRoundFilter ? allVisibleLlaves.filter(l => l.roundName === activeFecha) : allVisibleLlaves,
    [allVisibleLlaves, activeFecha, isRoundFilter]
  )

  const groupedLlaves = useMemo(() =>
    visibleLlaves.reduce((acc, l) => {
      (acc[l.roundName] = acc[l.roundName] || []).push(l)
      return acc
    }, {}),
    [visibleLlaves]
  )

  const finCount = filtered.filter(m => m.estado === 'Finalizado' || m.estado === 'W.O.').length
  const pendCount = filtered.filter(m => m.estado === 'Programado').length
  const liveCount = filtered.filter(m => m.estado === 'En juego').length

  if (loading) return <Spinner />

  return (
    <div className="mv-page" style={{ padding: isMobile ? '20px 12px' : '32px 24px' }}>
      <style>{`@keyframes pulse-live { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }`}</style>

      <div className="mv-header" style={{ marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Partidos y Resultados</h1>
          {activeTorneo && <p className="mv-subtitle">{activeTorneo.nombre}</p>}
        </div>
        <div className="mv-header-right">
          {liveCount > 0 && (
            <span className="mv-live-badge">
              <span className="mv-live-dot" />
              {liveCount} en vivo
            </span>
          )}
          <span className="mv-count-green">✓ {finCount}</span>
          <span className="mv-count-orange">📅 {pendCount}</span>
          <ShareButton targetRef={shareRef} title="Partidos y Resultados" filename="partidos-villapadel" />
        </div>
      </div>

      {torneos.length === 0 ? (
        <div className="mv-empty">No hay torneos activos.</div>
      ) : (
        <>
          <div className="mv-filters">
            {torneos.length > 1 && (
              <StyledSelect
                value={activeTorneo?.id || ''}
                onChange={e => setActiveTorneoId(e.target.value)}
                options={torneos.map(t => ({ value: t.id, label: t.nombre + (t.estado === 'En curso' ? ' · En curso' : '') }))}
              />
            )}
            {zonas.length > 0 && (
              <StyledSelect
                value={activeZona}
                onChange={e => setActiveZona(e.target.value)}
                options={[{ value: 'all', label: 'Todas las zonas' }, ...zonas.map(z => ({ value: z.id, label: z.nombre }))]}
              />
            )}
            {(fechas.length > 0 || llaveRounds.length > 0) && (
              <StyledSelect
                value={activeFecha}
                onChange={e => setActiveFecha(e.target.value)}
                groups={[
                  {
                    label: 'Fechas',
                    options: [
                      { value: 'all', label: 'Todas las fechas' },
                      ...fechas.map(f => ({
                        value: f,
                        label: new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/^\w/, c => c.toUpperCase()),
                      })),
                      ...(hasSinFecha ? [{ value: 'sin-fecha', label: 'Sin fecha' }] : []),
                    ],
                  },
                  ...(llaveRounds.length > 0 ? [{
                    label: 'Llave final',
                    options: llaveRounds.map(r => ({ value: r, label: r })),
                  }] : []),
                ]}
              />
            )}
            <div className="mv-search-wrap" style={{ flex: isMobile ? '1 1 100%' : '0 1 220px', minWidth: 150 }}>
              <span className="mv-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                className="mv-search-input"
              />
              {playerSearch && (
                <button onClick={() => setPlayerSearch('')} className="mv-search-clear">×</button>
              )}
            </div>
          </div>

          <div ref={shareRef}>
            {visibleLlaves.length > 0 && (
              <div className="mv-bracket-section">
                <div className="mv-section-header">
                  <h2 className="mv-section-title">🏆 Llave</h2>
                  <div className="mv-section-line" />
                </div>
                {Object.entries(groupedLlaves).sort(([a], [b]) => (ROUND_ORDER[a] || 99) - (ROUND_ORDER[b] || 99)).map(([roundName, roundMatches]) => (
                  <div key={roundName} className="mv-round-section">
                    <div className="mv-round-header">
                      <span className="mv-round-name">{roundName}</span>
                      <div className="mv-round-divider" />
                      <span className="mv-round-count">{roundMatches.length} partidos</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                      {roundMatches.sort((a, b) => a.matchIndex - b.matchIndex).map(l => (
                        <LlaveMatchCard key={l.id} llave={l} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filtered.length === 0 && visibleLlaves.length === 0 ? (
              <div className="mv-empty">
                {partidos.length === 0 ? 'No hay partidos para mostrar.' : 'Ningún partido coincide con la búsqueda.'}
              </div>
            ) : (
              Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, matches]) => {
                const dateLabel = fecha !== 'sin-fecha'
                  ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())
                  : 'Sin fecha asignada'
                return (
                  <div key={fecha} className="mv-jornada-section">
                    <div className="mv-jornada-header">
                      <h2 className="mv-jornada-title">{dateLabel}</h2>
                      <div className="mv-jornada-divider" />
                      <span className="mv-jornada-count">{matches.length} partidos</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                      {matches.map(m => <MatchCard key={m.id} match={m} />)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
