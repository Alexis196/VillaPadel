import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { seedTorneos } from '../../firebase/seedTorneos'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'

const ZONE_COLORS = ['#f97316', '#a855f7', '#3b82f6', '#10b981', '#ec4899', '#f59e0b', '#6366f1', '#14b8a6']

function DuplaBadge({ jugador1, jugador2 }) {
  return (
    <div>
      <div style={{ color: '#f1f1f5', fontSize: 14, lineHeight: 1.3 }}>
        {jugador1}
      </div>
      <div style={{ color: '#9999b0', fontSize: 12, lineHeight: 1.3 }}>
        {jugador2}
      </div>
    </div>
  )
}

export default function GroupsView() {
  const [torneos, setTorneos] = useState([])
  const [activeTorneo, setActiveTorneo] = useState(null)
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const shareRef = useRef(null)

  useEffect(() => { loadTorneos() }, [])

  useEffect(() => {
    if (activeTorneo) loadZonas(activeTorneo.id)
  }, [activeTorneo])

  async function loadTorneos() {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'torneos'), orderBy('createdAt', 'desc')))
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setTorneos(list)
    const active = list.find(t => t.estado === 'En curso') || list[0]
    if (active) setActiveTorneo(active)
    else setLoading(false)
  }

  async function loadZonas(torneoId) {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'torneos', torneoId, 'zonas'), orderBy('orden')))
    setZonas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  async function handleSeed() {
    setSeeding(true)
    await seedTorneos()
    setSeeded(true)
    setSeeding(false)
    await loadTorneos()
  }

  if (loading && torneos.length === 0) return <Spinner />

  const noData = torneos.length === 0

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Torneos
          </h1>
          {activeTorneo && (
            <p style={{ color: '#9999b0', fontSize: 14, margin: 0 }}>
              {activeTorneo.nombre} · {zonas.length} zona{zonas.length !== 1 ? 's' : ''} · {zonas.reduce((s, z) => s + (z.duplas?.length || 0), 0)} duplas
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!noData && <ShareButton targetRef={shareRef} title="Fase de Grupos" filename="grupos-villapadel" />}
          {/* Seed button if empty */}
          {noData && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              style={{
                background: '#f97316', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 14, fontWeight: 600,
                cursor: seeding ? 'wait' : 'pointer', opacity: seeding ? 0.7 : 1,
              }}
            >
              {seeding ? 'Cargando datos...' : '+ Cargar datos de ejemplo'}
            </button>
          )}
        </div>
      </div>

      {/* No data */}
      {noData && (
        <div style={{
          textAlign: 'center', padding: 60,
          background: '#1a1a22', borderRadius: 12, border: '1px dashed #2a2a38',
          color: '#9999b0',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎾</div>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#f1f1f5' }}>No hay torneos aún</p>
          <p style={{ margin: 0, fontSize: 14 }}>Cargá datos de ejemplo o creá un torneo nuevo desde Categorías.</p>
        </div>
      )}

      {/* Tournament selector */}
      {torneos.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              value={activeTorneo?.id || ''}
              onChange={e => setActiveTorneo(torneos.find(t => t.id === e.target.value))}
              style={{ background: '#13131a', border: '1px solid #3a3a50', borderRadius: 8, color: '#f1f1f5', fontSize: 13, fontWeight: 500, padding: '8px 32px 8px 12px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
            >
              {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.estado === 'En curso' ? ' · En curso' : t.estado === 'Inscripción' ? ' · Inscripción' : ''}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: '#f97316', fontSize: 11 }}>▾</span>
          </div>
        </div>
      )}

      {/* Zones grid */}
      {loading && activeTorneo ? (
        <Spinner />
      ) : activeTorneo && activeTorneo.estado === 'Inscripción' ? (
        <div style={{
          textAlign: 'center', padding: 60,
          background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38',
          color: '#9999b0',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <p style={{ margin: '0 0 6px', fontSize: 15, color: '#f1f1f5', fontWeight: 600 }}>Torneo en etapa de Inscripción</p>
          <p style={{ margin: 0, fontSize: 13 }}>Las zonas se generan automáticamente al cerrar las inscripciones.</p>
        </div>
      ) : (
        <div ref={shareRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {zonas.map((zona, zi) => {
            const color = ZONE_COLORS[zi % ZONE_COLORS.length]
            return (
              <div key={zona.id} style={{ background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}>
                {/* Zone header */}
                <div style={{
                  padding: '14px 20px', borderBottom: '1px solid #2a2a38',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#16161e',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ color: '#f1f1f5', fontWeight: 700, fontSize: 15 }}>{zona.nombre}</span>
                  <span style={{ marginLeft: 'auto', color: '#9999b0', fontSize: 12 }}>
                    {zona.duplas?.length || 0} duplas
                  </span>
                </div>

                {/* Duplas */}
                <div style={{ padding: '8px 0' }}>
                  {(zona.duplas || []).map((dupla, idx) => (
                    <div
                      key={dupla.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '11px 20px',
                        borderBottom: idx < zona.duplas.length - 1 ? '1px solid #20202c' : 'none',
                        transition: 'background 0.15s', cursor: 'default',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#20202c'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Position number */}
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: idx === 0 ? `${color}30` : '#2a2a38',
                        border: idx === 0 ? `1.5px solid ${color}` : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: idx === 0 ? color : '#9999b0',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {idx + 1}
                      </span>

                      {/* Racket icon */}
                      <span style={{ fontSize: 16 }}>🎾</span>

                      <DuplaBadge jugador1={dupla.jugador1} jugador2={dupla.jugador2} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
