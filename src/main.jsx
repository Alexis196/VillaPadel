import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { TorneoProvider } from './contexts/TorneoContext.jsx'

// When a new deploy's service worker takes control of an already-open tab,
// reload once so it actually runs the new code instead of the stale bundle
// it booted with — without this, users have to reload manually to "unstick"
// pages/features shipped after their tab was first opened.
if ('serviceWorker' in navigator) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <TorneoProvider>
        <App />
      </TorneoProvider>
    </AuthProvider>
  </StrictMode>,
)
