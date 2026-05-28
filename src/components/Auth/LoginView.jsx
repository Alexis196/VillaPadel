import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle, signInWithEmail } from '../../firebase/auth'
import Logo from '../../assets/villapadel-icon.png'
import './LoginView.css'

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

  return (
    <div className="li-page">
      <div className="li-card">
        <div className="li-logo-wrap">
          <img src={Logo} alt="VillaPadel" className="li-logo-img" />
        </div>

        <h1 className="li-title">Panel de Administración</h1>
        <p className="li-desc">Acceso exclusivo para administradores de VillaPadel</p>

        <form onSubmit={handleEmail} className="li-form">
          <div className="li-field">
            <label className="li-label">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={loading}
              className="li-inp"
            />
          </div>

          <div className="li-field-last">
            <label className="li-label">CONTRASEÑA</label>
            <div className="li-pass-wrap">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="li-inp"
                style={{ paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} className="li-show-btn">
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

        <div className="li-divider">
          <div className="li-divider-line" />
          <span className="li-divider-text">o</span>
          <div className="li-divider-line" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="li-google-btn"
          style={{
            background: loading ? '#2a2a38' : '#1f1f2e',
            color: loading ? '#9999b0' : '#f1f1f5',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" className="li-google-icon">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        {error && <div className="li-error">{error}</div>}
      </div>
    </div>
  )
}
