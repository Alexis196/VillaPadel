import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useTorneo } from '../../contexts/TorneoContext'
import { useAuth } from '../../contexts/AuthContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  addBusquedaDupla, deleteBusquedaDupla,
  addComentarioBusqueda, deleteComentarioBusqueda,
} from '../../firebase/torneoService'
import './BuscarDuplaView.css'

const blankForm = () => ({ nombre: '', apellido: '', mensaje: '' })
const blankComentario = () => ({ nombre: '', mensaje: '' })

function formatRelativeTime(ts) {
  if (!ts?.seconds) return 'recién'
  const diffMs = Date.now() - ts.seconds * 1000
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

function BusquedaCard({ torneoId, busqueda, isAdmin, removing, onRequestRemove }) {
  const [expanded, setExpanded] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [comentario, setComentario] = useState(blankComentario())
  const [enviando, setEnviando] = useState(false)
  const [removingComentarioId, setRemovingComentarioId] = useState(null)

  useEffect(() => {
    if (!expanded) return
    const unsub = onSnapshot(
      query(collection(db, 'torneos', torneoId, 'buscandoDupla', busqueda.id, 'comentarios'), orderBy('createdAt', 'asc')),
      snap => setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [expanded, torneoId, busqueda.id])

  async function handleComentar() {
    if (!comentario.nombre.trim() || !comentario.mensaje.trim()) return
    setEnviando(true)
    await addComentarioBusqueda(torneoId, busqueda.id, comentario)
    setComentario(blankComentario())
    setEnviando(false)
  }

  async function handleRemoveComentario(id) {
    setRemovingComentarioId(id)
    await deleteComentarioBusqueda(torneoId, busqueda.id, id)
    setRemovingComentarioId(null)
  }

  return (
    <div className="bd-card">
      <div className="bd-card-top">
        <div className="bd-card-main">
          <div className="bd-card-name">{busqueda.nombre} {busqueda.apellido}</div>
          {busqueda.mensaje && <div className="bd-card-mensaje">{busqueda.mensaje}</div>}
          <div className="bd-card-time">{formatRelativeTime(busqueda.createdAt)}</div>
        </div>
        {isAdmin && (
          <button onClick={() => onRequestRemove(busqueda)} disabled={removing} className="bd-btn-remove" title="Eliminar publicación">
            {removing ? '...' : '🗑'}
          </button>
        )}
      </div>

      <button onClick={() => setExpanded(v => !v)} className="bd-comment-toggle">
        💬 {expanded ? 'Ocultar comentarios' : 'Comentarios'}
      </button>

      {expanded && (
        <div className="bd-comments">
          {comentarios.map(c => (
            <div key={c.id} className="bd-comment-row">
              <div className="bd-comment-bubble">
                <span className="bd-comment-nombre">{c.nombre}</span>
                <span className="bd-comment-mensaje">{c.mensaje}</span>
              </div>
              <div className="bd-comment-meta">
                <span className="bd-comment-time">{formatRelativeTime(c.createdAt)}</span>
                {isAdmin && (
                  <button onClick={() => handleRemoveComentario(c.id)} disabled={removingComentarioId === c.id} className="bd-comment-remove">
                    eliminar
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="bd-comment-form">
            <input placeholder="Tu nombre" value={comentario.nombre}
              onChange={e => setComentario(p => ({ ...p, nombre: e.target.value }))}
              className="bd-inp bd-comment-nombre-inp" />
            <input placeholder="Escribí una respuesta... (ej: dale, te acompaño)" value={comentario.mensaje}
              onChange={e => setComentario(p => ({ ...p, mensaje: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleComentar()}
              className="bd-inp" />
            <button onClick={handleComentar} disabled={enviando || !comentario.nombre.trim() || !comentario.mensaje.trim()} className="bd-btn-comentar">
              {enviando ? '...' : 'Responder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BuscarDuplaView() {
  const { activeTorneo, buscandoDupla } = useTorneo()
  const { isAdmin } = useAuth()
  const isMobile = useIsMobile()
  const [form, setForm] = useState(blankForm())
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)

  async function handlePublicar() {
    if (!form.nombre.trim() || !form.apellido.trim() || !activeTorneo) return
    setSubmitting(true)
    await addBusquedaDupla(activeTorneo.id, form)
    setForm(blankForm())
    setSubmitting(false)
  }

  async function handleConfirmRemove() {
    if (!activeTorneo || !confirmTarget) return
    setRemovingId(confirmTarget.id)
    await deleteBusquedaDupla(activeTorneo.id, confirmTarget.id)
    setRemovingId(null)
    setConfirmTarget(null)
  }

  return (
    <div className="bd-page" style={{ padding: isMobile ? '20px 12px' : '28px 24px' }}>
      <div className="bd-header">
        <h2 style={{ color: '#f1f1f5', fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.5px' }}>
          Buscar dupla
        </h2>
        <p className="bd-subtitle">¿Te anotaste solo? Dejá tus datos y aparecé acá hasta que encuentres pareja.</p>
      </div>

      <div className="bd-form-card">
        <div className="bd-form-row">
          <div style={{ flex: 1, minWidth: 140 }}>
            <div className="bd-field-label">NOMBRE</div>
            <input placeholder="Nombre" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              className="bd-inp" />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div className="bd-field-label">APELLIDO</div>
            <input placeholder="Apellido" value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))}
              className="bd-inp" />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="bd-field-label">MENSAJE (OPCIONAL)</div>
          <input placeholder="Ej: nivel intermedio, juego de revés" value={form.mensaje}
            onChange={e => setForm(p => ({ ...p, mensaje: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handlePublicar()} className="bd-inp" />
        </div>
        <button onClick={handlePublicar} disabled={submitting || !form.nombre.trim() || !form.apellido.trim()} className="bd-btn-publicar">
          {submitting ? 'Publicando...' : '+ Publicar'}
        </button>
      </div>

      {buscandoDupla.length === 0 ? (
        <div className="bd-empty">
          <div className="bd-empty-icon">🤝</div>
          <p className="bd-empty-title">Todavía nadie está buscando dupla</p>
          <p className="bd-empty-desc">Sé el primero en publicarte.</p>
        </div>
      ) : (
        <div className="bd-list">
          {buscandoDupla.map(b => (
            <BusquedaCard
              key={b.id}
              torneoId={activeTorneo.id}
              busqueda={b}
              isAdmin={isAdmin}
              removing={removingId === b.id}
              onRequestRemove={setConfirmTarget}
            />
          ))}
        </div>
      )}

      {confirmTarget && (
        <div className="bd-modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmTarget(null)}>
          <div className="bd-modal">
            <div className="bd-modal-icon">🗑</div>
            <h3 className="bd-modal-title">¿Eliminar publicación?</h3>
            <p className="bd-modal-desc">
              Se va a borrar la publicación de <strong>{confirmTarget.nombre} {confirmTarget.apellido}</strong> junto con todos sus comentarios. Esta acción no se puede deshacer.
            </p>
            <div className="bd-modal-actions">
              <button onClick={() => setConfirmTarget(null)} className="bd-modal-cancel">Cancelar</button>
              <button onClick={handleConfirmRemove} disabled={removingId === confirmTarget.id} className="bd-modal-confirm">
                {removingId === confirmTarget.id ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
