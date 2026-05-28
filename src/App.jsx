import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import LandingView from './components/Landing/LandingView'
import TorneosListView from './components/Torneos/TorneosListView'
import TorneoDetailView from './components/Torneos/TorneoDetailView'
import PlayersView from './components/Players/PlayersView'
import LoginView from './components/Auth/LoginView'
import AdminLayout from './components/Admin/AdminLayout'
import Spinner from './components/ui/Spinner'
import './index.css'

function AdminRoute({ children }) {
  const { user, isAdmin, authLoading } = useAuth()
  if (authLoading) return <Spinner />
  if (!user || !isAdmin) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{
        background: '#0b1020',
        backgroundImage: `
          radial-gradient(ellipse at top left,    rgba(14,165,233,0.07) 0%, transparent 45%),
          radial-gradient(ellipse at bottom right, rgba(249,115,22,0.07) 0%, transparent 45%)
        `,
        backgroundAttachment: 'fixed',
      }}>
        <Routes>
          {/* Login — no navbar */}
          <Route path="/login" element={<LoginView />} />

          {/* Admin — own layout, no public navbar */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>} />

          {/* Public routes */}
          <Route path="/*" element={
            <>
              <Navbar />
              <main>
                <Routes>
                  <Route path="/" element={<LandingView />} />
                  <Route path="/torneos" element={<TorneosListView />} />
                  <Route path="/torneos/:id" element={<TorneoDetailView />} />
                  <Route path="/categorizacion" element={<PlayersView />} />
                  {/* Legacy redirects */}
                  <Route path="/grupos" element={<Navigate to="/torneos" replace />} />
                  <Route path="/tabla" element={<Navigate to="/torneos" replace />} />
                  <Route path="/partidos" element={<Navigate to="/torneos" replace />} />
                  <Route path="/jugadores" element={<Navigate to="/categorizacion" replace />} />
                  <Route path="/llave" element={<Navigate to="/torneos" replace />} />
                </Routes>
              </main>
            </>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
