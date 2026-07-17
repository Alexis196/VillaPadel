import { useState, useEffect, useMemo, useRef } from 'react'
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  updateHorario, saveResultado, updateEstado, updateLlaveEstado, updateMarcador, updateLlaveMarcador,
  generateBracket, saveLlaveResultado, computeMatchResult, checkAmericanSetWinner,
} from '../../firebase/torneoService'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import AppSelect from '../ui/AppSelect'
import './PartidosAdmin.css'

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

// Rounds counted backwards from the final (Final is always the last round,
// Semifinal always second-to-last, etc.) so "3er set desde" works regardless
// of how many total rounds a given bracket has.
const ROUND_OFFSET_FROM_FINAL = { final: 0, semifinal: 1, cuartos: 2, octavos: 3 }

// A 1-1 scoreline is never a valid final result (computeMatchResult rejects it as
// a tie) — but it's also the single most common way an admin actually reaches
// this error, since that's how the match "felt" before the decider. When the
// match doesn't play a full 3rd set, 1-1 is decided by a super tiebreak, which
// counts as winning the 3rd set — so the real final tally is 2-1 (or 1-2),
// recorded as 7-6/6-7 for that set, same convention the live scoreboard uses.
function tieHint(setsA, setsB, allowThirdSet) {
  if (allowThirdSet) return null
  if (Number(setsA) !== 1 || Number(setsB) !== 1) return null
  return 'Un 1-1 se define por súper tiebreak, que cuenta como el 3er set: cargá el resultado final como 2-1 (o 1-2) y anotá 7-6 / 6-7 en el Set 3.'
}

