import { useState, useMemo, useRef, useEffect } from 'react'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'

const PTS_LABELS = ['0', '15', '30', '40']

const ROUND_ORDER = { 'Octavos de Final': 1, 'Cuartos de Final': 2, 'Semifinal': 3, 'Final': 4 }

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
    <div style={{ marginTop: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 10, padding: '10px 14px' }}>
      {historialSets.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'center' }}>
          {historialSets.map((s, i) => (
            <span key={i} style={{ fontSize: 11, color: '#9999b0', background: '#2a2a38', borderRadius: 4, padding: '1px 6px' }}>
              {s.gA}–{s.gB}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: setsA > setsB ? '#f97316' : '#f1f1f5', lineHeight: 1 }}>{setsA}</div>
          <div style={{ fontSize: 9, color: '#6666a0', fontWeight: 600, marginTop: 1 }}>SETS</div>
          {showPoints && (
            <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800, lineHeight: 1, color: enOroDePunto ? '#f59e0b' : '#f1f1f5' }}>
              {ptLabelA}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ color: '#44445a', fontSize: 12, fontWeight: 700 }}>–</div>
          {enTiebreak ? (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.15)', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>
              TB {tbPuntosA}–{tbPuntosB}
            </span>
          ) : (
            <>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.12)', borderRadius: 3, padding: '1px 5px' }}>
                {gamesA}–{gamesB}
              </span>
              {enOroDePunto && (
                <span style={{ fontSize: 8, fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', borderRadius: 3, padding: '1px 4px', whiteSpace: 'nowrap' }}>
                  ★ ORO
                </span>
              )}
            </>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: setsB > setsA ? '#f97316' : '#f1f1f5', lineHeight: 1 }}>{setsB}</div>
          <div style={{ fontSize: 9, color: '#6666a0', fontWeight: 600, marginTop: 1 }}>SETS</div>
          {showPoints && (
            <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800, lineHeight: 1, color: enOroDePunto ? '#f59e0b' : '#f1f1f5' }}>
              {ptLabelB}
            </div>
          )}
        </div>
      </div>
      {enTiebreak && (
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 600 }}>
            {tiebreakTipo === 'supertb' ? `Super Tiebreak · primero a ${tbTarget}` : `Tiebreak · primero a ${tbTarget}`}
          </span>
        </div>
      )}
    </div>
  )
}

