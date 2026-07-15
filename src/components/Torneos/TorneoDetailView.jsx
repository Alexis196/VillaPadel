import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import GroupsView from '../Groups/GroupsView'
import StandingsView from '../Standings/StandingsView'
import MatchesView from '../Matches/MatchesView'
import BracketView from '../Bracket/BracketView'
import BuscarDuplaView from './BuscarDuplaView'
import './TorneoDetailView.css'

const ALL_TABS = [
  { id: 'buscar-dupla', label: 'Buscar dupla', icon: '🤝', component: BuscarDuplaView, onlyInscripcion: true },
  { id: 'grupos',   label: 'Grupos',   icon: '🏆', component: GroupsView },
  { id: 'tabla',    label: 'Tabla',    icon: '📊', component: StandingsView },
  { id: 'partidos', label: 'Partidos', icon: '🎾', component: MatchesView },
  { id: 'llave',    label: 'Llave',    icon: '🏅', component: BracketView },
]

const ESTADO_CONFIG = {
  'En curso':   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  'Llave':      { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  'Inscripción':{ color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'Finalizado': { color: '#6666a0', bg: 'rgba(102,102,160,0.12)' },
}

export default function TorneoDetailView() {
  const { id } = useParams()
  const { torneos, activeTorneo, setActiveTorneoId, loading, buscandoDupla } = useTorneo()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState('grupos')

  useEffect(() => {
    if (id) setActiveTorneoId(id)
  }, [id])

  useEffect(() => {
    if (activeTorneo?.estado === 'Inscripción') setActiveTab('buscar-dupla')
  }, [activeTorneo?.id])

  if (loading && torneos.length === 0) return <Spinner />

  if (!loading && torneos.length > 0 && !torneos.find(t => t.id === id)) {
    return (
      <div className="td-not-found">
        <div className="td-not-found-icon">🏓</div>
        <h2 style={{ color: '#f1f1f5', fontWeight: 700, marginBottom: 8 }}>Torneo no encontrado</h2>
        <p style={{ color: '#9999b0', marginBottom: 24 }}>El torneo que buscás no existe o fue eliminado.</p>
        <button onClick={() => navigate('/torneos')} className="td-not-found-btn">Ver torneos</button>
      </div>
    )
  }

  const TABS = ALL_TABS.filter(t => !t.onlyInscripcion || activeTorneo?.estado === 'Inscripción')
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || GroupsView
  const estado = activeTorneo ? (ESTADO_CONFIG[activeTorneo.estado] || ESTADO_CONFIG['Finalizado']) : null

  return (
    <div className="td-root">
      <div className="td-sticky-header">
        <div className="td-header-inner" style={{ padding: isMobile ? '12px 14px 0' : '14px 24px 0' }}>
          <div className="td-name-row" style={{ marginBottom: isMobile ? 12 : 10 }}>
            <button onClick={() => navigate('/torneos')} className="td-back-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Volver a torneos
            </button>
            {activeTorneo && (
              <>
                <h2 className="td-torneo-name" style={{ fontSize: isMobile ? 15 : 18 }}>{activeTorneo.nombre}</h2>
                {estado && (
                  <span className="td-estado-badge" style={{ background: estado.bg, color: estado.color }}>
                    {activeTorneo.estado}
                  </span>
                )}
              </>
            )}
          </div>

          {!isMobile && (
            <div className="td-tab-bar">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="td-tab-btn"
                  style={{
                    color: activeTab === tab.id ? '#f97316' : '#9999b0',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    borderBottomColor: activeTab === tab.id ? '#f97316' : 'transparent',
                  }}
                  onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#f1f1f5' }}
                  onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#9999b0' }}
                >
                  <span className="td-tab-icon">{tab.icon}</span>
                  {tab.label}
                  {tab.id === 'buscar-dupla' && buscandoDupla.length > 0 && (
                    <span className="td-tab-badge">{buscandoDupla.length}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="td-content" style={{ paddingBottom: isMobile ? 60 : 0 }}>
        <ActiveComponent />
      </div>

      {isMobile && (
        <nav className="td-bottom-nav">
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
              <span style={{ fontSize: 18, marginBottom: 2, lineHeight: 1, position: 'relative' }}>
                {tab.icon}
                {tab.id === 'buscar-dupla' && buscandoDupla.length > 0 && (
                  <span className="td-tab-badge td-tab-badge-mobile">{buscandoDupla.length}</span>
                )}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
