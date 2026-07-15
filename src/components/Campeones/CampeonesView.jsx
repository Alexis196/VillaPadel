import { useEffect, useState } from 'react'
import { getCampeones } from '../../firebase/torneoService'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import './CampeonesView.css'

function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CampeonCard({ c }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card cc-card">
      <div className="cc-card-header">
        <div className="cc-trophy" style={{ background: `${c.color || '#f97316'}18`, border: `1px solid ${c.color || '#f97316'}40` }}>🏆</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cc-torneo-nombre">{c.torneoNombre}</div>
          <div className="cc-torneo-meta">{c.categoriaName} · {formatFecha(c.fecha)}</div>
        </div>
      </div>

      <div className="cc-podio">
        <div className="cc-podio-row cc-podio-campeon">
          <span className="cc-podio-medal">🥇</span>
          <div>
            <div className="cc-podio-label">Campeón</div>
            <div className="cc-podio-names">{c.campeon.jugador1}{c.campeon.jugador2 ? ` / ${c.campeon.jugador2}` : ''}</div>
          </div>
        </div>
        <div className="cc-podio-row cc-podio-subcampeon">
          <span className="cc-podio-medal">🥈</span>
          <div>
            <div className="cc-podio-label">Subcampeón</div>
            <div className="cc-podio-names">{c.subcampeon.jugador1}{c.subcampeon.jugador2 ? ` / ${c.subcampeon.jugador2}` : ''}</div>
          </div>
        </div>
      </div>

      {c.camino.length > 0 && (
        <>
          <button onClick={() => setOpen(v => !v)} className="cc-camino-toggle">
            {open ? '▲ Ocultar camino a la final' : '▼ Ver camino a la final'}
          </button>
          {open && (
            <div className="cc-camino-list">
              {c.camino.map((paso, i) => (
                <div key={i} className="cc-camino-row">
                  <span className="cc-camino-ronda">{paso.roundName}</span>
                  <span className="cc-camino-rival">
                    vs {paso.rival?.jugador1}{paso.rival?.jugador2 ? ` / ${paso.rival.jugador2}` : ''}
                  </span>
                  <span className="cc-camino-score">{paso.setsCampeon}–{paso.setsRival}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function CampeonesView() {
  const [campeones, setCampeones] = useState([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    getCampeones()
      .then(data => setCampeones(data))
      .catch(() => setCampeones([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="view-container" style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: isMobile ? 22 : 32 }} className="animate-fadein">
        <h1 className="section-title">Historial de campeones</h1>
        <p className="section-subtitle">
          {campeones.length} torneo{campeones.length !== 1 ? 's' : ''} finalizado{campeones.length !== 1 ? 's' : ''}
        </p>
      </div>

      {campeones.length === 0 ? (
        <div className="tl-empty">
          <div className="tl-empty-icon">🏆</div>
          <p className="tl-empty-title">Todavía no hay campeones registrados</p>
          <p className="tl-empty-desc">Van a aparecer acá apenas se finalice el primer torneo con llave.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: isMobile ? 12 : 18 }}>
          {campeones.map((c, i) => (
            <div key={c.torneoId} className="animate-fadein" style={{ animationDelay: `${i * 0.06}s` }}>
              <CampeonCard c={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
