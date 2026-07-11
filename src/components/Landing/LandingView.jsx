import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Logo from '../../assets/nuevologo.png'
import Logofondo from '../../assets/logofondoSB.png'
import BgImg from '../../assets/background.png'
import './LandingView.css'

const IconGrupos = (s) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path d="M12 2a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4 4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" />
  </svg>
)
const IconTabla = (s) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)
const IconPartidos = (s) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C7.5 2 4 5.5 4 10c0 3.5 2.5 6 5.5 6.8L10 22h4l.5-5.2c3-.8 5.5-3.3 5.5-6.8 0-4.5-3.5-8-8-8z" />
    <path d="M11 18h2" />
    <circle cx="10" cy="8" r="1" fill="currentColor" /><circle cx="12" cy="7" r="1" fill="currentColor" /><circle cx="14" cy="8" r="1" fill="currentColor" />
    <circle cx="10" cy="11" r="1" fill="currentColor" /><circle cx="12" cy="10" r="1" fill="currentColor" /><circle cx="14" cy="11" r="1" fill="currentColor" />
  </svg>
)
const IconLlave = (s) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 22h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
    <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    <circle cx="12" cy="16" r="2" fill="currentColor" />
  </svg>
)
const IconJugadores = (s) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

const FEATURES = [
  { icon: IconGrupos,    title: 'Grupos',         desc: 'Fases de grupos y zonas de cada torneo' },
  { icon: IconTabla,     title: 'Tabla',          desc: 'Posiciones en tiempo real por zona' },
  { icon: IconPartidos,  title: 'Partidos',       desc: 'Resultados de todos los encuentros' },
  { icon: IconLlave,     title: 'Llave',          desc: 'Cruces eliminatorios y finales' },
  { icon: IconJugadores, title: 'Categorización', desc: 'Ranking y categorías de jugadores' },
]