// ─── Per-set games input (manual result entry) ────────────────────────────────
// Row count follows setsA + setsB (how many sets were actually played), so a
// 2-1 result gets 3 rows instead of a single aggregate games field.
function SetsBreakdown({ setsA, setsB, sets, onChange }) {
  const totalSets = (Number(setsA) || 0) + (Number(setsB) || 0)
  if (totalSets === 0) return null
  const rows = Array.from({ length: totalSets }, (_, i) => sets[i] || { gA: '', gB: '' })

  function updateRow(i, field, val) {
    const next = [...rows]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  return (
    <div className="pa-sets-breakdown">
      <div className="pa-field-label-sm">GAMES POR SET</div>
      {rows.map((row, i) => (
        <div key={i} className="pa-set-breakdown-row">
          <span className="pa-set-breakdown-label">Set {i + 1}</span>
          <input type="number" min="0" placeholder="A" value={row.gA} onChange={e => updateRow(i, 'gA', e.target.value)} className="pa-input-num" />
          <span className="pa-muted">–</span>
          <input type="number" min="0" placeholder="B" value={row.gB} onChange={e => updateRow(i, 'gB', e.target.value)} className="pa-input-num" />
        </div>
      ))}
    </div>
  )
}

// ─── Live score panel ─────────────────────────────────────────────────────────
// allowThirdSet=false → zone matches: 1-1 sets triggers super tiebreak instead of 3rd set
// allowThirdSet=true  → bracket SF/Final: full 3 sets
// modalidad='americano' → single set to 9 games (win by 2 past 8-8), no tiebreak-at-6, no allowThirdSet
function LiveScorePanel({ match, torneoId, onUpdated, allowThirdSet = false, modalidad = 'tradicional', saveFn, persistFn }) {
  const [m, setM] = useState(() => match.marcador ? { ...defaultMarcador(), ...match.marcador } : defaultMarcador())
  const [finishing, setFinishing] = useState(false)
  const isAmericano = modalidad === 'americano'

  const matchDone = isAmericano ? (m.setsA >= 1 || m.setsB >= 1) : (m.setsA >= 2 || m.setsB >= 2)

  async function persist(newM) {
    setM(newM)
    try {
      await (persistFn ? persistFn(newM) : updateMarcador(torneoId, match.id, newM))
      onUpdated({ ...match, marcador: newM })
    } catch (err) {
      console.error('Error guardando marcador:', err)
    }
  }

  function resolveGame(team, newM) {
    newM.puntosA = 0; newM.puntosB = 0; newM.enOroDePunto = false
    if (team === 'A') newM.gamesA += 1
    else newM.gamesB += 1

    if (isAmericano) {
      const winner = checkAmericanSetWinner(newM.gamesA, newM.gamesB)
      if (winner) {
        newM.historialSets = [...newM.historialSets, { gA: newM.gamesA, gB: newM.gamesB }]
        if (winner === 'A') newM.setsA += 1
        else newM.setsB += 1
      }
      return
    }

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
      const resultData = { setsA: m.setsA, setsB: m.setsB, gamesA: totalGamesA, gamesB: totalGamesB, historialSets: m.historialSets, wo: false }
      const { ptsA, ptsB } = computeMatchResult(resultData.setsA, resultData.setsB, false)
      await (saveFn ? saveFn(resultData) : saveResultado(torneoId, match.id, resultData))
      onUpdated({ ...match, estado: 'Finalizado', resultado: { setsA: m.setsA, setsB: m.setsB, gamesA: totalGamesA, gamesB: totalGamesB, historialSets: m.historialSets }, ptsA, ptsB, marcador: m })
    } catch (err) {
      alert('Error al finalizar partido: ' + (err.message || 'Error. Revisá la conexión.'))
    }
    setFinishing(false)
  }

  const setDisplay = m.historialSets.map((s, i) => (
    <span key={i} className="pa-set-chip">{s.gA}–{s.gB}</span>
  ))

  return (
    <div className="pa-live-panel">

      {/* Header */}
      <div className="pa-live-header">
        <span className="pa-live-title">
          {isAmericano
            ? 'MARCADOR EN VIVO · AMERICANO A 9'
            : !allowThirdSet && m.enTiebreak && m.tiebreakTipo === 'supertb' && m.setsA === 1 && m.setsB === 1
              ? 'MARCADOR EN VIVO · SUPER TIEBREAK'
              : `MARCADOR EN VIVO · Set ${m.historialSets.length + (matchDone ? 0 : 1)}`}
        </span>
        <div className="pa-live-sets-row">
          {setDisplay}
          {m.historialSets.length > 0 && !matchDone && (
            <button onClick={undoLastSet} className="pa-undo-set-btn">↩ Set</button>
          )}
        </div>
      </div>

      {/* Sets won */}
      <div className="pa-sets-grid">
        <div>
          <div className="pa-set-player">{match.duplaA?.jugador1}</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: m.setsA > m.setsB ? '#f97316' : '#f1f1f5', lineHeight: 1 }}>{m.setsA}</div>
          <div className="pa-sets-sub">sets</div>
        </div>
        <div className="pa-vs-small">VS</div>
        <div>
          <div className="pa-set-player">{match.duplaB?.jugador1}</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: m.setsB > m.setsA ? '#f97316' : '#f1f1f5', lineHeight: 1 }}>{m.setsB}</div>
          <div className="pa-sets-sub">sets</div>
        </div>
      </div>

      {!matchDone && (
        <>
          {m.enTiebreak ? (
            <div className="pa-tiebreak-panel">
              <div className="pa-tiebreak-header">
                <span className="pa-tiebreak-title">
                  {m.tiebreakTipo === 'supertb' ? 'SUPER TIEBREAK · 11 pts' : 'TIEBREAK · 7 pts'}
                </span>
                {(allowThirdSet || !(m.setsA === 1 && m.setsB === 1)) && (
                  <button onClick={toggleTBType} className="pa-change-tb-btn">
                    Cambiar a {m.tiebreakTipo === 'supertb' ? 'TB' : 'Super TB'}
                  </button>
                )}
              </div>
              <div className="pa-score-3col">
                <div className="pa-score-team">
                  <button className="pa-btn-lg-red" onClick={() => removeTBPoint('A')}>−</button>
                  <span className="pa-score-num">{m.tbPuntosA}</span>
                  <button className="pa-btn-lg-green" onClick={() => addTBPoint('A')}>+</button>
                </div>
                <div className="pa-pts-sep">pts</div>
                <div className="pa-score-team">
                  <button className="pa-btn-lg-red" onClick={() => removeTBPoint('B')}>−</button>
                  <span className="pa-score-num">{m.tbPuntosB}</span>
                  <button className="pa-btn-lg-green" onClick={() => addTBPoint('B')}>+</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="pa-games-panel">
              <div className="pa-games-header">
                <span className="pa-games-count">GAMES: {m.gamesA} – {m.gamesB}</span>
                <button onClick={resetCurrentSet} className="pa-reset-set-btn">↺ Reset set</button>
              </div>

              {m.enOroDePunto && (
                <div className="pa-golden-point">
                  <span className="pa-golden-text">⭐ PUNTO DE ORO</span>
                </div>
              )}

              {/* Points within current game */}
              <div className="pa-score-3col">
                <div className="pa-score-team">
                  <button className="pa-btn-lg-red" onClick={() => removePoint('A')}>−</button>
                  <span className="pa-score-num-lg" style={{ color: m.enOroDePunto ? '#f59e0b' : '#f1f1f5' }}>
                    {m.enOroDePunto ? '★' : PTS_DISPLAY[m.puntosA]}
                  </span>
                  <button className="pa-btn-lg-green" onClick={() => addPoint('A')}>+</button>
                </div>
                <div className="pa-dash-center">–</div>
                <div className="pa-score-team">
                  <button className="pa-btn-lg-red" onClick={() => removePoint('B')}>−</button>
                  <span className="pa-score-num-lg" style={{ color: m.enOroDePunto ? '#f59e0b' : '#f1f1f5' }}>
                    {m.enOroDePunto ? '★' : PTS_DISPLAY[m.puntosB]}
                  </span>
                  <button className="pa-btn-lg-green" onClick={() => addPoint('B')}>+</button>
                </div>
              </div>

              {/* Manual game correction */}
              <div className="pa-manual-adj">
                <div className="pa-manual-adj-group">
                  <button className="pa-btn-sm-red" onClick={() => removeGame('A')}>−</button>
                  <span className="pa-adj-label">Game A</span>
                  <button className="pa-btn-sm-green" onClick={() => addGame('A')}>+</button>
                </div>
                <span className="pa-adj-hint">ajuste manual</span>
                <div className="pa-manual-adj-group">
                  <button className="pa-btn-sm-red" onClick={() => removeGame('B')}>−</button>
                  <span className="pa-adj-label">Game B</span>
                  <button className="pa-btn-sm-green" onClick={() => addGame('B')}>+</button>
                </div>
              </div>

              {isAmericano && m.gamesA >= 8 && m.gamesB >= 8 && (
                <p className="pa-five-five">8-8 → gana por diferencia de 2</p>
              )}
              {!isAmericano && m.gamesA === 5 && m.gamesB === 5 && (
                <p className="pa-five-five">5-5 → se extiende a 7</p>
              )}
            </div>
          )}
        </>
      )}

      {matchDone && (
        <div className="pa-match-done">
          <div className="pa-done-title">
            ¡Partido terminado! · {m.setsA > m.setsB ? match.duplaA?.jugador1 : match.duplaB?.jugador1} gana
          </div>
          <button
            onClick={finalize}
            disabled={finishing}
            className="pa-finalize-btn"
          >
            {finishing ? 'Guardando...' : '✓ Finalizar partido'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Match row (zone matches) ─────────────────────────────────────────────────
function MatchRow({ match, torneoId, modalidad, onUpdated, open, onToggle }) {
  const [tab, setTab] = useState('horario')
  const [horario, setHorario] = useState({ fecha: match.fecha || '', hora: match.hora || '', cancha: match.cancha || '' })
  const [res, setRes] = useState({
    setsA: match.resultado?.setsA ?? '',
    setsB: match.resultado?.setsB ?? '',
    sets: (match.resultado?.historialSets || []).map(s => ({ gA: String(s.gA ?? ''), gB: String(s.gB ?? '') })),
    wo: false,
  })
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
    const { setsA, setsB, sets, wo } = res
    if (setsA === '' || setsB === '') { setMsg('Ingresá los sets.'); setTimeout(() => setMsg(''), 2000); return }
    let ptsA, ptsB, estado
    try {
      ({ ptsA, ptsB, estado } = computeMatchResult(setsA, setsB, wo))
    } catch (err) {
      setMsg('⚠️ ' + (tieHint(setsA, setsB, false) || err.message))
      return
    }
    const totalSets = Number(setsA) + Number(setsB)
    const historialSets = sets.slice(0, totalSets).map(s => ({ gA: Number(s.gA) || 0, gB: Number(s.gB) || 0 }))
    const gamesA = historialSets.reduce((sum, s) => sum + s.gA, 0)
    const gamesB = historialSets.reduce((sum, s) => sum + s.gB, 0)
    setSaving(true)
    try {
      await saveResultado(torneoId, match.id, { setsA: Number(setsA), setsB: Number(setsB), gamesA, gamesB, historialSets, wo })
      setMsg('Resultado guardado')
      setTimeout(() => setMsg(''), 2000)
      onUpdated({ ...match, resultado: { setsA: Number(setsA), setsB: Number(setsB), gamesA, gamesB, historialSets }, ptsA, ptsB, estado })
    } catch (err) {
      setMsg('Error al guardar: ' + (err.message || 'Error'))
      setTimeout(() => setMsg(''), 4000)
    }
    setSaving(false)
  }

  return (
    <div className="pa-match-border">
      {isCardView ? (
        /* Mobile card header */
        <div
          className="pa-match-mobile-card"
          onClick={onToggle}
          onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="pa-zone-text">{match.zonaNombre}</span>
              <span className="pa-zone-text">J{match.jornada}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pa-badge" style={{ background: cfg.bg, color: cfg.color }}>{match.estado}</span>
              <span className="pa-muted" style={{ fontSize: 14 }}>{open ? '▲' : '▼'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pa-player-main-clip">{match.duplaA?.jugador1}</div>
              <div className="pa-player-sub-clip">{match.duplaA?.jugador2}</div>
            </div>
            <span style={{ color: match.resultado ? '#f97316' : '#44445a', fontWeight: 700, fontSize: match.resultado ? 15 : 13, flexShrink: 0 }}>
              {match.resultado ? `${match.resultado.setsA}–${match.resultado.setsB}` : 'vs'}
            </span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
              <div className="pa-player-main-clip">{match.duplaB?.jugador1}</div>
              <div className="pa-player-sub-clip">{match.duplaB?.jugador2}</div>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop row */
        <div
          className="pa-match-row-desktop"
          onClick={onToggle}
          onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div className="pa-zone-text">Zona {match.zonaNombre?.replace('Zona ', '')}</div>
          <div className="pa-zone-text">J{match.jornada}</div>
          <div>
            <div className="pa-player-main">{match.duplaA?.jugador1}</div>
            <div className="pa-player-sub">{match.duplaA?.jugador2}</div>
          </div>
          <div>
            <div className="pa-player-main">{match.duplaB?.jugador1}</div>
            <div className="pa-player-sub">{match.duplaB?.jugador2}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="pa-badge" style={{ background: cfg.bg, color: cfg.color }}>{match.estado}</span>
            {match.resultado && <span style={{ color: '#f97316', fontSize: 13, fontWeight: 700 }}>{match.resultado.setsA}–{match.resultado.setsB}</span>}
          </div>
          <div className="pa-chevron">{open ? '▲' : '▼'}</div>
        </div>
      )}

      {open && (
        <div className="pa-expand-panel">
          {(match.fecha || match.hora || match.cancha) && (
            <div className="pa-schedule-bar">
              {match.fecha && <span className="pa-schedule-item">📅 {match.fecha}</span>}
              {match.hora && <span className="pa-schedule-item">🕐 {match.hora}</span>}
              {match.cancha && <span className="pa-schedule-item">🎾 {match.cancha}</span>}
            </div>
          )}

          {/* Status select */}
          {match.estado !== 'W.O.' && (
            <div className="pa-estado-row">
              <span className="pa-estado-label">ESTADO:</span>
              <div style={{ minWidth: 170 }}>
                <AppSelect
                  value={match.estado}
                  onChange={handleEstado}
                  isDisabled={savingEstado}
                  options={[
                    { value: 'Programado',   label: 'Programado' },
                    { value: 'En juego',     label: 'En juego' },
                    { value: 'Demorado',     label: 'Demorado' },
                    { value: 'Reprogramado', label: 'Reprogramado' },
                    { value: 'Finalizado',   label: 'Finalizado' },
                  ]}
                />
              </div>
              {savingEstado && <span className="pa-saving-text">Guardando...</span>}
            </div>
          )}

          {match.estado === 'En juego' ? (
            <LiveScorePanel match={match} torneoId={torneoId} onUpdated={onUpdated} modalidad={modalidad} />
          ) : (
            <>
              {/* Tab select */}
              <div style={{ marginBottom: 14 }}>
                <AppSelect
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'horario',    label: '📅 Horario' },
                    { value: 'resultado',  label: '⚽ Resultado manual' },
                  ]}
                  minWidth={isCardView ? undefined : 200}
                />
              </div>

              {tab === 'horario' && (
                <div className="pa-horario-form">
                  <div style={{ flex: isCardView ? '1 1 100%' : 'none' }}>
                    <div className="pa-field-label">FECHA</div>
                    <input type="date" value={horario.fecha} onChange={e => setHorario(p => ({ ...p, fecha: e.target.value }))} className="pa-input" style={{ width: isCardView ? '100%' : 160 }} />
                  </div>
                  <div style={{ flex: isCardView ? '1 1 45%' : 'none' }}>
                    <div className="pa-field-label">HORA</div>
                    <input type="time" value={horario.hora} onChange={e => setHorario(p => ({ ...p, hora: e.target.value }))} className="pa-input" style={{ width: isCardView ? '100%' : 130 }} />
                  </div>
                  <div style={{ flex: isCardView ? '1 1 45%' : 'none' }}>
                    <div className="pa-field-label">CANCHA</div>
                    <input placeholder="ej. Cancha 1" value={horario.cancha} onChange={e => setHorario(p => ({ ...p, cancha: e.target.value }))} className="pa-input" style={{ width: isCardView ? '100%' : 150 }} />
                  </div>
                  <button onClick={saveHorario} disabled={saving} className="pa-btn-save pa-btn-blue" style={{ cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, flex: isCardView ? '1 1 100%' : 'none' }}>
                    {saving ? '...' : 'Guardar horario'}
                  </button>
                </div>
              )}

              {tab === 'resultado' && (
                <div>
                  <div className="pa-result-pairs">
                    <div className="pa-result-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pa-result-dupla-name">{match.duplaA?.jugador1} / {match.duplaA?.jugador2}</div>
                        <div className="pa-field-label-sm">SETS GANADOS</div>
                        <input type="number" min="0" max="3" value={res.setsA} onChange={e => setRes(p => ({ ...p, setsA: e.target.value }))} className="pa-input-num" />
                      </div>
                      <div className="pa-muted" style={{ fontWeight: 700, fontSize: 16, flexShrink: 0 }}>vs</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pa-result-dupla-name">{match.duplaB?.jugador1} / {match.duplaB?.jugador2}</div>
                        <div className="pa-field-label-sm">SETS GANADOS</div>
                        <input type="number" min="0" max="3" value={res.setsB} onChange={e => setRes(p => ({ ...p, setsB: e.target.value }))} className="pa-input-num" />
                      </div>
                    </div>
                  </div>
                  <SetsBreakdown setsA={res.setsA} setsB={res.setsB} sets={res.sets} onChange={sets => setRes(p => ({ ...p, sets }))} />
                  <div className="pa-result-actions">
                    <label className="pa-wo-label">
                      <input type="checkbox" checked={res.wo} onChange={e => setRes(p => ({ ...p, wo: e.target.checked }))} />
                      W.O.
                    </label>
                    <button onClick={saveRes} disabled={saving} className="pa-btn-save pa-btn-green" style={{ cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, flex: isCardView ? 1 : 'none' }}>
                      {saving ? '...' : 'Guardar resultado'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {msg && <p className={msg.startsWith('⚠') || msg.startsWith('Error') ? 'pa-feedback-err' : 'pa-feedback-ok'}>{msg}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Llave row (bracket matches) ──────────────────────────────────────────────
function LlaveRow({ llave, torneoId, modalidad, allowThirdSet, onUpdated }) {
  const [open, setOpen] = useState(false)
  const isCardView = useIsMobile(720)
  const [res, setRes] = useState({
    setsA: llave.resultado?.setsA ?? '',
    setsB: llave.resultado?.setsB ?? '',
    sets: (llave.resultado?.historialSets || []).map(s => ({ gA: String(s.gA ?? ''), gB: String(s.gB ?? '') })),
    wo: false,
  })
  const [saving, setSaving] = useState(false)
  const [savingEstado, setSavingEstado] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (llave.resultado) {
      setRes(p => ({
        ...p,
        setsA: llave.resultado.setsA ?? p.setsA,
        setsB: llave.resultado.setsB ?? p.setsB,
        sets: llave.resultado.historialSets
          ? llave.resultado.historialSets.map(s => ({ gA: String(s.gA ?? ''), gB: String(s.gB ?? '') }))
          : p.sets,
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
    const { setsA, setsB, sets, wo } = res
    if (setsA === '' || setsB === '') { setMsg('Ingresá los sets.'); setTimeout(() => setMsg(''), 2000); return }
    let ptsA, ptsB, estado
    try {
      ({ ptsA, ptsB, estado } = computeMatchResult(setsA, setsB, wo))
    } catch (err) {
      setMsg('⚠️ ' + (tieHint(setsA, setsB, allowThirdSet) || err.message))
      return
    }
    const totalSets = Number(setsA) + Number(setsB)
    const historialSets = sets.slice(0, totalSets).map(s => ({ gA: Number(s.gA) || 0, gB: Number(s.gB) || 0 }))
    const gamesA = historialSets.reduce((sum, s) => sum + s.gA, 0)
    const gamesB = historialSets.reduce((sum, s) => sum + s.gB, 0)
    setSaving(true)
    try {
      await saveLlaveResultado(torneoId, llave.id, { setsA: Number(setsA), setsB: Number(setsB), gamesA, gamesB, historialSets, wo })
      setMsg('Resultado guardado')
      setTimeout(() => setMsg(''), 2000)
      onUpdated({ ...llave, resultado: { setsA: Number(setsA), setsB: Number(setsB), gamesA, gamesB, historialSets }, ptsA, ptsB, estado })
    } catch (err) {
      setMsg('Error al guardar: ' + (err.message || 'Error'))
      setTimeout(() => setMsg(''), 4000)
    }
    setSaving(false)
  }

  return (
    <div className="pa-match-border">
      {isCardView ? (
        <div
          className="pa-match-mobile-card"
          style={{ cursor: canEdit ? 'pointer' : 'default' }}
          onClick={() => canEdit && setOpen(o => !o)}
          onMouseEnter={e => { if (canEdit) e.currentTarget.style.background = '#1a1a22' }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="pa-round-cell">{llave.roundName}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pa-badge" style={{ background: cfg.bg, color: cfg.color }}>{llave.estado}</span>
              {canEdit && <span className="pa-muted" style={{ fontSize: 14 }}>{open ? '▲' : '▼'}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {duplaA ? (
                <>
                  <div className="pa-player-main-clip">{duplaA.jugador1}</div>
                  <div className="pa-player-sub-clip">{duplaA.jugador2}</div>
                </>
              ) : (
                <div className="pa-muted-italic">Por definir</div>
              )}
            </div>
            <span style={{ color: llave.resultado ? '#f97316' : '#44445a', fontWeight: 700, fontSize: llave.resultado ? 15 : 13, flexShrink: 0 }}>
              {llave.resultado ? `${llave.resultado.setsA}–${llave.resultado.setsB}` : 'vs'}
            </span>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
              {duplaB ? (
                <>
                  <div className="pa-player-main-clip">{duplaB.jugador1}</div>
                  <div className="pa-player-sub-clip">{duplaB.jugador2}</div>
                </>
              ) : (
                <div className="pa-muted-italic">Por definir</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="pa-llave-row-desktop"
          style={{ cursor: canEdit ? 'pointer' : 'default' }}
          onClick={() => canEdit && setOpen(o => !o)}
          onMouseEnter={e => { if (canEdit) e.currentTarget.style.background = '#1a1a22' }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div>
            <span className="pa-round-cell">{llave.roundName}</span>
          </div>
          <div>
            {duplaA ? (
              <>
                <div className="pa-player-main">{duplaA.jugador1}</div>
                <div className="pa-player-sub">{duplaA.jugador2}</div>
              </>
            ) : (
              <div className="pa-muted-italic">Por definir</div>
            )}
          </div>
          <div>
            {duplaB ? (
              <>
                <div className="pa-player-main">{duplaB.jugador1}</div>
                <div className="pa-player-sub">{duplaB.jugador2}</div>
              </>
            ) : (
              <div className="pa-muted-italic">Por definir</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pa-badge" style={{ background: cfg.bg, color: cfg.color }}>{llave.estado}</span>
            {llave.resultado && (
              <span style={{ color: '#f97316', fontSize: 13, fontWeight: 700 }}>
                {llave.resultado.setsA}–{llave.resultado.setsB}
              </span>
            )}
          </div>
          <div className="pa-chevron">{canEdit && (open ? '▲' : '▼')}</div>
        </div>
      )}

      {open && canEdit && (
        <div className="pa-expand-panel">
          {llave.estado !== 'W.O.' && (
            <div className="pa-estado-row">
              <span className="pa-estado-label">ESTADO:</span>
              <div style={{ minWidth: 170 }}>
                <AppSelect
                  value={llave.estado}
                  onChange={handleEstado}
                  isDisabled={savingEstado}
                  options={[
                    { value: 'Programado',   label: 'Programado' },
                    { value: 'En juego',     label: 'En juego' },
                    { value: 'Demorado',     label: 'Demorado' },
                    { value: 'Reprogramado', label: 'Reprogramado' },
                    { value: 'Finalizado',   label: 'Finalizado' },
                  ]}
                />
              </div>
              {savingEstado && <span className="pa-saving-text">Guardando...</span>}
            </div>
          )}

          {llave.estado === 'En juego' ? (
            <LiveScorePanel
              match={llave}
              torneoId={torneoId}
              onUpdated={onUpdated}
              allowThirdSet={allowThirdSet}
              modalidad={modalidad}
              saveFn={(result) => saveLlaveResultado(torneoId, llave.id, result)}
              persistFn={(newM) => updateLlaveMarcador(torneoId, llave.id, newM)}
            />
          ) : (
            <>
              <div className="pa-result-row" style={{ marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pa-result-dupla-name">
                    {duplaA.jugador1}{duplaA.jugador2 ? ` / ${duplaA.jugador2}` : ''}
                  </div>
                  <div className="pa-field-label-sm">SETS GANADOS</div>
                  <input type="number" min="0" max="3" value={res.setsA} onChange={e => setRes(p => ({ ...p, setsA: e.target.value }))} className="pa-input-num" />
                </div>
                <div className="pa-muted" style={{ fontWeight: 700, fontSize: 16, flexShrink: 0 }}>vs</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pa-result-dupla-name">
                    {duplaB.jugador1}{duplaB.jugador2 ? ` / ${duplaB.jugador2}` : ''}
                  </div>
                  <div className="pa-field-label-sm">SETS GANADOS</div>
                  <input type="number" min="0" max="3" value={res.setsB} onChange={e => setRes(p => ({ ...p, setsB: e.target.value }))} className="pa-input-num" />
                </div>
              </div>
              <SetsBreakdown setsA={res.setsA} setsB={res.setsB} sets={res.sets} onChange={sets => setRes(p => ({ ...p, sets }))} />
              <div className="pa-result-actions">
                <label className="pa-wo-label">
                  <input type="checkbox" checked={res.wo} onChange={e => setRes(p => ({ ...p, wo: e.target.checked }))} />
                  W.O.
                </label>
                <button onClick={saveRes} disabled={saving} className="pa-btn-save pa-btn-green" style={{ cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, flex: isCardView ? 1 : 'none' }}>
                  {saving ? '...' : 'Guardar resultado'}
                </button>
              </div>
            </>
          )}
          {msg && <p className={msg.startsWith('⚠') || msg.startsWith('Error') ? 'pa-feedback-err' : 'pa-feedback-ok'}>{msg}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PartidosAdmin() {
  const isCardView = useIsMobile(720)
  const { refreshTorneos } = useTorneo()
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
  const [filterSearch, setFilterSearch] = useState('')
  const [openIds, setOpenIds] = useState([])
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [autoLlaveMsg, setAutoLlaveMsg] = useState('')
  const [generatingAutoLlave, setGeneratingAutoLlave] = useState(false)
  const [pendingAutoLlave, setPendingAutoLlave] = useState(null)

  const unsubZonasRef = useRef(null)
  const unsubPartidosRef = useRef(null)
  const unsubLlavesRef = useRef(null)

  useEffect(() => { loadTorneos() }, [])

  // Live-subscribed instead of one-time getDocs: two admins/colaboradores can
  // have this screen open at once, and results loaded elsewhere (or a bracket
  // regenerated from TorneosAdmin) need to show up here without a manual refresh.
  useEffect(() => {
    if (!activeTorneoId) return
    setOpenIds([])
    setLoading(true)
    setFilterZona('all'); setFilterJornada('all'); setFilterEstado('all'); setFilterSearch('')
    setPage(1)
    // A pending "generate bracket?" prompt belongs to whichever tournament was
    // active when it fired — it must not follow the admin to a different tab.
    setPendingAutoLlave(null)
    // Clear out the previous tournament's data immediately — otherwise it lingers
    // (mismatched against the new activeTorneoId) until the new listeners fire,
    // which could feed stale data into the "all matches done" check below.
    setZonas([]); setPartidos([]); setLlaves([])

    if (unsubZonasRef.current) { unsubZonasRef.current(); unsubZonasRef.current = null }
    if (unsubPartidosRef.current) { unsubPartidosRef.current(); unsubPartidosRef.current = null }
    if (unsubLlavesRef.current) { unsubLlavesRef.current(); unsubLlavesRef.current = null }

    // Tracked locally to THIS subscription (not via React state/useEffect deps):
    // when switching tournaments, a separate effect reacting to `partidos`/`llaves`
    // state can run with the previous tournament's still-stale values before this
    // effect's own resets are reflected in a new render, incorrectly flagging the
    // newly-selected tournament as "ready for a bracket". These closures are
    // recreated fresh per activeTorneoId, so there's no cross-tournament mix-up.
    const torneoIdForThisSubscription = activeTorneoId
    let latestPartidos = []
    let latestLlaves = []
    function checkAllPartidosDone() {
      if (latestPartidos.length === 0) return
      const allDone = latestPartidos.every(p => p.estado === 'Finalizado' || p.estado === 'W.O.')
      if (allDone && latestLlaves.length === 0) setPendingAutoLlave(torneoIdForThisSubscription)
    }

    unsubZonasRef.current = onSnapshot(
      query(collection(db, 'torneos', activeTorneoId, 'zonas'), orderBy('orden')),
      snap => setZonas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    let firstPartidos = true
    unsubPartidosRef.current = onSnapshot(
      collection(db, 'torneos', activeTorneoId, 'partidos'),
      snap => {
        latestPartidos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setPartidos(latestPartidos)
        if (firstPartidos) { setLoading(false); firstPartidos = false }
        checkAllPartidosDone()
      },
      () => setLoading(false)
    )

    // Only auto-pick the view mode ('grupos' vs 'llave') on the first snapshot for
    // this tournament — after that, later score updates shouldn't yank the admin's
    // manually-selected tab back.
    let firstLlaves = true
    unsubLlavesRef.current = onSnapshot(
      collection(db, 'torneos', activeTorneoId, 'llaves'),
      snap => {
        latestLlaves = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || (a.matchIndex ?? 0) - (b.matchIndex ?? 0))
        setLlaves(latestLlaves)
        if (firstLlaves) { setViewMode(latestLlaves.length > 0 ? 'llave' : 'grupos'); firstLlaves = false }
        checkAllPartidosDone()
      }
    )

    return () => {
      if (unsubZonasRef.current) { unsubZonasRef.current(); unsubZonasRef.current = null }
      if (unsubPartidosRef.current) { unsubPartidosRef.current(); unsubPartidosRef.current = null }
      if (unsubLlavesRef.current) { unsubLlavesRef.current(); unsubLlavesRef.current = null }
    }
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

  function handleUpdated(updated) {
    setPartidos(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  async function handleConfirmAutoLlave() {
    const tid = pendingAutoLlave
    if (!tid) return
    setPendingAutoLlave(null)
    setGeneratingAutoLlave(true)
    try {
      await generateBracket(tid)
      setViewMode('llave')
      setActiveTorneo(prev => prev ? { ...prev, estado: 'Llave' } : prev)
      // Keeps the public side (TorneoContext) in sync — otherwise its `torneos`
      // list only refetches on a full page reload, and things gated on
      // torneo.estado (like the bracket tab even existing) stay stale.
      refreshTorneos()
      setAutoLlaveMsg('¡Listo! La llave fue generada.')
    } catch (err) {
      setAutoLlaveMsg('Error al generar la llave: ' + (err.message || 'Error desconocido'))
    }
    setGeneratingAutoLlave(false)
  }

  function handleLlaveUpdated(updated) {
    setLlaves(prev => prev.map(l => l.id === updated.id ? updated : l))
  }

  function toggleOpen(id) {
    setOpenIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  const jornadas = useMemo(() => [...new Set(partidos.map(p => p.jornada))].sort((a, b) => a - b), [partidos])

  const filtered = useMemo(() => {
    const q = filterSearch.trim().toLowerCase()
    return partidos
      .filter(p => {
        if (filterZona !== 'all' && p.zonaId !== filterZona) return false
        if (filterJornada !== 'all' && p.jornada !== Number(filterJornada)) return false
        if (filterEstado !== 'all' && p.estado !== filterEstado) return false
        if (q) {
          const names = [p.duplaA?.jugador1, p.duplaA?.jugador2, p.duplaB?.jugador1, p.duplaB?.jugador2]
          if (!names.some(n => n?.toLowerCase().includes(q))) return false
        }
        return true
      })
      // Chronological schedule order (fecha, then hora) first, jornada/zona as tiebreak
      // for matches that share (or lack) a scheduled time.
      .sort((a, b) =>
        (a.fecha || '9999-99-99').localeCompare(b.fecha || '9999-99-99') ||
        (a.hora || '99:99').localeCompare(b.hora || '99:99') ||
        a.jornada - b.jornada ||
        (a.zonaNombre || '').localeCompare(b.zonaNombre || '')
      )
  }, [partidos, filterZona, filterJornada, filterEstado, filterSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const rounds = useMemo(() => {
    const roundNums = [...new Set(llaves.map(l => l.round))].sort((a, b) => a - b)
    return roundNums.map(r => ({
      round: r,
      name: llaves.find(l => l.round === r)?.roundName || `Ronda ${r}`,
      matches: llaves.filter(l => l.round === r),
    }))
  }, [llaves])

  // Which rounds play a full 3rd set is configurable per tournament
  // (tercerSetDesde), counted backwards from the final so it works regardless
  // of how many total rounds this particular bracket has.
  const maxRound = rounds.length > 0 ? rounds[rounds.length - 1].round : 0
  const tercerSetOffset = ROUND_OFFSET_FROM_FINAL[activeTorneo?.tercerSetDesde] ?? ROUND_OFFSET_FROM_FINAL.semifinal

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 className="pa-page-title">Partidos</h2>
        <p className="pa-page-desc">Horarios, canchas y carga de resultados</p>
      </div>

      {torneos.length > 1 && (
        <div className="pa-tab-row">
          {torneos.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTorneo(t); setActiveTorneoId(t.id) }}
              className={`pa-torneo-tab${activeTorneo?.id === t.id ? ' active' : ''}`}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      )}

      {pendingAutoLlave && pendingAutoLlave === activeTorneoId && (
        <div className="pa-alert pa-alert-prompt">
          <span className="pa-alert-text">🏅 ¡Todos los partidos de grupos terminaron! ¿Generar la llave ahora?</span>
          <div className="pa-alert-actions">
            <button onClick={() => setPendingAutoLlave(null)} className="pa-alert-btn-ghost">Todavía no</button>
            <button onClick={handleConfirmAutoLlave} className="pa-alert-btn-solid">Generar llave</button>
          </div>
        </div>
      )}

      {generatingAutoLlave && (
        <div className="pa-alert">
          <span className="pa-alert-text">
            <span className="pa-alert-spinner" />
            Generando llave...
          </span>
        </div>
      )}

      {autoLlaveMsg && !generatingAutoLlave && (
        <div className="pa-alert">
          <span className="pa-alert-text">🏅 {autoLlaveMsg}</span>
          <button onClick={() => setAutoLlaveMsg('')} className="pa-alert-close">×</button>
        </div>
      )}

      {/* View mode toggle (shown when bracket exists) */}
      {llaves.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <AppSelect
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: 'grupos', label: `Fase de Grupos (${partidos.length})` },
              { value: 'llave',  label: `Llave (${llaves.filter(l => l.estado !== 'BYE').length} partidos)` },
            ]}
            minWidth={220}
          />
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          {/* ── GRUPO VIEW ─────────────────────────────────────────────────── */}
          {viewMode === 'grupos' && (
            <>
              <div className="pa-filter-bar">
                <span className="pa-filter-label">ZONA</span>
                <AppSelect
                  value={filterZona}
                  onChange={v => { setFilterZona(v); setPage(1) }}
                  options={[
                    { value: 'all', label: 'Todas las zonas' },
                    ...zonas.map(z => ({ value: z.id, label: z.nombre })),
                  ]}
                  minWidth={160}
                />
                <span className="pa-filter-label">JORNADA</span>
                <AppSelect
                  value={filterJornada}
                  onChange={v => { setFilterJornada(v); setPage(1) }}
                  options={[
                    { value: 'all', label: 'Todas' },
                    ...jornadas.map(j => ({ value: String(j), label: `J${j}` })),
                  ]}
                  minWidth={100}
                />
                <span className="pa-filter-label">ESTADO</span>
                <AppSelect
                  value={filterEstado}
                  onChange={v => { setFilterEstado(v); setPage(1) }}
                  options={[
                    { value: 'all',          label: 'Todos' },
                    { value: 'Programado',   label: 'Programado' },
                    { value: 'En juego',     label: 'En juego' },
                    { value: 'Demorado',     label: 'Demorado' },
                    { value: 'Reprogramado', label: 'Reprogramado' },
                    { value: 'Finalizado',   label: 'Finalizado' },
                  ]}
                  minWidth={150}
                />
                <div className="pa-search-wrap">
                  <span className="pa-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar jugador..."
                    value={filterSearch}
                    onChange={e => { setFilterSearch(e.target.value); setPage(1) }}
                    className="pa-search-input"
                  />
                  {filterSearch && (
                    <button onClick={() => { setFilterSearch(''); setPage(1) }} className="pa-search-clear">×</button>
                  )}
                </div>
                <div className="pa-page-size-group">
                  <span className="pa-page-size-label">Ver</span>
                  {[10, 25, 50].map(n => (
                    <button
                      key={n}
                      onClick={() => { setPageSize(n); setPage(1) }}
                      className={`pa-pagesize-btn${pageSize === n ? ' active' : ''}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {openIds.length > 0 && (
                <div className="pa-accordion-hint">
                  <span>{openIds.length}/2 acordeones abiertos</span>
                </div>
              )}

              {filtered.length === 0 ? (
                <div className="pa-empty">
                  No hay partidos para mostrar con los filtros actuales.
                </div>
              ) : (
                <>
                  <div className="pa-table-wrap">
                    {!isCardView && (
                      <div className="pa-thead-grupos">
                        {['Zona', 'Jornada', 'Dupla A', 'Dupla B', 'Estado', ''].map(h => (
                          <div key={h} className="pa-th">{h}</div>
                        ))}
                      </div>
                    )}
                    {paginated.map(m => (
                      <MatchRow
                        key={m.id}
                        match={m}
                        torneoId={activeTorneo.id}
                        modalidad={activeTorneo.modalidadTorneo}
                        onUpdated={handleUpdated}
                        open={openIds.includes(m.id)}
                        onToggle={() => toggleOpen(m.id)}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="pa-pagination">
                      <span>{filtered.length} partidos · página {safePage} de {totalPages}</span>
                      <div className="pa-pagination-btns">
                        <button onClick={() => setPage(1)} disabled={safePage === 1} className="pa-page-btn">«</button>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="pa-page-btn">‹</button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
                          const pg = start + i
                          return pg <= totalPages ? (
                            <button key={pg} onClick={() => setPage(pg)} className={`pa-page-num-btn${pg === safePage ? ' active' : ''}`}>{pg}</button>
                          ) : null
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="pa-page-btn">›</button>
                        <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="pa-page-btn">»</button>
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
                <div className="pa-empty">No hay partidos de llave generados aún.</div>
              ) : rounds.map(({ round, name, matches }) => (
                <div key={round} className="pa-round-section">
                  <div className="pa-round-header">
                    <div className="pa-round-accent" />
                    <span className="pa-round-name">{name}</span>
                    <div className="pa-round-rule" />
                  </div>
                  <div className="pa-table-wrap">
                    {!isCardView && (
                      <div className="pa-thead-llave">
                        {['Ronda', 'Dupla A', 'Dupla B', 'Estado', ''].map(h => (
                          <div key={h} className="pa-th">{h}</div>
                        ))}
                      </div>
                    )}
                    {matches.map(l => (
                      <LlaveRow
                        key={l.id}
                        llave={l}
                        torneoId={activeTorneo.id}
                        modalidad={activeTorneo.modalidadTorneo}
                        allowThirdSet={maxRound - round <= tercerSetOffset}
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
