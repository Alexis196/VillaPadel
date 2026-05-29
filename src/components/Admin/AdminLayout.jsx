import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { signOutUser } from '../../firebase/auth'
import { getSolicitudes } from '../../firebase/torneoService'
import { useIsMobile } from '../../hooks/useIsMobile'
import TorneosAdmin from './TorneosAdmin'
import DuplasAdmin from './DuplasAdmin'
import PartidosAdmin from './PartidosAdmin'
import JugadoresAdmin from './JugadoresAdmin'
import DocumentosAdmin from './DocumentosAdmin'
import SolicitudesAdmin from './SolicitudesAdmin'
import Logo from '../../assets/nuevologo.png'
import './AdminLayout.css'

const BASE_SECTIONS = [
  { id: 'torneos',    icon: '🏆', label: 'Torneos',       component: TorneosAdmin },
  { id: 'duplas',     icon: '👥', label: 'Duplas',         component: DuplasAdmin },
  { id: 'partidos',   icon: '📅', label: 'Partidos',       component: PartidosAdmin },
  { id: 'jugadores',  icon: '🎾', label: 'Categorización', component: JugadoresAdmin },
  { id: 'documentos', icon: '📄', label: 'Documentos',     component: DocumentosAdmin },
]

export default function AdminLayout() {
  const [active, setActive] = useState('torneos')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const { user, isMaster } = useAuth()

  const SECTIONS = isMaster
    ? [...BASE_SECTIONS, { id: 'solicitudes', icon: '📬', label: 'Solicitudes', component: SolicitudesAdmin }]
    : BASE_SECTIONS

  useEffect(() => {
    if (!isMaster) return
    getSolicitudes().then(list => setPendingCount(list.filter(s => s.status === 'pendiente').length))
  }, [isMaster])
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  async function handleLogout() {
    await signOutUser()
    navigate('/grupos')
  }

  const ActiveComponent = SECTIONS.find(s => s.id === active)?.component || TorneosAdmin

  function NavButton({ section, onClick, full = false }) {
    const isActive = active === section.id
    return (
      <button
        onClick={() => { setActive(section.id); if (onClick) onClick() }}
        style={{
          display: 'flex', alignItems: 'center', gap: full ? 10 : 0,
          width: '100%', padding: full ? '10px 12px' : '10px 0', borderRadius: 8,
          border: 'none', cursor: 'pointer', marginBottom: 4, justifyContent: full ? 'flex-start' : 'center',
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
          color: isActive ? '#f97316' : '#8899bb',
          transition: 'all 0.15s', textAlign: 'left',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(14,165,233,0.07)'; e.currentTarget.style.color = '#e2eaf8' } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8899bb' } }}
      >
        <span style={{ fontSize: 16 }}>{section.icon}</span>
        {full && section.label}
        {full && section.id === 'solicitudes' && pendingCount > 0 && (
          <span style={{ marginLeft: 'auto', background: '#f97316', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
            {pendingCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="al-root">
      {/* Mobile top bar */}
      {isMobile && (
        <header className="al-mobile-header al-glass al-glass-bb">
          <div className="al-mobile-brand">
            <button
              onClick={() => setMobileDrawerOpen(v => !v)}
              style={{
                background: mobileDrawerOpen ? 'rgba(249,115,22,0.15)' : 'rgba(14,165,233,0.08)',
                border: `1px solid ${mobileDrawerOpen ? '#f97316' : 'rgba(14,165,233,0.15)'}`,
                borderRadius: 8, color: mobileDrawerOpen ? '#f97316' : '#8899bb',
                width: 34, height: 34, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3.5,
                transition: 'all 0.15s', padding: 0,
              }}
              aria-label="Menú"
            >
              <span className="al-btn-bar" />
              <span className="al-btn-bar" />
              <span className="al-btn-bar" />
            </button>
            <img src={Logo} alt="VP" className="al-brand-logo-sm" />
            <div>
              <div className="al-brand-name">VillaPadel</div>
              <div className="al-brand-admin">ADMIN</div>
            </div>
          </div>
          <button onClick={() => navigate('/grupos')} className="al-site-btn-mobile">
            <span style={{ fontSize: 14 }}>🌐</span> Sitio
          </button>
        </header>
      )}

      <div className="al-body">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside
            className="al-sidebar al-glass al-glass-br"
            style={{ width: sidebarOpen ? 220 : 60 }}
          >
            <div className="al-sidebar-header al-glass-bb">
              {sidebarOpen && (
                <div className="al-sidebar-brand">
                  <img src={Logo} alt="VP" className="al-sidebar-logo" />
                  <div>
                    <div className="al-sidebar-name">VillaPadel</div>
                    <div className="al-sidebar-admin-label">ADMIN</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(v => !v)}
                style={{
                  background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)',
                  borderRadius: 7, color: '#8899bb', width: 30, height: 30,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 3, padding: 0,
                  flexShrink: 0, transition: 'all 0.15s',
                }}
                title={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
              >
                <span className="al-btn-bar-sm" />
                <span className="al-btn-bar-sm" />
                <span className="al-btn-bar-sm" />
              </button>
            </div>

            <nav className="al-sidebar-nav">
              {SECTIONS.map(s => <NavButton key={s.id} section={s} full={sidebarOpen} />)}
            </nav>

            <div className="al-sidebar-footer al-glass-bt">
              {sidebarOpen && user && (
                <div className="al-user-card">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="al-user-avatar-img" />
                  ) : (
                    <div className="al-user-avatar-placeholder">
                      {user.displayName?.[0] || 'A'}
                    </div>
                  )}
                  <div className="al-user-info">
                    <div className="al-user-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {user.displayName}
                      {isMaster && <span style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316', borderRadius: 6, padding: '1px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>MASTER</span>}
                    </div>
                    <div className="al-user-email">{user.email}</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate('/grupos')}
                className="al-site-link-btn"
                style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
              >
                <span style={{ fontSize: 15 }}>🌐</span>
                {sidebarOpen && ' Ver sitio público'}
              </button>
              <button
                onClick={handleLogout}
                className="al-logout-btn"
                style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
              >
                <span>↩</span>
                {sidebarOpen && ' Cerrar sesión'}
              </button>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main
          className="al-main"
          style={{
            padding: isMobile ? '16px 14px' : '28px 32px',
            paddingBottom: isMobile ? 76 : undefined,
            marginLeft: isMobile ? 0 : (sidebarOpen ? 220 : 60),
          }}
        >
          <ActiveComponent />
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobile && mobileDrawerOpen && (
        <div onClick={() => setMobileDrawerOpen(false)} className="al-overlay" />
      )}

      {/* Mobile slide-in drawer */}
      {isMobile && (
        <div
          className="al-drawer al-glass al-glass-br"
          style={{ transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          <nav className="al-drawer-nav">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => { setActive(s.id); setMobileDrawerOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '11px 14px', borderRadius: 8, marginBottom: 4,
                  border: 'none', cursor: 'pointer', fontSize: 13,
                  fontWeight: active === s.id ? 600 : 400,
                  background: active === s.id ? 'rgba(249,115,22,0.12)' : 'transparent',
                  color: active === s.id ? '#f97316' : '#8899bb',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 17 }}>{s.icon}</span>
                {s.label}
                {s.id === 'solicitudes' && pendingCount > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#f97316', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="al-drawer-footer al-glass-bt">
            {user && <div className="al-drawer-email">{isMaster ? '⭐ ' : ''}{user.email}</div>}
            <button onClick={handleLogout} className="al-drawer-logout">↩ Cerrar sesión</button>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <nav className="al-bottom-nav al-glass al-glass-bt">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '8px 2px 6px', border: 'none', cursor: 'pointer',
                background: active === s.id ? 'rgba(249,115,22,0.08)' : 'transparent',
                color: active === s.id ? '#f97316' : '#5566aa',
                fontSize: 9, fontWeight: active === s.id ? 600 : 400,
                borderTop: `2px solid ${active === s.id ? '#f97316' : 'transparent'}`,
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 18, marginBottom: 2, lineHeight: 1 }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
