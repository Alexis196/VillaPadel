import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from '../assets/nuevologo.png'
import { useAuth } from '../contexts/AuthContext'
import { signOutUser } from '../firebase/auth'
import { useIsMobile } from '../hooks/useIsMobile'

const navItems = [
  { to: '/torneos',  label: 'Torneos',   icon: '🏆' },
  { to: '/tabla',    label: 'Tabla',     icon: '📊' },
  { to: '/partidos', label: 'Partidos',  icon: '🎾' },
  { to: '/llave',    label: 'Llave',     icon: '🏅' },
  { to: '/jugadores', label: 'Jugadores', icon: '👤' },
]

function UserMenu({ user, isAdmin }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function outside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  async function handleLogout() {
    setOpen(false)
    await signOutUser()
  
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: isAdmin ? '2px solid #f97316' : '2px solid #2a2a38' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
            {user.displayName?.[0] || 'A'}
          </div>
        )}
        {isAdmin && (
          <span style={{ padding: '2px 7px', borderRadius: 10, background: 'rgba(249,115,22,0.15)', color: '#f97316', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' }}>
            ADMIN
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 500,
          background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 10,
          overflow: 'hidden', minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #2a2a38' }}>
            <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 600 }}>{user.displayName}</div>
            <div style={{ color: '#9999b0', fontSize: 12 }}>{user.email}</div>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setOpen(false); navigate('/admin') }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#f97316', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2a2a38'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span>⚙️</span> Panel de administración
            </button>
          )}
          <button
            onClick={() => { setOpen(false); handleLogout() }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span>↩</span> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  return (
    <>
      <header style={{ background: '#13131a', borderBottom: '1px solid #2a2a38' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>

            {/* Logo */}
            <div style={{
              width: isMobile ? 72 : 100, height: isMobile ? 38 : 50,
              background: '#ffffff', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 8px 2px rgba(255,255,255,0.6)',
              flexShrink: 0,
            }}>
              <img src={Logo} alt="logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
            </div>

            {/* Desktop nav — hidden on mobile */}
            {!isMobile && (
              <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {navItems.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    style={({ isActive }) => ({
                      padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                      textDecoration: 'none', transition: 'all 0.15s',
                      background: isActive ? '#f97316' : 'transparent',
                      color: isActive ? '#fff' : '#9999b0',
                    })}
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            )}

            {/* Right: user or login */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user ? (
                <UserMenu user={user} isAdmin={isAdmin} />
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #2a2a38', background: 'transparent', color: '#9999b0', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.color = '#9999b0' }}
                >
                  Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: '#13131a', borderTop: '1px solid #2a2a38',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '8px 2px 6px',
                textDecoration: 'none',
                color: isActive ? '#f97316' : '#6666a0',
                fontSize: 10, fontWeight: isActive ? 600 : 400,
                borderTop: `2px solid ${isActive ? '#f97316' : 'transparent'}`,
                transition: 'color 0.15s',
              })}
            >
              <span style={{ fontSize: 19, marginBottom: 2, lineHeight: 1 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  )
}
