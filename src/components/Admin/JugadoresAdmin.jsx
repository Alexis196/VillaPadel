import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { addJugador, updateJugador, deleteJugador, toggleAscenso } from '../../firebase/torneoService'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import AppSelect from '../ui/AppSelect'
import './JugadoresAdmin.css'

const CAT_OPTIONS = [
  { id: 'cat-8va', name: '8va Categoría', valor: 8, color: '#64748b' },
  { id: 'cat-7ma', name: '7ma Categoría', valor: 7, color: '#eab308' },
  { id: 'cat-6ta', name: '6ta Categoría', valor: 6, color: '#84cc16' },
  { id: 'cat-5ta', name: '5ta Categoría', valor: 5, color: '#06b6d4' },
  { id: 'cat-4ta', name: '4ta Categoría', valor: 4, color: '#10b981' },
  { id: 'cat-3ra', name: '3ra Categoría', valor: 3, color: '#3b82f6' },
  { id: 'cat-2da', name: '2da Categoría', valor: 2, color: '#a855f7' },
  { id: 'cat-1ra', name: '1ra Categoría', valor: 1, color: '#f97316' },
]

const blankForm = () => ({ name: '', catId: 'cat-8va', sexo: 'M', localidad: '' })

function sexoBadgeStyle(sexo) {
  return {
    background: sexo === 'F' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)',
    color: sexo === 'F' ? '#ec4899' : '#3b82f6',
    border: `1px solid ${sexo === 'F' ? 'rgba(236,72,153,0.3)' : 'rgba(59,130,246,0.3)'}`,
  }
}

