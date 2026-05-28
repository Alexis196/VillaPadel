import { useState, useMemo, useRef } from 'react'
import { useCollection } from '../../hooks/useFirestore'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'

const CAT_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'cat-1ra', label: '1ra' },
  { id: 'cat-2da', label: '2da' },
  { id: 'cat-3ra', label: '3ra' },
  { id: 'cat-4ta', label: '4ta' },
  { id: 'cat-5ta', label: '5ta' },
  { id: 'cat-6ta', label: '6ta' },
  { id: 'cat-7ma', label: '7ma' },
  { id: 'cat-8va', label: '8va' },
]

function CategoryBadge({ name, color, valor }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {name}
      {valor != null && (
        <span style={{ background: color, color: '#fff', borderRadius: 10, padding: '0px 6px', fontSize: 10, fontWeight: 800, lineHeight: '16px' }}>
          {valor}
        </span>
      )}
    </span>
  )
}

export default function PlayersView() {
  const { data: players, loading } = useCollection('players')
  const isMobile = useIsMobile()
  const shareRef = useRef(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterSexo, setFilterSexo] = useState('all')
  const [filterLocalidad, setFilterLocalidad] = useState('all')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)

  const CAT_PREFIX = { 'cat-1ra': '1ra', 'cat-2da': '2da', 'cat-3ra': '3ra', 'cat-4ta': '4ta', 'cat-5ta': '5ta', 'cat-6ta': '6ta', 'cat-7ma': '7ma', 'cat-8va': '8va' }

  const localidades = useMemo(() => {
    const set = new Set(players.filter(p => p.localidad).map(p => p.localidad))
    return [...set].sort()
  }, [players])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const catPrefix = filterCat !== 'all' ? CAT_PREFIX[filterCat] : null
    return [...players]
      .filter(p => {
        if (q && !p.name.toLowerCase().includes(q) && !p.categoryName?.toLowerCase().includes(q)) return false
        if (catPrefix && !p.categoryName?.startsWith(catPrefix)) return false
        if (filterSexo !== 'all' && p.sexo !== filterSexo) return false
        if (filterLocalidad !== 'all' && p.localidad !== filterLocalidad) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [players, search, filterCat, filterSexo, filterLocalidad])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function resetPage() { setPage(1) }
  function handleSearch(val) { setSearch(val); resetPage() }
  function handleFilterCat(val) { setFilterCat(val); resetPage() }
  function handleFilterSexo(val) { setFilterSexo(val); resetPage() }
  function handlePageSize(val) { setPageSize(val); resetPage() }

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 12px' : '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Categorización
          </h1>
          <p style={{ color: '#9999b0', fontSize: 14, margin: 0 }}>
            {filtered.length} de {players.length} jugadores
          </p>
        </div>
        <ShareButton targetRef={shareRef} title="Categorización" filename="categorizacion" />
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6666a0', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{ width: '100%', background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 8, padding: '9px 36px 9px 36px', color: '#f1f1f5', fontSize: 13, outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#f97316'}
            onBlur={e => e.target.style.borderColor = '#2a2a38'}
          />
          {search && (
            <button onClick={() => handleSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Cross-filters row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Category filter */}
          <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>CATEGORÍA</span>
          <select
            value={filterCat}
            onChange={e => handleFilterCat(e.target.value)}
            style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6, color: '#f1f1f5', fontSize: 12, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">Todas</option>
            {CAT_FILTERS.slice(1).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {/* Sexo filter */}
          <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>SEXO</span>
          <select
            value={filterSexo}
            onChange={e => handleFilterSexo(e.target.value)}
            style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6, color: '#f1f1f5', fontSize: 12, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">Todos</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
          {/* Localidad filter */}
          {localidades.length > 0 && (
            <>
              <div style={{ width: 1, height: 20, background: '#2a2a38', flexShrink: 0 }} />
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <select
                  value={filterLocalidad}
                  onChange={e => { setFilterLocalidad(e.target.value); resetPage() }}
                  style={{ background: '#13131a', border: `1px solid ${filterLocalidad !== 'all' ? '#f97316' : '#2a2a38'}`, borderRadius: 6, color: filterLocalidad !== 'all' ? '#f97316' : '#9999b0', fontSize: 12, fontWeight: 600, padding: '5px 28px 5px 10px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
                >
                  <option value="all">Localidad</option>
                  {localidades.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: filterLocalidad !== 'all' ? '#f97316' : '#9999b0', fontSize: 10 }}>▾</span>
              </div>
            </>
          )}
          {/* Page size (desktop only) */}
          {!isMobile && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {[10, 25, 50].map(n => (
                <button key={n} onClick={() => handlePageSize(n)} style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: pageSize === n ? '#f97316' : 'transparent', color: pageSize === n ? '#fff' : '#9999b0', borderColor: pageSize === n ? '#f97316' : '#2a2a38' }}>{n}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#9999b0', background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38' }}>
          {players.length === 0 ? 'No hay jugadores registrados aún.' : 'No se encontraron jugadores con esos filtros.'}
        </div>
      ) : isMobile ? (
        /* Mobile: card grid */
        <div ref={shareRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {paginated.map((player, idx) => (
            <div key={player.id} style={{ background: '#1a1a22', borderRadius: 10, border: '1px solid #2a2a38', padding: '12px 14px' }}>
              <div style={{ color: '#f1f1f5', fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                {player.name}
                {player.ascenso && <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }}>↑</span>}
              </div>
              {player.localidad && (
                <div style={{ color: '#6666a0', fontSize: 11, marginBottom: 5 }}>{player.localidad}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20,
                  background: `${player.categoryColor || '#f97316'}18`, border: `1px solid ${player.categoryColor || '#f97316'}40`,
                  color: player.categoryColor || '#f97316', fontSize: 10, fontWeight: 700,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: player.categoryColor || '#f97316' }} />
                  {player.categoryName}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background: player.sexo === 'F' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)',
                  color: player.sexo === 'F' ? '#ec4899' : '#3b82f6',
                }}>
                  {player.sexo === 'F' ? 'F' : 'M'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: table */
        <div ref={shareRef} style={{ background: '#1a1a22', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 130px 220px', alignItems: 'center', padding: '0 20px', height: 42, borderBottom: '1px solid #2a2a38', background: '#16161e', gap: 12 }}>
            <div style={{ color: '#6666a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>#</div>
            <div style={{ color: '#6666a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Jugador</div>
            <div style={{ color: '#6666a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Localidad</div>
            <div style={{ color: '#6666a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoría</div>
          </div>
          {paginated.map((player, idx) => {
            const globalIdx = (safePage - 1) * pageSize + idx
            return (
              <div
                key={player.id}
                style={{ display: 'grid', gridTemplateColumns: '48px 1fr 130px 220px', alignItems: 'center', padding: '0 20px', height: 54, borderBottom: idx < paginated.length - 1 ? '1px solid #20202c' : 'none', gap: 12, transition: 'background 0.12s', cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.background = '#20202c'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ color: '#44445a', fontSize: 13, fontWeight: 600 }}>{globalIdx + 1}</div>
                <div style={{ color: '#f1f1f5', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {player.name}
                  {player.ascenso && <span title="En zona de ascenso" style={{ color: '#22c55e', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>↑</span>}
                </div>
                <div style={{ color: '#9999b0', fontSize: 13 }}>{player.localidad || '—'}</div>
                <div>
                  <CategoryBadge name={player.categoryName} color={player.categoryColor || '#f97316'} valor={player.categoriaValor} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, color: '#9999b0', fontSize: 12, flexWrap: 'wrap', gap: 8 }}>
          <span>{filtered.length} jugadores · pág. {safePage}/{totalPages}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(1)} disabled={safePage === 1} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === 1 ? '#44445a' : '#9999b0', cursor: safePage === 1 ? 'default' : 'pointer', fontSize: 12 }}>«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === 1 ? '#44445a' : '#9999b0', cursor: safePage === 1 ? 'default' : 'pointer', fontSize: 12 }}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
              const pg = start + i
              return pg <= totalPages ? (
                <button key={pg} onClick={() => setPage(pg)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid', fontSize: 12, cursor: 'pointer', background: pg === safePage ? '#f97316' : 'transparent', color: pg === safePage ? '#fff' : '#9999b0', borderColor: pg === safePage ? '#f97316' : '#2a2a38' }}>{pg}</button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === totalPages ? '#44445a' : '#9999b0', cursor: safePage === totalPages ? 'default' : 'pointer', fontSize: 12 }}>›</button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === totalPages ? '#44445a' : '#9999b0', cursor: safePage === totalPages ? 'default' : 'pointer', fontSize: 12 }}>»</button>
          </div>
        </div>
      )}
    </div>
  )
}
