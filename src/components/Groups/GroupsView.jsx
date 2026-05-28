import { useRef } from 'react'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'
import './GroupsView.css'

const ZONE_COLORS = ['#f97316', '#a855f7', '#3b82f6', '#10b981', '#ec4899', '#f59e0b', '#6366f1', '#14b8a6']

export default function GroupsView() {
  const { activeTorneo, zonas, loading } = useTorneo()
  const isMobile = useIsMobile()
  const shareRef = useRef(null)

  return (
    <div className="gv-page" style={{ padding: isMobile ? '20px 12px' : '28px 24px' }}>
      <div className="gv-header" style={{ marginBottom: isMobile ? 16 : 22 }}>
        <div>
          <h2 style={{ color: '#f1f1f5', fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.5px' }}>
            Fase de Grupos
          </h2>
          {activeTorneo && (
            <p className="gv-subtitle">
              {zonas.length} zona{zonas.length !== 1 ? 's' : ''} · {zonas.reduce((s, z) => s + (z.duplas?.length || 0), 0)} duplas
            </p>
          )}
        </div>
        {activeTorneo && <ShareButton targetRef={shareRef} title="Fase de Grupos" filename="grupos-villapadel" />}
      </div>

      {loading ? (
        <Spinner />
      ) : activeTorneo && activeTorneo.estado === 'Inscripción' ? (
        <div className="gv-empty">
          <div className="gv-empty-icon">📋</div>
          <p className="gv-empty-title">Torneo en etapa de Inscripción</p>
          <p className="gv-empty-desc">Las zonas se generan automáticamente al cerrar las inscripciones.</p>
        </div>
      ) : (
        <div ref={shareRef} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {zonas.map((zona, zi) => {
            const color = ZONE_COLORS[zi % ZONE_COLORS.length]
            return (
              <div key={zona.id} className="gv-zone-card">
                <div className="gv-zone-header">
                  <div className="gv-zone-dot" style={{ background: color }} />
                  <span className="gv-zone-name">{zona.nombre}</span>
                  <span className="gv-zone-count">{zona.duplas?.length || 0} duplas</span>
                </div>
                <div className="gv-duplas-list">
                  {(zona.duplas || []).map((dupla, idx) => (
                    <div
                      key={dupla.id}
                      className="gv-dupla-row"
                      style={{ borderBottom: idx < zona.duplas.length - 1 ? '1px solid #20202c' : 'none' }}
                    >
                      <span
                        className="gv-dupla-num"
                        style={{
                          background: idx === 0 ? `${color}30` : '#2a2a38',
                          border: idx === 0 ? `1.5px solid ${color}` : 'none',
                          color: idx === 0 ? color : '#9999b0',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className="gv-padel-icon">🎾</span>
                      <div>
                        <div className="gv-dupla-p1">{dupla.jugador1}</div>
                        <div className="gv-dupla-p2">{dupla.jugador2}</div>
                      </div>
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
