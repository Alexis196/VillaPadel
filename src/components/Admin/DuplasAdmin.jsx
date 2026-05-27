import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { updateDuplaPago, deleteDupla } from '../../firebase/torneoService'
import Spinner from '../ui/Spinner'

function getPago(dupla, num) {
  const key = `pago${num}`
  if (dupla[key]) return dupla[key]
  return { estado: dupla.pagoEstado || 'pendiente', metodo: dupla.pagoMetodo || null, monto: 0 }
}

function PagoBadge({ estado }) {
  const cfg = estado === 'pagado'
    ? { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: '✓ Pagado' }
    : { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: '⏳ Pendiente' }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

function MetodoBadge({ metodo }) {
  if (!metodo) return <span style={{ color: '#44445a', fontSize: 12 }}>—</span>
  const cfg = metodo === 'efectivo'
    ? { bg: 'rgba(34,197,94,0.10)', color: '#22c55e', label: '💵 Efectivo' }
    : { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: '🏦 Transf.' }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

function EditRow({ dupla, torneoId, torneoCosto, onSaved }) {
  const fallback = torneoCosto ? String(torneoCosto) : ''
  const [form, setForm] = useState({
    pago1: { estado: getPago(dupla, 1).estado, metodo: getPago(dupla, 1).metodo || '', monto: getPago(dupla, 1).monto || fallback },
    pago2: { estado: getPago(dupla, 2).estado, metodo: getPago(dupla, 2).metodo || '', monto: getPago(dupla, 2).monto || fallback },
  })
  const [saving, setSaving] = useState(false)

  function update(num, field, val) {
    const key = `pago${num}`
    setForm(p => ({ ...p, [key]: { ...p[key], [field]: val } }))
  }

  async function handleSave() {
    setSaving(true)
    await updateDuplaPago(torneoId, dupla.id, form)
    setSaving(false)
    onSaved({ ...dupla, pago1: form.pago1, pago2: form.pago2 })
  }

  const inp = {
    background: '#0f0f13', border: '1px solid #2a2a38', borderRadius: 6,
    padding: '5px 8px', color: '#f1f1f5', fontSize: 12, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '12px 16px', background: 'rgba(249,115,22,0.04)', borderTop: '1px solid #2a2a38' }}>
      {[1, 2].map(num => {
        const pago = form[`pago${num}`]
        const player = num === 1 ? dupla.jugador1 : dupla.jugador2
        return (
          <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: num === 1 ? 6 : 0 }}>
            <span style={{ color: num === 1 ? '#f97316' : '#9999b0', fontSize: 11, fontWeight: 700, width: 20, flexShrink: 0 }}>J{num}</span>
            <span style={{ color: '#9999b0', fontSize: 12, width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player}</span>
            <select value={pago.estado} onChange={e => update(num, 'estado', e.target.value)} style={{ ...inp, cursor: 'pointer', minWidth: 90 }}>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
            <select value={pago.metodo} onChange={e => update(num, 'metodo', e.target.value)} style={{ ...inp, cursor: 'pointer', minWidth: 120 }} disabled={pago.estado !== 'pagado'}>
              <option value="">— Método</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <input
              type="number"
              placeholder="Monto $"
              value={pago.monto}
              onChange={e => update(num, 'monto', e.target.value)}
              style={{ ...inp, width: 100 }}
              disabled={pago.estado !== 'pagado'}
            />
          </div>
        )
      })}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 16px', fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 8 }}
      >
        {saving ? '...' : 'Guardar'}
      </button>
    </div>
  )
}

