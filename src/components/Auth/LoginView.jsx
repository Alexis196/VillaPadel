import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle, signInWithEmail } from '../../firebase/auth'
import Logo from '../../assets/villapadel-icon.png'

export default function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleEmail(e) {
    e.preventDefault()
    if (!email || !password) { setError('Completá email y contraseña.'); return }
    setLoading(true)
    setError('')
    try {
      const { isAdmin } = await signInWithEmail(email, password)
      if (isAdmin) {
        navigate('/admin')
      } else {
        setError('Tu cuenta no tiene permisos de administrador.')
        setLoading(false)
      }
    } catch (err) {
      const code = err?.code || ''
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Email o contraseña incorrectos.')
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Intentá más tarde.')
      } else {
        setError('Error al iniciar sesión. Verificá tus datos.')
      }
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    setError('')
    try {
      const { isAdmin } = await signInWithGoogle()
      if (isAdmin) {
        navigate('/admin')
      } else {
        setError('Tu cuenta no tiene permisos de administrador. Contactá al organizador.')
        setLoading(false)
      }
    } catch {
      setError('Error al iniciar sesión con Google. Intentá de nuevo.')
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', boxSizing: 'border-box',
    background: '#13131a', border: '1px solid #2a2a38', borderRadius: 9,
    padding: '11px 14px', color: '#f1f1f5', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f0f13',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#1a1a22', borderRadius: 16, border: '1px solid #2a2a38',
        padding: '44px 40px', width: '100%', maxWidth: 400, textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, background: '#fff', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 22px',
          boxShadow: '0 0 24px rgba(255,255,255,0.15)',
        }}>
          <img src={Logo} alt="VillaPadel" style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
        </div>

        <h1 style={{ color: '#f1f1f5', fontSize: 21, fontWeight: 700, margin: '0 0 6px' }}>
          Panel de Administración
        </h1>
        <p style={{ color: '#9999b0', fontSize: 13, margin: '0 0 28px' }}>
          Acceso exclusivo para administradores de VillaPadel
        </p>

        <form onSubmit={handleEmail} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', color: '#9999b0', fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: '0.5px' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={loading}
              style={inp}
              onFocus={e => e.target.style.borderColor = '#f97316'}
              onBlur={e => e.target.style.borderColor = '#2a2a38'}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#9999b0', fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: '0.5px' }}>
              CONTRASEÑA
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                style={{ ...inp, paddingRight: 42 }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#2a2a38'}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#6666a0', cursor: 'pointer',
                  fontSize: 14, padding: 4, lineHeight: 1,
                }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
              background: loading ? '#2a2a38' : '#f97316',
              color: loading ? '#9999b0' : '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#2a2a38' }} />
          <span style={{ color: '#44445a', fontSize: 12 }}>o</span>
          <div style={{ flex: 1, height: 1, background: '#2a2a38' }} />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: loading ? '#2a2a38' : '#1f1f2e',
            color: loading ? '#9999b0' : '#f1f1f5',
            border: '1px solid #2a2a38', borderRadius: 10, padding: '11px 20px',
            fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = '#4a4a5a' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.borderColor = '#2a2a38' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        {error && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8, color: '#ef4444', fontSize: 13, textAlign: 'left',
          }}>
            {error}
          </div>
        )}

        <p style={{ color: '#44445a', fontSize: 11, margin: '24px 0 0', lineHeight: 1.6 }}>
          Para acceso por email, activá Email/Contraseña en Firebase Console → Authentication.
          Para permisos de admin, agregá el email en{' '}
          <code style={{ background: '#13131a', padding: '1px 5px', borderRadius: 3, color: '#6666a0' }}>VITE_ADMIN_EMAILS</code>.
        </p>
      </div>
    </div>
  )
}
