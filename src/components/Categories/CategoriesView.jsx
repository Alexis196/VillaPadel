import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import Spinner from '../ui/Spinner'

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
  'En curso':    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  'Inscripción': { bg: 'rgba(249,115,22,0.12)', color: '#f97316', border: 'rgba(249,115,22,0.25)' },
  'Finalizado':  { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', border: 'rgba(156,163,175,0.25)' },
}

function TorneoCard({ torneo }) {
  const col = getTorneoColor(torneo)
  const cat = CAT_OPTIONS.find(c => c.id === torneo.categoriaId)
  const st = STATUS_STYLE[torneo.estado] || STATUS_STYLE['Inscripción']

  return (
    <div style={{
      background: '#1a1a22', borderRadius: 14, border: '1px solid #2a2a38',
      overflow: 'hidden', transition: 'border-color 0.2s, transform 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = col; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ height: 3, background: col }} />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ color: '#f1f1f5', fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3, flex: 1, paddingRight: 12 }}>
            {torneo.nombre}
          </h3>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>
            {torneo.estado}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: `${col}18`, border: `1px solid ${col}40`, color: col, fontSize: 11, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, display: 'inline-block' }} />
            {torneo.categoriaName}
          </span>
          {torneo.fechaInicio && (
            <span style={{ color: '#9999b0', fontSize: 12 }}>📅 {torneo.fechaInicio}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, paddingTop: 14, borderTop: '1px solid #2a2a38' }}>
          {[
            { label: 'Zonas', value: torneo.zonas ?? '—' },
            { label: '$/jugador', value: torneo.costoPorJugador ? `$${Number(torneo.costoPorJugador).toLocaleString()}` : '—' },
            { label: 'Nivel', value: torneo.categoriaValor ?? (cat?.valor ?? '—') },
          ].map(s => (
            <div key={s.label}>
              <div style={{ color: '#f1f1f5', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: '#9999b0', fontSize: 11, marginTop: 3 }}>{s.label}</div>
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
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#f1f1f5', fontSize: 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Torneos
        </h1>
        <p style={{ color: '#9999b0', fontSize: 14, margin: 0 }}>
          {torneos.length} torneo{torneos.length !== 1 ? 's' : ''} · {enCurso} en curso · {inscripcion} en inscripción
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total torneos', value: torneos.length, icon: '🏆' },
          { label: 'En curso', value: enCurso, icon: '▶️' },
          { label: 'En inscripción', value: inscripcion, icon: '📋' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            <div>
              <div style={{ color: '#f1f1f5', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: '#9999b0', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {torneos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#1a1a22', borderRadius: 12, border: '1px dashed #2a2a38', color: '#9999b0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎾</div>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#f1f1f5' }}>No hay torneos</p>
          <p style={{ margin: 0, fontSize: 14 }}>Los administradores pueden crear torneos desde el Panel Admin.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {torneos.map(t => <TorneoCard key={t.id} torneo={t} />)}
        </div>
      )}
    </div>
  )
}
