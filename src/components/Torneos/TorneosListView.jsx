import { useNavigate } from 'react-router-dom'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import './TorneosListView.css'

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
      <div style={{ marginBottom: isMobile ? 22 : 32 }} className="animate-fadein">
        <h1 className="section-title">Torneos</h1>
        <p className="section-subtitle">
          {torneos.length} torneo{torneos.length !== 1 ? 's' : ''} registrado{torneos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {torneos.length === 0 ? (
        <div className="tl-empty">
          <div className="tl-empty-icon">🎾</div>
          <p className="tl-empty-title">No hay torneos aún</p>
          <p className="tl-empty-desc">Creá un torneo nuevo desde el panel de administración.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', gap: isMobile ? 12 : 18 }}>
          {torneos.map((t, i) => {
            const cfg = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG['Finalizado']
            return (
              <button
                key={t.id}
                className="torneo-card animate-fadein"
                style={{ animationDelay: `${i * 0.06}s` }}
                onClick={() => navigate(`/torneos/${t.id}`)}
              >
                <div className="tl-card-header-row">
                  <div className="tl-card-icon">🏆</div>
                  <span className={cfg.badgeClass}>
                    {cfg.dot && <span className="tl-live-dot" />}
                    {cfg.label}
                  </span>
                </div>

                <div>
                  <div className="tl-card-title">{t.nombre}</div>
                  {t.descripcion && <div className="tl-card-desc">{t.descripcion}</div>}
                </div>

                <div className="tl-card-footer">
                  <span className="tl-card-date">{formatDate(t.createdAt)}</span>
                  <span className="tl-card-cta">Ver detalles →</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
