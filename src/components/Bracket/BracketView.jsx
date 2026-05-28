import { useState, useMemo, useRef } from 'react'
import { useTorneo } from '../../contexts/TorneoContext'
import { useAuth } from '../../contexts/AuthContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import { saveLlaveResultado } from '../../firebase/torneoService'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'

const CARD_W = 224
const BASE_H = 120
const CONN_W = 44
const LINE = '#2a2a38'
const HALF = CONN_W / 2

function TeamRow({ team, pts, isWinner }) {
  if (!team) {
    return (
      <div style={{ padding: '10px 12px', color: '#3a3a50', fontSize: 12, fontStyle: 'italic' }}>
        Por definir
      </div>
    )
  }
  return (
    <div style={{ padding: '8px 12px', background: isWinner ? 'rgba(249,115,22,0.08)' : 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25, color: isWinner ? '#f97316' : '#f1f1f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team.jugador1}
        </div>
        <div style={{ fontSize: 11, color: '#9999b0', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team.jugador2}
        </div>
      </div>
      {team.seed != null && (
        <span style={{ fontSize: 9, color: '#6a6a80', fontWeight: 700, flexShrink: 0 }}>S{team.seed}</span>
      )}
      {pts != null && (
        <span style={{ fontSize: 15, fontWeight: 800, flexShrink: 0, minWidth: 18, textAlign: 'right', color: isWinner ? '#f97316' : '#6a6a80' }}>
          {pts}
        </span>
      )}
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
      style={{
        background: '#1a1a22',
        border: `1px solid ${played ? 'rgba(249,115,22,0.25)' : '#2a2a38'}`,
        borderRadius: 10, overflow: 'hidden',
        cursor: canEdit ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (canEdit) { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.boxShadow = '0 0 12px rgba(249,115,22,0.12)' } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = played ? 'rgba(249,115,22,0.25)' : '#2a2a38'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ padding: '4px 10px', background: '#13131a', borderBottom: '1px solid #2a2a38', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#6a6a80', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {llave.roundName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {llave.estado === 'W.O.' && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>W.O.</span>}
          {isBye && <span style={{ fontSize: 9, color: '#6366f1', fontWeight: 700 }}>BYE</span>}
          {canEdit && <span style={{ fontSize: 10, color: '#f97316', opacity: 0.7 }}>✎</span>}
        </div>
      </div>
      <TeamRow team={llave.duplaA} pts={played ? llave.ptsA : null} isWinner={winnerA} />
      <div style={{ height: 1, background: '#20202c', margin: '0 8px' }} />
      <TeamRow team={llave.duplaB} pts={played ? llave.ptsB : null} isWinner={winnerB} />
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
    <div style={{
      position: 'relative',
      background: 'linear-gradient(160deg, rgba(251,191,36,0.1) 0%, #141208 40%, rgba(249,115,22,0.06) 100%)',
      border: '1px solid rgba(251,191,36,0.38)',
      borderRadius: compact ? 12 : 16,
      padding: compact ? '18px 14px' : '32px 28px',
      textAlign: 'center',
      overflow: 'hidden',
      width: compact ? CARD_W : undefined,
      boxShadow: '0 0 40px rgba(251,191,36,0.08), 0 4px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)',
        width: '200%', height: '55%',
        background: 'radial-gradient(ellipse, rgba(251,191,36,0.16) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'absolute', top: 8, left: 10, color: '#fbbf24', fontSize: compact ? 8 : 12, opacity: 0.5 }}>✦</div>
      <div style={{ position: 'absolute', top: 8, right: 10, color: '#fbbf24', fontSize: compact ? 8 : 12, opacity: 0.5 }}>✦</div>

      <div style={{ fontSize: compact ? 30 : 52, lineHeight: 1, marginBottom: compact ? 8 : 12, position: 'relative' }}>🏆</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: compact ? 10 : 16 }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(251,191,36,0.5))' }} />
        <span style={{ fontSize: compact ? 7 : 9, fontWeight: 800, letterSpacing: '2px', color: '#fbbf24', textTransform: 'uppercase' }}>
          Campeones
        </span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(251,191,36,0.5))' }} />
      </div>

      <div style={{
        fontSize: compact ? 13 : 20, fontWeight: 800, color: '#fef3c7', lineHeight: 1.3, marginBottom: 3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {champion.jugador1}
      </div>
      <div style={{
        fontSize: compact ? 11 : 15, fontWeight: 600, color: '#f97316',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {champion.jugador2}
      </div>

      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
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

  const inp = {
    background: '#16161e', border: '1px solid #2a2a38', borderRadius: 7,
    padding: '10px 8px', color: '#f1f1f5', fontSize: 16, fontWeight: 700,
    width: '100%', outline: 'none', boxSizing: 'border-box', textAlign: 'center',
  }

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div style={{ background: '#1a1a22', borderRadius: 14, border: '1px solid #2a2a38', width: '100%', maxWidth: 400, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: '#f1f1f5', fontSize: 16, fontWeight: 700, margin: 0 }}>{llave.roundName}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#9999b0', fontSize: 11, fontWeight: 600, textAlign: 'center', marginBottom: 6 }}>{llave.duplaA?.jugador1}</div>
            <input type="number" min="0" max="3" placeholder="0" value={form.setsA}
              onChange={e => setForm(p => ({ ...p, setsA: e.target.value }))} style={inp}
              onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = '#2a2a38'} />
          </div>
          <span style={{ color: '#6a6a80', fontSize: 13, fontWeight: 600, paddingTop: 22 }}>vs</span>
          <div>
            <div style={{ color: '#9999b0', fontSize: 11, fontWeight: 600, textAlign: 'center', marginBottom: 6 }}>{llave.duplaB?.jugador1}</div>
            <input type="number" min="0" max="3" placeholder="0" value={form.setsB}
              onChange={e => setForm(p => ({ ...p, setsB: e.target.value }))} style={inp}
              onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = '#2a2a38'} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginBottom: 18 }}>
          <input type="number" min="0" placeholder="Games A" value={form.gamesA}
            onChange={e => setForm(p => ({ ...p, gamesA: e.target.value }))} style={{ ...inp, fontSize: 13, fontWeight: 400 }}
            onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = '#2a2a38'} />
          <span style={{ color: '#6a6a80', fontSize: 11, textAlign: 'center' }}>games</span>
          <input type="number" min="0" placeholder="Games B" value={form.gamesB}
            onChange={e => setForm(p => ({ ...p, gamesB: e.target.value }))} style={{ ...inp, fontSize: 13, fontWeight: 400 }}
            onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = '#2a2a38'} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 20 }}>
          <input type="checkbox" checked={form.wo} onChange={e => setForm(p => ({ ...p, wo: e.target.checked }))}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#f97316' }} />
          <span style={{ color: '#9999b0', fontSize: 13 }}>W.O. (walkover)</span>
        </label>

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 14 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '8px 18px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
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
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? 16 : 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>Llave</h1>
          {activeTorneo && (
            <p style={{ color: '#9999b0', fontSize: 14, margin: 0 }}>
              {activeTorneo.nombre}{finalRoundName ? ` · hasta ${finalRoundName}` : ''}
            </p>
          )}
        </div>
        {rounds.length > 0 && <ShareButton targetRef={shareRef} title="Llave" filename="llave-villapadel" />}
      </div>

      {/* Tournament selector */}
      {torneos.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              value={activeTorneo?.id || ''}
              onChange={e => setActiveTorneoId(e.target.value)}
              style={{ background: '#13131a', border: '1px solid #3a3a50', borderRadius: 8, color: '#f1f1f5', fontSize: 13, fontWeight: 500, padding: '8px 32px 8px 12px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
            >
              {torneos.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre}{t.estado === 'Llave' ? ' · Llave' : t.estado === 'En curso' ? ' · En curso' : ''}
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: '#f97316', fontSize: 11 }}>▾</span>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Spinner />
      ) : !activeTorneo ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#1a1a22', borderRadius: 12, border: '1px dashed #2a2a38', color: '#9999b0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f1f1f5' }}>No hay torneos</p>
        </div>
      ) : activeTorneo.estado !== 'Llave' ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', color: '#9999b0' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <p style={{ margin: '0 0 6px', fontSize: 15, color: '#f1f1f5', fontWeight: 600 }}>Fase de grupos en curso</p>
          <p style={{ margin: 0, fontSize: 13 }}>La llave se genera al finalizar la fase de grupos.</p>
        </div>
      ) : rounds.length === 0 ? (
        <Spinner />
      ) : isMobile ? (
        /* Mobile: vertical round list */
        <div ref={shareRef} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {champion && <ChampionCard champion={champion} />}
          {rounds.map((roundMatches, roundIdx) => (
            <div key={roundIdx}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                  color: roundIdx === totalRounds - 1 ? '#f97316' : '#6a6a80',
                  padding: '3px 10px', borderRadius: 20,
                  background: roundIdx === totalRounds - 1 ? 'rgba(249,115,22,0.12)' : 'rgba(100,100,160,0.1)',
                  border: `1px solid ${roundIdx === totalRounds - 1 ? 'rgba(249,115,22,0.3)' : '#2a2a38'}`,
                }}>
                  {roundMatches[0]?.roundName || ''}
                </span>
                <div style={{ flex: 1, height: 1, background: '#2a2a38' }} />
                <span style={{ color: '#6666a0', fontSize: 11 }}>{roundMatches.length} partido{roundMatches.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {roundMatches.map(llave => (
                  <MatchCard
                    key={llave.id}
                    llave={llave}
                    isAdmin={isAdmin}
                    onEdit={() => setEditLlave(llave)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: horizontal bracket */
        <div ref={shareRef} style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content', paddingTop: 8 }}>
            {rounds.map((roundMatches, roundIdx) => (
              <div key={roundIdx} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ paddingBottom: 14, paddingLeft: roundIdx === 0 ? 0 : HALF, width: CARD_W + CONN_W, textAlign: 'center', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                    color: roundIdx === totalRounds - 1 ? '#f97316' : '#6a6a80',
                    borderBottom: roundIdx === totalRounds - 1 ? '1px solid rgba(249,115,22,0.4)' : 'none',
                    paddingBottom: roundIdx === totalRounds - 1 ? 3 : 0,
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
            ))}

            {/* Champion column — inline with bracket, after Final */}
            {champion && (
              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ paddingBottom: 14 }}>
                  <span style={{ fontSize: 10, display: 'inline-block', lineHeight: '14px', visibility: 'hidden' }}>.</span>
                </div>
                <div style={{
                  height: rounds[0].length * BASE_H,
                  display: 'flex', alignItems: 'center',
                }}>
                  <div style={{ width: 28, height: 1, background: 'rgba(251,191,36,0.35)', flexShrink: 0 }} />
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
