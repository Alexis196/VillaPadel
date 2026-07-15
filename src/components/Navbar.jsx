import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from '../assets/nuevologo.png'
import { useAuth } from '../contexts/AuthContext'
import { signOutUser } from '../firebase/auth'
import { useIsMobile } from '../hooks/useIsMobile'
import './Navbar.css'

const navItems = [
  { to: '/',               label: 'Inicio',         icon: '🏠', end: true },
  { to: '/torneos',        label: 'Torneos',         icon: '🏆', end: false },
  { to: '/categorizacion', label: 'Categorización',  icon: '👤', end: false },
  { to: '/campeones',      label: 'Campeones',       icon: '🥇', end: false },
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
          <img
            src={user.photoURL}
            alt=""
            className={isAdmin ? 'user-avatar user-avatar-admin' : 'user-avatar'}
            style={{ width: 34, height: 34, borderRadius: '50%', border: isAdmin ? '2px solid rgba(255,122,0,.7)' : '2px solid rgba(255,255,255,.12)' }}
          />
        ) : (
          <div className="nb-avatar-placeholder">{user.displayName?.[0] || 'A'}</div>
        )}
        {isAdmin && <span className="badge-admin">ADMIN</span>}
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div className="nb-user-name">{user.displayName}</div>
            <div className="nb-user-email">{user.email}</div>
          </div>
          {isAdmin && (
            <button
              className="user-dropdown-item user-dropdown-item-admin"
              onClick={() => { setOpen(false); navigate('/admin') }}
            >
              <span>⚙️</span> Panel de administración
            </button>
          )}
          <button
            className="user-dropdown-item user-dropdown-item-danger"
            onClick={() => { setOpen(false); handleLogout() }}
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
      <header className="navbar">
        <div className="navbar-inner">
          <div className="nb-left">
            <NavLink to="/" className="nav-logo">
              <img src={Logo} alt="VillaPadel" style={{ height: isMobile ? 36 : 44, width: 'auto', borderRadius: 6, display: 'block' }} />
            </NavLink>
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(v => !v)}
                className={`nav-hamburger${drawerOpen ? ' open' : ''}`}
                aria-label="Menú"
              >
                <span className="nb-bar" />
                <span className="nb-bar" />
                <span className="nb-bar" />
              </button>
            )}
          </div>

          {!isMobile && (
            <nav className="nav-links">
              {navItems.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}>
                  {label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="nb-right">
            {user ? (
              <UserMenu user={user} isAdmin={isAdmin} />
            ) : (
              <button className="nav-btn-login" onClick={() => navigate('/login')}>Iniciar sesión</button>
            )}
          </div>
        </div>
      </header>

      {isMobile && (
        <>
          {drawerOpen && <div className="nav-drawer-overlay" onClick={() => setDrawerOpen(false)} />}
          <div ref={drawerRef} className={`nav-drawer${drawerOpen ? ' open' : ''}`}>
            <nav className="nb-drawer-nav">
              {navItems.map(({ to, label, icon, end }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => `drawer-nav-link${isActive ? ' drawer-nav-link-active' : ''}`}>
                  <span className="nb-drawer-icon">{icon}</span>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="nb-drawer-footer">
              {isAdmin && (
                <button onClick={() => { setDrawerOpen(false); navigate('/admin') }} className="nb-admin-btn">
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
