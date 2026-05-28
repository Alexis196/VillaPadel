import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import GroupsView from '../Groups/GroupsView'
import StandingsView from '../Standings/StandingsView'
import MatchesView from '../Matches/MatchesView'
import BracketView from '../Bracket/BracketView'
import PlayersView from '../Players/PlayersView'

const TABS = [
  { id: 'grupos',         label: 'Grupos',         icon: '🏆', component: GroupsView },
  { id: 'tabla',          label: 'Tabla',           icon: '📊', component: StandingsView },
  { id: 'partidos',       label: 'Partidos',        icon: '🎾', component: MatchesView },
  { id: 'llave',          label: 'Llave',           icon: '🏅', component: BracketView },
]

const ESTADO_CONFIG = {
  'En curso':   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  'Llave':      { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  'Inscripción':{ color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'Finalizado': { color: '#6666a0', bg: 'rgba(102,102,160,0.12)' },
}

export default function TorneoDetailView() {
  const { id } = useParams()
  const { torneos, activeTorneo, setActiveTorneoId, loading } = useTorneo()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState('grupos')

  useEffect(() => {
    if (id) setActiveTorneoId(id)
  }, [id])

  if (loading && torneos.length === 0) return <Spinner />

  if (!loading && torneos.length > 0 && !torneos.find(t => t.id === id)) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏓</div>
        <h2 style={{ color: '#f1f1f5', fontWeight: 700, marginBottom: 8 }}>Torneo no encontrado</h2>
        <p style={{ color: '#9999b0', marginBottom: 24 }}>El torneo que buscás no existe o fue eliminado.</p>
        <button
          onClick={() => navigate('/torneos')}
          style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Ver torneos
        </button>
      </div>
    )
  }

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || GroupsView
  const estado = activeTorneo ? (ESTADO_CONFIG[activeTorneo.estado] || ESTADO_CONFIG['Finalizado']) : null

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tournament header */}
      <div style={{ background: '#13131a', borderBottom: '1px solid #2a2a38', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '12px 14px 0' : '14px 24px 0' }}>
          {/* Back + name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isMobile ? 12 : 10 }}>
            <button
              onClick={() => navigate('/torneos')}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a38', borderRadius: 7,
                color: '#9999b0', fontSize: 12, padding: '5px 11px', cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f1f1f5'; e.currentTarget.style.borderColor = '#3a3a50' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9999b0'; e.currentTarget.style.borderColor = '#2a2a38' }}
            >
              ← Torneos
            </button>
            {activeTorneo && (
              <>
                <h2 style={{
                  color: '#f1f1f5', fontSize: isMobile ? 15 : 18, fontWeight: 700, margin: 0,
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  letterSpacing: '-0.3px',
                }}>
                  {activeTorneo.nombre}
                </h2>
                {estado && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.3px', background: estado.bg, color: estado.color, flexShrink: 0,
                  }}>
                    {activeTorneo.estado}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Tab bar — desktop only (mobile uses bottom nav) */}
          {!isMobile && (
            <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 18px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: activeTab === tab.id ? '#f97316' : '#9999b0',
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    borderBottom: `2px solid ${activeTab === tab.id ? '#f97316' : 'transparent'}`,
                    transition: 'color 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 5,
                    marginBottom: -1,
                  }}
                  onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#f1f1f5' }}
                  onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#9999b0' }}
                >
                  <span style={{ fontSize: 14 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, paddingBottom: isMobile ? 60 : 0 }}>
        <ActiveComponent />
      </div>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: '#13131a', borderTop: '1px solid #2a2a38',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '8px 2px 6px', border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? 'rgba(249,115,22,0.08)' : 'transparent',
                color: activeTab === tab.id ? '#f97316' : '#6666a0',
                fontSize: 9, fontWeight: activeTab === tab.id ? 600 : 400,
                borderTop: `2px solid ${activeTab === tab.id ? '#f97316' : 'transparent'}`,
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 18, marginBottom: 2, lineHeight: 1 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
