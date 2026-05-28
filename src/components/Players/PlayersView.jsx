import { useState, useMemo, useRef, useEffect } from 'react'
import { useCollection } from '../../hooks/useFirestore'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import ShareButton from '../ui/ShareButton'
import './PlayersView.css'

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

function SexoBadge({ sexo }) {
  return (
    <span className="pv-sexo-badge" style={{
      background: sexo === 'F' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)',
      color: sexo === 'F' ? '#ec4899' : '#3b82f6',
    }}>
      {sexo === 'F' ? 'F' : 'M'}
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
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, filterCat, filterSexo, filterLocalidad])

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
    <div className="pv-page" style={{ padding: isMobile ? '20px 12px' : '32px 24px' }}>
      <div className="pv-header">
        <div>
          <h1 style={{ color: '#f1f1f5', fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Categorización
          </h1>
          <p className="pv-subtitle">{filtered.length} de {players.length} jugadores</p>
        </div>
        <ShareButton targetRef={shareRef} title="Categorización" filename="categorizacion" />
      </div>

      <div className="pv-filter-section">
        <div className="pv-search-wrap">
          <span className="pv-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pv-search-input"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="pv-search-clear">×</button>
          )}
        </div>

        <div className="pv-filter-row">
          <span className="pv-filter-label">CATEGORÍA</span>
          <select value={filterCat} onChange={e => handleFilterCat(e.target.value)} className="pv-filter-select">
            <option value="all">Todas</option>
            {CAT_FILTERS.slice(1).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <span className="pv-filter-label">SEXO</span>
          <select value={filterSexo} onChange={e => handleFilterSexo(e.target.value)} className="pv-filter-select">
            <option value="all">Todos</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>

          {localidades.length > 0 && (
            <>
              <div className="pv-filter-divider" />
              <div className="pv-localidad-wrap">
                <select
                  value={filterLocalidad}
                  onChange={e => { setFilterLocalidad(e.target.value); resetPage() }}
                  className="pv-filter-select"
                  style={{
                    border: `1px solid ${filterLocalidad !== 'all' ? '#f97316' : '#2a2a38'}`,
                    color: filterLocalidad !== 'all' ? '#f97316' : '#9999b0',
                    fontWeight: 600, paddingRight: 28, appearance: 'none', WebkitAppearance: 'none',
                  }}
                >
                  <option value="all">Localidad</option>
                  {localidades.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <span className="pv-localidad-arrow" style={{ color: filterLocalidad !== 'all' ? '#f97316' : '#9999b0' }}>▾</span>
              </div>
            </>
          )}

          {!isMobile && (
            <div className="pv-pagesize-group">
              {[10, 25, 50].map(n => (
                <button key={n} onClick={() => handlePageSize(n)}
                  className={`pv-pagesize-btn${pageSize === n ? ' active' : ''}`}>{n}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="pv-empty">
          {players.length === 0 ? 'No hay jugadores registrados aún.' : 'No se encontraron jugadores con esos filtros.'}
        </div>
      ) : isMobile ? (
        <div ref={shareRef} className="pv-cards-grid">
          {paginated.map(player => {
            const col = player.categoryColor || '#f97316'
            return (
              <div key={player.id} className="pv-card">
                <div className="pv-card-name">
                  {player.name}
                  {player.ascenso && <span className="pv-card-ascenso">↑</span>}
                </div>
                {player.localidad && <div className="pv-card-location">{player.localidad}</div>}
                <div className="pv-card-meta">
                  <span className="pv-cat-badge" style={{ background: `${col}18`, border: `1px solid ${col}40`, color: col }}>
                    <span className="pv-cat-dot" style={{ background: col }} />
                    {player.categoryName}
                  </span>
                  <SexoBadge sexo={player.sexo} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div ref={shareRef} className="pv-table-wrap">
          <div className="pv-table-head">
            <div className="pv-th">#</div>
            <div className="pv-th">Jugador</div>
            <div className="pv-th">Localidad</div>
            <div className="pv-th">Categoría</div>
          </div>
          {paginated.map((player, idx) => {
            const globalIdx = (safePage - 1) * pageSize + idx
            const col = player.categoryColor || '#f97316'
            return (
              <div
                key={player.id}
                className="pv-table-row"
                style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #20202c' : 'none' }}
              >
                <div className="pv-row-num">{globalIdx + 1}</div>
                <div className="pv-row-name">
                  {player.name}
                  {player.ascenso && <span title="En zona de ascenso" className="pv-row-ascenso">↑</span>}
                </div>
                <div className="pv-row-location">{player.localidad || '—'}</div>
                <div>
                  <span className="pv-cat-badge-full" style={{ background: `${col}18`, border: `1px solid ${col}40`, color: col }}>
                    <span className="pv-cat-dot-full" style={{ background: col }} />
                    {player.categoryName}
                    {player.categoriaValor != null && (
                      <span className="pv-cat-valor" style={{ background: col }}>{player.categoriaValor}</span>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pv-pagination">
          <span>{filtered.length} jugadores · pág. {safePage}/{totalPages}</span>
          <div className="pv-pagination-btns">
            <button onClick={() => setPage(1)} disabled={safePage === 1} className="pv-page-btn">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="pv-page-btn">‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
              const pg = start + i
              return pg <= totalPages ? (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`pv-page-num-btn${pg === safePage ? ' active' : ''}`}>{pg}</button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="pv-page-btn">›</button>
            <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="pv-page-btn">»</button>
          </div>
        </div>
      )}
    </div>
  )
}
