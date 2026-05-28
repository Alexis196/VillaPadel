import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { addJugador, updateJugador, deleteJugador, toggleAscenso } from '../../firebase/torneoService'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'

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
const inp = { background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6, padding: '6px 10px', color: '#f1f1f5', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

export default function JugadoresAdmin() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterSexo, setFilterSexo] = useState('all')
  const [form, setForm] = useState(blankForm())
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [pageSize, setPageSize] = useState(25)
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const catPrefix = filterCat !== 'all' ? CAT_PREFIX[filterCat] : null
    return [...players]
      .filter(p => {
        if (q && !p.name?.toLowerCase().includes(q) && !p.categoryName?.toLowerCase().includes(q)) return false
        if (catPrefix && !p.categoryName?.startsWith(catPrefix)) return false
        if (filterSexo !== 'all' && p.sexo !== filterSexo) return false
        return true
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [players, search, filterCat, filterSexo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = pageSize === 0 ? filtered : filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function handleSearch(val) { setSearch(val); setPage(1) }
  function handlePageSize(val) { setPageSize(val); setPage(1) }
  function handleFilterCat(val) { setFilterCat(val); setPage(1) }
  function handleFilterSexo(val) { setFilterSexo(val); setPage(1) }

  async function handleToggleAscenso(p) {
    const next = !p.ascenso
    await toggleAscenso(p.id, next)
    setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, ascenso: next } : x))
  }

  function startEdit(p) {
    const cat = CAT_OPTIONS.find(c => c.name === p.categoryName) || CAT_OPTIONS[0]
    setForm({ name: p.name, catId: cat.id, sexo: p.sexo || 'M', localidad: p.localidad || '' })
    setEditId(p.id)
  }

  function cancelEdit() { setForm(blankForm()); setEditId(null) }

  async function handleSave() {
    if (!form.name.trim()) return
    const cat = CAT_OPTIONS.find(c => c.id === form.catId)
    setSaving(true)
    if (editId) {
      await updateJugador(editId, { name: form.name.trim(), categoryName: cat.name, categoryColor: cat.color, categoriaValor: cat.valor, sexo: form.sexo, localidad: form.localidad })
      setPlayers(prev => prev.map(p => p.id === editId ? { ...p, name: form.name.trim(), categoryName: cat.name, categoryColor: cat.color, categoriaValor: cat.valor, sexo: form.sexo, localidad: form.localidad } : p))
    } else {
      await addJugador({ name: form.name.trim(), categoryName: cat.name, categoryColor: cat.color, categoriaValor: cat.valor, sexo: form.sexo, localidad: form.localidad })
      await load()
    }
    setSaving(false)
    setForm(blankForm())
    setEditId(null)
  }

  async function handleDelete(id) {
    await deleteJugador(id)
    setPlayers(prev => prev.filter(p => p.id !== id))
    setConfirmDelete(null)
  }

  const cat = CAT_OPTIONS.find(c => c.id === form.catId) || CAT_OPTIONS[0]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#f1f1f5', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Jugadores</h2>
        <p style={{ color: '#9999b0', fontSize: 13, margin: 0 }}>Categorización de jugadores</p>
      </div>

      {/* Add / Edit form */}
      <div style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ color: '#9999b0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
          {editId ? '✎ Editar jugador' : '+ Nuevo jugador'}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ color: '#9999b0', fontSize: 11, fontWeight: 600, marginBottom: 5 }}>NOMBRE</div>
            <input placeholder="Nombre y apellido" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()} style={inp} />
          </div>
          <div style={{ minWidth: 140 }}>
            <div style={{ color: '#9999b0', fontSize: 11, fontWeight: 600, marginBottom: 5 }}>LOCALIDAD</div>
            <input placeholder="Ciudad / Club" value={form.localidad} onChange={e => setForm(p => ({ ...p, localidad: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()} style={inp} />
          </div>
          <div style={{ minWidth: 170 }}>
            <div style={{ color: '#9999b0', fontSize: 11, fontWeight: 600, marginBottom: 5 }}>CATEGORÍA</div>
            <select value={form.catId} onChange={e => setForm(p => ({ ...p, catId: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {CAT_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 120 }}>
            <div style={{ color: '#9999b0', fontSize: 11, fontWeight: 600, marginBottom: 5 }}>SEXO</div>
            <div style={{ display: 'flex', background: '#0f0f13', border: '1px solid #2a2a38', borderRadius: 6, padding: 3, gap: 3 }}>
              {[{ v: 'M', label: 'Masc.', col: '#3b82f6' }, { v: 'F', label: 'Fem.', col: '#ec4899' }].map(({ v, label, col }) => (
                <button key={v} type="button" onClick={() => setForm(p => ({ ...p, sexo: v }))}
                  style={{ flex: 1, padding: '4px 0', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                    background: form.sexo === v ? col : 'transparent',
                    color: form.sexo === v ? '#fff' : '#9999b0',
                  }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: `${cat.color}15`, border: `1px solid ${cat.color}30`, borderRadius: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
            <span style={{ color: cat.color, fontSize: 12, fontWeight: 600 }}>Nv. {cat.valor}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {editId && <button onClick={cancelEdit} style={{ background: 'transparent', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '7px 14px', cursor: 'pointer' }}>Cancelar</button>}
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
              {saving ? '...' : editId ? 'Guardar' : '+ Agregar'}
            </button>
          </div>
        </div>
      </div>

      {/* Search + filters + page size */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6666a0', fontSize: 13 }}>🔍</span>
          <input type="text" placeholder="Buscar jugador..." value={search} onChange={e => handleSearch(e.target.value)} style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>CATEGORÍA</span>
          <select value={filterCat} onChange={e => handleFilterCat(e.target.value)} style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6, color: '#f1f1f5', fontSize: 12, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}>
            <option value="all">Todas</option>
            {CAT_OPTIONS.slice().reverse().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span style={{ color: '#6666a0', fontSize: 11, fontWeight: 600 }}>SEXO</span>
          <select value={filterSexo} onChange={e => handleFilterSexo(e.target.value)} style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 6, color: '#f1f1f5', fontSize: 12, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}>
            <option value="all">Todos</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#6666a0', fontSize: 12 }}>Ver</span>
            {[10, 25, 50].map(n => (
              <button key={n} onClick={() => handlePageSize(n)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: pageSize === n ? '#f97316' : 'transparent', color: pageSize === n ? '#fff' : '#9999b0', borderColor: pageSize === n ? '#f97316' : '#2a2a38' }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Players list */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#13131a', borderRadius: 12, border: '1px dashed #2a2a38', color: '#9999b0' }}>
          {players.length === 0 ? 'No hay jugadores. Agregá el primero arriba.' : 'No se encontraron jugadores.'}
        </div>
      ) : isCardView ? (
        /* Mobile (<720px): cards */
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {paginated.map((p, idx) => {
              const pCat = CAT_OPTIONS.find(c => c.name === p.categoryName) || { color: '#f97316', valor: '—' }
              return (
                <div key={p.id} style={{ background: '#13131a', borderRadius: 10, border: `1px solid ${editId === p.id ? '#f97316' : '#2a2a38'}`, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ color: '#f1f1f5', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {p.name}
                        {p.ascenso && <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }}>↑</span>}
                      </div>
                      {p.localidad && <div style={{ color: '#9999b0', fontSize: 11, marginTop: 2 }}>📍 {p.localidad}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => startEdit(p)} style={{ background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 14, padding: '3px 5px', borderRadius: 4 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f97316'} onMouseLeave={e => e.currentTarget.style.color = '#9999b0'}>✎</button>
                      <button onClick={() => setConfirmDelete(p.id)} style={{ background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 14, padding: '3px 5px', borderRadius: 4 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#9999b0'}>🗑</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: `${pCat.color}18`, border: `1px solid ${pCat.color}40`, color: pCat.color, fontSize: 11, fontWeight: 600 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: pCat.color }} />
                      {p.categoryName}
                      <span style={{ background: pCat.color, color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 10, fontWeight: 800 }}>{pCat.valor}</span>
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: p.sexo === 'F' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)', color: p.sexo === 'F' ? '#ec4899' : '#3b82f6', border: `1px solid ${p.sexo === 'F' ? 'rgba(236,72,153,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
                      {p.sexo === 'F' ? 'F' : 'M'}
                    </span>
                    <button
                      onClick={() => handleToggleAscenso(p)}
                      style={{ background: p.ascenso ? 'rgba(34,197,94,0.15)' : 'transparent', border: `1px solid ${p.ascenso ? 'rgba(34,197,94,0.4)' : '#2a2a38'}`, color: p.ascenso ? '#22c55e' : '#44445a', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 6, lineHeight: 1 }}>↑</button>
                  </div>
                </div>
              )
            })}
          </div>
          <PaginationBar safePage={safePage} totalPages={totalPages} setPage={setPage} filtered={filtered} />
        </>
      ) : (
        /* Desktop: table */
        <>
          <div style={{ background: '#13131a', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 130px 44px 200px 44px 80px', padding: '0 16px', height: 40, borderBottom: '1px solid #2a2a38', background: '#0f0f13', alignItems: 'center', gap: 10 }}>
              {['#', 'Jugador', 'Localidad', 'Sexo', 'Categoría', '↑', ''].map(h => (
                <div key={h} style={{ color: h === '↑' ? '#22c55e' : '#6666a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', textAlign: h === '↑' ? 'center' : undefined }}>{h}</div>
              ))}
            </div>
            {paginated.map((p, idx) => {
              const pCat = CAT_OPTIONS.find(c => c.name === p.categoryName) || { color: '#f97316', valor: '—' }
              const globalIdx = (safePage - 1) * pageSize + idx
              return (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '44px 1fr 130px 44px 200px 44px 80px',
                  padding: '0 16px', height: 54, alignItems: 'center', gap: 10,
                  borderBottom: idx < paginated.length - 1 ? '1px solid #20202c' : 'none',
                  background: editId === p.id ? 'rgba(249,115,22,0.04)' : 'transparent',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => { if (editId !== p.id) e.currentTarget.style.background = '#1a1a22' }}
                  onMouseLeave={e => { if (editId !== p.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ color: '#44445a', fontSize: 12, fontWeight: 600 }}>{globalIdx + 1}</div>
                  <div style={{ color: '#f1f1f5', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.name}
                    {p.ascenso && <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>↑</span>}
                  </div>
                  <div style={{ color: '#9999b0', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.localidad || '—'}</div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: p.sexo === 'F' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)', color: p.sexo === 'F' ? '#ec4899' : '#3b82f6', border: `1px solid ${p.sexo === 'F' ? 'rgba(236,72,153,0.3)' : 'rgba(59,130,246,0.3)'}` }}>{p.sexo === 'F' ? 'F' : 'M'}</span>
                  </div>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: `${pCat.color}18`, border: `1px solid ${pCat.color}40`, color: pCat.color, fontSize: 11, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: pCat.color }} />
                      {p.categoryName}
                      <span style={{ background: pCat.color, color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 10, fontWeight: 800 }}>{pCat.valor}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleToggleAscenso(p)}
                      title={p.ascenso ? 'Quitar ascenso' : 'Marcar en ascenso'}
                      style={{ background: p.ascenso ? 'rgba(34,197,94,0.15)' : 'transparent', border: `1px solid ${p.ascenso ? 'rgba(34,197,94,0.4)' : '#2a2a38'}`, color: p.ascenso ? '#22c55e' : '#44445a', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '3px 7px', borderRadius: 6, lineHeight: 1, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#22c55e' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = p.ascenso ? 'rgba(34,197,94,0.4)' : '#2a2a38'; e.currentTarget.style.color = p.ascenso ? '#22c55e' : '#44445a' }}
                    >↑</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(p)} style={{ background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f97316'} onMouseLeave={e => e.currentTarget.style.color = '#9999b0'}>✎</button>
                    <button onClick={() => setConfirmDelete(p.id)} style={{ background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#9999b0'}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
          <PaginationBar safePage={safePage} totalPages={totalPages} setPage={setPage} filtered={filtered} />
        </>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 12, padding: 28, maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
            <h3 style={{ color: '#f1f1f5', margin: '0 0 8px' }}>¿Eliminar jugador?</h3>
            <p style={{ color: '#9999b0', fontSize: 14, margin: '0 0 20px' }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ background: 'transparent', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '8px 18px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, color: '#9999b0', fontSize: 12 }}>
      <span>{filtered.length} jugadores · página {safePage} de {totalPages}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => setPage(1)} disabled={safePage === 1} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === 1 ? '#44445a' : '#9999b0', cursor: safePage === 1 ? 'default' : 'pointer', fontSize: 12 }}>«</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === 1 ? '#44445a' : '#9999b0', cursor: safePage === 1 ? 'default' : 'pointer', fontSize: 12 }}>‹</button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
          const pg = start + i
          return pg <= totalPages ? (
            <button key={pg} onClick={() => setPage(pg)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, cursor: 'pointer', background: pg === safePage ? '#f97316' : 'transparent', color: pg === safePage ? '#fff' : '#9999b0', borderColor: pg === safePage ? '#f97316' : '#2a2a38' }}>{pg}</button>
          ) : null
        })}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === totalPages ? '#44445a' : '#9999b0', cursor: safePage === totalPages ? 'default' : 'pointer', fontSize: 12 }}>›</button>
        <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a38', background: 'transparent', color: safePage === totalPages ? '#44445a' : '#9999b0', cursor: safePage === totalPages ? 'default' : 'pointer', fontSize: 12 }}>»</button>
      </div>
    </div>
  )
}
