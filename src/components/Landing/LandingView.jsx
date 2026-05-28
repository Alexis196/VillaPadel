import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTorneo } from '../../contexts/TorneoContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import Logo from '../../assets/nuevologo.png'
import Logofondo from '../../assets/logofondoSB.png'
import BgImg from '../../assets/background.png'

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
      <div style={{ fontSize: 34, fontWeight: 800, color: '#f1f1f5', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9999b0', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

function MatchRow({ match, last }) {
  const fin = match.estado === 'Finalizado' || match.estado === 'W.O.'
  const live = match.estado === 'En juego'
  const aWon = fin && (match.ptsA || 0) > (match.ptsB || 0)
  const bWon = fin && (match.ptsB || 0) > (match.ptsA || 0)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: last ? 'none' : '1px solid #1e1e28',
    }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontWeight: aWon ? 600 : 400, color: aWon ? '#f1f1f5' : '#9999b0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {match.duplaA?.jugador1}
        </div>
        <div style={{ fontSize: 11, color: aWon ? '#9999b0' : '#55556a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {match.duplaA?.jugador2}
        </div>
      </div>

      <div style={{ textAlign: 'center', minWidth: 60 }}>
        {live ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.12)', borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
            EN VIVO
          </span>
        ) : fin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: aWon ? '#f97316' : '#6666a0' }}>
              {match.resultado?.setsA}
            </span>
            <span style={{ fontSize: 12, color: '#3a3a50' }}>–</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: bWon ? '#f97316' : '#6666a0' }}>
              {match.resultado?.setsB}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#44445a', fontWeight: 600 }}>vs</span>
        )}
      </div>

      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontWeight: bWon ? 600 : 400, color: bWon ? '#f1f1f5' : '#9999b0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {match.duplaB?.jugador1}
        </div>
        <div style={{ fontSize: 11, color: bWon ? '#9999b0' : '#55556a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {match.duplaB?.jugador2}
        </div>
      </div>
    </div>
  )
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

  return (
    <div>

      {/* ── HERO ── */}
      <div style={{
        position: 'relative',
        backgroundImage: `url(${BgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 40%',
        minHeight: isMobile ? 420 : 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(15,15,19,0.94) 100%)',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 700, width: '100%',
          padding: isMobile ? '52px 20px 44px' : '72px 24px 56px',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <img
            src={Logofondo}
            alt="VillaPadel"
            style={{ height: isMobile ? 70 : 88, width: 'auto', borderRadius: 14, marginBottom: 20, display: 'block' }}
          />

          <h1 style={{
            color: '#f1f1f5', fontSize: isMobile ? 36 : 54, fontWeight: 800,
            margin: '0 0 10px', letterSpacing: '-2px', lineHeight: 1.05,
          }}>
            Villa
            <span style={{
              color: '#f97316', fontSize: isMobile ? 36 : 54, fontWeight: 800,
            }}>
              Padel
            </span>
          </h1>
          <p style={{ color: '#b0b0c8', fontSize: isMobile ? 14 : 16, margin: '0 0 36px', lineHeight: 1.6, maxWidth: 380 }}>
            Seguí los torneos, resultados y tabla de posiciones de VillaPadel Club.
          </p>

          {/* Stats */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: isMobile ? 20 : 44,
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: isMobile ? '14px 22px' : '18px 40px',
          }}>
            <StatItem value={torneos.length} label="Torneos" />
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
            <StatItem value={totalJugadores || '–'} label="Jugadores" />
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
            <StatItem value={enCurso} label="En curso" />
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '28px 14px 60px' : '40px 24px 60px' }}>

        {/* Feature cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: 10, marginBottom: 32,
        }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{
                background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 12,
                padding: isMobile ? '16px 12px' : '20px 18px', textAlign: 'center',
              }}
            >
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: '#f97316' }}>{f.icon(isMobile ? 24 : 28)}</div>
              <div style={{ color: '#f1f1f5', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{f.title}</div>
              <div style={{ color: '#6666a0', fontSize: 12, lineHeight: 1.45 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <button
            onClick={() => navigate('/torneos')}
            style={{
              padding: '14px 48px', borderRadius: 10, border: 'none',
              background: '#f97316', color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '-0.2px', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ea6c0e' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f97316' }}
          >
            Ir a torneos →
          </button>
        </div>

        {/* Partidos en vivo */}
        {partidosDestacados.length > 0 && (
          <div style={{ background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{
              padding: '13px 18px', borderBottom: '1px solid #2a2a38',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#f1f1f5', fontSize: 14, fontWeight: 700 }}>Partidos en vivo</span>
                {activeTorneo && (
                  <span style={{ color: '#6666a0', fontSize: 12 }}>{activeTorneo.nombre}</span>
                )}
              </div>
              {activeTorneo && (
                <button
                  onClick={() => navigate(`/torneos/${activeTorneo.id}`)}
                  style={{ background: 'none', border: 'none', color: '#f97316', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Ver todos →
                </button>
              )}
            </div>

            <div style={{ padding: '2px 18px 8px' }}>
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
