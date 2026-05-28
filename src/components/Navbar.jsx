import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from '../assets/nuevologo.png'
import { useAuth } from '../contexts/AuthContext'
import { signOutUser } from '../firebase/auth'
import { useIsMobile } from '../hooks/useIsMobile'

const navItems = [
  { to: '/',        label: 'Inicio',   icon: '🏠', end: true },
  { to: '/torneos', label: 'Torneos',  icon: '🏆', end: false },
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef(null)

  useEffect(() => {
    function outside(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setDrawerOpen(false)
    }
    if (drawerOpen) document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [drawerOpen])

  return (
    <>
      <header style={{ background: '#13131a', borderBottom: '1px solid #2a2a38', position: 'relative', zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>

            {/* Logo + hamburger (left) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <NavLink to="/" style={{ textDecoration: 'none', lineHeight: 0 }}>
                <img
                  src={Logo}
                  alt="VillaPadel"
                  style={{ height: isMobile ? 36 : 44, width: 'auto', borderRadius: 6, display: 'block' }}
                />
              </NavLink>
              {isMobile && (
                <button
                  onClick={() => setDrawerOpen(v => !v)}
                  style={{
                    background: drawerOpen ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${drawerOpen ? '#f97316' : '#2a2a38'}`,
                    borderRadius: 8, color: drawerOpen ? '#f97316' : '#9999b0',
                    width: 36, height: 36, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    transition: 'all 0.15s', padding: 0, flexShrink: 0,
                  }}
                  aria-label="Menú"
                >
                  <span style={{ width: 16, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} />
                  <span style={{ width: 16, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} />
                  <span style={{ width: 16, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} />
                </button>
              )}
            </div>

            {/* Desktop nav */}
            {!isMobile && (
              <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {navItems.map(({ to, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
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

            {/* Right: user/login */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

      {/* Mobile side drawer */}
      {isMobile && (
        <>
          {drawerOpen && (
            <div
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 299 }}
            />
          )}

          <div
            ref={drawerRef}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
              background: '#13131a', borderRight: '1px solid #2a2a38',
              zIndex: 300, display: 'flex', flexDirection: 'column',
              transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.25s ease',
              paddingTop: 60,
            }}
          >
            <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
              {navItems.map(({ to, label, icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setDrawerOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 8, marginBottom: 4,
                    textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 600 : 400,
                    background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
                    color: isActive ? '#f97316' : '#9999b0',
                    transition: 'all 0.15s',
                  })}
                >
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  {label}
                </NavLink>
              ))}
            </nav>

            <div style={{ padding: '12px 10px', borderTop: '1px solid #2a2a38' }}>
              {isAdmin && (
                <button
                  onClick={() => { setDrawerOpen(false); navigate('/admin') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', borderRadius: 8, marginBottom: 6,
                    background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
                    color: '#f97316', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  ⚙️ Panel Admin
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
