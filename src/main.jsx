import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { TorneoProvider } from './contexts/TorneoContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <TorneoProvider>
        <App />
      </TorneoProvider>
    </AuthProvider>
  </StrictMode>,
)
