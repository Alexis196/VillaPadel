import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import Spinner from '../ui/Spinner'
import './CategoriesView.css'

const CAT_OPTIONS = [
  { id: 'cat-8va', name: '8va Categoría', valor: 8, color: '#64748b' },
  { id: 'cat-7ma', name: '7ma Categoría', valor: 7, color: '#eab308' },
  { id: 'cat-6ta', name: '6ta Categoría', valor: 6, color: '#84cc16' },
  { id: 'cat-5ta', name: '5ta Categoría', valor: 5, color: '#06b6d4' },
  { id: 'cat-4ta', name: '4ta Categoría', valor: 4, color: '#10b981' },
  { id: 'cat-3ra', name: '3ra Categoría', valor: 3, color: '#3b82f6' },
  { id: 'cat-2da', name: '2da Categoría', valor: 2, color: '#a855f7' },
  { id: 'cat-1ra', name: '1ra Categoría', valor: 1, color: '#f97316' },
  { id: 'cat-fem', name: 'Femenino A',    valor: 2, color: '#ec4899' },
  { id: 'cat-mix', name: 'Mixto',          valor: 3, color: '#f59e0b' },
]

function getTorneoColor(t) {
  if (t.color) return t.color
  const cat = CAT_OPTIONS.find(c => c.id === t.categoriaId)
  return cat?.color || '#f97316'
}

const STATUS_STYLE = {
  'En curso':    { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e',  border: 'rgba(34,197,94,0.25)' },
  'Inscripción': { bg: 'rgba(249,115,22,0.12)',  color: '#f97316',  border: 'rgba(249,115,22,0.25)' },
  'Finalizado':  { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', border: 'rgba(156,163,175,0.25)' },
}

function TorneoCard({ torneo }) {
  const col = getTorneoColor(torneo)
  const cat = CAT_OPTIONS.find(c => c.id === torneo.categoriaId)
  const st = STATUS_STYLE[torneo.estado] || STATUS_STYLE['Inscripción']

  return (
    <div
      className="cv-card"
      onMouseEnter={e => { e.currentTarget.style.borderColor = col }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38' }}
    >
      <div className="cv-card-top-bar" style={{ background: col }} />
      <div className="cv-card-body">
        <div className="cv-card-header-row">
          <h3 className="cv-card-title">{torneo.nombre}</h3>
          <span className="cv-card-status" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
            {torneo.estado}
          </span>
        </div>

        <div className="cv-meta-row">
          <span className="cv-cat-badge" style={{ background: `${col}18`, border: `1px solid ${col}40`, color: col }}>
            <span className="cv-cat-dot" style={{ background: col }} />
            {torneo.categoriaName}
          </span>
          {torneo.fechaInicio && <span className="cv-card-date">📅 {torneo.fechaInicio}</span>}
        </div>

        <div className="cv-card-stats">
          {[
            { label: 'Zonas', value: torneo.zonas ?? '—' },
            { label: '$/jugador', value: torneo.costoPorJugador ? `$${Number(torneo.costoPorJugador).toLocaleString()}` : '—' },
            { label: 'Nivel', value: torneo.categoriaValor ?? (cat?.valor ?? '—') },
          ].map(s => (
            <div key={s.label}>
              <div className="cv-card-stat-value">{s.value}</div>
              <div className="cv-card-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CategoriesView() {
  const [torneos, setTorneos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const snap = await getDocs(query(collection(db, 'torneos'), orderBy('createdAt', 'desc')))
      setTorneos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Spinner />

  const enCurso = torneos.filter(t => t.estado === 'En curso').length
  const inscripcion = torneos.filter(t => t.estado === 'Inscripción').length

  return (
    <div className="cv-page">
      <div className="cv-header">
        <h1 className="cv-title">Torneos</h1>
        <p className="cv-subtitle">
          {torneos.length} torneo{torneos.length !== 1 ? 's' : ''} · {enCurso} en curso · {inscripcion} en inscripción
        </p>
      </div>

      <div className="cv-stats-grid">
        {[
          { label: 'Total torneos', value: torneos.length, icon: '🏆' },
          { label: 'En curso', value: enCurso, icon: '▶️' },
          { label: 'En inscripción', value: inscripcion, icon: '📋' },
        ].map(s => (
          <div key={s.label} className="cv-stat-card">
            <div className="cv-stat-icon">{s.icon}</div>
            <div>
              <div className="cv-stat-value">{s.value}</div>
              <div className="cv-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {torneos.length === 0 ? (
        <div className="cv-empty">
          <div className="cv-empty-icon">🎾</div>
          <p className="cv-empty-title">No hay torneos</p>
          <p className="cv-empty-desc">Los administradores pueden crear torneos desde el Panel Admin.</p>
        </div>
      ) : (
        <div className="cv-torneos-grid">
          {torneos.map(t => <TorneoCard key={t.id} torneo={t} />)}
        </div>
      )}
    </div>
  )
}