export default function JugadoresAdmin() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterSexo, setFilterSexo] = useState('all')
  const [filterLocalidad, setFilterLocalidad] = useState('all')
  const [form, setForm] = useState(blankForm())
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(blankForm())
  const [saving, setSaving] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const isCardView = useIsMobile(720)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const snap = await getDocs(collection(db, 'players'))
    setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  const CAT_PREFIX = { 'cat-1ra': '1ra', 'cat-2da': '2da', 'cat-3ra': '3ra', 'cat-4ta': '4ta', 'cat-5ta': '5ta', 'cat-6ta': '6ta', 'cat-7ma': '7ma', 'cat-8va': '8va' }

  const localidadOptions = useMemo(() => {
    const set = new Set(players.map(p => p.localidad).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [players])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const catPrefix = filterCat !== 'all' ? CAT_PREFIX[filterCat] : null
    return [...players]
      .filter(p => {
        if (q && !p.name?.toLowerCase().includes(q) && !p.categoryName?.toLowerCase().includes(q)) return false
        if (catPrefix && !p.categoryName?.startsWith(catPrefix)) return false
        if (filterSexo !== 'all' && p.sexo !== filterSexo) return false
        if (filterLocalidad !== 'all' && p.localidad !== filterLocalidad) return false
        return true
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [players, search, filterCat, filterSexo, filterLocalidad])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = pageSize === 0 ? filtered : filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function handleSearch(val) { setSearch(val); setPage(1) }
  function handlePageSize(val) { setPageSize(val); setPage(1) }
  function handleFilterCat(val) { setFilterCat(val); setPage(1) }
  function handleFilterSexo(val) { setFilterSexo(val); setPage(1) }
  function handleFilterLocalidad(val) { setFilterLocalidad(val); setPage(1) }

  async function handleToggleAscenso(p) {
    const next = !p.ascenso
    await toggleAscenso(p.id, next)
    setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, ascenso: next } : x))
  }

  function startEdit(p) {
    const cat = CAT_OPTIONS.find(c => c.name === p.categoryName) || CAT_OPTIONS[0]
    setEditForm({ name: p.name, catId: cat.id, sexo: p.sexo || 'M', localidad: p.localidad || '' })
    setEditId(p.id)
  }

  function cancelEdit() { setEditForm(blankForm()); setEditId(null) }

  async function handleAdd() {
    if (!form.name.trim()) return
    const cat = CAT_OPTIONS.find(c => c.id === form.catId)
    setSaving(true)
    await addJugador({ name: form.name.trim(), categoryName: cat.name, categoryColor: cat.color, categoriaValor: cat.valor, sexo: form.sexo, localidad: form.localidad })
    await load()
    setSaving(false)
    setForm(blankForm())
  }

  async function handleSaveEdit() {
    if (!editForm.name.trim()) return
    const cat = CAT_OPTIONS.find(c => c.id === editForm.catId)
    setSavingEdit(true)
    await updateJugador(editId, { name: editForm.name.trim(), categoryName: cat.name, categoryColor: cat.color, categoriaValor: cat.valor, sexo: editForm.sexo, localidad: editForm.localidad })
    setPlayers(prev => prev.map(p => p.id === editId ? { ...p, name: editForm.name.trim(), categoryName: cat.name, categoryColor: cat.color, categoriaValor: cat.valor, sexo: editForm.sexo, localidad: editForm.localidad } : p))
    setSavingEdit(false)
    cancelEdit()
  }

  async function handleDelete(id) {
    await deleteJugador(id)
    setPlayers(prev => prev.filter(p => p.id !== id))
    setConfirmDelete(null)
  }

  const cat = CAT_OPTIONS.find(c => c.id === form.catId) || CAT_OPTIONS[0]
  const editCat = CAT_OPTIONS.find(c => c.id === editForm.catId) || CAT_OPTIONS[0]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 className="ja-page-title">Jugadores</h2>
        <p className="ja-page-desc">Categorización de jugadores</p>
      </div>

      {/* Add form */}
      <div className="ja-form-panel">
        <div className="ja-form-heading">+ Nuevo jugador</div>
        <div className="ja-form-row">
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="ja-field-label">NOMBRE</div>
            <input placeholder="Nombre y apellido" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} className="ja-inp" />
          </div>
          <div style={{ minWidth: 140 }}>
            <div className="ja-field-label">LOCALIDAD</div>
            <input placeholder="Ciudad / Club" value={form.localidad} onChange={e => setForm(p => ({ ...p, localidad: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} className="ja-inp" />
          </div>
          <div style={{ minWidth: 170 }}>
            <div className="ja-field-label">CATEGORÍA</div>
            <AppSelect
              value={form.catId}
              onChange={v => setForm(p => ({ ...p, catId: v }))}
              options={CAT_OPTIONS.map(c => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div style={{ minWidth: 120 }}>
            <div className="ja-field-label">SEXO</div>
            <div className="ja-sexo-group">
              {[{ v: 'M', label: 'Masc.', col: '#3b82f6' }, { v: 'F', label: 'Fem.', col: '#ec4899' }].map(({ v, label, col }) => (
                <button key={v} type="button" onClick={() => setForm(p => ({ ...p, sexo: v }))}
                  className="ja-sexo-btn"
                  style={{ background: form.sexo === v ? col : 'transparent', color: form.sexo === v ? '#fff' : '#9999b0' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="ja-cat-preview" style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>
            <span className="ja-cat-dot" style={{ background: cat.color }} />
            <span className="ja-cat-label" style={{ color: cat.color }}>Nv. {cat.valor}</span>
          </div>
          <div className="ja-form-actions">
            <button onClick={handleAdd} disabled={saving || !form.name.trim()} className="ja-btn-save">
              {saving ? '...' : '+ Agregar'}
            </button>
          </div>
        </div>
      </div>

      {/* Search + filters + page size */}
      <div className="ja-filter-section">
        <div className="ja-search-wrap">
          <span className="ja-search-icon">🔍</span>
          <input type="text" placeholder="Buscar jugador..." value={search} onChange={e => handleSearch(e.target.value)}
            className="ja-inp" style={{ paddingLeft: 32 }} />
        </div>
        <div className="ja-filter-row">
          <span className="ja-filter-label">CATEGORÍA</span>
          <AppSelect
            value={filterCat}
            onChange={handleFilterCat}
            options={[
              { value: 'all', label: 'Todas' },
              ...CAT_OPTIONS.slice().reverse().map(c => ({ value: c.id, label: c.name })),
            ]}
            minWidth={160}
          />
          <span className="ja-filter-label">SEXO</span>
          <AppSelect
            value={filterSexo}
            onChange={handleFilterSexo}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Femenino' },
            ]}
            minWidth={130}
          />
          <span className="ja-filter-label">LOCALIDAD</span>
          <AppSelect
            value={filterLocalidad}
            onChange={handleFilterLocalidad}
            options={[
              { value: 'all', label: 'Todas' },
              ...localidadOptions.map(l => ({ value: l, label: l })),
            ]}
            minWidth={160}
          />
          <div className="ja-pagesize-group">
            <span className="ja-pagesize-label">Ver</span>
            {[10, 25, 50].map(n => (
              <button key={n} onClick={() => handlePageSize(n)}
                className={`ja-pagesize-btn${pageSize === n ? ' active' : ''}`}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Players list */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="ja-empty">
          {players.length === 0 ? 'No hay jugadores. Agregá el primero arriba.' : 'No se encontraron jugadores.'}
        </div>
      ) : isCardView ? (
        <>
          <div className="ja-cards-grid">
            {paginated.map(p => {
              const pCat = CAT_OPTIONS.find(c => c.name === p.categoryName) || { color: '#f97316', valor: '—' }
              return (
                <div key={p.id} className="ja-card" style={{ border: `1px solid ${editId === p.id ? '#f97316' : '#2a2a38'}` }}>
                  <div className="ja-card-top">
                    <div>
                      <div className="ja-card-name">
                        {p.name}
                        {p.ascenso && <span className="ja-ascenso-upgrade">↑</span>}
                      </div>
                      {p.localidad && <div className="ja-card-location">📍 {p.localidad}</div>}
                    </div>
                    <div className="ja-card-btn-group">
                      <button onClick={() => startEdit(p)} className="ja-icon-btn"
                        onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                        onMouseLeave={e => e.currentTarget.style.color = '#9999b0'}>✎</button>
                      <button onClick={() => setConfirmDelete(p.id)} className="ja-icon-btn"
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#9999b0'}>🗑</button>
                    </div>
                  </div>
                  <div className="ja-card-meta">
                    <span className="ja-cat-badge" style={{ background: `${pCat.color}18`, border: `1px solid ${pCat.color}40`, color: pCat.color }}>
                      <span className="ja-cat-badge-dot" style={{ background: pCat.color }} />
                      {p.categoryName}
                      <span className="ja-cat-badge-level" style={{ background: pCat.color }}>{pCat.valor}</span>
                    </span>
                    <span className="ja-sexo-badge" style={sexoBadgeStyle(p.sexo)}>
                      {p.sexo === 'F' ? 'F' : 'M'}
                    </span>
                    <button onClick={() => handleToggleAscenso(p)} className="ja-ascenso-btn"
                      style={{
                        background: p.ascenso ? 'rgba(34,197,94,0.15)' : 'transparent',
                        border: `1px solid ${p.ascenso ? 'rgba(34,197,94,0.4)' : '#2a2a38'}`,
                        color: p.ascenso ? '#22c55e' : '#44445a',
                      }}>↑</button>
                  </div>
                </div>
              )
            })}
          </div>
          <PaginationBar safePage={safePage} totalPages={totalPages} setPage={setPage} filtered={filtered} />
        </>
      ) : (
        <>
          <div className="ja-table-wrap">
            <div className="ja-table-head">
              {['#', 'Jugador', 'Localidad', 'Sexo', 'Categoría', '↑', ''].map(h => (
                <div key={h} className={h === '↑' ? 'ja-th-ascenso' : 'ja-th'}>{h}</div>
              ))}
            </div>
            {paginated.map((p, idx) => {
              const pCat = CAT_OPTIONS.find(c => c.name === p.categoryName) || { color: '#f97316', valor: '—' }
              const globalIdx = (safePage - 1) * pageSize + idx
              return (
                <div key={p.id} className="ja-table-row"
                  style={{
                    borderBottom: idx < paginated.length - 1 ? '1px solid #20202c' : 'none',
                    background: editId === p.id ? 'rgba(249,115,22,0.04)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (editId !== p.id) e.currentTarget.style.background = '#1a1a22' }}
                  onMouseLeave={e => { if (editId !== p.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="ja-row-num">{globalIdx + 1}</div>
                  <div className="ja-row-name">
                    {p.name}
                    {p.ascenso && <span className="ja-ascenso-upgrade">↑</span>}
                  </div>
                  <div className="ja-row-location">{p.localidad || '—'}</div>
                  <div>
                    <span className="ja-sexo-badge" style={sexoBadgeStyle(p.sexo)}>{p.sexo === 'F' ? 'F' : 'M'}</span>
                  </div>
                  <div>
                    <span className="ja-cat-badge" style={{ background: `${pCat.color}18`, border: `1px solid ${pCat.color}40`, color: pCat.color }}>
                      <span className="ja-cat-badge-dot" style={{ background: pCat.color }} />
                      {p.categoryName}
                      <span className="ja-cat-badge-level" style={{ background: pCat.color }}>{pCat.valor}</span>
                    </span>
                  </div>
                  <div className="ja-row-ascenso-cell">
                    <button
                      onClick={() => handleToggleAscenso(p)}
                      title={p.ascenso ? 'Quitar ascenso' : 'Marcar en ascenso'}
                      className="ja-ascenso-btn"
                      style={{
                        background: p.ascenso ? 'rgba(34,197,94,0.15)' : 'transparent',
                        border: `1px solid ${p.ascenso ? 'rgba(34,197,94,0.4)' : '#2a2a38'}`,
                        color: p.ascenso ? '#22c55e' : '#44445a',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#22c55e' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = p.ascenso ? 'rgba(34,197,94,0.4)' : '#2a2a38'; e.currentTarget.style.color = p.ascenso ? '#22c55e' : '#44445a' }}
                    >↑</button>
                  </div>
                  <div className="ja-row-actions">
                    <button onClick={() => startEdit(p)} className="ja-table-icon-btn"
                      onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                      onMouseLeave={e => e.currentTarget.style.color = '#9999b0'}>✎</button>
                    <button onClick={() => setConfirmDelete(p.id)} className="ja-table-icon-btn"
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#9999b0'}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
          <PaginationBar safePage={safePage} totalPages={totalPages} setPage={setPage} filtered={filtered} />
        </>
      )}

      {editId && (
        <div className="ja-modal-overlay" onClick={e => e.target === e.currentTarget && cancelEdit()}>
          <div className="ja-edit-modal">
            <div className="ja-form-heading">✎ Editar jugador</div>
            <div className="ja-edit-modal-body">
              <div>
                <div className="ja-field-label">NOMBRE</div>
                <input placeholder="Nombre y apellido" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit()} className="ja-inp" autoFocus />
              </div>
              <div>
                <div className="ja-field-label">LOCALIDAD</div>
                <input placeholder="Ciudad / Club" value={editForm.localidad} onChange={e => setEditForm(p => ({ ...p, localidad: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit()} className="ja-inp" />
              </div>
              <div>
                <div className="ja-field-label">CATEGORÍA</div>
                <AppSelect
                  value={editForm.catId}
                  onChange={v => setEditForm(p => ({ ...p, catId: v }))}
                  options={CAT_OPTIONS.map(c => ({ value: c.id, label: c.name }))}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="ja-field-label">SEXO</div>
                  <div className="ja-sexo-group">
                    {[{ v: 'M', label: 'Masc.', col: '#3b82f6' }, { v: 'F', label: 'Fem.', col: '#ec4899' }].map(({ v, label, col }) => (
                      <button key={v} type="button" onClick={() => setEditForm(p => ({ ...p, sexo: v }))}
                        className="ja-sexo-btn"
                        style={{ background: editForm.sexo === v ? col : 'transparent', color: editForm.sexo === v ? '#fff' : '#9999b0' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ja-cat-preview" style={{ background: `${editCat.color}15`, border: `1px solid ${editCat.color}30` }}>
                  <span className="ja-cat-dot" style={{ background: editCat.color }} />
                  <span className="ja-cat-label" style={{ color: editCat.color }}>Nv. {editCat.valor}</span>
                </div>
              </div>
            </div>
            <div className="ja-modal-actions" style={{ marginTop: 22 }}>
              <button onClick={cancelEdit} className="ja-modal-cancel">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={savingEdit || !editForm.name.trim()} className="ja-btn-save">
                {savingEdit ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="ja-modal-overlay">
          <div className="ja-modal">
            <div className="ja-modal-icon">🗑</div>
            <h3 className="ja-modal-title">¿Eliminar jugador?</h3>
            <p className="ja-modal-desc">Esta acción no se puede deshacer.</p>
            <div className="ja-modal-actions">
              <button onClick={() => setConfirmDelete(null)} className="ja-modal-cancel">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="ja-modal-confirm">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PaginationBar({ safePage, totalPages, setPage, filtered }) {
  if (totalPages <= 1) return null
  return (
    <div className="ja-pagination">
      <span>{filtered.length} jugadores · página {safePage} de {totalPages}</span>
      <div className="ja-pagination-btns">
        <button onClick={() => setPage(1)} disabled={safePage === 1} className="ja-page-btn">«</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="ja-page-btn">‹</button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
          const pg = start + i
          return pg <= totalPages ? (
            <button key={pg} onClick={() => setPage(pg)}
              className={`ja-page-num-btn${pg === safePage ? ' active' : ''}`}>{pg}</button>
          ) : null
        })}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="ja-page-btn">›</button>
        <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="ja-page-btn">»</button>
      </div>
    </div>
  )
}
