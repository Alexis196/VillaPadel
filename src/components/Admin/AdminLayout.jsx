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
  { id: 'jugadores',  icon: '🎾', label: 'Jugadores',   component: JugadoresAdmin },
  { id: 'documentos', icon: '📄', label: 'Documentos',  component: DocumentosAdmin },
]

export default function AdminLayout() {
  const [active, setActive] = useState('torneos')
  const { user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  async function handleLogout() {
    await signOutUser()
    navigate('/grupos')
  }

  const ActiveComponent = SECTIONS.find(s => s.id === active)?.component || TorneosAdmin

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', flexDirection: 'column' }}>

      {/* Mobile top bar */}
      {isMobile && (
        <header style={{
          height: 52, background: '#13131a', borderBottom: '1px solid #2a2a38',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#fff', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
      <div style={{ display: 'flex', flex: 1 }}>

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <aside style={{
          width: 220, flexShrink: 0, background: '#13131a',
          borderRight: '1px solid #2a2a38', display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        }}>
          <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #2a2a38' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={Logo} alt="VP" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>VillaPadel</div>
                <div style={{ color: '#f97316', fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>ADMIN</div>
              </div>
            </div>
          </div>

          <nav style={{ padding: '12px 10px', flex: 1 }}>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', marginBottom: 4,
                  fontSize: 13, fontWeight: active === s.id ? 600 : 400,
                  background: active === s.id ? 'rgba(249,115,22,0.12)' : 'transparent',
                  color: active === s.id ? '#f97316' : '#9999b0',
                  transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { if (active !== s.id) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f1f1f5' } }}
                onMouseLeave={e => { if (active !== s.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9999b0' } }}
              >
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>

          <div style={{ padding: '12px 10px', borderTop: '1px solid #2a2a38' }}>
            {user && (
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                width: '100%', padding: '10px 12px', borderRadius: 9, marginBottom: 8,
                border: '1px solid #3a3a50', cursor: 'pointer',
                background: 'rgba(249,115,22,0.10)', color: '#f97316',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.2px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.22)'; e.currentTarget.style.borderColor = '#f97316' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.10)'; e.currentTarget.style.borderColor = '#3a3a50' }}
            >
              <span style={{ fontSize: 15 }}>🌐</span> Ver sitio público
            </button>
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#ef4444', fontSize: 13, textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              Cerrar sesión
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
      }}>
        <ActiveComponent />
      </main>

      </div>

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
                fontSize: 10, fontWeight: active === s.id ? 600 : 400,
                borderTop: `2px solid ${active === s.id ? '#f97316' : 'transparent'}`,
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 19, marginBottom: 2, lineHeight: 1 }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