function ConfirmDeleteModal({ dupla, onConfirm, onCancel, deleting }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 360, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>🗑</div>
        <h3 style={{ color: '#f1f1f5', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>¿Eliminar dupla?</h3>
        <p style={{ color: '#9999b0', fontSize: 13, margin: '0 0 6px' }}>
          <span style={{ color: '#f1f1f5', fontWeight: 600 }}>{dupla.jugador1}</span>
          <span style={{ color: '#6666a0' }}> · </span>
          <span style={{ color: '#f1f1f5', fontWeight: 600 }}>{dupla.jugador2}</span>
        </p>
        <p style={{ color: '#6666a0', fontSize: 12, margin: '0 0 20px' }}>Esta acción no se puede deshacer.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #2a2a38', background: 'transparent', color: '#9999b0', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.7 : 1 }}
          >
            {deleting ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TorneoDuplas({ torneo, editingId, setEditingId, onSaved }) {
  const [duplas, setDuplas] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDupla, setConfirmDupla] = useState(null)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadDuplas()
    return () => { mountedRef.current = false }
  }, [torneo.id])

  async function loadDuplas() {
    setLoading(true)
    setDuplas([])
    const snap = await getDocs(collection(db, 'torneos', torneo.id, 'duplas'))
    if (!mountedRef.current) return
    setDuplas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  function handleSaved(updated) {
    setDuplas(prev => prev.map(d => d.id === updated.id ? updated : d))
    onSaved()
  }

  async function handleDelete(dupla) {
    setConfirmDupla(dupla)
  }

  async function confirmDelete() {
    const dupla = confirmDupla
    setDeletingId(dupla.id)
    await deleteDupla(torneo.id, dupla.id)
    setDuplas(prev => prev.filter(d => d.id !== dupla.id))
    if (editingId === `${torneo.id}:${dupla.id}`) setEditingId(null)
    setDeletingId(null)
    setConfirmDupla(null)
  }

  let jugadoresPagados = 0
  let jugadoresPendientes = 0
  let totalEfectivo = 0
  let totalTransferencia = 0
  const totalCobrado = duplas.reduce((s, d) => {
    const p1 = getPago(d, 1)
    const p2 = getPago(d, 2)
    if (p1.estado === 'pagado') { jugadoresPagados++; if (p1.metodo === 'efectivo') totalEfectivo += Number(p1.monto || 0); else if (p1.metodo === 'transferencia') totalTransferencia += Number(p1.monto || 0) } else jugadoresPendientes++
    if (p2.estado === 'pagado') { jugadoresPagados++; if (p2.metodo === 'efectivo') totalEfectivo += Number(p2.monto || 0); else if (p2.metodo === 'transferencia') totalTransferencia += Number(p2.monto || 0) } else jugadoresPendientes++
    return s + (p1.estado === 'pagado' ? Number(p1.monto || 0) : 0) + (p2.estado === 'pagado' ? Number(p2.monto || 0) : 0)
  }, 0)

  const totalEsperado = duplas.length * 2 * (torneo.costoPorJugador || 0)

  const totalPages = Math.max(1, Math.ceil(duplas.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedDuplas = duplas.slice((safePage - 1) * pageSize, safePage * pageSize)

  const estadoBadge = torneo.estado === 'En curso'
    ? { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' }
    : torneo.estado === 'Inscripción'
    ? { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' }
    : { bg: 'rgba(100,116,139,0.12)', color: '#64748b' }

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Torneo header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h3 style={{ color: '#f1f1f5', fontSize: 16, fontWeight: 700, margin: 0 }}>{torneo.nombre}</h3>
        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: estadoBadge.bg, color: estadoBadge.color }}>
          {torneo.estado}
        </span>
        {torneo.categoria && (
          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(249,115,22,0.10)', color: '#f97316' }}>
            {torneo.categoria}
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total duplas', value: loading ? '—' : duplas.length, color: '#f97316' },
          { label: 'Jug. pagados', value: loading ? '—' : jugadoresPagados, color: '#22c55e' },
          { label: 'Jug. pendientes', value: loading ? '—' : jugadoresPendientes, color: '#ef4444' },
          { label: 'Total cobrado', value: loading ? '—' : `$${totalCobrado.toLocaleString()}`, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 800, lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ color: '#9999b0', fontSize: 10 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Duplas list */}
      {loading ? <Spinner /> : duplas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, background: '#13131a', borderRadius: 12, border: '1px dashed #2a2a38', color: '#9999b0', fontSize: 13 }}>
          No hay duplas inscriptas en este torneo.
        </div>
      ) : (
        <>
        {/* Page size selector */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 10, justifyContent: 'flex-end' }}>
          <span style={{ color: '#6666a0', fontSize: 12 }}>Mostrar</span>
          {[10, 25, 50].map(n => (
            <button key={n} onClick={() => { setPageSize(n); setPage(1) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: pageSize === n ? '#f97316' : 'transparent', color: pageSize === n ? '#fff' : '#9999b0', borderColor: pageSize === n ? '#f97316' : '#2a2a38' }}>{n}</button>
          ))}
        </div>
        <div style={{ background: '#13131a', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}>
          <div className="scroll-x">
            {/* Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid #2a2a38', background: '#0f0f13', height: 36, alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 110px 130px 100px', padding: '0 16px', gap: 10, alignItems: 'center' }}>
                {['Jugador', 'Estado', 'Método', 'Monto'].map(h => (
                  <div key={h} style={{ color: '#6666a0', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              <div style={{ width: 90, padding: '0 16px' }} />
            </div>

            {paginatedDuplas.map((d, idx) => {

              const p1 = getPago(d, 1)
              const p2 = getPago(d, 2)
              const isEditing = editingId === `${torneo.id}:${d.id}`
              const rowStyle = {
                display: 'grid', gridTemplateColumns: '1fr 110px 130px 100px',
                padding: '7px 16px', alignItems: 'center', gap: 10,
                background: isEditing ? 'rgba(249,115,22,0.04)' : 'transparent',
              }
              const fmt = (monto) => monto ? `$${Number(monto).toLocaleString()}` : '—'

              return (
                <div key={d.id} style={{ borderBottom: idx < duplas.length - 1 ? '1px solid #1c1c28' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...rowStyle, borderBottom: '1px solid #181820' }}>
                        <div style={{ color: '#f1f1f5', fontSize: 13 }}>{d.jugador1}</div>
                        <PagoBadge estado={p1.estado} />
                        <MetodoBadge metodo={p1.metodo} />
                        <div style={{ color: p1.monto ? '#f1f1f5' : '#44445a', fontSize: 13, fontWeight: p1.monto ? 600 : 400 }}>{fmt(p1.monto)}</div>
                      </div>
                      <div style={rowStyle}>
                        <div style={{ color: '#9999b0', fontSize: 13 }}>{d.jugador2}</div>
                        <PagoBadge estado={p2.estado} />
                        <MetodoBadge metodo={p2.metodo} />
                        <div style={{ color: p2.monto ? '#f1f1f5' : '#44445a', fontSize: 13, fontWeight: p2.monto ? 600 : 400 }}>{fmt(p2.monto)}</div>
                      </div>
                    </div>
                    <div style={{ width: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 12px', borderLeft: '1px solid #1c1c28' }}>
                      <button
                        onClick={() => setEditingId(isEditing ? null : `${torneo.id}:${d.id}`)}
                        style={{
                          background: isEditing ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)',
                          border: 'none', borderRadius: 6,
                          color: isEditing ? '#f97316' : '#9999b0',
                          fontSize: 11, padding: '4px 8px', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap', width: '100%',
                        }}
                      >
                        {isEditing ? 'Cerrar' : '✎ Editar'}
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        disabled={deletingId === d.id}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 6,
                          color: '#ef4444', fontSize: 11, padding: '4px 8px',
                          cursor: deletingId === d.id ? 'wait' : 'pointer',
                          fontWeight: 500, whiteSpace: 'nowrap', width: '100%',
                          opacity: deletingId === d.id ? 0.5 : 1,
                        }}
                      >
                        {deletingId === d.id ? '...' : '🗑 Eliminar'}
                      </button>
                    </div>
                  </div>
                  {isEditing && <EditRow dupla={d} torneoId={torneo.id} torneoCosto={torneo.costoPorJugador} onSaved={handleSaved} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, color: '#9999b0', fontSize: 12 }}>
            <span>{duplas.length} duplas · página {safePage} de {totalPages}</span>
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
        )}
        </>
      )}

      {/* Financial summary */}
      {!loading && totalEsperado > 0 && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 10, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><span style={{ color: '#9999b0', fontSize: 12 }}>Esperado: </span><span style={{ color: '#f1f1f5', fontWeight: 600 }}>${totalEsperado.toLocaleString()}</span></div>
          <div><span style={{ color: '#9999b0', fontSize: 12 }}>Cobrado: </span><span style={{ color: '#22c55e', fontWeight: 600 }}>${totalCobrado.toLocaleString()}</span></div>
          <div><span style={{ color: '#9999b0', fontSize: 12 }}>Diferencia: </span><span style={{ color: totalCobrado < totalEsperado ? '#ef4444' : '#22c55e', fontWeight: 600 }}>${(totalCobrado - totalEsperado).toLocaleString()}</span></div>
          <div style={{ width: 1, height: 24, background: '#2a2a38', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ color: '#9999b0', fontSize: 12 }}>Efectivo: </span>
            <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 13 }}>${totalEfectivo.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
            <span style={{ color: '#9999b0', fontSize: 12 }}>Transferencia: </span>
            <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: 13 }}>${totalTransferencia.toLocaleString()}</span>
          </div>
        </div>
      )}

      {confirmDupla && (
        <ConfirmDeleteModal
          dupla={confirmDupla}
          deleting={deletingId === confirmDupla.id}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDupla(null)}
        />
      )}
    </div>
  )
}

