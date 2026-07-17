import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import './HoyView.css'

const STATUS_CFG = {
  Finalizado:   { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
  'W.O.':       { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  Programado:   { bg: 'rgba(249,115,22,0.12)',  color: '#f97316' },
  'En juego':   { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
  Demorado:     { bg: 'rgba(234,179,8,0.12)',   color: '#eab308' },
  Reprogramado: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  _default:     { bg: 'rgba(249,115,22,0.12)',  color: '#f97316' },
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function MatchRow({ match, onClick }) {
  const fin = match.estado === 'Finalizado' || match.estado === 'W.O.'
  const live = match.estado === 'En juego'
  const aWon = fin && (match.ptsA || 0) > (match.ptsB || 0)
  const bWon = fin && (match.ptsB || 0) > (match.ptsA || 0)
  const cfg = STATUS_CFG[match.estado] || STATUS_CFG._default

  return (
    <button className="hoy-row" onClick={onClick}>
      <div className="hoy-row-time">
        {match.hora ? <span className="hoy-time-badge">{match.hora}</span> : <span className="hoy-time-tbd">S/H</span>}
      </div>

      <div className="hoy-row-main">
        <div className="hoy-row-torneo">
          <span className="hoy-torneo-dot" style={{ background: match.torneoColor || '#f97316' }} />
          {match.torneoNombre}
          <span className="hoy-row-meta-sep">·</span>
          {match.tipo === 'llave' ? match.roundName : `${match.zonaNombre} · J${match.jornada}`}
          {match.cancha && <><span className="hoy-row-meta-sep">·</span>🎾 {match.cancha}</>}
        </div>
        <div className="hoy-row-players">
          <div className="hoy-row-pair">
            <span style={{ color: aWon ? '#f1f1f5' : '#9999b0', fontWeight: aWon ? 700 : 500 }}>{match.duplaA?.jugador1} / {match.duplaA?.jugador2}</span>
          </div>
          <span className="hoy-row-vs">vs</span>
          <div className="hoy-row-pair" style={{ textAlign: 'right' }}>
            <span style={{ color: bWon ? '#f1f1f5' : '#9999b0', fontWeight: bWon ? 700 : 500 }}>{match.duplaB?.jugador1} / {match.duplaB?.jugador2}</span>
          </div>
        </div>
      </div>

      <div className="hoy-row-status">
        {fin && <span className="hoy-row-score">{match.resultado?.setsA}–{match.resultado?.setsB}</span>}
        <span className="hoy-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
          {live && <span className="hoy-live-dot" />}
          {match.estado}
        </span>
      </div>
    </button>
  )
}

export default function HoyView() {
  const { torneos, loading: loadingTorneos } = useTorneo()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [byTorneo, setByTorneo] = useState({})
  const [search, setSearch] = useState('')
  const [filterHora, setFilterHora] = useState('all')
  const unsubsRef = useRef({})

  const activeTorneos = useMemo(
    () => torneos.filter(t => t.estado === 'En curso' || t.estado === 'Llave'),
    [torneos]
  )
  const activeIds = activeTorneos.map(t => t.id).join(',')

  useEffect(() => {
    const currentIds = new Set(activeTorneos.map(t => t.id))

    for (const id of Object.keys(unsubsRef.current)) {
      if (!currentIds.has(id)) {
        unsubsRef.current[id].partidos()
        unsubsRef.current[id].llaves()
        delete unsubsRef.current[id]
        setByTorneo(prev => { const next = { ...prev }; delete next[id]; return next })
      }
    }

    for (const t of activeTorneos) {
      if (unsubsRef.current[t.id]) continue
      const entry = { partidos: [], llaves: [] }
      const update = () => setByTorneo(prev => ({ ...prev, [t.id]: { torneo: t, ...entry } }))

      const unsubP = onSnapshot(collection(db, 'torneos', t.id, 'partidos'), snap => {
        entry.partidos = snap.docs.map(d => ({ id: d.id, ...d.data(), tipo: 'grupo' }))
        update()
      })
      const unsubL = onSnapshot(collection(db, 'torneos', t.id, 'llaves'), snap => {
        entry.llaves = snap.docs
          .map(d => ({ id: d.id, ...d.data(), tipo: 'llave' }))
          .filter(l => l.estado !== 'BYE' && l.estado !== 'Pendiente' && l.duplaA && l.duplaB)
        update()
      })
      unsubsRef.current[t.id] = { partidos: unsubP, llaves: unsubL }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIds])

  useEffect(() => () => {
    Object.values(unsubsRef.current).forEach(u => { u.partidos(); u.llaves() })
  }, [])

  const partidosHoy = useMemo(() => {
    const today = todayStr()
    const all = []
    for (const { torneo, partidos, llaves } of Object.values(byTorneo)) {
      for (const p of partidos) if (p.fecha === today) all.push({ ...p, torneoId: torneo.id, torneoNombre: torneo.nombre, torneoColor: torneo.color })
      for (const l of llaves) if (l.fecha === today) all.push({ ...l, torneoId: torneo.id, torneoNombre: torneo.nombre, torneoColor: torneo.color })
    }
    return all.sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99'))
  }, [byTorneo])

  const loading = loadingTorneos || (activeTorneos.length > 0 && Object.keys(byTorneo).length < activeTorneos.length)

  const horas = useMemo(() => [...new Set(partidosHoy.map(m => m.hora).filter(Boolean))].sort(), [partidosHoy])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return partidosHoy.filter(m => {
      if (filterHora !== 'all' && m.hora !== filterHora) return false
      if (q) {
        const names = [m.duplaA?.jugador1, m.duplaA?.jugador2, m.duplaB?.jugador1, m.duplaB?.jugador2]
        if (!names.some(n => n?.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [partidosHoy, filterHora, search])

  const finCount = filtered.filter(m => m.estado === 'Finalizado' || m.estado === 'W.O.').length
  const liveCount = filtered.filter(m => m.estado === 'En juego').length
  const pendCount = filtered.filter(m => m.estado === 'Programado' || m.estado === 'Demorado' || m.estado === 'Reprogramado').length

  const dateLabel = new Date(todayStr() + 'T12:00:00')
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase())

  return (
    <div className="hoy-page" style={{ padding: isMobile ? '20px 12px' : '32px 24px' }}>
      <div className="hoy-header" style={{ marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Partidos de hoy</h1>
          <p className="hoy-subtitle">{dateLabel} · todos los torneos activos</p>
        </div>
        <div className="hoy-header-right">
          {liveCount > 0 && <span className="hoy-count-live"><span className="hoy-live-dot" />{liveCount} en vivo</span>}
          <span className="hoy-count-green">✓ {finCount}</span>
          <span className="hoy-count-orange">📅 {pendCount}</span>
        </div>
      </div>

      {!loading && partidosHoy.length > 0 && (
        <div className="hoy-filters">
          <div className="hoy-search-wrap">
            <span className="hoy-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar jugador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="hoy-search-input"
            />
            {search && <button onClick={() => setSearch('')} className="hoy-search-clear">×</button>}
          </div>
          {horas.length > 1 && (
            <div className="hoy-select-wrap">
              <select value={filterHora} onChange={e => setFilterHora(e.target.value)} className="hoy-select">
                <option value="all">Todos los horarios</option>
                {horas.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="hoy-select-arrow">▾</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : partidosHoy.length === 0 ? (
        <div className="hoy-empty">
          <div className="hoy-empty-icon">📅</div>
          <p className="hoy-empty-title">No hay partidos programados para hoy</p>
          <p className="hoy-empty-desc">Entrá a un torneo específico para ver todo su calendario.</p>
          <button className="btn-primary" style={{ marginTop: 16, padding: '10px 24px', fontSize: 13 }} onClick={() => navigate('/torneos')}>Ver torneos</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="hoy-empty">
          <div className="hoy-empty-icon">🔍</div>
          <p className="hoy-empty-title">Ningún partido coincide con el filtro</p>
        </div>
      ) : (
        <div className="hoy-list">
          {filtered.map(m => (
            <MatchRow key={`${m.torneoId}-${m.tipo}-${m.id}`} match={m} onClick={() => navigate(`/torneos/${m.torneoId}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
