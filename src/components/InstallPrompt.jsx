import { useEffect, useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import Logo from '../assets/villapadel-icon.png'
import './InstallPrompt.css'

const DISMISS_KEY = 'vp_install_dismissed_at'
const DISMISS_DAYS = 14

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: '-2px', margin: '0 2px' }}>
      <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

export default function InstallPrompt() {
  const isMobile = useIsMobile()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState('android')

  useEffect(() => {
    if (isStandalone()) return

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
    if (dismissedAt && daysSince < DISMISS_DAYS) return

    if (isIos()) {
      setPlatform('ios')
      setVisible(true)
      return
    }

    function handler(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform('android')
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!isMobile || !visible) return null

  return (
    <div className="ip-banner">
      <img src={Logo} alt="" className="ip-icon" />
      <div className="ip-text">
        <div className="ip-title">Instalá VillaPadel</div>
        <div className="ip-desc">
          {platform === 'ios'
            ? <>Tocá <ShareIcon />Compartir y luego "Agregar a inicio"</>
            : 'Accedé más rápido, como una app'}
        </div>
      </div>
      {platform === 'android' && (
        <button onClick={handleInstall} className="ip-btn-install">Instalar</button>
      )}
      <button onClick={dismiss} className="ip-btn-close" aria-label="Cerrar">×</button>
    </div>
  )
}