export default function DuplasAdmin() {
  const [torneos, setTorneos] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => { loadTorneos() }, [])

  async function loadTorneos() {
    const snap = await getDocs(query(collection(db, 'torneos'), orderBy('createdAt', 'desc')))
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setTorneos(list)
    const active = list.find(t => t.estado === 'En curso') || list[0]
    if (active) setSelectedId(active.id)
    setLoading(false)
  }

  const torneo = torneos.find(t => t.id === selectedId) || null

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#f1f1f5', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Duplas & Pagos</h2>
        <p style={{ color: '#9999b0', fontSize: 13, margin: 0 }}>Control de inscripción y estado de pago por jugador</p>
      </div>

      {loading ? <Spinner /> : torneos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#13131a', borderRadius: 12, border: '1px dashed #2a2a38', color: '#9999b0' }}>
          No hay torneos creados.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <select
              value={selectedId || ''}
              onChange={e => { setSelectedId(e.target.value); setEditingId(null) }}
              style={{
                background: '#13131a', border: '1px solid #3a3a50', borderRadius: 8,
                color: '#f1f1f5', fontSize: 14, fontWeight: 500,
                padding: '8px 36px 8px 14px', cursor: 'pointer', outline: 'none',
                appearance: 'none', minWidth: 240,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239999b0' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
              }}
            >
              {torneos.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre}{t.estado === 'En curso' ? ' · En curso' : t.estado === 'Inscripción' ? ' · Inscripción' : ''}
                </option>
              ))}
            </select>
          </div>

          {torneo && (
            <TorneoDuplas
              key={torneo.id}
              torneo={torneo}
              editingId={editingId}
              setEditingId={setEditingId}
              onSaved={() => {}}
            />
          )}
        </>
      )}
    </div>
  )
}
