import { useState, useEffect, useMemo, useRef } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { updateHorario, saveResultado, updateEstado, updateLlaveEstado, updateMarcador, updateLlaveMarcador, generateBracket, saveLlaveResultado } from '../../firebase/torneoService'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'

const STATUS_CFG = {
  Finalizado:   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  'W.O.':       { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  Programado:   { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
  'En juego':   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  Demorado:     { bg: 'rgba(234,179,8,0.12)',  color: '#eab308' },
  Reprogramado: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  BYE:          { bg: 'rgba(100,100,160,0.12)', color: '#6666a0' },
  Pendiente:    { bg: 'rgba(100,100,160,0.12)', color: '#6666a0' },
}

const PTS_DISPLAY = ['0', '15', '30', '40']

// ─── Padel set logic ──────────────────────────────────────────────────────────
function checkSetWinner(gA, gB) {
  if (gA >= 6 && gB <= 4 && gA - gB >= 2) return 'A'
  if (gB >= 6 && gA <= 4 && gB - gA >= 2) return 'B'
  if (gA === 7 && gB === 5) return 'A'
  if (gB === 7 && gA === 5) return 'B'
  return null
}

function needsTiebreak(gA, gB) {
  return gA === 6 && gB === 6
}

function checkTBWinner(tbA, tbB, tipo) {
  const target = tipo === 'supertb' ? 11 : 7
  if (tbA >= target && tbA - tbB >= 2) return 'A'
  if (tbB >= target && tbB - tbA >= 2) return 'B'
  return null
}

const defaultMarcador = () => ({
  setsA: 0, setsB: 0, historialSets: [],
  gamesA: 0, gamesB: 0,
  puntosA: 0, puntosB: 0, enOroDePunto: false,
  enTiebreak: false, tiebreakTipo: 'tiebreak',
  tbPuntosA: 0, tbPuntosB: 0,
})

// ─── Live score panel ─────────────────────────────────────────────────────────
// allowThirdSet=false → zone matches: 1-1 sets triggers super tiebreak instead of 3rd set
// allowThirdSet=true  → bracket SF/Final: full 3 sets
function LiveScorePanel({ match, torneoId, onUpdated, allowThirdSet = false, saveFn, persistFn }) {
  const [m, setM] = useState(() => match.marcador ? { ...defaultMarcador(), ...match.marcador } : defaultMarcador())
  const [finishing, setFinishing] = useState(false)

  const matchDone = m.setsA >= 2 || m.setsB >= 2

  async function persist(newM) {
    setM(newM)
    try {
      await (persistFn ? persistFn(newM) : updateMarcador(torneoId, match.id, newM))
      onUpdated({ ...match, marcador: newM })
    } catch (err) {
      console.error('Error guardando marcador:', err)
    }
  }

  // ── Game resolution: auto-called when a game is won via points ──────────────
  function resolveGame(team, newM) {
    newM.puntosA = 0; newM.puntosB = 0; newM.enOroDePunto = false
    if (team === 'A') newM.gamesA += 1
    else newM.gamesB += 1

    if (needsTiebreak(newM.gamesA, newM.gamesB)) {
      newM.enTiebreak = true
      newM.tbPuntosA = 0; newM.tbPuntosB = 0
    } else {
      const winner = checkSetWinner(newM.gamesA, newM.gamesB)
      if (winner) {
        newM.historialSets = [...newM.historialSets, { gA: newM.gamesA, gB: newM.gamesB }]
        if (winner === 'A') newM.setsA += 1
        else newM.setsB += 1
        newM.gamesA = 0; newM.gamesB = 0
        newM.enTiebreak = false; newM.tbPuntosA = 0; newM.tbPuntosB = 0
        if (!allowThirdSet && newM.setsA === 1 && newM.setsB === 1) {
          newM.enTiebreak = true
          newM.tiebreakTipo = 'supertb'
        }
      }
    }
  }

  // ── Point tracking (0/15/30/40 + Golden Point) ─────────────────────────────
  function addPoint(team) {
    if (m.enTiebreak || matchDone) return
    const newM = { ...m }

    if (m.enOroDePunto) {
      resolveGame(team, newM)
      return persist(newM)
    }

    if (team === 'A') newM.puntosA = m.puntosA + 1
    else newM.puntosB = m.puntosB + 1

    if (newM.puntosA === 3 && newM.puntosB === 3) {
      newM.enOroDePunto = true
    } else if (newM.puntosA >= 4) {
      resolveGame('A', newM)
    } else if (newM.puntosB >= 4) {
      resolveGame('B', newM)
    }

    persist(newM)
  }

  function removePoint(team) {
    if (m.enTiebreak || matchDone) return
    const newM = { ...m }
    if (m.enOroDePunto) {
      newM.enOroDePunto = false
      return persist(newM)
    }
    if (team === 'A') newM.puntosA = Math.max(0, m.puntosA - 1)
    else newM.puntosB = Math.max(0, m.puntosB - 1)
    persist(newM)
  }

  // ── Manual game adjustment (for corrections) ────────────────────────────────
  function addGame(team) {
    if (m.enTiebreak || matchDone) return
    const newM = { ...m }
    resolveGame(team, newM)
    persist(newM)
  }

  function removeGame(team) {
    if (m.enTiebreak || matchDone) return
    const newM = { ...m, puntosA: 0, puntosB: 0, enOroDePunto: false }
    if (team === 'A') newM.gamesA = Math.max(0, m.gamesA - 1)
    else newM.gamesB = Math.max(0, m.gamesB - 1)
    persist(newM)
  }

  // ── Tiebreak points ─────────────────────────────────────────────────────────
  function addTBPoint(team) {
    const newM = { ...m }
    if (team === 'A') newM.tbPuntosA = m.tbPuntosA + 1
    else newM.tbPuntosB = m.tbPuntosB + 1

    const winner = checkTBWinner(newM.tbPuntosA, newM.tbPuntosB, m.tiebreakTipo)
    if (winner) {
      const gA = winner === 'A' ? 7 : 6
      const gB = winner === 'A' ? 6 : 7
      newM.historialSets = [...m.historialSets, { gA, gB }]
      if (winner === 'A') newM.setsA = m.setsA + 1
      else newM.setsB = m.setsB + 1
      newM.gamesA = 0; newM.gamesB = 0
      newM.enTiebreak = false; newM.tbPuntosA = 0; newM.tbPuntosB = 0
      if (!allowThirdSet && newM.setsA === 1 && newM.setsB === 1) {
        newM.enTiebreak = true
        newM.tiebreakTipo = 'supertb'
        newM.tbPuntosA = 0; newM.tbPuntosB = 0
      }
    }
    persist(newM)
  }

  function removeTBPoint(team) {
    const newM = { ...m }
    if (team === 'A') newM.tbPuntosA = Math.max(0, m.tbPuntosA - 1)
    else newM.tbPuntosB = Math.max(0, m.tbPuntosB - 1)
    persist(newM)
  }

  function undoLastSet() {
    if (m.historialSets.length === 0) return
    const newM = { ...m }
    const last = m.historialSets[m.historialSets.length - 1]
    newM.historialSets = m.historialSets.slice(0, -1)
    if (last.gA > last.gB) newM.setsA = Math.max(0, m.setsA - 1)
    else newM.setsB = Math.max(0, m.setsB - 1)
    newM.gamesA = last.gA; newM.gamesB = last.gB
    newM.puntosA = 0; newM.puntosB = 0; newM.enOroDePunto = false
    newM.enTiebreak = false; newM.tbPuntosA = 0; newM.tbPuntosB = 0
    persist(newM)
  }

  function resetCurrentSet() {
    persist({ ...m, gamesA: 0, gamesB: 0, puntosA: 0, puntosB: 0, enOroDePunto: false, enTiebreak: false, tbPuntosA: 0, tbPuntosB: 0 })
  }

  function toggleTBType() {
    persist({ ...m, tiebreakTipo: m.tiebreakTipo === 'tiebreak' ? 'supertb' : 'tiebreak' })
  }

  async function finalize() {
    setFinishing(true)
    const totalGamesA = m.historialSets.reduce((s, set) => s + set.gA, 0)
    const totalGamesB = m.historialSets.reduce((s, set) => s + set.gB, 0)
    try {
      const resultData = { setsA: m.setsA, setsB: m.setsB, gamesA: totalGamesA, gamesB: totalGamesB, wo: false }
      await (saveFn ? saveFn(resultData) : saveResultado(torneoId, match.id, resultData))
      const ptsA = m.setsA > m.setsB ? 2 : 1
      const ptsB = m.setsA > m.setsB ? 1 : 2
      onUpdated({ ...match, estado: 'Finalizado', resultado: { setsA: m.setsA, setsB: m.setsB, gamesA: totalGamesA, gamesB: totalGamesB }, ptsA, ptsB, marcador: m })
    } catch (err) {
      alert('Error al finalizar partido: ' + (err.message || 'Error. Revisá la conexión.'))
    }
    setFinishing(false)
  }

  const btnStyle = (color = '#f97316') => ({
    width: 34, height: 34, borderRadius: 8, border: `1px solid ${color}44`,
    background: `${color}18`, color, fontSize: 18, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.1s', flexShrink: 0,
  })
  const smBtn = (color = '#6666a0') => ({
    width: 22, height: 22, borderRadius: 5, border: `1px solid ${color}55`,
    background: `${color}15`, color, fontSize: 12, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  })

  const setDisplay = m.historialSets.map((s, i) => (
    <span key={i} style={{ color: '#9999b0', fontSize: 11, background: '#2a2a38', borderRadius: 4, padding: '1px 6px' }}>
      {s.gA}–{s.gB}
    </span>
  ))

  return (
    <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: 16, marginBottom: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
          {!allowThirdSet && m.enTiebreak && m.tiebreakTipo === 'supertb' && m.setsA === 1 && m.setsB === 1
            ? 'MARCADOR EN VIVO · SUPER TIEBREAK'
            : `MARCADOR EN VIVO · Set ${m.historialSets.length + (matchDone ? 0 : 1)}`}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {setDisplay}
          {m.historialSets.length > 0 && !matchDone && (
            <button onClick={undoLastSet} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
              ↩ Set
            </button>
          )}
        </div>
      </div>

      {/* Sets won */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#f1f1f5', fontSize: 12, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.duplaA?.jugador1}
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: m.setsA > m.setsB ? '#f97316' : '#f1f1f5', lineHeight: 1 }}>{m.setsA}</div>
          <div style={{ color: '#9999b0', fontSize: 10, marginTop: 2 }}>sets</div>
        </div>
        <div style={{ color: '#44445a', fontWeight: 700, fontSize: 14 }}>VS</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#f1f1f5', fontSize: 12, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.duplaB?.jugador1}
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: m.setsB > m.setsA ? '#f97316' : '#f1f1f5', lineHeight: 1 }}>{m.setsB}</div>
          <div style={{ color: '#9999b0', fontSize: 10, marginTop: 2 }}>sets</div>
        </div>
      </div>

      {!matchDone && (
        <>
          {m.enTiebreak ? (
            // ── Tiebreak ──────────────────────────────────────────────────────
            <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700 }}>
                  {m.tiebreakTipo === 'supertb' ? 'SUPER TIEBREAK · 11 pts' : 'TIEBREAK · 7 pts'}
                </span>
                {(allowThirdSet || !(m.setsA === 1 && m.setsB === 1)) && (
                  <button onClick={toggleTBType} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                    Cambiar a {m.tiebreakTipo === 'supertb' ? 'TB' : 'Super TB'}
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <button style={btnStyle('#ef4444')} onClick={() => removeTBPoint('A')}>−</button>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#f1f1f5', minWidth: 32, textAlign: 'center' }}>{m.tbPuntosA}</span>
                  <button style={btnStyle('#22c55e')} onClick={() => addTBPoint('A')}>+</button>
                </div>
                <div style={{ color: '#44445a', fontSize: 12, fontWeight: 700 }}>pts</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <button style={btnStyle('#ef4444')} onClick={() => removeTBPoint('B')}>−</button>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#f1f1f5', minWidth: 32, textAlign: 'center' }}>{m.tbPuntosB}</span>
                  <button style={btnStyle('#22c55e')} onClick={() => addTBPoint('B')}>+</button>
                </div>
              </div>
            </div>
          ) : (
            // ── Game score + point tracking ────────────────────────────────────
            <div style={{ background: '#1a1a22', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#9999b0', fontSize: 11, fontWeight: 600 }}>
                  GAMES: {m.gamesA} – {m.gamesB}
                </span>
                <button onClick={resetCurrentSet} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', color: '#eab308', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                  ↺ Reset set
                </button>
              </div>

              {m.enOroDePunto && (
                <div style={{ textAlign: 'center', marginBottom: 8, padding: '5px 0', background: 'rgba(245,158,11,0.1)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.25)' }}>
                  <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 800 }}>⭐ PUNTO DE ORO</span>
                </div>
              )}

              {/* Points within current game */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <button style={btnStyle('#ef4444')} onClick={() => removePoint('A')}>−</button>
                  <span style={{ fontSize: 28, fontWeight: 800, color: m.enOroDePunto ? '#f59e0b' : '#f1f1f5', minWidth: 36, textAlign: 'center' }}>
                    {m.enOroDePunto ? '★' : PTS_DISPLAY[m.puntosA]}
                  </span>
                  <button style={btnStyle('#22c55e')} onClick={() => addPoint('A')}>+</button>
                </div>
                <div style={{ color: '#44445a', fontSize: 14, fontWeight: 700 }}>–</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <button style={btnStyle('#ef4444')} onClick={() => removePoint('B')}>−</button>
                  <span style={{ fontSize: 28, fontWeight: 800, color: m.enOroDePunto ? '#f59e0b' : '#f1f1f5', minWidth: 36, textAlign: 'center' }}>
                    {m.enOroDePunto ? '★' : PTS_DISPLAY[m.puntosB]}
                  </span>
                  <button style={btnStyle('#22c55e')} onClick={() => addPoint('B')}>+</button>
                </div>
              </div>

              {/* Manual game correction */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #20202c' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button style={smBtn('#ef4444')} onClick={() => removeGame('A')}>−</button>
                  <span style={{ color: '#44445a', fontSize: 10, fontWeight: 600 }}>Game A</span>
                  <button style={smBtn('#22c55e')} onClick={() => addGame('A')}>+</button>
                </div>
                <span style={{ color: '#44445a', fontSize: 10 }}>ajuste manual</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button style={smBtn('#ef4444')} onClick={() => removeGame('B')}>−</button>
                  <span style={{ color: '#44445a', fontSize: 10, fontWeight: 600 }}>Game B</span>
                  <button style={smBtn('#22c55e')} onClick={() => addGame('B')}>+</button>
                </div>
              </div>

              {m.gamesA === 5 && m.gamesB === 5 && (
                <p style={{ color: '#eab308', fontSize: 11, textAlign: 'center', margin: '8px 0 0', fontWeight: 600 }}>5-5 → se extiende a 7</p>
              )}
            </div>
          )}
        </>
      )}

      {matchDone && (
        <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
            ¡Partido terminado! · {m.setsA > m.setsB ? match.duplaA?.jugador1 : match.duplaB?.jugador1} gana
          </div>
          <button
            onClick={finalize}
            disabled={finishing}
            style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: finishing ? 'wait' : 'pointer', opacity: finishing ? 0.7 : 1 }}
          >
            {finishing ? 'Guardando...' : '✓ Finalizar partido'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Match row (zone matches) ─────────────────────────────────────────────────
function MatchRow({ match, torneoId, onUpdated, open, onToggle }) {
  const [tab, setTab] = useState('horario')
  const [horario, setHorario] = useState({ fecha: match.fecha || '', hora: match.hora || '', cancha: match.cancha || '' })
  const [res, setRes] = useState({ setsA: match.resultado?.setsA ?? '', setsB: match.resultado?.setsB ?? '', gamesA: match.resultado?.gamesA ?? '', gamesB: match.resultado?.gamesB ?? '', wo: false })
  const [saving, setSaving] = useState(false)
  const [savingEstado, setSavingEstado] = useState(false)
  const [msg, setMsg] = useState('')
  const isCardView = useIsMobile(720)

  const cfg = STATUS_CFG[match.estado] || STATUS_CFG.Programado

  async function handleEstado(newEstado) {
    if (newEstado === match.estado) return
    if (newEstado === 'Finalizado' && !match.resultado) {
      setMsg('⚠️ Ingresá el resultado antes de marcar como Finalizado.')
      setTab('resultado')
      return
    }
    setSavingEstado(true)
    try {
      await updateEstado(torneoId, match.id, newEstado)
      onUpdated({ ...match, estado: newEstado })
    } catch (err) {
      setMsg('Error al cambiar estado: ' + (err.message || 'Error'))
    }
    setSavingEstado(false)
  }

  async function saveHorario() {
    setSaving(true)
    await updateHorario(torneoId, match.id, horario)
    setSaving(false)
    setMsg('Horario guardado')
    setTimeout(() => setMsg(''), 2000)
    onUpdated({ ...match, ...horario })
  }

  async function saveRes() {
    const { setsA, setsB, gamesA, gamesB, wo } = res
    if (setsA === '' || setsB === '') { setMsg('Ingresá los sets.'); setTimeout(() => setMsg(''), 2000); return }
    setSaving(true)
    try {
      await saveResultado(torneoId, match.id, { setsA: Number(setsA), setsB: Number(setsB), gamesA: Number(gamesA) || 0, gamesB: Number(gamesB) || 0, wo })
      setMsg('Resultado guardado')
      setTimeout(() => setMsg(''), 2000)
      const ptsA = Number(setsA) > Number(setsB) ? 2 : (wo ? 0 : 1)
      const ptsB = Number(setsA) > Number(setsB) ? (wo ? 0 : 1) : 2
      onUpdated({ ...match, resultado: { setsA: Number(setsA), setsB: Number(setsB), gamesA: Number(gamesA) || 0, gamesB: Number(gamesB) || 0 }, ptsA, ptsB, estado: wo ? 'W.O.' : 'Finalizado' })
    } catch (err) {
      setMsg('Error al guardar: ' + (err.message || 'Error'))
      setTimeout(() => setMsg(''), 4000)
    }
    setSaving(false)
  }

  const inp = { background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6, padding: '6px 10px', color: '#f1f1f5', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const numInp = { ...inp, width: 70, textAlign: 'center' }
  const tabStyle = (active) => ({
    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
    color: active ? '#f97316' : '#9999b0',
  })

  return (
    <div style={{ borderBottom: '1px solid #20202c' }}>
      {isCardView ? (
        /* Mobile card header */
        <div
          style={{ padding: '10px 14px', cursor: 'pointer', transition: 'background 0.12s' }}
          onClick={onToggle}
          onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#6666a0', fontSize: 11 }}>{match.zonaNombre}</span>
              <span style={{ color: '#6666a0', fontSize: 11 }}>J{match.jornada}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600 }}>{match.estado}</span>
              <span style={{ color: '#44445a', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.duplaA?.jugador1}</div>
              <div style={{ color: '#9999b0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.duplaA?.jugador2}</div>
            </div>
            <span style={{ color: match.resultado ? '#f97316' : '#44445a', fontWeight: 700, fontSize: match.resultado ? 15 : 13, flexShrink: 0 }}>
              {match.resultado ? `${match.resultado.setsA}–${match.resultado.setsB}` : 'vs'}
            </span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
              <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.duplaB?.jugador1}</div>
              <div style={{ color: '#9999b0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.duplaB?.jugador2}</div>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop row */
        <div
          style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 1fr 100px 80px', alignItems: 'center', padding: '0 16px', height: 54, gap: 12, cursor: 'pointer', transition: 'background 0.12s' }}
          onClick={onToggle}
          onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ color: '#9999b0', fontSize: 12 }}>Zona {match.zonaNombre?.replace('Zona ', '')}</div>
          <div style={{ color: '#9999b0', fontSize: 12 }}>J{match.jornada}</div>
          <div>
            <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600 }}>{match.duplaA?.jugador1}</div>
            <div style={{ color: '#9999b0', fontSize: 11 }}>{match.duplaA?.jugador2}</div>
          </div>
          <div>
            <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600 }}>{match.duplaB?.jugador1}</div>
            <div style={{ color: '#9999b0', fontSize: 11 }}>{match.duplaB?.jugador2}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600 }}>{match.estado}</span>
            {match.resultado && <span style={{ color: '#f97316', fontSize: 13, fontWeight: 700 }}>{match.resultado.setsA}–{match.resultado.setsB}</span>}
          </div>
          <div style={{ textAlign: 'right', color: '#44445a', fontSize: 18 }}>{open ? '▲' : '▼'}</div>
        </div>
      )}

      {open && (
        <div style={{ background: '#13131a', borderTop: '1px solid #2a2a38', padding: '14px 16px' }}>
          {(match.fecha || match.hora || match.cancha) && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, padding: '8px 12px', background: 'rgba(249,115,22,0.06)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.15)' }}>
              {match.fecha && <span style={{ color: '#9999b0', fontSize: 12 }}>📅 {match.fecha}</span>}
              {match.hora && <span style={{ color: '#9999b0', fontSize: 12 }}>🕐 {match.hora}</span>}
              {match.cancha && <span style={{ color: '#9999b0', fontSize: 12 }}>🎾 {match.cancha}</span>}
            </div>
          )}

          {/* Status select */}
          {match.estado !== 'W.O.' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>ESTADO:</span>
              <div style={{ position: 'relative' }}>
                <select
                  value={match.estado}
                  onChange={e => handleEstado(e.target.value)}
                  disabled={savingEstado}
                  style={{
                    background: '#13131a', border: `1px solid ${cfg.color}55`,
                    borderRadius: 8, color: cfg.color, fontSize: 13, fontWeight: 600,
                    padding: '6px 28px 6px 12px', cursor: 'pointer', outline: 'none',
                    appearance: 'none', WebkitAppearance: 'none',
                    opacity: savingEstado ? 0.6 : 1,
                  }}
                >
                  <option value="Programado">Programado</option>
                  <option value="En juego">En juego</option>
                  <option value="Demorado">Demorado</option>
                  <option value="Reprogramado">Reprogramado</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: cfg.color, fontSize: 10 }}>▾</span>
              </div>
              {savingEstado && <span style={{ color: '#9999b0', fontSize: 11 }}>Guardando...</span>}
            </div>
          )}

          {match.estado === 'En juego' ? (
            <LiveScorePanel match={match} torneoId={torneoId} onUpdated={onUpdated} />
          ) : (
            <>
              {/* Tab select */}
              <div style={{ marginBottom: 14 }}>
                <select
                  value={tab}
                  onChange={e => setTab(e.target.value)}
                  style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, color: '#f1f1f5', fontSize: 13, fontWeight: 600, padding: '8px 12px', cursor: 'pointer', outline: 'none', width: isCardView ? '100%' : 'auto' }}
                >
                  <option value="horario">📅 Horario</option>
                  <option value="resultado">⚽ Resultado manual</option>
                </select>
              </div>

              {tab === 'horario' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: isCardView ? '1 1 100%' : 'none' }}>
                    <div style={{ color: '#9999b0', fontSize: 11, marginBottom: 5, fontWeight: 600 }}>FECHA</div>
                    <input type="date" value={horario.fecha} onChange={e => setHorario(p => ({ ...p, fecha: e.target.value }))} style={{ ...inp, width: isCardView ? '100%' : 160 }} />
                  </div>
                  <div style={{ flex: isCardView ? '1 1 45%' : 'none' }}>
                    <div style={{ color: '#9999b0', fontSize: 11, marginBottom: 5, fontWeight: 600 }}>HORA</div>
                    <input type="time" value={horario.hora} onChange={e => setHorario(p => ({ ...p, hora: e.target.value }))} style={{ ...inp, width: isCardView ? '100%' : 130 }} />
                  </div>
                  <div style={{ flex: isCardView ? '1 1 45%' : 'none' }}>
                    <div style={{ color: '#9999b0', fontSize: 11, marginBottom: 5, fontWeight: 600 }}>CANCHA</div>
                    <input placeholder="ej. Cancha 1" value={horario.cancha} onChange={e => setHorario(p => ({ ...p, cancha: e.target.value }))} style={{ ...inp, width: isCardView ? '100%' : 150 }} />
                  </div>
                  <button onClick={saveHorario} disabled={saving} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, flex: isCardView ? '1 1 100%' : 'none' }}>
                    {saving ? '...' : 'Guardar horario'}
                  </button>
                </div>
              )}

              {tab === 'resultado' && (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#f1f1f5', fontWeight: 600, fontSize: 12, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.duplaA?.jugador1} / {match.duplaA?.jugador2}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div>
                            <div style={{ color: '#9999b0', fontSize: 10, marginBottom: 4 }}>SETS</div>
                            <input type="number" min="0" max="3" value={res.setsA} onChange={e => setRes(p => ({ ...p, setsA: e.target.value }))} style={numInp} />
                          </div>
                          <div>
                            <div style={{ color: '#9999b0', fontSize: 10, marginBottom: 4 }}>GAMES</div>
                            <input type="number" min="0" value={res.gamesA} onChange={e => setRes(p => ({ ...p, gamesA: e.target.value }))} style={numInp} />
                          </div>
                        </div>
                      </div>
                      <div style={{ color: '#44445a', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>vs</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#f1f1f5', fontWeight: 600, fontSize: 12, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.duplaB?.jugador1} / {match.duplaB?.jugador2}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div>
                            <div style={{ color: '#9999b0', fontSize: 10, marginBottom: 4 }}>SETS</div>
                            <input type="number" min="0" max="3" value={res.setsB} onChange={e => setRes(p => ({ ...p, setsB: e.target.value }))} style={numInp} />
                          </div>
                          <div>
                            <div style={{ color: '#9999b0', fontSize: 10, marginBottom: 4 }}>GAMES</div>
                            <input type="number" min="0" value={res.gamesB} onChange={e => setRes(p => ({ ...p, gamesB: e.target.value }))} style={numInp} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={res.wo} onChange={e => setRes(p => ({ ...p, wo: e.target.checked }))} />
                      W.O.
                    </label>
                    <button onClick={saveRes} disabled={saving} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, flex: isCardView ? 1 : 'none' }}>
                      {saving ? '...' : 'Guardar resultado'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {msg && <p style={{ color: msg.startsWith('⚠') || msg.startsWith('Error') ? '#ef4444' : '#22c55e', fontSize: 12, margin: '10px 0 0' }}>{msg}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Llave row (bracket matches) ──────────────────────────────────────────────
function LlaveRow({ llave, torneoId, onUpdated }) {
  const [open, setOpen] = useState(false)
  const isCardView = useIsMobile(720)
  const [res, setRes] = useState({
    setsA: llave.resultado?.setsA ?? '',
    setsB: llave.resultado?.setsB ?? '',
    gamesA: llave.resultado?.gamesA ?? '',
    gamesB: llave.resultado?.gamesB ?? '',
    wo: false,
  })
  const [saving, setSaving] = useState(false)
  const [savingEstado, setSavingEstado] = useState(false)
  const [msg, setMsg] = useState('')

  // Sync form inputs when llave prop updates (e.g. after parent reloads from Firestore)
  useEffect(() => {
    if (llave.resultado) {
      setRes(p => ({
        ...p,
        setsA: llave.resultado.setsA ?? p.setsA,
        setsB: llave.resultado.setsB ?? p.setsB,
        gamesA: llave.resultado.gamesA ?? p.gamesA,
        gamesB: llave.resultado.gamesB ?? p.gamesB,
      }))
    }
  }, [llave.resultado])

  async function handleEstado(newEstado) {
    if (newEstado === llave.estado) return
    if (newEstado === 'Finalizado' && !llave.resultado) {
      setMsg('⚠️ Ingresá el resultado antes de marcar como Finalizado.')
      return
    }
    setSavingEstado(true)
    try {
      await updateLlaveEstado(torneoId, llave.id, newEstado)
      onUpdated({ ...llave, estado: newEstado })
    } catch (err) {
      setMsg('Error al cambiar estado: ' + (err.message || 'Error'))
    }
    setSavingEstado(false)
  }

  const cfg = STATUS_CFG[llave.estado] || STATUS_CFG.Programado
  const duplaA = llave.duplaA
  const duplaB = llave.duplaB
  const isBye = llave.estado === 'BYE'
  const isPending = llave.estado === 'Pendiente' || (!duplaA && !duplaB)
  const canEdit = !isBye && !isPending && duplaA && duplaB

  async function saveRes() {
    const { setsA, setsB, gamesA, gamesB, wo } = res
    if (setsA === '' || setsB === '') { setMsg('Ingresá los sets.'); setTimeout(() => setMsg(''), 2000); return }
    setSaving(true)
    try {
      await saveLlaveResultado(torneoId, llave.id, {
        setsA: Number(setsA), setsB: Number(setsB),
        gamesA: Number(gamesA) || 0, gamesB: Number(gamesB) || 0, wo,
      })
      setMsg('Resultado guardado')
      setTimeout(() => setMsg(''), 2000)
      const ptsA = Number(setsA) > Number(setsB) ? 2 : (wo ? 0 : 1)
      const ptsB = Number(setsA) > Number(setsB) ? (wo ? 0 : 1) : 2
      onUpdated({ ...llave, resultado: { setsA: Number(setsA), setsB: Number(setsB), gamesA: Number(gamesA)||0, gamesB: Number(gamesB)||0 }, ptsA, ptsB, estado: wo ? 'W.O.' : 'Finalizado' })
    } catch (err) {
      setMsg('Error al guardar: ' + (err.message || 'Error'))
      setTimeout(() => setMsg(''), 4000)
    }
    setSaving(false)
  }

  const numInp = {
    background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6,
    padding: '6px 10px', color: '#f1f1f5', fontSize: 13, outline: 'none',
    width: 70, textAlign: 'center', boxSizing: 'border-box',
  }

  return (
    <div style={{ borderBottom: '1px solid #20202c' }}>
      {isCardView ? (
        <div
          style={{ padding: '10px 14px', cursor: canEdit ? 'pointer' : 'default', transition: 'background 0.12s' }}
          onClick={() => canEdit && setOpen(o => !o)}
          onMouseEnter={e => { if (canEdit) e.currentTarget.style.background = '#1a1a22' }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700 }}>{llave.roundName}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600 }}>{llave.estado}</span>
              {canEdit && <span style={{ color: '#44445a', fontSize: 14 }}>{open ? '▲' : '▼'}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {duplaA ? (
                <>
                  <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{duplaA.jugador1}</div>
                  <div style={{ color: '#9999b0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{duplaA.jugador2}</div>
                </>
              ) : (
                <div style={{ color: '#44445a', fontSize: 12, fontStyle: 'italic' }}>Por definir</div>
              )}
            </div>
            <span style={{ color: llave.resultado ? '#f97316' : '#44445a', fontWeight: 700, fontSize: llave.resultado ? 15 : 13, flexShrink: 0 }}>
              {llave.resultado ? `${llave.resultado.setsA}–${llave.resultado.setsB}` : 'vs'}
            </span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
              {duplaB ? (
                <>
                  <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{duplaB.jugador1}</div>
                  <div style={{ color: '#9999b0', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{duplaB.jugador2}</div>
                </>
              ) : (
                <div style={{ color: '#44445a', fontSize: 12, fontStyle: 'italic' }}>Por definir</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid', gridTemplateColumns: '120px 1fr 1fr 130px 60px',
            alignItems: 'center', padding: '0 16px', height: 54, gap: 12,
            cursor: canEdit ? 'pointer' : 'default', transition: 'background 0.12s',
          }}
          onClick={() => canEdit && setOpen(o => !o)}
          onMouseEnter={e => { if (canEdit) e.currentTarget.style.background = '#1a1a22' }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div>
            <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px' }}>{llave.roundName}</span>
          </div>
          <div>
            {duplaA ? (
              <>
                <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600 }}>{duplaA.jugador1}</div>
                <div style={{ color: '#9999b0', fontSize: 11 }}>{duplaA.jugador2}</div>
              </>
            ) : (
              <div style={{ color: '#44445a', fontSize: 12, fontStyle: 'italic' }}>Por definir</div>
            )}
          </div>
          <div>
            {duplaB ? (
              <>
                <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600 }}>{duplaB.jugador1}</div>
                <div style={{ color: '#9999b0', fontSize: 11 }}>{duplaB.jugador2}</div>
              </>
            ) : (
              <div style={{ color: '#44445a', fontSize: 12, fontStyle: 'italic' }}>Por definir</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600 }}>
              {llave.estado}
            </span>
            {llave.resultado && (
              <span style={{ color: '#f97316', fontSize: 13, fontWeight: 700 }}>
                {llave.resultado.setsA}–{llave.resultado.setsB}
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right', color: '#44445a', fontSize: 18 }}>
            {canEdit && (open ? '▲' : '▼')}
          </div>
        </div>
      )}

      {open && canEdit && (
        <div style={{ background: '#13131a', borderTop: '1px solid #2a2a38', padding: '14px 16px' }}>
          {llave.estado !== 'W.O.' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>ESTADO:</span>
              <div style={{ position: 'relative' }}>
                <select
                  value={llave.estado}
                  onChange={e => handleEstado(e.target.value)}
                  disabled={savingEstado}
                  style={{
                    background: '#13131a', border: `1px solid ${cfg.color}55`,
                    borderRadius: 8, color: cfg.color, fontSize: 13, fontWeight: 600,
                    padding: '6px 28px 6px 12px', cursor: 'pointer', outline: 'none',
                    appearance: 'none', WebkitAppearance: 'none',
                    opacity: savingEstado ? 0.6 : 1,
                  }}
                >
                  <option value="Programado">Programado</option>
                  <option value="En juego">En juego</option>
                  <option value="Demorado">Demorado</option>
                  <option value="Reprogramado">Reprogramado</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: cfg.color, fontSize: 10 }}>▾</span>
              </div>
              {savingEstado && <span style={{ color: '#9999b0', fontSize: 11 }}>Guardando...</span>}
            </div>
          )}

          {llave.estado === 'En juego' ? (
            <LiveScorePanel
              match={llave}
              torneoId={torneoId}
              onUpdated={onUpdated}
              allowThirdSet={llave.roundName === 'Semifinal' || llave.roundName === 'Final'}
              saveFn={(result) => saveLlaveResultado(torneoId, llave.id, result)}
              persistFn={(newM) => updateLlaveMarcador(torneoId, llave.id, newM)}
            />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f1f1f5', fontWeight: 600, fontSize: 12, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {duplaA.jugador1}{duplaA.jugador2 ? ` / ${duplaA.jugador2}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div>
                      <div style={{ color: '#9999b0', fontSize: 10, marginBottom: 4 }}>SETS</div>
                      <input type="number" min="0" max="3" value={res.setsA} onChange={e => setRes(p => ({ ...p, setsA: e.target.value }))} style={numInp} />
                    </div>
                    <div>
                      <div style={{ color: '#9999b0', fontSize: 10, marginBottom: 4 }}>GAMES</div>
                      <input type="number" min="0" value={res.gamesA} onChange={e => setRes(p => ({ ...p, gamesA: e.target.value }))} style={numInp} />
                    </div>
                  </div>
                </div>
                <div style={{ color: '#44445a', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>vs</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f1f1f5', fontWeight: 600, fontSize: 12, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {duplaB.jugador1}{duplaB.jugador2 ? ` / ${duplaB.jugador2}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div>
                      <div style={{ color: '#9999b0', fontSize: 10, marginBottom: 4 }}>SETS</div>
                      <input type="number" min="0" max="3" value={res.setsB} onChange={e => setRes(p => ({ ...p, setsB: e.target.value }))} style={numInp} />
                    </div>
                    <div>
                      <div style={{ color: '#9999b0', fontSize: 10, marginBottom: 4 }}>GAMES</div>
                      <input type="number" min="0" value={res.gamesB} onChange={e => setRes(p => ({ ...p, gamesB: e.target.value }))} style={numInp} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={res.wo} onChange={e => setRes(p => ({ ...p, wo: e.target.checked }))} />
                  W.O.
                </label>
                <button onClick={saveRes} disabled={saving} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, flex: isCardView ? 1 : 'none' }}>
                  {saving ? '...' : 'Guardar resultado'}
                </button>
              </div>
            </>
          )}
          {msg && <p style={{ color: msg.startsWith('⚠') || msg.startsWith('Error') ? '#ef4444' : '#22c55e', fontSize: 12, margin: '10px 0 0' }}>{msg}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PartidosAdmin() {
  const isCardView = useIsMobile(720)
  const [torneos, setTorneos] = useState([])
  const [activeTorneo, setActiveTorneo] = useState(null)
  const [activeTorneoId, setActiveTorneoId] = useState(null)
  const [zonas, setZonas] = useState([])
  const [partidos, setPartidos] = useState([])
  const [llaves, setLlaves] = useState([])
  const [viewMode, setViewMode] = useState('grupos')
  const [loading, setLoading] = useState(true)
  const [filterZona, setFilterZona] = useState('all')
  const [filterJornada, setFilterJornada] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [openIds, setOpenIds] = useState([])
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [autoLlaveMsg, setAutoLlaveMsg] = useState('')
  const [generatingAutoLlave, setGeneratingAutoLlave] = useState(false)

  // Refs to avoid stale closures in async callbacks
  const activeTorneoRef = useRef(null)
  const llavesRef = useRef([])

  useEffect(() => { activeTorneoRef.current = activeTorneo }, [activeTorneo])
  useEffect(() => { llavesRef.current = llaves }, [llaves])

  useEffect(() => { loadTorneos() }, [])

  // Only re-load data when the active torneo ID changes, not when estado changes
  useEffect(() => {
    if (activeTorneoId) { loadData(activeTorneoId); setOpenIds([]) }
  }, [activeTorneoId])

  async function loadTorneos() {
    const snap = await getDocs(query(collection(db, 'torneos'), orderBy('createdAt', 'desc')))
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setTorneos(list)
    const active = list.find(t => t.estado === 'En curso') || list[0]
    if (active) {
      setActiveTorneo(active)
      setActiveTorneoId(active.id)
    } else {
      setLoading(false)
    }
  }

  async function loadLlaves(torneoId) {
    const snap = await getDocs(collection(db, 'torneos', torneoId, 'llaves'))
    const data = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || (a.matchIndex ?? 0) - (b.matchIndex ?? 0))
    setLlaves(data)
    llavesRef.current = data
    return data
  }

  async function loadData(torneoId) {
    setLoading(true)
    const [zonasSnap, partidosSnap] = await Promise.all([
      getDocs(query(collection(db, 'torneos', torneoId, 'zonas'), orderBy('orden'))),
      getDocs(collection(db, 'torneos', torneoId, 'partidos')),
    ])
    setZonas(zonasSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setPartidos(partidosSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setFilterZona('all'); setFilterJornada('all'); setFilterEstado('all')
    setPage(1)

    const llavesData = await loadLlaves(torneoId)
    setViewMode(llavesData.length > 0 ? 'llave' : 'grupos')
    setLoading(false)
  }

  async function handleUpdated(updated) {
    let allDone = false
    setPartidos(prev => {
      const next = prev.map(p => p.id === updated.id ? updated : p)
      allDone = next.length > 0 && next.every(p => p.estado === 'Finalizado' || p.estado === 'W.O.')
      return next
    })

    // Auto-generate bracket when all zone matches are done and no bracket exists yet
    if (allDone && llavesRef.current.length === 0) {
      const tid = activeTorneoRef.current?.id
      if (!tid) return
      setGeneratingAutoLlave(true)
      try {
        await generateBracket(tid)
        const llavesData = await loadLlaves(tid)
        if (llavesData.length > 0) setViewMode('llave')
        setActiveTorneo(prev => prev ? { ...prev, estado: 'Llave' } : prev)
        setAutoLlaveMsg('¡Todos los partidos finalizados! La llave fue generada automáticamente.')
      } catch (err) {
        setAutoLlaveMsg('Error al generar la llave: ' + (err.message || 'Error desconocido'))
      }
      setGeneratingAutoLlave(false)
    }
  }

  async function handleLlaveUpdated(updated) {
    setLlaves(prev => prev.map(l => l.id === updated.id ? updated : l))
    // Reload to pick up winner propagation to next match
    if (activeTorneoRef.current?.id) {
      await loadLlaves(activeTorneoRef.current.id)
    }
  }

  function toggleOpen(id) {
    setOpenIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  const jornadas = useMemo(() => [...new Set(partidos.map(p => p.jornada))].sort((a, b) => a - b), [partidos])

  const filtered = useMemo(() => partidos
    .filter(p =>
      (filterZona === 'all' || p.zonaId === filterZona) &&
      (filterJornada === 'all' || p.jornada === Number(filterJornada)) &&
      (filterEstado === 'all' || p.estado === filterEstado)
    )
    .sort((a, b) => a.jornada - b.jornada || (a.zonaNombre || '').localeCompare(b.zonaNombre || '')),
    [partidos, filterZona, filterJornada, filterEstado]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function setFilter(setter) { return (val) => { setter(val); setPage(1) } }

  const tabBtn = (t) => (
    <button key={t.id} onClick={() => { setActiveTorneo(t); setActiveTorneoId(t.id) }} style={{
      padding: '6px 14px', borderRadius: 7, border: '1px solid', fontSize: 12, fontWeight: 500, cursor: 'pointer',
      borderColor: activeTorneo?.id === t.id ? '#f97316' : '#2a2a38',
      background: activeTorneo?.id === t.id ? 'rgba(249,115,22,0.12)' : 'transparent',
      color: activeTorneo?.id === t.id ? '#f97316' : '#9999b0',
    }}>{t.nombre}</button>
  )

  // Bracket rounds for display
  const rounds = useMemo(() => {
    const roundNums = [...new Set(llaves.map(l => l.round))].sort((a, b) => a - b)
    return roundNums.map(r => ({
      round: r,
      name: llaves.find(l => l.round === r)?.roundName || `Ronda ${r}`,
      matches: llaves.filter(l => l.round === r),
    }))
  }, [llaves])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#f1f1f5', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Partidos</h2>
        <p style={{ color: '#9999b0', fontSize: 13, margin: 0 }}>Horarios, canchas y carga de resultados</p>
      </div>

      {torneos.length > 1 && <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>{torneos.map(tabBtn)}</div>}

      {generatingAutoLlave && (
        <div style={{ marginBottom: 14, padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#10b981', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Generando llave automáticamente...
        </div>
      )}

      {autoLlaveMsg && !generatingAutoLlave && (
        <div style={{ marginBottom: 14, padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>🏅 {autoLlaveMsg}</span>
          <button onClick={() => setAutoLlaveMsg('')} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* View mode toggle (shown when bracket exists) */}
      {llaves.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <select
            value={viewMode}
            onChange={e => setViewMode(e.target.value)}
            style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, color: '#f1f1f5', fontSize: 13, fontWeight: 600, padding: '8px 14px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="grupos">Fase de Grupos ({partidos.length})</option>
            <option value="llave">Llave ({llaves.filter(l => l.estado !== 'BYE').length} partidos)</option>
          </select>
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          {/* ── GRUPO VIEW ─────────────────────────────────────────────────── */}
          {viewMode === 'grupos' && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>ZONA</span>
                <select value={filterZona} onChange={e => { setFilterZona(e.target.value); setPage(1) }} style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6, color: '#f1f1f5', fontSize: 12, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}>
                  <option value="all">Todas las zonas</option>
                  {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
                <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>JORNADA</span>
                <select value={filterJornada} onChange={e => { setFilterJornada(e.target.value); setPage(1) }} style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6, color: '#f1f1f5', fontSize: 12, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}>
                  <option value="all">Todas</option>
                  {jornadas.map(j => <option key={j} value={String(j)}>J{j}</option>)}
                </select>
                <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>ESTADO</span>
                <select value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1) }} style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6, color: '#f1f1f5', fontSize: 12, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}>
                  <option value="all">Todos</option>
                  <option value="Programado">Programado</option>
                  <option value="En juego">En juego</option>
                  <option value="Demorado">Demorado</option>
                  <option value="Reprogramado">Reprogramado</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ color: '#6666a0', fontSize: 12 }}>Ver</span>
                  {[10, 25, 50].map(n => (
                    <button key={n} onClick={() => { setPageSize(n); setPage(1) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: pageSize === n ? '#f97316' : 'transparent', color: pageSize === n ? '#fff' : '#9999b0', borderColor: pageSize === n ? '#f97316' : '#2a2a38' }}>{n}</button>
                  ))}
                </div>
              </div>

              {openIds.length > 0 && (
                <div style={{ marginBottom: 10, padding: '5px 12px', background: 'rgba(249,115,22,0.06)', borderRadius: 6, border: '1px solid rgba(249,115,22,0.15)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#f97316', fontSize: 11, fontWeight: 600 }}>{openIds.length}/2 acordeones abiertos</span>
                </div>
              )}

              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, background: '#13131a', borderRadius: 12, border: '1px dashed #2a2a38', color: '#9999b0' }}>
                  No hay partidos para mostrar con los filtros actuales.
                </div>
              ) : (
                <>
                  <div style={{ background: '#13131a', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}>
                    {!isCardView && (
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 1fr 100px 80px', padding: '0 16px', height: 40, borderBottom: '1px solid #2a2a38', background: '#0f0f13', alignItems: 'center', gap: 12 }}>
                        {['Zona', 'Jornada', 'Dupla A', 'Dupla B', 'Estado', ''].map(h => (
                          <div key={h} style={{ color: '#6666a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</div>
                        ))}
                      </div>
                    )}
                    {paginated.map(m => (
                      <MatchRow
                        key={m.id}
                        match={m}
                        torneoId={activeTorneo.id}
                        onUpdated={handleUpdated}
                        open={openIds.includes(m.id)}
                        onToggle={() => toggleOpen(m.id)}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, color: '#9999b0', fontSize: 12 }}>
                      <span>{filtered.length} partidos · página {safePage} de {totalPages}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setPage(1)} disabled={safePage === 1} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === 1 ? '#44445a' : '#9999b0', cursor: safePage === 1 ? 'default' : 'pointer', fontSize: 12 }}>«</button>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === 1 ? '#44445a' : '#9999b0', cursor: safePage === 1 ? 'default' : 'pointer', fontSize: 12 }}>‹</button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
                          const pg = start + i
                          return pg <= totalPages ? (
                            <button key={pg} onClick={() => setPage(pg)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, cursor: 'pointer', background: pg === safePage ? '#f97316' : 'transparent', color: pg === safePage ? '#fff' : '#9999b0', borderColor: pg === safePage ? '#f97316' : '#2a2a38' }}>{pg}</button>
                          ) : null
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === totalPages ? '#44445a' : '#9999b0', cursor: safePage === totalPages ? 'default' : 'pointer', fontSize: 12 }}>›</button>
                        <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === totalPages ? '#44445a' : '#9999b0', cursor: safePage === totalPages ? 'default' : 'pointer', fontSize: 12 }}>»</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── LLAVE VIEW ─────────────────────────────────────────────────── */}
          {viewMode === 'llave' && (
            <div>
              {rounds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, background: '#13131a', borderRadius: 12, border: '1px dashed #2a2a38', color: '#9999b0' }}>
                  No hay partidos de llave generados aún.
                </div>
              ) : rounds.map(({ round, name, matches }) => (
                <div key={round} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 3, height: 18, background: '#a78bfa', borderRadius: 2 }} />
                    <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }}>{name}</span>
                    <div style={{ flex: 1, height: 1, background: '#2a2a38' }} />
                  </div>
                  <div style={{ background: '#13131a', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}>
                    {!isCardView && (
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 130px 60px', padding: '0 16px', height: 36, borderBottom: '1px solid #2a2a38', background: '#0f0f13', alignItems: 'center', gap: 12 }}>
                        {['Ronda', 'Dupla A', 'Dupla B', 'Estado', ''].map(h => (
                          <div key={h} style={{ color: '#6666a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</div>
                        ))}
                      </div>
                    )}
                    {matches.map(l => (
                      <LlaveRow
                        key={l.id}
                        llave={l}
                        torneoId={activeTorneo.id}
                        onUpdated={handleLlaveUpdated}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
