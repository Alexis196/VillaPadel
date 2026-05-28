import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { signOutUser } from '../../firebase/auth'
import { useIsMobile } from '../../hooks/useIsMobile'
import TorneosAdmin from './TorneosAdmin'
import DuplasAdmin from './DuplasAdmin'
import PartidosAdmin from './PartidosAdmin'
import JugadoresAdmin from './JugadoresAdmin'
import DocumentosAdmin from './DocumentosAdmin'
import Logo from '../../assets/villapadel-icon.png'

const SECTIONS = [
  { id: 'torneos',    icon: '🏆', label: 'Torneos',    component: TorneosAdmin },
  { id: 'duplas',     icon: '👥', label: 'Duplas',      component: DuplasAdmin },
  { id: 'partidos',   icon: '📅', label: 'Partidos',    component: PartidosAdmin },
  { id: 'jugadores',  icon: '🎾', label: 'Categorización', component: JugadoresAdmin },
  { id: 'documentos', icon: '📄', label: 'Documentos',  component: DocumentosAdmin },
]

export default function AdminLayout() {
  const [active, setActive] = useState('torneos')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const { user } = useAuth()
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
          color: isActive ? '#f97316' : '#9999b0',
          transition: 'all 0.15s', textAlign: 'left',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f1f1f5' } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9999b0' } }}
      >
        <span style={{ fontSize: 16 }}>{section.icon}</span>
        {full && section.label}
      </button>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', flexDirection: 'column' }}>

      {/* Mobile top bar */}
      {isMobile && (
        <header style={{
          height: 52, background: '#13131a', borderBottom: '1px solid #2a2a38',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setMobileDrawerOpen(v => !v)}
              style={{
                background: mobileDrawerOpen ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${mobileDrawerOpen ? '#f97316' : '#2a2a38'}`,
                borderRadius: 8, color: mobileDrawerOpen ? '#f97316' : '#9999b0',
                width: 34, height: 34, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3.5,
                transition: 'all 0.15s', padding: 0,
              }}
              aria-label="Menú"
            >
              <span style={{ width: 14, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} />
              <span style={{ width: 14, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} />
              <span style={{ width: 14, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} />
            </button>
            <div style={{ width: 26, height: 26, background: '#fff', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={Logo} alt="VP" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ color: '#f1f1f5', fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>VillaPadel</div>
              <div style={{ color: '#f97316', fontSize: 9, fontWeight: 700, letterSpacing: '0.5px' }}>ADMIN</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/grupos')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(249,115,22,0.12)', border: '1px solid #f97316',
              borderRadius: 8, color: '#f97316', fontSize: 12, fontWeight: 700,
              padding: '6px 13px', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 14 }}>🌐</span> Sitio
          </button>
        </header>
      )}

      {/* Body area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <aside style={{
            width: sidebarOpen ? 220 : 60, background: '#13131a',
            borderRight: '1px solid #2a2a38', display: 'flex', flexDirection: 'column',
            position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto',
            transition: 'width 0.2s ease', overflowX: 'hidden', zIndex: 100,
          }}>
            {/* Sidebar header with hamburger */}
            <div style={{ padding: '14px 10px 12px', borderBottom: '1px solid #2a2a38', display: 'flex', alignItems: 'center', gap: 8 }}>
              {sidebarOpen && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, background: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={Logo} alt="VP" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>VillaPadel</div>
                    <div style={{ color: '#f97316', fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>ADMIN</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(v => !v)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a38',
                  borderRadius: 7, color: '#9999b0', width: 30, height: 30,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 3, padding: 0,
                  flexShrink: 0, transition: 'all 0.15s',
                }}
                title={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
              >
                <span style={{ width: 12, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} />
                <span style={{ width: 12, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} />
                <span style={{ width: 12, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} />
              </button>
            </div>

            <nav style={{ padding: '12px 8px', flex: 1 }}>
              {SECTIONS.map(s => <NavButton key={s.id} section={s} full={sidebarOpen} />)}
            </nav>

            <div style={{ padding: '12px 8px', borderTop: '1px solid #2a2a38' }}>
              {sidebarOpen && user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {user.displayName?.[0] || 'A'}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#f1f1f5', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName}</div>
                    <div style={{ color: '#9999b0', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate('/grupos')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 7,
                  width: '100%', padding: '9px 10px', borderRadius: 9, marginBottom: 8,
                  border: '1px solid #3a3a50', cursor: 'pointer',
                  background: 'rgba(249,115,22,0.10)', color: '#f97316',
                  fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.22)'; e.currentTarget.style.borderColor = '#f97316' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.10)'; e.currentTarget.style.borderColor = '#3a3a50' }}
              >
                <span style={{ fontSize: 15 }}>🌐</span>
                {sidebarOpen && ' Ver sitio público'}
              </button>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 8,
                  width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', background: 'transparent', color: '#ef4444', fontSize: 13,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <span>↩</span>
                {sidebarOpen && ' Cerrar sesión'}
              </button>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main style={{
          flex: 1,
          padding: isMobile ? '16px 14px' : '28px 32px',
          overflowY: 'auto',
          paddingBottom: isMobile ? 76 : undefined,
          minWidth: 0,
          marginLeft: isMobile ? 0 : (sidebarOpen ? 220 : 60),
          transition: 'margin-left 0.2s ease',
        }}>
          <ActiveComponent />
        </main>
      </div>

      {/* Mobile: overlay for drawer */}
      {isMobile && mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 299 }}
        />
      )}

      {/* Mobile slide-in drawer */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 52, left: 0, bottom: 0, width: 220,
          background: '#13131a', borderRight: '1px solid #2a2a38',
          zIndex: 300, display: 'flex', flexDirection: 'column',
          transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}>
          <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
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
                  color: active === s.id ? '#f97316' : '#9999b0',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 17 }}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '10px 8px', borderTop: '1px solid #2a2a38' }}>
            {user && (
              <div style={{ padding: '6px 10px', marginBottom: 8, color: '#9999b0', fontSize: 11 }}>
                {user.email}
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#ef4444', fontSize: 13 }}
            >
              ↩ Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: '#13131a', borderTop: '1px solid #2a2a38',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '8px 2px 6px', border: 'none', cursor: 'pointer',
                background: active === s.id ? 'rgba(249,115,22,0.08)' : 'transparent',
                color: active === s.id ? '#f97316' : '#6666a0',
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