function StatItem({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function MatchRow({ match, last }) {
  const fin = match.estado === 'Finalizado' || match.estado === 'W.O.'
  const live = match.estado === 'En juego'
  const aWon = fin && (match.ptsA || 0) > (match.ptsB || 0)
  const bWon = fin && (match.ptsB || 0) > (match.ptsA || 0)

  return (
    <div className="match-row" style={{ borderBottom: last ? 'none' : undefined }}>
      <div className="lv-player-cell-r">
        <div className="lv-player-p1" style={{ fontWeight: aWon ? 600 : 400, color: aWon ? '#fff' : 'rgba(255,255,255,.52)' }}>
          {match.duplaA?.jugador1}
        </div>
        <div className="lv-player-p2" style={{ color: aWon ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.28)' }}>
          {match.duplaA?.jugador2}
        </div>
      </div>

      <div className="lv-score-center">
        {live ? (
          <span className="badge badge-live" style={{ whiteSpace: 'nowrap' }}>
            <span className="lv-live-dot" />
            EN VIVO
          </span>
        ) : fin ? (
          <div className="lv-score-display">
            <span className="lv-score-num" style={{ color: aWon ? 'var(--orange-light)' : 'rgba(255,255,255,.28)' }}>{match.resultado?.setsA}</span>
            <span className="lv-score-sep">–</span>
            <span className="lv-score-num" style={{ color: bWon ? 'var(--orange-light)' : 'rgba(255,255,255,.28)' }}>{match.resultado?.setsB}</span>
          </div>
        ) : (
          <span className="lv-score-vs">vs</span>
        )}
      </div>

      <div className="lv-player-cell-l">
        <div className="lv-player-p1" style={{ fontWeight: bWon ? 600 : 400, color: bWon ? '#fff' : 'rgba(255,255,255,.52)' }}>
          {match.duplaB?.jugador1}
        </div>
        <div className="lv-player-p2" style={{ color: bWon ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.28)' }}>
          {match.duplaB?.jugador2}
        </div>
      </div>
    </div>
  )
}

function formatFechaInicio(fecha) {
  if (!fecha) return ''
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default function LandingView() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { torneos, activeTorneo, partidos, zonas } = useTorneo()

  const enCurso = torneos.filter(t => t.estado === 'En curso' || t.estado === 'Llave').length
  const totalJugadores = zonas.reduce((acc, z) => acc + (z.duplas?.length || 0) * 2, 0)

  const partidosDestacados = useMemo(() => {
    const live = partidos.filter(p => p.estado === 'En juego')
    const fin = partidos.filter(p => p.estado === 'Finalizado' || p.estado === 'W.O.')
    return [...live, ...fin].slice(0, 5)
  }, [partidos])

  const proximosTorneos = useMemo(() => {
    return torneos
      .filter(t => t.estado === 'Inscripción')
      .sort((a, b) => (a.fechaInicio || '').localeCompare(b.fechaInicio || ''))
  }, [torneos])

  return (
    <div>
      {/* ── HERO ── */}
      <div className="hero-section" style={{ minHeight: isMobile ? 520 : 720 }}>
        <div className="hero-bg" style={{ backgroundImage: `url(${BgImg})` }} />
        <div className="hero-overlay" />
        <div className="hero-glow-orange" />
        <div className="hero-glow-blue" />

        <div className="hero-content" style={{ padding: isMobile ? '52px 18px 44px' : undefined }}>
          <img src={Logofondo} alt="VillaPadel" className="hero-logo animate-fadein" style={{ height: isMobile ? 72 : 92 }} />

          <h1 className="hero-title animate-fadein-delay-1">
            Villa<span className="hero-title-accent">Padel</span>
          </h1>

          <p className="hero-desc animate-fadein-delay-2" style={{ fontSize: isMobile ? 14 : undefined }}>
            Seguí los torneos, resultados y tabla de posiciones de VillaPadel Club.
          </p>

          <div className="hero-stats animate-fadein-delay-3" style={{ gap: isMobile ? 20 : undefined, padding: isMobile ? '15px 22px' : undefined }}>
            <StatItem value={torneos.length} label="Torneos" />
            <div className="stat-divider" />
            <StatItem value={totalJugadores || '–'} label="Jugadores" />
            <div className="stat-divider" />
            <StatItem value={enCurso} label="En curso" />
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="lv-body" style={{ padding: isMobile ? '28px 14px 64px' : '44px 24px 72px' }}>

        <div className="lv-features-section">
          <p className="lv-features-label">Explorá la plataforma</p>
          <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.3px' }}>
            Todo lo que encontrás en VillaPadel
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 14 }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="feature-card animate-fadein"
                style={{
                  animationDelay: `${i * 0.06}s`,
                  padding: isMobile ? '18px 12px' : undefined,
                  border: '1px solid rgba(255,255,255,0.03)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4), 0 0 20px rgba(249,115,22,0.05)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'
                }}
              >
                <div className="feature-icon">{f.icon(isMobile ? 24 : 28)}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lv-cta lv-cta-buttons">
          <button className="btn-primary" onClick={() => navigate('/torneos')} style={{ padding: isMobile ? '13px 36px' : undefined }}>
            Ver torneos
          </button>
          <button className="btn-ghost" onClick={() => navigate('/categorizacion')} style={{ padding: isMobile ? '13px 28px' : '14px 32px', fontSize: 14 }}>
            Ver categorización
          </button>
        </div>

        {proximosTorneos.length > 0 && (
          <div className="match-section lv-match-section animate-fadein" style={{ marginBottom: 32 }}>
            <div className="match-section-header">
              <div className="lv-match-header-inner">
                <span className="lv-recent-title">Próximamente</span>
              </div>
            </div>

            <div style={{ padding: '2px 0 4px' }}>
              {proximosTorneos.map((t, i) => (
                <button
                  key={t.id}
                  className="lv-proximo-row"
                  onClick={() => navigate(`/torneos/${t.id}`)}
                  style={{ borderBottom: i === proximosTorneos.length - 1 ? 'none' : undefined }}
                >
                  <span className="lv-proximo-nombre">{t.nombre}</span>
                  <span className="badge badge-blue">{formatFechaInicio(t.fechaInicio)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {partidosDestacados.length > 0 && (
          <div className="match-section lv-match-section animate-fadein">
            <div className="match-section-header">
              <div className="lv-match-header-inner">
                <span className="lv-recent-title">Partidos recientes</span>
                {activeTorneo && <span className="lv-recent-torneo">{activeTorneo.nombre}</span>}
              </div>
              {activeTorneo && (
                <button className="btn-text-link" onClick={() => navigate(`/torneos/${activeTorneo.id}`)}>
                  Ver todos →
                </button>
              )}
            </div>

            <div style={{ padding: '2px 0 4px' }}>
              {partidosDestacados.map((m, i) => (
                <MatchRow key={m.id} match={m} last={i === partidosDestacados.length - 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
