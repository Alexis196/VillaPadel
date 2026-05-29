import { useState, useEffect } from 'react'
import { getSolicitudes, approveSolicitud, rejectSolicitud, updateSolicitud, deleteSolicitud, getAdmins, revokeAdmin } from '../../firebase/torneoService'
import Spinner from '../ui/Spinner'
import './SolicitudesAdmin.css'

const STATUS_LABEL = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' }
const STATUS_COLOR = {
  pendiente: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', border: 'rgba(249,115,22,0.25)' },
  aprobado:  { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  rechazado: { bg: 'rgba(156,163,175,0.1)', color: '#9ca3af', border: 'rgba(156,163,175,0.2)' },
}

export default function SolicitudesAdmin() {
  const [tab, setTab] = useState('solicitudes')

  return (
    <div className="sa-root">
      <div className="sa-header">
        <div>
          <h1 className="section-title">Gestión de accesos</h1>
          <p className="section-subtitle">Solicitudes y administradores activos</p>
        </div>
      </div>

      <div className="sa-tabs">
        <button className={`sa-tab ${tab === 'solicitudes' ? 'sa-tab-active' : ''}`} onClick={() => setTab('solicitudes')}>
          Solicitudes
        </button>
        <button className={`sa-tab ${tab === 'admins' ? 'sa-tab-active' : ''}`} onClick={() => setTab('admins')}>
          Administradores
        </button>
      </div>

      {tab === 'solicitudes' ? <SolicitudesPanel /> : <AdminsPanel />}
    </div>
  )
}

function SolicitudesPanel() {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState('pendiente')
  const [acting, setActing]           = useState(null)
  const [editingId, setEditingId]     = useState(null)
  const [editForm, setEditForm]       = useState({ nombre: '', apellido: '', email: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function load() {
    setLoading(true)
    const data = await getSolicitudes()
    setSolicitudes(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleApprove(s) {
    setActing(s.id)
    await approveSolicitud(s.id, { email: s.email, nombre: s.nombre, apellido: s.apellido })
    await load()
    setActing(null)
  }

  async function handleReject(s) {
    setActing(s.id)
    await rejectSolicitud(s.id)
    await load()
    setActing(null)
  }

  function startEdit(s) {
    setEditingId(s.id)
    setEditForm({ nombre: s.nombre, apellido: s.apellido, email: s.email, status: s.status })
    setConfirmDelete(null)
  }

  async function handleSaveEdit(id) {
    setActing(id)
    await updateSolicitud(id, editForm)
    setEditingId(null)
    await load()
    setActing(null)
  }

  async function handleDelete(id) {
    setActing(id)
    await deleteSolicitud(id)
    setConfirmDelete(null)
    await load()
    setActing(null)
  }

  const filtered = solicitudes.filter(s => filter === 'todas' || s.status === filter)
  const pendingCount = solicitudes.filter(s => s.status === 'pendiente').length

  return (
    <>
      <div className="sa-filters">
        {['pendiente', 'aprobado', 'rechazado', 'todas'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`sa-filter-btn ${filter === f ? 'sa-filter-btn-active' : ''}`}>
            {f === 'todas' ? 'Todas' : STATUS_LABEL[f]}
            <span className="sa-filter-count">
              {f === 'todas' ? solicitudes.length : solicitudes.filter(s => s.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {pendingCount > 0 && filter !== 'pendiente' && (
        <div className="sa-alert">{pendingCount} solicitud{pendingCount !== 1 ? 'es' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de revisión</div>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="sa-empty">No hay solicitudes {filter !== 'todas' ? STATUS_LABEL[filter].toLowerCase() + 's' : ''}.</div>
      ) : (
        <div className="sa-list">
          {filtered.map(s => {
            const st = STATUS_COLOR[s.status] || STATUS_COLOR.pendiente
            const isActing = acting === s.id
            const isEditing = editingId === s.id
            const date = s.createdAt?.toDate?.()
            return (
              <div key={s.id} className="sa-card">
                <div className="sa-card-top">
                  <div className="sa-card-info">
                    {isEditing ? (
                      <div className="sa-edit-form">
                        <div className="sa-edit-row">
                          <input className="sa-edit-input" value={editForm.nombre} placeholder="Nombre"
                            onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
                          <input className="sa-edit-input" value={editForm.apellido} placeholder="Apellido"
                            onChange={e => setEditForm(f => ({ ...f, apellido: e.target.value }))} />
                        </div>
                        <input className="sa-edit-input" value={editForm.email} placeholder="Email"
                          onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                        <select className="sa-edit-input sa-edit-select" value={editForm.status}
                          onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                          <option value="pendiente">Pendiente</option>
                          <option value="aprobado">Aprobado</option>
                          <option value="rechazado">Rechazado</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="sa-card-name">{s.nombre} {s.apellido}</div>
                        <div className="sa-card-email">{s.email}</div>
                        {date && (
                          <div className="sa-card-date">
                            {date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <span className="sa-status-chip" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>

                {isEditing ? (
                  <div className="sa-card-actions">
                    <button className="sa-btn-approve" disabled={isActing} onClick={() => handleSaveEdit(s.id)}>
                      {isActing ? '...' : 'Guardar'}
                    </button>
                    <button className="sa-btn-cancel" onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                ) : confirmDelete === s.id ? (
                  <div className="sa-card-actions">
                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>¿Eliminar solicitud?</span>
                    <button className="sa-btn-delete" disabled={isActing} onClick={() => handleDelete(s.id)}>
                      {isActing ? '...' : 'Eliminar'}
                    </button>
                    <button className="sa-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                  </div>
                ) : (
                  <div className="sa-card-actions">
                    {s.status === 'pendiente' && (
                      <>
                        <button className="sa-btn-approve" disabled={isActing} onClick={() => handleApprove(s)}>
                          {isActing ? '...' : 'Aprobar'}
                        </button>
                        <button className="sa-btn-reject" disabled={isActing} onClick={() => handleReject(s)}>
                          {isActing ? '...' : 'Rechazar'}
                        </button>
                      </>
                    )}
                    <button className="sa-btn-icon" title="Editar" onClick={() => startEdit(s)}>✏️</button>
                    <button className="sa-btn-icon sa-btn-icon-delete" title="Eliminar" onClick={() => setConfirmDelete(s.id)}>🗑️</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function AdminsPanel() {
  const [admins, setAdmins]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [revoking, setRevoking]     = useState(null)
  const [confirmRevoke, setConfirmRevoke] = useState(null)

  async function load() {
    setLoading(true)
    const data = await getAdmins()
    setAdmins(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleRevoke(admin) {
    const key = admin.uid || admin.email
    setRevoking(key)
    await revokeAdmin(admin.uid, admin.email)
    await load()
    setRevoking(null)
    setConfirmRevoke(null)
  }

  return (
    <>
      {loading ? (
        <Spinner />
      ) : admins.length === 0 ? (
        <div className="sa-empty">No hay administradores activos aún. Aprobá solicitudes para agregar admins.</div>
      ) : (
        <div className="sa-list">
          {admins.map(a => {
            const key = a.uid || a.email
            return (
            <div key={key} className="sa-card">
              <div className="sa-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {a.photoURL ? (
                    <img src={a.photoURL} alt="" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: a.pending ? 'rgba(99,102,241,0.15)' : 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.pending ? '#818cf8' : '#f97316', fontWeight: 700, fontSize: 16 }}>
                      {(a.displayName || a.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="sa-card-info">
                    <div className="sa-card-name">{a.displayName || (a.pending ? 'Sin registrar' : '—')}</div>
                    <div className="sa-card-email">{a.email}</div>
                    {a.pending && <div className="sa-card-date">Aprobado · pendiente de primer inicio de sesión</div>}
                  </div>
                </div>
                <span className="sa-status-chip" style={
                  a.pending
                    ? { background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }
                    : { background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }
                }>
                  {a.pending ? 'Pendiente' : 'Admin'}
                </span>
              </div>

              {confirmRevoke === key ? (
                <div className="sa-card-actions">
                  <span style={{ flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>¿Quitar acceso admin?</span>
                  <button className="sa-btn-reject" style={{ flex: 'none', padding: '7px 14px' }}
                    disabled={revoking === key} onClick={() => handleRevoke(a)}>
                    {revoking === key ? '...' : 'Confirmar'}
                  </button>
                  <button className="sa-btn-cancel" onClick={() => setConfirmRevoke(null)}>Cancelar</button>
                </div>
              ) : (
                <div className="sa-card-actions" style={{ justifyContent: 'flex-end' }}>
                  <button className="sa-btn-reject" style={{ flex: 'none', padding: '7px 14px' }}
                    onClick={() => setConfirmRevoke(key)}>
                    Quitar acceso
                  </button>
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </>
  )
}
