import { useState, useMemo, useRef } from 'react'
import { useTorneo } from '../../contexts/TorneoContext'
import { useAuth } from '../../contexts/AuthContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import { saveLlaveResultado } from '../../firebase/torneoService'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'
import './BracketView.css'

const CARD_W = 224
const BASE_H = 120
const CONN_W = 44
const LINE = '#2a2a38'
const HALF = CONN_W / 2

function TeamRow({ team, pts, isWinner }) {
  if (!team) {
    return <div className="bv-team-empty">Por definir</div>
  }
  return (
    <div className="bv-team-row" style={{ background: isWinner ? 'rgba(249,115,22,0.08)' : 'transparent' }}>
      <div className="bv-team-names">
        <div className="bv-team-p1" style={{ color: isWinner ? '#f97316' : '#f1f1f5' }}>{team.jugador1}</div>
        <div className="bv-team-p2" style={{ color: isWinner ? '#f97316' : '#f1f1f5' }}>{team.jugador2}</div>
      </div>
      {team.seed != null && <span className="bv-team-seed">S{team.seed}</span>}
      {pts != null && <span className="bv-team-pts" style={{ color: isWinner ? '#f97316' : '#6a6a80' }}>{pts}</span>}
    </div>
  )
}

function MatchCard({ llave, isAdmin, onEdit }) {
  const played = llave.estado === 'Finalizado' || llave.estado === 'W.O.'
  const isBye = llave.estado === 'BYE'
  const isPending = llave.estado === 'Pendiente'
  const canEdit = isAdmin && !isPending && !isBye && llave.duplaA && llave.duplaB
  const winnerA = played && (llave.ptsA || 0) > (llave.ptsB || 0)
  const winnerB = played && (llave.ptsB || 0) > (llave.ptsA || 0)

  return (
    <div
      onClick={canEdit ? onEdit : undefined}
      className="bv-match-card"
      style={{ border: `1px solid ${played ? 'rgba(249,115,22,0.25)' : '#2a2a38'}`, cursor: canEdit ? 'pointer' : 'default' }}
      onMouseEnter={e => { if (canEdit) { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.boxShadow = '0 0 12px rgba(249,115,22,0.12)' } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = played ? 'rgba(249,115,22,0.25)' : '#2a2a38'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div className="bv-match-header">
        <span className="bv-round-label">{llave.roundName}</span>
        <div className="bv-header-badges">
          {llave.estado === 'W.O.' && <span className="bv-wo-badge">W.O.</span>}
          {isBye && <span className="bv-bye-badge">BYE</span>}
          {canEdit && <span className="bv-edit-icon">✎</span>}
        </div>
      </div>
      <TeamRow team={llave.duplaA} pts={played ? llave.resultado?.setsA : null} isWinner={winnerA} />
      <div className="bv-row-divider" />
      <TeamRow team={llave.duplaB} pts={played ? llave.resultado?.setsB : null} isWinner={winnerB} />
    </div>
  )
}

function BracketSlot({ llave, roundIdx, matchIdx, totalRounds, isAdmin, onEdit }) {
  const slotH = BASE_H * Math.pow(2, roundIdx)
  const isEven = matchIdx % 2 === 0
  const isFirstRound = roundIdx === 0
  const isLastRound = roundIdx === totalRounds - 1
  const cardLeft = isFirstRound ? 0 : HALF
  const rightConnW = isFirstRound ? CONN_W : HALF
  const vertX = cardLeft + CARD_W + rightConnW - 1

  return (
    <div style={{ height: slotH, position: 'relative', width: CARD_W + CONN_W, flexShrink: 0 }}>
      {!isFirstRound && (
        <div style={{ position: 'absolute', left: 0, top: '50%', width: HALF, height: 1, background: LINE, transform: 'translateY(-0.5px)' }} />
      )}
      <div style={{ position: 'absolute', left: cardLeft, width: CARD_W, top: '50%', transform: 'translateY(-50%)' }}>
        <MatchCard llave={llave} isAdmin={isAdmin} onEdit={onEdit} />
      </div>
      {!isLastRound && (
        <>
          <div style={{ position: 'absolute', left: cardLeft + CARD_W, top: '50%', width: rightConnW, height: 1, background: LINE, transform: 'translateY(-0.5px)' }} />
          <div style={{ position: 'absolute', left: vertX, top: isEven ? '50%' : 0, bottom: isEven ? 0 : '50%', width: 1, background: LINE }} />
        </>
      )}
    </div>
  )
}

function ChampionCard({ champion, compact = false }) {
  return (
    <div className="bv-champion" style={{
      borderRadius: compact ? 12 : 16,
      padding: compact ? '18px 14px' : '32px 28px',
      width: compact ? CARD_W : undefined,
    }}>
      <div className="bv-champion-glow" />
      <div className="bv-champion-star-tl" style={{ fontSize: compact ? 8 : 12 }}>✦</div>
      <div className="bv-champion-star-tr" style={{ fontSize: compact ? 8 : 12 }}>✦</div>

      <div className="bv-champion-trophy" style={{ fontSize: compact ? 30 : 52, marginBottom: compact ? 8 : 12 }}>🏆</div>

      <div className="bv-champion-divider" style={{ marginBottom: compact ? 10 : 16 }}>
        <div className="bv-champion-divider-l" />
        <span className="bv-champion-divider-label" style={{ fontSize: compact ? 7 : 9 }}>Campeones</span>
        <div className="bv-champion-divider-r" />
      </div>

      <div className="bv-champion-name" style={{ fontSize: compact ? 13 : 20 }}>{champion.jugador1}</div>
      <div className="bv-champion-sub" style={{ fontSize: compact ? 11 : 15 }}>{champion.jugador2}</div>

      {!compact && (
        <div className="bv-champion-stars">
          <span style={{ color: '#fbbf24', fontSize: 10, opacity: 0.4 }}>★</span>
          <span style={{ color: '#fbbf24', fontSize: 16 }}>★</span>
          <span style={{ color: '#fbbf24', fontSize: 10, opacity: 0.4 }}>★</span>
        </div>
      )}
    </div>
  )
}

function LlaveResultModal({ llave, torneoId, onClose }) {
  const [form, setForm] = useState({ setsA: '', setsB: '', gamesA: '', gamesB: '', wo: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const sA = Number(form.setsA), sB = Number(form.setsB)
    if (isNaN(sA) || isNaN(sB) || sA === sB || sA < 0 || sB < 0) {
      setError('El resultado es inválido (los sets no pueden ser iguales).')
      return
    }
    setError('')
    setSaving(true)
    try {
      await saveLlaveResultado(torneoId, llave.id, {
        setsA: sA, setsB: sB,
        gamesA: Number(form.gamesA) || 0,
        gamesB: Number(form.gamesB) || 0,
        wo: form.wo,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Error al guardar.')
      setSaving(false)
    }
  }

  return (
    <div className="bv-modal-overlay">
      <div className="bv-modal">
        <div className="bv-modal-header">
          <h3 className="bv-modal-title">{llave.roundName}</h3>
          <button onClick={onClose} className="bv-close-btn">×</button>
        </div>

        <div className="bv-teams-grid">
          <div>
            <div className="bv-team-label">{llave.duplaA?.jugador1}</div>
            <input type="number" min="0" max="3" placeholder="0" value={form.setsA}
              onChange={e => setForm(p => ({ ...p, setsA: e.target.value }))} className="bv-inp" />
          </div>
          <span className="bv-vs-label">vs</span>
          <div>
            <div className="bv-team-label">{llave.duplaB?.jugador1}</div>
            <input type="number" min="0" max="3" placeholder="0" value={form.setsB}
              onChange={e => setForm(p => ({ ...p, setsB: e.target.value }))} className="bv-inp" />
          </div>
        </div>

        <div className="bv-games-grid">
          <input type="number" min="0" placeholder="Games A" value={form.gamesA}
            onChange={e => setForm(p => ({ ...p, gamesA: e.target.value }))} className="bv-inp bv-inp-sm" />
          <span className="bv-games-label">games</span>
          <input type="number" min="0" placeholder="Games B" value={form.gamesB}
            onChange={e => setForm(p => ({ ...p, gamesB: e.target.value }))} className="bv-inp bv-inp-sm" />
        </div>

        <label className="bv-wo-label">
          <input type="checkbox" checked={form.wo} onChange={e => setForm(p => ({ ...p, wo: e.target.checked }))} className="bv-wo-check" />
          <span className="bv-wo-text">W.O. (walkover)</span>
        </label>

        {error && <p className="bv-error">{error}</p>}

        <div className="bv-modal-actions">
          <button onClick={onClose} className="bv-btn-cancel">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="bv-btn-save">
            {saving ? 'Guardando...' : 'Guardar resultado'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BracketView() {
  const { isAdmin } = useAuth()
  const { torneos, activeTorneo, setActiveTorneoId, llaves, loading } = useTorneo()
  const isMobile = useIsMobile()
  const shareRef = useRef(null)
  const [editLlave, setEditLlave] = useState(null)

  const rounds = useMemo(() => {
    if (llaves.length === 0) return []
    const grouped = {}
    for (const l of llaves) {
      const r = l.round - 1
      if (!grouped[r]) grouped[r] = []
      grouped[r].push(l)
    }
    for (const r in grouped) grouped[r].sort((a, b) => a.matchIndex - b.matchIndex)
    const maxRound = Math.max(...llaves.map(l => l.round - 1))
    const arr = []
    for (let r = 0; r <= maxRound; r++) arr.push(grouped[r] || [])
    return arr
  }, [llaves])

  const totalRounds = rounds.length
  const finalRoundName = totalRounds > 0 ? rounds[totalRounds - 1]?.[0]?.roundName : ''
  const finalMatch = totalRounds > 0 ? rounds[totalRounds - 1]?.[0] : null
  const isFinalDone = finalMatch && (finalMatch.estado === 'Finalizado' || finalMatch.estado === 'W.O.')
  const champion = isFinalDone
    ? ((finalMatch.ptsA ?? 0) > (finalMatch.ptsB ?? 0) ? finalMatch.duplaA : finalMatch.duplaB)
    : null

  return (
    <div className="bv-page" style={{ padding: isMobile ? '20px 12px' : '32px 24px' }}>
      <div className="bv-header" style={{ marginBottom: isMobile ? 16 : 28 }}>
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Llave</h1>
          {activeTorneo && (
            <p className="bv-subtitle">
              {activeTorneo.nombre}{finalRoundName ? ` · hasta ${finalRoundName}` : ''}
            </p>
          )}
        </div>
        {rounds.length > 0 && <ShareButton targetRef={shareRef} title="Llave" filename="llave-villapadel" />}
      </div>

      {activeTorneo?.estado === 'Llave' && activeTorneo.llaveExcluidos?.length > 0 && (
        <div className="bv-excluidos-notice">
          {activeTorneo.llaveExcluidos.length === 1 ? 'Quedó afuera de la llave por redondeo: ' : `Quedaron afuera de la llave por redondeo (${activeTorneo.llaveExcluidos.length}): `}
          {activeTorneo.llaveExcluidos.map(d => `${d.jugador1}/${d.jugador2}`).join(', ')}
        </div>
      )}

      {torneos.length > 1 && (
        <div className="bv-selector">
          <div className="bv-select-wrap">
            <select
              value={activeTorneo?.id || ''}
              onChange={e => setActiveTorneoId(e.target.value)}
              className="bv-select"
            >
              {torneos.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre}{t.estado === 'Llave' ? ' · Llave' : t.estado === 'En curso' ? ' · En curso' : ''}
                </option>
              ))}
            </select>
            <span className="bv-select-arrow">▾</span>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : !activeTorneo ? (
        <div className="bv-empty">
          <div className="bv-empty-icon">🏆</div>
          <p className="bv-empty-title">No hay torneos</p>
        </div>
      ) : activeTorneo.estado !== 'Llave' ? (
        <div className="bv-info">
          <div className="bv-info-icon">📋</div>
          <p className="bv-info-title">Fase de grupos en curso</p>
          <p className="bv-info-desc">La llave se genera al finalizar la fase de grupos.</p>
        </div>
      ) : rounds.length === 0 ? (
        <Spinner />
      ) : isMobile ? (
        <div ref={shareRef} className="bv-mobile-rounds">
          {champion && <ChampionCard champion={champion} />}
          {rounds.map((roundMatches, roundIdx) => {
            const isFinal = roundIdx === totalRounds - 1
            return (
              <div key={roundIdx}>
                <div className="bv-mobile-round-header">
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                    color: isFinal ? '#f97316' : '#6a6a80',
                    padding: '3px 10px', borderRadius: 20,
                    background: isFinal ? 'rgba(249,115,22,0.12)' : 'rgba(100,100,160,0.1)',
                    border: `1px solid ${isFinal ? 'rgba(249,115,22,0.3)' : '#2a2a38'}`,
                  }}>
                    {roundMatches[0]?.roundName || ''}
                  </span>
                  <div className="bv-mobile-divider" />
                  <span className="bv-mobile-count">{roundMatches.length} partido{roundMatches.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="bv-mobile-matches">
                  {roundMatches.map(llave => (
                    <MatchCard key={llave.id} llave={llave} isAdmin={isAdmin} onEdit={() => setEditLlave(llave)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div ref={shareRef} className="bv-bracket-wrap">
          <div className="bv-bracket-inner">
            {rounds.map((roundMatches, roundIdx) => {
              const isFinal = roundIdx === totalRounds - 1
              return (
                <div key={roundIdx} className="bv-round-col">
                  <div className="bv-round-name-wrap" style={{ paddingLeft: roundIdx === 0 ? 0 : HALF, width: CARD_W + CONN_W }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                      color: isFinal ? '#f97316' : '#6a6a80',
                      borderBottom: isFinal ? '1px solid rgba(249,115,22,0.4)' : 'none',
                      paddingBottom: isFinal ? 3 : 0,
                    }}>
                      {roundMatches[0]?.roundName || ''}
                    </span>
                  </div>
                  {roundMatches.map((llave, matchIdx) => (
                    <BracketSlot
                      key={llave.id}
                      llave={llave}
                      roundIdx={roundIdx}
                      matchIdx={matchIdx}
                      totalRounds={totalRounds}
                      isAdmin={isAdmin}
                      onEdit={() => setEditLlave(llave)}
                    />
                  ))}
                </div>
              )
            })}

            {champion && (
              <div className="bv-champion-col">
                <div className="bv-champion-label-spacer">
                  <span style={{ fontSize: 10, display: 'inline-block', lineHeight: '14px', visibility: 'hidden' }}>.</span>
                </div>
                <div className="bv-champion-content" style={{ height: rounds[0].length * BASE_H }}>
                  <div className="bv-champion-line" />
                  <ChampionCard champion={champion} compact />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editLlave && activeTorneo && (
        <LlaveResultModal
          llave={editLlave}
          torneoId={activeTorneo.id}
          onClose={() => setEditLlave(null)}
        />
      )}
    </div>
  )
}
