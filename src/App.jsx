import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import GroupsView from './components/Groups/GroupsView'
import StandingsView from './components/Standings/StandingsView'
import MatchesView from './components/Matches/MatchesView'
import PlayersView from './components/Players/PlayersView'
import BracketView from './components/Bracket/BracketView'
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
      <div className="min-h-screen" style={{ background: '#0f0f13' }}>
        <Routes>
          {/* Login — no navbar */}
          <Route path="/login" element={<LoginView />} />

          {/* Admin — own layout, no public navbar */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>} />

          {/* Public routes */}
          <Route path="/*" element={
            <>
              <Navbar />
              <main className="has-bottom-nav">
                <Routes>
                  <Route path="/" element={<Navigate to="/torneos" replace />} />
                  <Route path="/grupos" element={<Navigate to="/torneos" replace />} />
                  <Route path="/torneos" element={<GroupsView />} />
                  <Route path="/tabla" element={<StandingsView />} />
                  <Route path="/partidos" element={<MatchesView />} />
                  <Route path="/jugadores" element={<PlayersView />} />
                  <Route path="/llave" element={<BracketView />} />
                </Routes>
              </main>
            </>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