function MatchCard({ match }) {
  const fin = match.estado === 'Finalizado' || match.estado === 'W.O.'
  const live = match.estado === 'En juego'
  const aWon = fin && (match.ptsA || 0) > (match.ptsB || 0)
  const bWon = fin && (match.ptsB || 0) > (match.ptsA || 0)

  const statusCfg = {
    Finalizado:   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
    'W.O.':       { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
    Programado:   { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    'En juego':   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
    Demorado:     { bg: 'rgba(234,179,8,0.12)',  color: '#eab308' },
    Reprogramado: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  }[match.estado] || { bg: 'rgba(249,115,22,0.12)', color: '#f97316' }

  return (
    <div
      style={{ background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a50'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a38'}
    >
      <div style={{ padding: '8px 14px', borderBottom: '1px solid #2a2a38', background: '#16161e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>
          {match.zonaNombre} · Jornada {match.jornada}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: statusCfg.bg, color: statusCfg.color, display: 'flex', alignItems: 'center', gap: 5 }}>
          {live && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse-live 1.4s ease-in-out infinite', flexShrink: 0 }} />
          )}
          {match.estado}
        </span>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ color: aWon ? '#f1f1f5' : '#9999b0', fontSize: 13 }}>{match.duplaA?.jugador1}</div>
            <div style={{ color: aWon ? '#f1f1f5' : '#66668a', fontSize: 12 }}>{match.duplaA?.jugador2}</div>
          </div>
          {fin && (
            <span style={{ fontSize: 24, fontWeight: 800, color: aWon ? '#f97316' : '#6666a0' }}>
              {match.resultado?.setsA}
            </span>
          )}
        </div>

        <div style={{ height: 1, background: '#2a2a38', margin: '4px 0 8px', position: 'relative' }}>
          {fin && (
            <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: '#1a1a22', padding: '0 6px', color: '#44445a', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
              VS
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: bWon ? '#f1f1f5' : '#9999b0', fontSize: 13 }}>{match.duplaB?.jugador1}</div>
            <div style={{ color: bWon ? '#f1f1f5' : '#66668a', fontSize: 12 }}>{match.duplaB?.jugador2}</div>
          </div>
          {fin && (
            <span style={{ fontSize: 24, fontWeight: 800, color: bWon ? '#f97316' : '#6666a0' }}>
              {match.resultado?.setsB}
            </span>
          )}
        </div>

        {live && <LiveScore marcador={match.marcador} />}

        {!fin && !live && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {(match.fecha || match.hora || match.cancha) ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {match.fecha && (
                  <span style={{ background: 'rgba(249,115,22,0.10)', color: '#f97316', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(249,115,22,0.25)' }}>
                    📅 {new Date(match.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                {match.hora && (
                  <span style={{ background: 'rgba(96,165,250,0.10)', color: '#60a5fa', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(96,165,250,0.25)' }}>
                    🕐 {match.hora}
                  </span>
                )}
                {match.cancha && (
                  <span style={{ background: 'rgba(167,139,250,0.10)', color: '#a78bfa', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(167,139,250,0.25)' }}>
                    🎾 {match.cancha}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(249,115,22,0.25)' }}>
                📅 Por jugar
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StyledSelect({ value, onChange, options, groups }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={value}
        onChange={onChange}
        style={{ background: '#13131a', border: '1px solid #3a3a50', borderRadius: 8, color: '#f1f1f5', fontSize: 13, fontWeight: 500, padding: '8px 32px 8px 12px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
      >
        {groups
          ? groups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            ))
          : options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
        }
      </select>
      <span style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: '#f97316', fontSize: 11 }}>▾</span>
    </div>
  )
}

function LlaveMatchCard({ llave }) {
  const fin = llave.estado === 'Finalizado' || llave.estado === 'W.O.'
  const live = llave.estado === 'En juego'
  const aWon = fin && (llave.ptsA || 0) > (llave.ptsB || 0)
  const bWon = fin && (llave.ptsB || 0) > (llave.ptsA || 0)

  const statusCfg = {
    Finalizado:   { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
    'W.O.':       { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
    Programado:   { bg: 'rgba(249,115,22,0.12)',  color: '#f97316' },
    'En juego':   { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
    Demorado:     { bg: 'rgba(234,179,8,0.12)',   color: '#eab308' },
    Reprogramado: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  }[llave.estado] || { bg: 'rgba(249,115,22,0.12)', color: '#f97316' }

  return (
    <div
      style={{ background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a50'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a38'}
    >
      <div style={{ padding: '8px 14px', borderBottom: '1px solid #2a2a38', background: '#16161e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 600 }}>
          🏆 {llave.roundName}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: statusCfg.bg, color: statusCfg.color, display: 'flex', alignItems: 'center', gap: 5 }}>
          {live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse-live 1.4s ease-in-out infinite', flexShrink: 0 }} />}
          {llave.estado}
        </span>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ color: aWon ? '#f1f1f5' : '#9999b0', fontSize: 13 }}>{llave.duplaA?.jugador1 || '—'}</div>
            <div style={{ color: aWon ? '#f1f1f5' : '#66668a', fontSize: 12 }}>{llave.duplaA?.jugador2 || ''}</div>
          </div>
          {fin && (
            <span style={{ fontSize: 24, fontWeight: 800, color: aWon ? '#f97316' : '#6666a0' }}>
              {llave.resultado?.setsA ?? ''}
            </span>
          )}
        </div>

        <div style={{ height: 1, background: '#2a2a38', margin: '4px 0 8px', position: 'relative' }}>
          {fin && (
            <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: '#1a1a22', padding: '0 6px', color: '#44445a', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
              VS
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: bWon ? '#f1f1f5' : '#9999b0', fontSize: 13 }}>{llave.duplaB?.jugador1 || '—'}</div>
            <div style={{ color: bWon ? '#f1f1f5' : '#66668a', fontSize: 12 }}>{llave.duplaB?.jugador2 || ''}</div>
          </div>
          {fin && (
            <span style={{ fontSize: 24, fontWeight: 800, color: bWon ? '#f97316' : '#6666a0' }}>
              {llave.resultado?.setsB ?? ''}
            </span>
          )}
        </div>

        {live && <LiveScore marcador={llave.marcador} />}

        {!fin && !live && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            {(llave.fecha || llave.hora || llave.cancha) ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {llave.fecha && (
                  <span style={{ background: 'rgba(249,115,22,0.10)', color: '#f97316', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(249,115,22,0.25)' }}>
                    📅 {new Date(llave.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                {llave.hora && (
                  <span style={{ background: 'rgba(96,165,250,0.10)', color: '#60a5fa', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(96,165,250,0.25)' }}>
                    🕐 {llave.hora}
                  </span>
                )}
                {llave.cancha && (
                  <span style={{ background: 'rgba(167,139,250,0.10)', color: '#a78bfa', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(167,139,250,0.25)' }}>
                    🎾 {llave.cancha}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(249,115,22,0.25)' }}>
                📅 Por jugar
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MatchesView() {
  const { torneos, activeTorneo, setActiveTorneoId, zonas, partidos, llaves, loading } = useTorneo()
  const isMobile = useIsMobile()
  const shareRef = useRef(null)
  const [activeZona, setActiveZona] = useState('all')
  const [activeJornada, setActiveJornada] = useState('all')
  const [playerSearch, setPlayerSearch] = useState('')

  // Reset filters when active torneo changes
  useEffect(() => {
    setActiveZona('all')
    setActiveJornada('all')
    setPlayerSearch('')
  }, [activeTorneo?.id])

  const jornadas = useMemo(() => [...new Set(partidos.map(p => p.jornada))].sort((a, b) => a - b), [partidos])

  const isRoundFilter = activeJornada !== 'all' && ROUND_ORDER[activeJornada] != null

  const filtered = useMemo(() => {
    if (isRoundFilter) return []
    const q = playerSearch.trim().toLowerCase()
    return partidos
      .filter(p => {
        if (activeZona !== 'all' && p.zonaId !== activeZona) return false
        if (activeJornada !== 'all' && p.jornada !== Number(activeJornada)) return false
        if (q) {
          const names = [p.duplaA?.jugador1, p.duplaA?.jugador2, p.duplaB?.jugador1, p.duplaB?.jugador2]
          if (!names.some(n => n?.toLowerCase().includes(q))) return false
        }
        return true
      })
      .sort((a, b) => a.jornada - b.jornada || (a.zonaNombre || '').localeCompare(b.zonaNombre || ''))
  }, [partidos, activeZona, activeJornada, playerSearch, isRoundFilter])

  const jornadaDates = useMemo(() => {
    const map = {}
    for (const m of filtered) {
      if (m.fecha && !map[m.jornada]) map[m.jornada] = m.fecha
    }
    return map
  }, [filtered])

  const grouped = useMemo(() => {
    return filtered.reduce((acc, m) => {
      const key = `Jornada ${m.jornada}`
      ;(acc[key] = acc[key] || []).push(m)
      return acc
    }, {})
  }, [filtered])

  const allVisibleLlaves = useMemo(() =>
    llaves.filter(l => l.estado !== 'BYE' && l.estado !== 'Pendiente' && (l.duplaA || l.duplaB)),
    [llaves]
  )

  const llaveRounds = useMemo(() => {
    const rounds = [...new Set(allVisibleLlaves.map(l => l.roundName))]
    return rounds.sort((a, b) => (ROUND_ORDER[a] || 99) - (ROUND_ORDER[b] || 99))
  }, [allVisibleLlaves])

  const visibleLlaves = useMemo(() =>
    isRoundFilter
      ? allVisibleLlaves.filter(l => l.roundName === activeJornada)
      : allVisibleLlaves,
    [allVisibleLlaves, activeJornada, isRoundFilter]
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
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 24px' }}>
      <style>{`@keyframes pulse-live { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? 16 : 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Partidos y Resultados</h1>
          {activeTorneo && <p style={{ color: '#9999b0', fontSize: 14, margin: 0 }}>{activeTorneo.nombre}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {liveCount > 0 && (
            <span style={{ padding: '6px 13px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse-live 1.4s ease-in-out infinite' }} />
              {liveCount} en vivo
            </span>
          )}
          <span style={{ padding: '6px 13px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 13, fontWeight: 600 }}>✓ {finCount}</span>
          <span style={{ padding: '6px 13px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316', fontSize: 13, fontWeight: 600 }}>📅 {pendCount}</span>
          <ShareButton targetRef={shareRef} title="Partidos y Resultados" filename="partidos-villapadel" />
        </div>
      </div>

      {torneos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', color: '#9999b0' }}>No hay torneos activos.</div>
      ) : (
        <>
          {/* Selectors + player search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
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
            {(jornadas.length > 0 || llaveRounds.length > 0) && (
              <StyledSelect
                value={activeJornada}
                onChange={e => setActiveJornada(e.target.value)}
                groups={[
                  {
                    label: 'Grupos',
                    options: [
                      { value: 'all', label: 'Todas las jornadas' },
                      ...jornadas.map(j => ({ value: String(j), label: `Jornada ${j}` })),
                    ],
                  },
                  ...(llaveRounds.length > 0 ? [{
                    label: 'Llave final',
                    options: llaveRounds.map(r => ({ value: r, label: r })),
                  }] : []),
                ]}
              />
            )}
            {/* Player search */}
            <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 1 220px', minWidth: 150 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6666a0', fontSize: 13, pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                style={{ width: '100%', background: '#13131a', border: '1px solid #3a3a50', borderRadius: 8, padding: '8px 30px 8px 32px', color: '#f1f1f5', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#3a3a50'}
              />
              {playerSearch && (
                <button onClick={() => setPlayerSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
              )}
            </div>
          </div>

          <div ref={shareRef}>
            {/* Bracket matches section */}
            {visibleLlaves.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <h2 style={{ color: '#a78bfa', fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>🏆 Llave</h2>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #a78bfa44, transparent)' }} />
                </div>
                {Object.entries(groupedLlaves).sort(([a], [b]) => (ROUND_ORDER[a] || 99) - (ROUND_ORDER[b] || 99)).map(([roundName, roundMatches]) => (
                  <div key={roundName} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>{roundName}</span>
                      <div style={{ flex: 1, height: 1, background: '#2a2a38' }} />
                      <span style={{ color: '#9999b0', fontSize: 12 }}>{roundMatches.length} partidos</span>
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

            {/* Group matches section */}
            {filtered.length === 0 && visibleLlaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', color: '#9999b0' }}>
                {partidos.length === 0 ? 'No hay partidos para mostrar.' : 'Ningún partido coincide con la búsqueda.'}
              </div>
            ) : (
              Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([jornada, matches]) => {
                const jornadaNum = matches[0]?.jornada
                const fecha = jornadaDates[jornadaNum]
                const dateLabel = fecha
                  ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())
                  : null
                return (
                  <div key={jornada} style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div>
                        <h2 style={{ color: '#f1f1f5', fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{dateLabel || jornada}</h2>
                        {dateLabel && <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>{jornada}</span>}
                      </div>
                      <div style={{ flex: 1, height: 1, background: '#2a2a38' }} />
                      <span style={{ color: '#9999b0', fontSize: 12 }}>{matches.length} partidos</span>
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
