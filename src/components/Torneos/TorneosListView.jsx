import { useNavigate } from 'react-router-dom'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'

const ESTADO_CONFIG = {
  'En curso':   { badgeClass: 'badge badge-green',  label: 'En curso',     dot: true },
  'Llave':      { badgeClass: 'badge badge-orange',  label: 'Llave final',  dot: false },
  'Inscripción':{ badgeClass: 'badge badge-blue',    label: 'Inscripción',  dot: false },
  'Finalizado': { badgeClass: 'badge badge-muted',   label: 'Finalizado',   dot: false },
}

function formatDate(ts) {
  if (!ts) return ''
  const ms = ts.seconds ? ts.seconds * 1000 : ts
  return new Date(ms).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TorneosListView() {
  const { torneos, loading } = useTorneo()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  if (loading && torneos.length === 0) return <Spinner />

  return (
    <div className="view-container" style={{ maxWidth: 960 }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? 22 : 32 }} className="animate-fadein">
        <h1 className="section-title">Torneos</h1>
        <p className="section-subtitle">
          {torneos.length} torneo{torneos.length !== 1 ? 's' : ''} registrado{torneos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {torneos.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 64,
          background: 'rgba(17,24,39,.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: 20,
          border: '1px dashed rgba(255,255,255,.08)',
          color: 'rgba(255,255,255,.45)',
        }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🎾</div>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>No hay torneos aún</p>
          <p style={{ margin: 0, fontSize: 14 }}>Creá un torneo nuevo desde el panel de administración.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: isMobile ? 12 : 18,
        }}>
          {torneos.map((t, i) => {
            const cfg = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG['Finalizado']
            return (
              <button
                key={t.id}
                className="torneo-card animate-fadein"
                style={{ animationDelay: `${i * 0.06}s` }}
                onClick={() => navigate(`/torneos/${t.id}`)}
              >
                {/* Top row: icon + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(255,122,0,.18), rgba(255,157,47,.08))',
                    border: '1px solid rgba(255,122,0,.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    🏆
                  </div>
                  <span className={cfg.badgeClass}>
                    {cfg.dot && (
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                    )}
                    {cfg.label}
                  </span>
                </div>

                {/* Name + desc */}
                <div>
                  <div style={{
                    color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 5,
                    letterSpacing: '-.02em', lineHeight: 1.25,
                    fontFamily: 'var(--font-display)',
                  }}>
                    {t.nombre}
                  </div>
                  {t.descripcion && (
                    <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, lineHeight: 1.5 }}>
                      {t.descripcion}
                    </div>
                  )}
                </div>

                {/* Footer: date + CTA */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,.28)', fontSize: 12 }}>{formatDate(t.createdAt)}</span>
                  <span style={{ color: 'var(--orange-light)', fontSize: 13, fontWeight: 600 }}>Ver detalles →</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
