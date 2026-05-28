import { useRef } from 'react'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'

const ZONE_COLORS = ['#f97316', '#a855f7', '#3b82f6', '#10b981', '#ec4899', '#f59e0b', '#6366f1', '#14b8a6']

function DuplaBadge({ jugador1, jugador2 }) {
  return (
    <div>
      <div style={{ color: '#f1f1f5', fontSize: 14, lineHeight: 1.3 }}>{jugador1}</div>
      <div style={{ color: '#9999b0', fontSize: 12, lineHeight: 1.3 }}>{jugador2}</div>
    </div>
  )
}

export default function GroupsView() {
  const { activeTorneo, zonas, loading } = useTorneo()
  const isMobile = useIsMobile()
  const shareRef = useRef(null)

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '20px 12px' : '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 16 : 22, gap: 16 }}>
        <div>
          <h2 style={{ color: '#f1f1f5', fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.5px' }}>
            Fase de Grupos
          </h2>
          {activeTorneo && (
            <p style={{ color: '#9999b0', fontSize: 13, margin: 0 }}>
              {zonas.length} zona{zonas.length !== 1 ? 's' : ''} · {zonas.reduce((s, z) => s + (z.duplas?.length || 0), 0)} duplas
            </p>
          )}
        </div>
        {activeTorneo && <ShareButton targetRef={shareRef} title="Fase de Grupos" filename="grupos-villapadel" />}
      </div>

      {/* Zones grid */}
      {loading ? (
        <Spinner />
      ) : activeTorneo && activeTorneo.estado === 'Inscripción' ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', color: '#9999b0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <p style={{ margin: '0 0 6px', fontSize: 15, color: '#f1f1f5', fontWeight: 600 }}>Torneo en etapa de Inscripción</p>
          <p style={{ margin: 0, fontSize: 13 }}>Las zonas se generan automáticamente al cerrar las inscripciones.</p>
        </div>
      ) : (
        <div ref={shareRef} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {zonas.map((zona, zi) => {
            const color = ZONE_COLORS[zi % ZONE_COLORS.length]
            return (
              <div key={zona.id} style={{ background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}>
                {/* Zone header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a2a38', display: 'flex', alignItems: 'center', gap: 10, background: '#16161e' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ color: '#f1f1f5', fontWeight: 700, fontSize: 15 }}>{zona.nombre}</span>
                  <span style={{ marginLeft: 'auto', color: '#9999b0', fontSize: 12 }}>{zona.duplas?.length || 0} duplas</span>
                </div>

                {/* Duplas */}
                <div style={{ padding: '8px 0' }}>
                  {(zona.duplas || []).map((dupla, idx) => (
                    <div
                      key={dupla.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', borderBottom: idx < zona.duplas.length - 1 ? '1px solid #20202c' : 'none', transition: 'background 0.15s', cursor: 'default' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#20202c'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
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
