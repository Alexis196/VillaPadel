import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { updateDuplaPago, deleteDupla } from '../../firebase/torneoService'
import { useIsMobile } from '../../hooks/useIsMobile'
import Spinner from '../ui/Spinner'
import AppSelect from '../ui/AppSelect'
import './DuplasAdmin.css'

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
    <span className="da-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function MetodoBadge({ metodo }) {
  if (!metodo) return <span className="da-badge-muted">—</span>
  const cfg = metodo === 'efectivo'
    ? { bg: 'rgba(34,197,94,0.10)', color: '#22c55e', label: '💵 Efectivo' }
    : { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: '🏦 Transf.' }
  return (
    <span className="da-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function EditRow({ dupla, torneoId, torneoCosto, onSaved }) {
  const isMobile = useIsMobile()
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

  return (
    <div className="da-edit-row">
      {[1, 2].map(num => {
        const pago = form[`pago${num}`]
        const player = num === 1 ? dupla.jugador1 : dupla.jugador2
        return isMobile ? (
          <div key={num} style={{ marginBottom: num === 1 ? 8 : 0 }}>
            <div className="da-edit-player-row">
              <span className="da-edit-j-label" style={{ color: num === 1 ? '#f97316' : '#9999b0' }}>J{num}</span>
              <span className="da-edit-player-name">{player}</span>
            </div>
            <div className="da-edit-pago-row-mobile">
              <div style={{ flex: 1 }}>
                <AppSelect size="sm" value={pago.estado} onChange={v => update(num, 'estado', v)}
                  options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'pagado', label: 'Pagado' }]} />
              </div>
              <div style={{ flex: 1 }}>
                <AppSelect size="sm" value={pago.metodo || ''} onChange={v => update(num, 'metodo', v)}
                  isDisabled={pago.estado !== 'pagado'}
                  options={[{ value: '', label: '— Método' }, { value: 'efectivo', label: 'Efectivo' }, { value: 'transferencia', label: 'Transferencia' }]} />
              </div>
              <input type="number" placeholder="$" value={pago.monto} onChange={e => update(num, 'monto', e.target.value)}
                className="da-inp" style={{ width: 64 }} disabled={pago.estado !== 'pagado'} />
            </div>
          </div>
        ) : (
          <div key={num} className="da-edit-pago-row-desktop" style={{ marginBottom: num === 1 ? 6 : 0 }}>
            <span className="da-edit-j-label" style={{ color: num === 1 ? '#f97316' : '#9999b0' }}>J{num}</span>
            <span className="da-edit-player-name-desktop">{player}</span>
            <div style={{ minWidth: 110 }}>
              <AppSelect size="sm" value={pago.estado} onChange={v => update(num, 'estado', v)}
                options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'pagado', label: 'Pagado' }]} />
            </div>
            <div style={{ minWidth: 140 }}>
              <AppSelect size="sm" value={pago.metodo || ''} onChange={v => update(num, 'metodo', v)}
                isDisabled={pago.estado !== 'pagado'}
                options={[{ value: '', label: '— Método' }, { value: 'efectivo', label: 'Efectivo' }, { value: 'transferencia', label: 'Transferencia' }]} />
            </div>
            <input type="number" placeholder="Monto $" value={pago.monto} onChange={e => update(num, 'monto', e.target.value)}
              className="da-inp" style={{ width: 100 }} disabled={pago.estado !== 'pagado'} />
          </div>
        )
      })}
      <button onClick={handleSave} disabled={saving} className="da-save-btn">
        {saving ? '...' : 'Guardar'}
      </button>
    </div>
  )
}

