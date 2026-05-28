import { useNavigate } from 'react-router-dom'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'

const ESTADO_CONFIG = {
  'En curso':   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',    label: 'En curso' },
  'Llave':      { color: '#f97316', bg: 'rgba(249,115,22,0.12)',   label: 'Llave final' },
  'Inscripción':{ color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   label: 'Inscripción' },
  'Finalizado': { color: '#6666a0', bg: 'rgba(102,102,160,0.12)',  label: 'Finalizado' },
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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 24px' }}>
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h1 style={{ color: '#f1f1f5', fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Torneos
        </h1>
        <p style={{ color: '#9999b0', fontSize: 14, margin: 0 }}>
          {torneos.length} torneo{torneos.length !== 1 ? 's' : ''} registrado{torneos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {torneos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#1a1a22', borderRadius: 12, border: '1px dashed #2a2a38', color: '#9999b0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎾</div>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#f1f1f5' }}>No hay torneos aún</p>
          <p style={{ margin: 0, fontSize: 14 }}>Creá un torneo nuevo desde el panel de administración.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 16,
        }}>
          {torneos.map(t => {
            const cfg = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG['Finalizado']
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/torneos/${t.id}`)}
                style={{
                  background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 14,
                  padding: '20px 22px', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                  display: 'flex', flexDirection: 'column', gap: 12, width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.background = '#1e1e28' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.background = '#1a1a22' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🏆</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.3px', background: cfg.bg, color: cfg.color, flexShrink: 0,
                  }}>
                    {cfg.label}
                  </span>
                </div>

                <div>
                  <div style={{ color: '#f1f1f5', fontSize: 17, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.3px' }}>
                    {t.nombre}
                  </div>
                  {t.descripcion && (
                    <div style={{ color: '#9999b0', fontSize: 13, lineHeight: 1.4 }}>{t.descripcion}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6666a0', fontSize: 12 }}>{formatDate(t.createdAt)}</span>
                  <span style={{ color: '#f97316', fontSize: 13, fontWeight: 600 }}>Ver detalles →</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