function ConfirmDeleteModal({ dupla, onConfirm, onCancel, deleting }) {
  return (
    <div className="da-modal-overlay">
      <div className="da-modal">
        <div className="da-modal-icon">🗑</div>
        <h3 className="da-modal-title">¿Eliminar dupla?</h3>
        <p className="da-modal-player">
          <strong>{dupla.jugador1}</strong>
          <span className="da-modal-sep"> · </span>
          <strong>{dupla.jugador2}</strong>
        </p>
        <p className="da-modal-warn">Esta acción no se puede deshacer.</p>
        <div className="da-modal-actions">
          <button onClick={onCancel} disabled={deleting} className="da-modal-cancel">Cancelar</button>
          <button onClick={onConfirm} disabled={deleting} className="da-modal-confirm">
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
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const mountedRef = useRef(true)
  const isCardView = useIsMobile(720)

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

  async function handleDelete(dupla) { setConfirmDupla(dupla) }

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
    <div className="da-torneo-section">
      <div className="da-torneo-header">
        <h3 className="da-torneo-name">{torneo.nombre}</h3>
        <span className="da-torneo-badge" style={{ background: estadoBadge.bg, color: estadoBadge.color }}>
          {torneo.estado}
        </span>
        {torneo.categoria && <span className="da-cat-badge">{torneo.categoria}</span>}
      </div>

      <div className="da-stats-grid" style={{ gridTemplateColumns: isCardView ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total duplas', value: loading ? '—' : duplas.length, color: '#f97316' },
          { label: 'Jug. pagados', value: loading ? '—' : jugadoresPagados, color: '#22c55e' },
          { label: 'Jug. pendientes', value: loading ? '—' : jugadoresPendientes, color: '#ef4444' },
          { label: 'Total cobrado', value: loading ? '—' : `$${totalCobrado.toLocaleString()}`, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="da-stat-card">
            <div className="da-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="da-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? <Spinner /> : duplas.length === 0 ? (
        <div className="da-empty">No hay duplas inscriptas en este torneo.</div>
      ) : (
        <>
          {!isCardView && (
            <div className="da-pagesize-group">
              <span className="da-pagesize-label">Mostrar</span>
              {[10, 25, 50].map(n => (
                <button key={n} onClick={() => { setPageSize(n); setPage(1) }}
                  className={`da-pagesize-btn${pageSize === n ? ' active' : ''}`}>{n}</button>
              ))}
            </div>
          )}

          {isCardView ? (
            <div className="da-card-list">
              {paginatedDuplas.map(d => {
                const p1 = getPago(d, 1)
                const p2 = getPago(d, 2)
                const isEditing = editingId === `${torneo.id}:${d.id}`
                const fmt = (monto) => monto ? `$${Number(monto).toLocaleString()}` : '—'
                return (
                  <div key={d.id} className="da-card" style={{ border: `1px solid ${isEditing ? '#f97316' : '#2a2a38'}` }}>
                    <div className="da-card-body">
                      <div className="da-card-top">
                        <div style={{ minWidth: 0 }}>
                          <div className="da-player-main">{d.jugador1}</div>
                          <div className="da-player-sub">{d.jugador2}</div>
                        </div>
                        <div className="da-card-actions">
                          <button
                            onClick={() => setEditingId(isEditing ? null : `${torneo.id}:${d.id}`)}
                            className={`da-btn-edit${isEditing ? ' active' : ''}`}
                          >
                            {isEditing ? 'Cerrar' : '✎ Editar'}
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            disabled={deletingId === d.id}
                            className="da-btn-delete"
                          >
                            {deletingId === d.id ? '...' : '🗑'}
                          </button>
                        </div>
                      </div>
                      <div className="da-pago-rows">
                        {[{ player: d.jugador1, pago: p1 }, { player: d.jugador2, pago: p2 }].map(({ player, pago }, i) => (
                          <div key={i} className="da-pago-row">
                            <span className="da-pago-player">{player}</span>
                            <PagoBadge estado={pago.estado} />
                            <MetodoBadge metodo={pago.metodo} />
                            {pago.monto > 0 && <span className="da-pago-amount">{fmt(pago.monto)}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    {isEditing && <EditRow dupla={d} torneoId={torneo.id} torneoCosto={torneo.costoPorJugador} onSaved={handleSaved} />}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="da-table-wrap">
              <div className="scroll-x">
                <div className="da-table-head">
                  <div className="da-table-head-inner">
                    {['Jugador', 'Estado', 'Método', 'Monto'].map(h => (
                      <div key={h} className="da-th">{h}</div>
                    ))}
                  </div>
                  <div className="da-table-head-spacer" />
                </div>

                {paginatedDuplas.map((d, idx) => {
                  const p1 = getPago(d, 1)
                  const p2 = getPago(d, 2)
                  const isEditing = editingId === `${torneo.id}:${d.id}`
                  const fmt = (monto) => monto ? `$${Number(monto).toLocaleString()}` : '—'
                  const editingBg = isEditing ? 'rgba(249,115,22,0.04)' : 'transparent'

                  return (
                    <div key={d.id} className={idx < paginatedDuplas.length - 1 ? 'da-row-border' : ''}>
                      <div className="da-row-flex">
                        <div className="da-row-inner">
                          <div className="da-row-grid da-row-grid-sub" style={{ background: editingBg }}>
                            <div className="da-row-player-1">{d.jugador1}</div>
                            <PagoBadge estado={p1.estado} />
                            <MetodoBadge metodo={p1.metodo} />
                            <div className="da-monto-value" style={{ color: p1.monto ? '#f1f1f5' : '#44445a', fontWeight: p1.monto ? 600 : 400 }}>{fmt(p1.monto)}</div>
                          </div>
                          <div className="da-row-grid" style={{ background: editingBg }}>
                            <div className="da-row-player-2">{d.jugador2}</div>
                            <PagoBadge estado={p2.estado} />
                            <MetodoBadge metodo={p2.metodo} />
                            <div className="da-monto-value" style={{ color: p2.monto ? '#f1f1f5' : '#44445a', fontWeight: p2.monto ? 600 : 400 }}>{fmt(p2.monto)}</div>
                          </div>
                        </div>
                        <div className="da-row-actions">
                          <button
                            onClick={() => setEditingId(isEditing ? null : `${torneo.id}:${d.id}`)}
                            className={`da-row-edit-btn${isEditing ? ' active' : ''}`}
                          >
                            {isEditing ? 'Cerrar' : '✎ Editar'}
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            disabled={deletingId === d.id}
                            className="da-row-delete-btn"
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
          )}

          {totalPages > 1 && (
            <div className="da-pagination">
              <span>{duplas.length} duplas · página {safePage} de {totalPages}</span>
              <div className="da-pagination-btns">
                <button onClick={() => setPage(1)} disabled={safePage === 1} className="da-page-btn">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="da-page-btn">‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
                  const pg = start + i
                  return pg <= totalPages ? (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={`da-page-num-btn${pg === safePage ? ' active' : ''}`}>{pg}</button>
                  ) : null
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="da-page-btn">›</button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="da-page-btn">»</button>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && totalEsperado > 0 && (
        <div className="da-financial-bar">
          <div className="da-financial-item">
            <span className="da-financial-label">Esperado: </span>
            <span style={{ color: '#f1f1f5', fontWeight: 600 }}>${totalEsperado.toLocaleString()}</span>
          </div>
          <div className="da-financial-item">
            <span className="da-financial-label">Cobrado: </span>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>${totalCobrado.toLocaleString()}</span>
          </div>
          <div className="da-financial-item">
            <span className="da-financial-label">Diferencia: </span>
            <span style={{ color: totalCobrado < totalEsperado ? '#ef4444' : '#22c55e', fontWeight: 600 }}>${(totalCobrado - totalEsperado).toLocaleString()}</span>
          </div>
          <div className="da-financial-divider" />
          <div className="da-financial-method">
            <span className="da-method-dot" style={{ background: '#22c55e' }} />
            <span className="da-financial-label">Efectivo: </span>
            <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 13 }}>${totalEfectivo.toLocaleString()}</span>
          </div>
          <div className="da-financial-method">
            <span className="da-method-dot" style={{ background: '#3b82f6' }} />
            <span className="da-financial-label">Transferencia: </span>
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
        <h2 className="da-page-title">Duplas & Pagos</h2>
        <p className="da-page-desc">Control de inscripción y estado de pago por jugador</p>
      </div>

      {loading ? <Spinner /> : torneos.length === 0 ? (
        <div className="da-empty">No hay torneos creados.</div>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <AppSelect
              value={selectedId || ''}
              onChange={v => { setSelectedId(v); setEditingId(null) }}
              options={torneos.map(t => ({
                value: t.id,
                label: t.nombre + (t.estado === 'En curso' ? ' · En curso' : t.estado === 'Inscripción' ? ' · Inscripción' : ''),
              }))}
              minWidth={240}
              isSearchable
            />
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
