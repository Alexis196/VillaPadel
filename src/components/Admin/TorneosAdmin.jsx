import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createTorneo, updateTorneo, deleteTorneo, addDupla, generateFixture, generateBracket, updateColaboradores } from '../../firebase/torneoService'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../ui/Spinner'
import AppSelect from '../ui/AppSelect'
import { useIsMobile } from '../../hooks/useIsMobile'
import './TorneosAdmin.css'

const CAT_OPTIONS = [
  { id: 'cat-8va', name: '8va Categoría', valor: 8, color: '#64748b' },
  { id: 'cat-7ma', name: '7ma Categoría', valor: 7, color: '#eab308' },
  { id: 'cat-6ta', name: '6ta Categoría', valor: 6, color: '#84cc16' },
  { id: 'cat-5ta', name: '5ta Categoría', valor: 5, color: '#06b6d4' },
  { id: 'cat-4ta', name: '4ta Categoría', valor: 4, color: '#10b981' },
  { id: 'cat-3ra', name: '3ra Categoría', valor: 3, color: '#3b82f6' },
  { id: 'cat-2da', name: '2da Categoría', valor: 2, color: '#a855f7' },
  { id: 'cat-1ra', name: '1ra Categoría', valor: 1, color: '#f97316' },
  { id: 'cat-fem', name: 'Femenino A',    valor: 2, color: '#ec4899' },
  { id: 'cat-mix', name: 'Mixto',          valor: 3, color: '#f59e0b' },
]

const STATUS_STYLE = {
  'En curso':    { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  'Inscripción': { bg: 'rgba(249,115,22,0.12)',  color: '#f97316', border: 'rgba(249,115,22,0.25)' },
  'Finalizado':  { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', border: 'rgba(156,163,175,0.25)' },
  'Llave':       { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6', border: 'rgba(139,92,246,0.25)' },
}

function getTorneoColor(t) {
  if (t.color) return t.color
  const cat = CAT_OPTIONS.find(c => c.id === t.categoriaId)
  return cat?.color || '#f97316'
}

function PlayerSearchSelect({ value, selectedId, players, onSelect, onChange, placeholder, style, mode = 'select' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropPos, setDropPos] = useState(null)
  const inputRef = useRef(null)

  const filtered = !search
    ? players
    : players.filter(j =>
        j.name.toLowerCase().includes(search.toLowerCase()) ||
        (j.displayCategory || j.categoryName || '').toLowerCase().includes(search.toLowerCase())
      )

  function handleFocus() {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 2, left: rect.left, width: rect.width })
    }
    setSearch('')
    setOpen(true)
  }

  function handleBlur() {
    setTimeout(() => setOpen(false), 150)
  }

  function handleInputChange(e) {
    setSearch(e.target.value)
    if (mode === 'freeform') onChange?.(e.target.value)
  }

  function handleSelect(j) {
    onSelect(j)
    setSearch('')
    setOpen(false)
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <input
        ref={inputRef}
        value={open ? search : value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || '— Jugador'}
        style={style}
        autoComplete="off"
      />
      {open && dropPos && (
        <div
          className="ta-player-dropdown"
          style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
        >
          {filtered.length === 0 ? (
            <div className="ta-player-no-results">Sin resultados</div>
          ) : filtered.map(j => (
            <div
              key={j.id}
              onMouseDown={() => handleSelect(j)}
              className="ta-player-option"
              style={{ background: j.id === selectedId ? 'rgba(249,115,22,0.08)' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.background = j.id === selectedId ? 'rgba(249,115,22,0.08)' : 'transparent' }}
            >
              <span className="ta-player-name">{j.name}</span>
              <span className="ta-player-cat" style={{ color: j.categoryColor || '#9999b0' }}>{j.displayCategory || j.categoryName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const defaultDupla = (costo = '') => ({
  jugador1: '', jugador1Valor: null,
  jugador2: '', jugador2Valor: null,
  pago1: { estado: 'pendiente', metodo: '', monto: costo },
  pago2: { estado: 'pendiente', metodo: '', monto: costo },
})

function AddDuplasModal({ torneoId, torneoNombre, torneoEstado, torneoTipoTorneo, torneoCategoriaValor, torneoSexo, torneoCosto, onClose, onFixtureGenerated }) {
  const isMobile = useIsMobile()
  const isSuma = torneoTipoTorneo === 'suma'
  const sumaMinima = Number(torneoCategoriaValor || 0)
  const isEnCurso = torneoEstado !== 'Inscripción'
  const costo = torneoCosto ? String(torneoCosto) : ''
  const [duplas, setDuplas] = useState([defaultDupla(costo)])
  const [jugadores, setJugadores] = useState([])
  const [existingPlayerNames, setExistingPlayerNames] = useState(new Set())
  const [loadingJugadores, setLoadingJugadores] = useState(false)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState('duplas')
  const [error, setError] = useState('')
  const eligibleJugadores = isSuma ? jugadores : jugadores.filter(j => j.categoriaValor >= sumaMinima)

  useEffect(() => {
    setLoadingJugadores(true)
    Promise.all([
      getDocs(query(collection(db, 'players'), orderBy('categoriaValor', 'desc'))),
      getDocs(collection(db, 'torneos', torneoId, 'duplas')),
    ]).then(([playersSnap, duplasSnap]) => {
      setJugadores(playersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      const names = new Set()
      duplasSnap.docs.forEach(d => {
        const data = d.data()
        if (data.jugador1?.trim()) names.add(data.jugador1.trim())
        if (data.jugador2?.trim()) names.add(data.jugador2.trim())
      })
      setExistingPlayerNames(names)
      setLoadingJugadores(false)
    })
  }, [])

  function selectPlayer(i, num, jugadorId) {
    const j = jugadores.find(p => p.id === jugadorId) || null
    const rawValor = j ? j.categoriaValor : null
    const efectivoValor = (j && torneoSexo === 'masculino' && j.sexo === 'F') ? rawValor + 2 : rawValor
    setDuplas(prev => prev.map((d, idx) => idx !== i ? d : {
      ...d,
      [`jugador${num}`]: j ? j.name : '',
      [`jugador${num}Valor`]: efectivoValor,
    }))
  }

  function updateDupla(i, field, val) {
    setDuplas(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d))
  }
  function updatePago(i, num, field, val) {
    const key = `pago${num}`
    setDuplas(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: { ...d[key], [field]: val } } : d))
  }

  async function handleSave() {
    const valid = duplas.filter(d => d.jugador1.trim() && d.jugador2.trim())
    const minRequired = isEnCurso ? 1 : 2
    if (valid.length < minRequired) {
      setError(isEnCurso ? 'Completá al menos una dupla.' : 'Se necesitan al menos 2 duplas completas.')
      return
    }
    if (isSuma) {
      const invalid = valid.filter(d => {
        const suma = Number(d.jugador1Valor || 0) + Number(d.jugador2Valor || 0)
        return suma < sumaMinima
      })
      if (invalid.length > 0) {
        setError(`${invalid.length} dupla(s) no cumplen la suma mínima de ${sumaMinima}. Revisá las categorías.`)
        return
      }
    }
    setError('')
    setSaving(true)
    for (const d of valid) await addDupla(torneoId, d)
    setSaving(false)
    setStep('done')
    onFixtureGenerated()
  }

  const rowInputStyle = {
    background: '#16161e', border: '1px solid #2a2a38', borderRadius: 6,
    padding: '6px 8px', color: '#f1f1f5', fontSize: 12, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  const pagoRow = (i, num) => {
    const pago = duplas[i][`pago${num}`]
    const labelColor = num === 1 ? '#f97316' : '#9999b0'
    const currentName = num === 1 ? duplas[i].jugador1 : duplas[i].jugador2
    const currentJugadorId = jugadores.find(j => j.name === currentName)?.id || ''
    const duplaSum = (duplas[i].jugador1Valor || 0) + (duplas[i].jugador2Valor || 0)
    const bothSelected = !!(duplas[i].jugador1 && duplas[i].jugador2 && duplas[i].jugador1Valor !== null && duplas[i].jugador2Valor !== null)
    const sumaOk = duplaSum >= sumaMinima

    const usedNames = new Set([
      ...existingPlayerNames,
      ...duplas.flatMap(d => [d.jugador1, d.jugador2]).filter(n => n.trim()),
    ])
    if (currentName.trim()) usedNames.delete(currentName)
    const availablePlayers = eligibleJugadores.filter(j => !usedNames.has(j.name))

    const playerSelect = (
      <PlayerSearchSelect
        value={currentName}
        selectedId={currentJugadorId}
        players={availablePlayers.map(j => ({
          ...j,
          displayCategory: (isSuma && torneoSexo === 'masculino' && j.sexo === 'F')
            ? `${j.categoryName} +2`
            : j.categoryName,
        }))}
        onSelect={j => isSuma
          ? selectPlayer(i, num, j.id)
          : updateDupla(i, num === 1 ? 'jugador1' : 'jugador2', j.name)
        }
        onChange={!isSuma ? (val => updateDupla(i, num === 1 ? 'jugador1' : 'jugador2', val)) : undefined}
        placeholder={`Jugador ${num}`}
        style={{ ...rowInputStyle, width: '100%' }}
        mode={isSuma ? 'select' : 'freeform'}
      />
    )
    const sumaBadge = isSuma && num === 2 && bothSelected && (
      <span className={sumaOk ? 'ta-suma-valid' : 'ta-suma-invalid'}>Σ{duplaSum}/{sumaMinima}</span>
    )

    if (isMobile) {
      return (
        <div key={num} style={{ marginBottom: num === 1 ? 8 : 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ color: labelColor, fontSize: 11, fontWeight: 700, width: 22, flexShrink: 0 }}>J{num}</span>
            <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
              {playerSelect}
              {sumaBadge}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, paddingLeft: 28 }}>
            <div style={{ flex: 1 }}>
              <AppSelect size="sm" value={pago.estado} onChange={v => updatePago(i, num, 'estado', v)}
                options={[{ value: 'pendiente', label: 'Pendiente' }, { value: 'pagado', label: 'Pagado' }]} />
            </div>
            <div style={{ flex: 1 }}>
              <AppSelect size="sm" value={pago.metodo || ''} onChange={v => updatePago(i, num, 'metodo', v)}
                isDisabled={pago.estado !== 'pagado'}
                options={[{ value: '', label: '— Método' }, { value: 'efectivo', label: 'Efectivo' }, { value: 'transferencia', label: 'Transferencia' }]} />
            </div>
            <input type="number" placeholder="$0" value={pago.monto} onChange={e => updatePago(i, num, 'monto', e.target.value)} style={{ ...rowInputStyle, width: 60 }} disabled={pago.estado !== 'pagado'} />
          </div>
        </div>
      )
    }

    return (
      <div key={num} className="ta-pago-row-desktop" style={{ marginBottom: num === 1 ? 5 : 0 }}>
        <span style={{ color: labelColor, fontSize: 11, fontWeight: 700, alignSelf: 'center' }}>J{num}</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {playerSelect}
          {sumaBadge}
        </div>
        <select value={pago.estado} onChange={e => updatePago(i, num, 'estado', e.target.value)} className="ta-row-input" style={{ cursor: 'pointer' }}>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
        </select>
        <select value={pago.metodo} onChange={e => updatePago(i, num, 'metodo', e.target.value)} className="ta-row-input" style={{ cursor: 'pointer' }} disabled={pago.estado !== 'pagado'}>
          <option value="">— Método</option>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <input type="number" placeholder="$0" value={pago.monto} onChange={e => updatePago(i, num, 'monto', e.target.value)} className="ta-row-input" disabled={pago.estado !== 'pagado'} />
      </div>
    )
  }

  return (
    <div className={`ta-modal-overlay${isMobile ? ' bottom' : ''}`}>
      <div className={`ta-modal${isMobile ? ' mobile-sheet' : ''}`} style={{ maxWidth: isMobile ? '100%' : 860 }}>
        <div className="ta-modal-header">
          <div>
            <h2 className="ta-modal-title">
              {isEnCurso ? 'Agregar Duplas' : 'Cargar Duplas'}
            </h2>
            <p className="ta-modal-subtitle">
              {torneoNombre}
              {isSuma && <span className="ta-suma-badge">· Suma mínima: {sumaMinima}</span>}
            </p>
          </div>
          <button onClick={onClose} className="ta-modal-close">×</button>
        </div>

        {step === 'done' ? (
          <div className="ta-done-step">
            <div className="ta-done-icon">✅</div>
            <h3 className="ta-done-title">¡Duplas guardadas!</h3>
            <p className="ta-done-desc">
              Las duplas fueron guardadas. Podés generar el fixture desde el panel del torneo.
            </p>
            <button onClick={onClose} className="ta-btn-primary">Ver Torneos →</button>
          </div>
        ) : (
          <>
            {!isMobile && (
              <div className="ta-dupla-thead">
                <div className="ta-dupla-thead-row">
                  {['', 'Jugador', 'Estado', 'Método', 'Monto', ''].map((h, idx) => (
                    <div key={idx} className="ta-dupla-th">{h}</div>
                  ))}
                </div>
              </div>
            )}

            {isSuma && loadingJugadores ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#9999b0' }}>Cargando jugadores...</div>
            ) : isSuma && jugadores.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ color: '#ef4444', margin: '0 0 8px', fontWeight: 600 }}>No hay jugadores registrados.</p>
                <p style={{ color: '#9999b0', fontSize: 13, margin: 0 }}>
                  Registrá los jugadores con su categoría en la sección "Jugadores" antes de inscribir duplas en un torneo de suma.
                </p>
              </div>
            ) : (
              <div className="ta-modal-body-scroll">
                {duplas.map((d, i) => (
                  <div key={i} className="ta-dupla-row">
                    <div className="ta-dupla-card">
                      {pagoRow(i, 1)}
                      {pagoRow(i, 2)}
                    </div>
                    <button
                      onClick={() => setDuplas(prev => prev.filter((_, idx) => idx !== i))}
                      className="ta-dupla-remove"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setDuplas(prev => [...prev, defaultDupla(costo)])}
                  className="ta-add-dupla-btn"
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.color = '#9999b0' }}
                >+ Agregar dupla</button>
                {error && <p className="ta-error-inline">{error}</p>}
              </div>
            )}

            <div className="ta-modal-footer">
              <span style={{ color: '#9999b0', fontSize: 13 }}>
                {duplas.filter(d => d.jugador1.trim() && d.jugador2.trim()).length} duplas válidas
              </span>
              <div className="ta-modal-footer-actions">
                <button onClick={onClose} className="ta-btn-secondary">Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={saving || (isSuma && jugadores.length === 0)}
                  className="ta-btn-primary"
                  style={{ cursor: (saving || (isSuma && jugadores.length === 0)) ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Guardando...' : '+ Guardar duplas'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function NewTorneoModal({ onClose, onCreated }) {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const [form, setForm] = useState({
    nombre: '', tipoTorneo: 'categoria', modalidadTorneo: 'tradicional', categoriaId: 'cat-8va',
    sumaValor: '', fechaInicio: '', fechaFin: '', costoPorJugador: '', sexo: 'masculino',
    tamanoZona: 4, clasificadosPorZona: 1,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.fechaInicio) { setError('La fecha de inicio es obligatoria.'); return }
    if (form.tipoTorneo === 'suma' && (!form.sumaValor || Number(form.sumaValor) < 1)) {
      setError('Ingresá el valor de suma (ej: 15).'); return
    }
    setError('')
    setSaving(true)

    const today = new Date().toISOString().split('T')[0]
    const estado = form.fechaInicio > today ? 'Inscripción' : 'En curso'

    let categoriaId, categoriaName, categoriaValor, color
    if (form.tipoTorneo === 'suma') {
      const sv = Number(form.sumaValor)
      categoriaId = `suma-${sv}`
      categoriaName = `Suma ${sv}`
      categoriaValor = sv
      color = '#8b5cf6'
    } else {
      const cat = CAT_OPTIONS.find(c => c.id === form.categoriaId)
      categoriaId = cat.id
      categoriaName = cat.name
      categoriaValor = cat.valor
      color = cat.color
    }

    const id = await createTorneo({
      nombre: form.nombre.trim(),
      categoriaId, categoriaName, categoriaValor,
      costoPorJugador: form.costoPorJugador || 0,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin || null,
      tipoTorneo: form.tipoTorneo,
      modalidadTorneo: form.modalidadTorneo,
      color,
      sexo: form.sexo,
      tamanoZona: form.tamanoZona,
      clasificadosPorZona: form.clasificadosPorZona,
      ownerUid: user?.uid || null,
      ownerEmail: user?.email || null,
    })
    setSaving(false)
    const catValor = form.tipoTorneo === 'suma' ? Number(form.sumaValor) : CAT_OPTIONS.find(c => c.id === form.categoriaId)?.valor
    onCreated(id, { nombre: form.nombre.trim(), estado, tipoTorneo: form.tipoTorneo, categoriaValor: catValor, sexo: form.sexo, costoPorJugador: form.costoPorJugador || 0 })
  }

  const cat = CAT_OPTIONS.find(c => c.id === form.categoriaId)
  const previewColor = form.tipoTorneo === 'suma' ? '#8b5cf6' : (cat?.color || '#f97316')
  const previewName = form.tipoTorneo === 'suma'
    ? (form.sumaValor ? `Suma ${form.sumaValor}` : 'Suma —')
    : (cat?.name || '—')

  return (
    <div className="ta-modal-overlay">
      <div className="ta-modal" style={{ maxWidth: 520 }}>
        <div className="ta-modal-header">
          <h2 className="ta-modal-title">Nuevo Torneo</h2>
          <button onClick={onClose} className="ta-modal-close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="ta-modal-body">
          <div className="ta-field">
            <label className="ta-label">Nombre del torneo</label>
            <input
              placeholder="ej. Copa Villa Padel — Masculino 3ra"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              className="ta-input"
            />
          </div>

          <div className="ta-field">
            <label className="ta-label">Tipo de torneo</label>
            <div className="ta-toggle-group">
              <button type="button" className={`ta-toggle${form.tipoTorneo === 'categoria' ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, tipoTorneo: 'categoria' }))}>
                Por categoría
              </button>
              <button type="button" className={`ta-toggle${form.tipoTorneo === 'suma' ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, tipoTorneo: 'suma' }))}>
                Por suma
              </button>
            </div>
          </div>

          <div className="ta-field">
            <label className="ta-label">Formato del torneo</label>
            <div className="ta-toggle-group">
              <button type="button" className={`ta-toggle${form.modalidadTorneo === 'tradicional' ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, modalidadTorneo: 'tradicional' }))}>Tradicional</button>
              <button type="button" className={`ta-toggle${form.modalidadTorneo === 'americano' ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, modalidadTorneo: 'americano' }))}>Americano</button>
            </div>
            {form.modalidadTorneo === 'americano' && (
              <p className="ta-americano-note">Americano: 1 set a 9 games (o diferencia de 2 en paridad).</p>
            )}
          </div>

          <div className="ta-field">
            <label className="ta-label">Modalidad</label>
            <div className="ta-toggle-group">
              {[{ v: 'masculino', label: 'Masculino' }, { v: 'femenino', label: 'Femenino' }, { v: 'mixto', label: 'Mixto' }].map(({ v, label }) => (
                <button key={v} type="button" className={`ta-toggle${form.sexo === v ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, sexo: v }))}>{label}</button>
              ))}
            </div>
          </div>

          {form.tipoTorneo === 'categoria' ? (
            <div className="ta-field">
              <label className="ta-label">Categoría</label>
              <AppSelect
                value={form.categoriaId}
                onChange={v => setForm(p => ({ ...p, categoriaId: v }))}
                options={CAT_OPTIONS.map(c => ({ value: c.id, label: c.name }))}
              />
            </div>
          ) : (
            <div className="ta-field">
              <label className="ta-label">Valor de suma</label>
              <input
                type="number"
                placeholder="ej. 15, 14, 13..."
                value={form.sumaValor}
                onChange={e => setForm(p => ({ ...p, sumaValor: e.target.value }))}
                className="ta-input"
                min="1"
              />
              <p className="ta-suma-note">La suma de los niveles de ambos jugadores de la dupla.</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label className="ta-label">Fecha de inicio</label>
              <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} className="ta-input" />
            </div>
            <div>
              <label className="ta-label">Fecha de fin</label>
              <input type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))} className="ta-input" />
            </div>
            <div>
              <label className="ta-label">Costo por jugador ($)</label>
              <input type="number" placeholder="ej. 18000" value={form.costoPorJugador} onChange={e => setForm(p => ({ ...p, costoPorJugador: e.target.value }))} className="ta-input" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label className="ta-label">Parejas por zona</label>
              <div className="ta-toggle-group">
                {[3, 4].map(n => (
                  <button key={n} type="button" className={`ta-toggle${form.tamanoZona === n ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, tamanoZona: n }))}>{n} parejas</button>
                ))}
              </div>
            </div>
            <div>
              <label className="ta-label">Clasifican por zona</label>
              <div className="ta-toggle-group">
                {[1, 2].map(n => (
                  <button key={n} type="button" className={`ta-toggle${form.clasificadosPorZona === n ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, clasificadosPorZona: n }))}>{n === 1 ? '1 pareja' : '2 parejas'}</button>
                ))}
              </div>
            </div>
          </div>

          <div
            className="ta-preview-bar"
            style={{ background: `${previewColor}10`, border: `1px solid ${previewColor}30` }}
          >
            <span className="ta-preview-dot" style={{ background: previewColor }} />
            <span className="ta-preview-text" style={{ color: previewColor }}>{previewName}</span>
            {form.fechaInicio && (
              <span className="ta-preview-date">
                {form.fechaInicio > new Date().toISOString().split('T')[0] ? '📋 Inscripción' : '▶️ En curso'}
              </span>
            )}
          </div>

          {error && <p className="ta-error">{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="ta-btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="ta-btn-primary" style={{ cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creando...' : 'Crear torneo →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditTorneoModal({ torneo, onClose, onSaved }) {
  const isMobile = useIsMobile()
  const isSuma = torneo.tipoTorneo === 'suma'
  const [form, setForm] = useState({
    nombre: torneo.nombre,
    tipoTorneo: isSuma ? 'suma' : 'categoria',
    modalidadTorneo: torneo.modalidadTorneo || 'tradicional',
    categoriaId: isSuma ? 'cat-8va' : (torneo.categoriaId || 'cat-8va'),
    sumaValor: isSuma ? String(torneo.categoriaValor || '') : '',
    fechaInicio: torneo.fechaInicio || '',
    fechaFin: torneo.fechaFin || '',
    costoPorJugador: torneo.costoPorJugador ? String(torneo.costoPorJugador) : '',
    sexo: torneo.sexo || 'masculino',
    tamanoZona: torneo.tamanoZona || 4,
    clasificadosPorZona: torneo.clasificadosPorZona || 1,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.fechaInicio) { setError('La fecha de inicio es obligatoria.'); return }
    if (form.tipoTorneo === 'suma' && (!form.sumaValor || Number(form.sumaValor) < 1)) {
      setError('Ingresá el valor de suma.'); return
    }
    setError('')
    setSaving(true)

    let categoriaId, categoriaName, categoriaValor, color
    if (form.tipoTorneo === 'suma') {
      const sv = Number(form.sumaValor)
      categoriaId = `suma-${sv}`; categoriaName = `Suma ${sv}`; categoriaValor = sv; color = '#8b5cf6'
    } else {
      const cat = CAT_OPTIONS.find(c => c.id === form.categoriaId)
      categoriaId = cat.id; categoriaName = cat.name; categoriaValor = cat.valor; color = cat.color
    }

    await updateTorneo(torneo.id, {
      nombre: form.nombre.trim(), categoriaId, categoriaName, categoriaValor,
      costoPorJugador: form.costoPorJugador || 0,
      fechaInicio: form.fechaInicio, fechaFin: form.fechaFin || null,
      tipoTorneo: form.tipoTorneo,
      modalidadTorneo: form.modalidadTorneo,
      color, sexo: form.sexo,
      tamanoZona: form.tamanoZona,
      clasificadosPorZona: form.clasificadosPorZona,
    })
    setSaving(false)
    onSaved()
  }

  const previewColor = form.tipoTorneo === 'suma' ? '#8b5cf6' : (CAT_OPTIONS.find(c => c.id === form.categoriaId)?.color || '#f97316')
  const previewName = form.tipoTorneo === 'suma' ? (form.sumaValor ? `Suma ${form.sumaValor}` : 'Suma —') : (CAT_OPTIONS.find(c => c.id === form.categoriaId)?.name || '—')

  return (
    <div className="ta-modal-overlay">
      <div className="ta-modal" style={{ maxWidth: 520 }}>
        <div className="ta-modal-header">
          <h2 className="ta-modal-title">Editar Torneo</h2>
          <button onClick={onClose} className="ta-modal-close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="ta-modal-body">
          <div className="ta-field">
            <label className="ta-label">Nombre del torneo</label>
            <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className="ta-input" />
          </div>
          <div className="ta-field">
            <label className="ta-label">Tipo de torneo</label>
            <div className="ta-toggle-group">
              <button type="button" className={`ta-toggle${form.tipoTorneo === 'categoria' ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, tipoTorneo: 'categoria' }))}>Por categoría</button>
              <button type="button" className={`ta-toggle${form.tipoTorneo === 'suma' ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, tipoTorneo: 'suma' }))}>Por suma</button>
            </div>
          </div>
          <div className="ta-field">
            <label className="ta-label">Formato del torneo</label>
            <div className="ta-toggle-group">
              <button type="button" className={`ta-toggle${form.modalidadTorneo === 'tradicional' ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, modalidadTorneo: 'tradicional' }))}>Tradicional</button>
              <button type="button" className={`ta-toggle${form.modalidadTorneo === 'americano' ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, modalidadTorneo: 'americano' }))}>Americano</button>
            </div>
            {form.modalidadTorneo === 'americano' && (
              <p className="ta-americano-note">Americano: 1 set a 9 games (o diferencia de 2 en paridad).</p>
            )}
          </div>
          <div className="ta-field">
            <label className="ta-label">Modalidad</label>
            <div className="ta-toggle-group">
              {[{ v: 'masculino', label: 'Masculino' }, { v: 'femenino', label: 'Femenino' }, { v: 'mixto', label: 'Mixto' }].map(({ v, label }) => (
                <button key={v} type="button" className={`ta-toggle${form.sexo === v ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, sexo: v }))}>{label}</button>
              ))}
            </div>
          </div>
          {form.tipoTorneo === 'categoria' ? (
            <div className="ta-field">
              <label className="ta-label">Categoría</label>
              <AppSelect
                value={form.categoriaId}
                onChange={v => setForm(p => ({ ...p, categoriaId: v }))}
                options={CAT_OPTIONS.map(c => ({ value: c.id, label: c.name }))}
              />
            </div>
          ) : (
            <div className="ta-field">
              <label className="ta-label">Valor de suma</label>
              <input type="number" placeholder="ej. 15, 14, 13..." value={form.sumaValor} onChange={e => setForm(p => ({ ...p, sumaValor: e.target.value }))} className="ta-input" min="1" />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label className="ta-label">Fecha de inicio</label>
              <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} className="ta-input" />
            </div>
            <div>
              <label className="ta-label">Fecha de fin</label>
              <input type="date" value={form.fechaFin} onChange={e => setForm(p => ({ ...p, fechaFin: e.target.value }))} className="ta-input" />
            </div>
            <div>
              <label className="ta-label">Costo por jugador ($)</label>
              <input type="number" placeholder="ej. 18000" value={form.costoPorJugador} onChange={e => setForm(p => ({ ...p, costoPorJugador: e.target.value }))} className="ta-input" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label className="ta-label">Parejas por zona</label>
              <div className="ta-toggle-group">
                {[3, 4].map(n => (
                  <button key={n} type="button" className={`ta-toggle${form.tamanoZona === n ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, tamanoZona: n }))}>{n} parejas</button>
                ))}
              </div>
            </div>
            <div>
              <label className="ta-label">Clasifican por zona</label>
              <div className="ta-toggle-group">
                {[1, 2].map(n => (
                  <button key={n} type="button" className={`ta-toggle${form.clasificadosPorZona === n ? ' active' : ''}`} onClick={() => setForm(p => ({ ...p, clasificadosPorZona: n }))}>{n === 1 ? '1 pareja' : '2 parejas'}</button>
                ))}
              </div>
            </div>
          </div>
          <div
            className="ta-preview-bar"
            style={{ background: `${previewColor}10`, border: `1px solid ${previewColor}30` }}
          >
            <span className="ta-preview-dot" style={{ background: previewColor }} />
            <span className="ta-preview-text" style={{ color: previewColor }}>{previewName}</span>
            {form.fechaInicio && (
              <span className="ta-preview-date">
                {form.fechaInicio > new Date().toISOString().split('T')[0] ? '📋 Inscripción' : '▶️ En curso'}
              </span>
            )}
          </div>
          {error && <p className="ta-error">{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="ta-btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="ta-btn-primary" style={{ cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ColaboradoresSection({ torneo, currentUserUid, isOwner, onUpdate }) {
  const [admins, setAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedUid, setSelectedUid] = useState('')

  useEffect(() => {
    setLoadingAdmins(true)
    getDocs(query(collection(db, 'users'), where('rol', '==', 'admin')))
      .then(snap => {
        setAdmins(snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(a => a.uid !== currentUserUid))
        setLoadingAdmins(false)
      })
      .catch(() => setLoadingAdmins(false))
  }, [currentUserUid])

  const colaboradores = torneo.colaboradores || []
  const available = admins.filter(a => !colaboradores.some(c => c.uid === a.uid))

  async function handleAdd() {
    if (!selectedUid) return
    const admin = admins.find(a => a.uid === selectedUid)
    if (!admin) return
    const updated = [...colaboradores, { uid: admin.uid, email: admin.email, displayName: admin.displayName || admin.email }]
    setSaving(true)
    await updateColaboradores(torneo.id, updated)
    setSelectedUid('')
    onUpdate()
    setSaving(false)
  }

  async function handleRemove(uid) {
    const updated = colaboradores.filter(c => c.uid !== uid)
    setSaving(true)
    await updateColaboradores(torneo.id, updated)
    onUpdate()
    setSaving(false)
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="ta-section-heading">Colaboradores</div>
      <div style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 10, padding: '14px 16px' }}>
        {colaboradores.length === 0 ? (
          <p style={{ color: '#6666a0', fontSize: 13, margin: isOwner ? '0 0 12px' : 0 }}>
            Sin colaboradores. Solo el dueño puede ver y editar este torneo.
          </p>
        ) : (
          <div style={{ marginBottom: isOwner ? 12 : 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {colaboradores.map(c => (
              <div key={c.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#1a1a24', borderRadius: 6, border: '1px solid #2a2a38' }}>
                <div>
                  <span style={{ color: '#f1f1f5', fontSize: 13 }}>{c.displayName || c.email}</span>
                  {c.displayName && <span style={{ color: '#6666a0', fontSize: 11, marginLeft: 8 }}>{c.email}</span>}
                </div>
                {isOwner && (
                  <button
                    onClick={() => handleRemove(c.uid)}
                    disabled={saving}
                    style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 6, color: '#ef4444', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}
                  >Quitar</button>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          loadingAdmins ? (
            <p style={{ color: '#6666a0', fontSize: 12, margin: 0 }}>Cargando admins...</p>
          ) : admins.length === 0 ? (
            <p style={{ color: '#6666a0', fontSize: 12, margin: 0 }}>No hay otros admins disponibles.</p>
          ) : available.length === 0 ? (
            <p style={{ color: '#6666a0', fontSize: 12, margin: 0 }}>Todos los admins ya son colaboradores.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={selectedUid}
                onChange={e => setSelectedUid(e.target.value)}
                style={{ flex: 1, background: '#0f0f13', border: '1px solid #2a2a38', borderRadius: 6, padding: '7px 10px', color: selectedUid ? '#f1f1f5' : '#6666a0', fontSize: 13, outline: 'none', cursor: 'pointer' }}
              >
                <option value="">— Seleccionar admin</option>
                {available.map(a => (
                  <option key={a.uid} value={a.uid}>{a.displayName || a.email}</option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedUid || saving}
                style={{
                  background: selectedUid ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedUid ? 'rgba(249,115,22,0.3)' : '#2a2a38'}`,
                  borderRadius: 6, color: selectedUid ? '#f97316' : '#6666a0',
                  fontSize: 12, fontWeight: 600, padding: '7px 14px',
                  cursor: selectedUid && !saving ? 'pointer' : 'default', whiteSpace: 'nowrap',
                }}
              >{saving ? '...' : '+ Agregar'}</button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default function TorneosAdmin() {
  const { user } = useAuth()
  const [torneos, setTorneos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [duplasModal, setDuplasModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [fixtureConfirm, setFixtureConfirm] = useState(null)
  const [generatingFixture, setGeneratingFixture] = useState(false)
  const [llaveConfirm, setLlaveConfirm] = useState(null)
  const [generatingLlave, setGeneratingLlave] = useState(false)

  useEffect(() => { if (user) load() }, [user?.uid])

  async function load() {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'torneos'), orderBy('createdAt', 'desc')))
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    const list = all.filter(t =>
      !t.ownerUid ||
      t.ownerUid === user?.uid ||
      (t.colaboradores || []).some(c => c.uid === user?.uid)
    )
    setTorneos(list)
    setSelected(prev => prev ? (list.find(t => t.id === prev.id) ?? null) : null)
    setLoading(false)
  }

  async function handleDelete(id) {
    setDeleting(true)
    await deleteTorneo(id)
    setDeleting(false)
    setConfirmDelete(null)
    setSelected(null)
    load()
  }

  async function handleGenerateFixture(torneoId) {
    setGeneratingFixture(true)
    await generateFixture(torneoId)
    setGeneratingFixture(false)
    setFixtureConfirm(null)
    load()
  }

  async function handleGenerateLlave(torneoId) {
    setGeneratingLlave(true)
    try {
      await generateBracket(torneoId)
    } catch (err) {
      alert(err.message || 'Error al generar la llave.')
    }
    setGeneratingLlave(false)
    setLlaveConfirm(null)
    load()
  }

  function handleCreated(id, data) {
    setShowNew(false)
    setDuplasModal({ id, nombre: data.nombre, estado: data.estado, tipoTorneo: data.tipoTorneo, categoriaValor: data.categoriaValor, sexo: data.sexo, costoPorJugador: data.costoPorJugador })
    load()
  }

  if (loading) return <Spinner />

  const enCurso = torneos.filter(t => t.estado === 'En curso').length
  const inscripcion = torneos.filter(t => t.estado === 'Inscripción').length

  return (
    <div>
      {selected ? (
        /* ── DETAIL VIEW ── */
        (() => {
          const t = selected
          const col = getTorneoColor(t)
          const st = STATUS_STYLE[t.estado] || STATUS_STYLE['Inscripción']
          const sexoLabel = { masculino: '♂ Masculino', femenino: '♀ Femenino', mixto: '⊕ Mixto' }[t.sexo] || t.sexo
          return (
            <div>
              <button
                onClick={() => setSelected(null)}
                className="ta-back-btn"
                onMouseEnter={e => e.currentTarget.style.color = '#f1f1f5'}
                onMouseLeave={e => e.currentTarget.style.color = '#9999b0'}
              >
                ← Torneos
              </button>

              <div className="ta-detail-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div className="ta-detail-accent" style={{ background: col }} />
                    <h2 className="ta-detail-title">{t.nombre}</h2>
                  </div>
                  <div className="ta-detail-actions">
                    <span
                      className="ta-status-badge"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                    >
                      {t.estado}
                    </span>
                    <button
                      onClick={() => setEditModal(t)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 12, padding: '6px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.color = '#9999b0' }}
                    >✎ Editar</button>
                  </div>
                </div>
                <div className="ta-detail-meta">
                  <span style={{ padding: '3px 10px', borderRadius: 20, background: `${col}18`, border: `1px solid ${col}40`, color: col, fontSize: 12, fontWeight: 600 }}>{t.categoriaName}</span>
                  <span className="ta-meta-text">{sexoLabel}</span>
                  {t.modalidadTorneo === 'americano' && <span className="ta-americano-badge">Americano</span>}
                  {t.fechaInicio && <span className="ta-meta-text">📅 {t.fechaInicio}{t.fechaFin ? ` → ${t.fechaFin}` : ''}</span>}
                  {t.costoPorJugador > 0 && <span className="ta-meta-text">💰 ${Number(t.costoPorJugador).toLocaleString()} / jugador</span>}
                </div>
              </div>

              <div className="ta-stats-grid">
                {[
                  { label: 'Zonas', value: t.zonas ?? '—' },
                  { label: 'Parejas / zona', value: t.tamanoZona || 4 },
                  { label: 'Clasifican', value: t.clasificadosPorZona || 1 },
                  { label: 'Costo / jugador', value: t.costoPorJugador ? `$${Number(t.costoPorJugador).toLocaleString()}` : '—' },
                ].map(s => (
                  <div key={s.label} className="ta-stat-card">
                    <div className="ta-stat-value">{s.value}</div>
                    <div className="ta-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="ta-section-heading">Acciones</div>
              <div className="ta-actions-grid">
                <button
                  onClick={() => setDuplasModal({ id: t.id, nombre: t.nombre, estado: t.estado, tipoTorneo: t.tipoTorneo, categoriaValor: t.categoriaValor, sexo: t.sexo, costoPorJugador: t.costoPorJugador })}
                  className="ta-action-card"
                  style={{ border: '1px solid rgba(249,115,22,0.3)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.08)'; e.currentTarget.style.borderColor = '#f97316' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#13131a'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)' }}
                >
                  <div className="ta-action-card-icon">👥</div>
                  <div className="ta-action-card-title" style={{ color: '#f97316' }}>Agregar duplas</div>
                  <div className="ta-action-card-desc">Inscribir parejas al torneo</div>
                </button>
                <button
                  onClick={() => setFixtureConfirm(t)}
                  className="ta-action-card"
                  style={{ border: '1px solid rgba(139,92,246,0.3)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.borderColor = '#8b5cf6' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#13131a'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)' }}
                >
                  <div className="ta-action-card-icon">⚡</div>
                  <div className="ta-action-card-title" style={{ color: '#8b5cf6' }}>Generar fixture</div>
                  <div className="ta-action-card-desc">Crear zonas y cruces automáticamente</div>
                </button>
                {t.estado === 'Llave' && (
                  <button
                    onClick={() => setLlaveConfirm(t)}
                    className="ta-action-card"
                    style={{ border: '1px solid rgba(16,185,129,0.3)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.borderColor = '#10b981' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#13131a'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)' }}
                  >
                    <div className="ta-action-card-icon">🏅</div>
                    <div className="ta-action-card-title" style={{ color: '#10b981' }}>Regenerar llave</div>
                    <div className="ta-action-card-desc">Reconstruir bracket de eliminación</div>
                  </button>
                )}
              </div>

              <ColaboradoresSection
                torneo={t}
                currentUserUid={user?.uid}
                isOwner={!t.ownerUid || t.ownerUid === user?.uid}
                onUpdate={load}
              />

              <div className="ta-danger-zone">
                <div className="ta-section-heading">Zona de peligro</div>
                <button
                  onClick={() => setConfirmDelete(t)}
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '11px 20px', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
                >
                  🗑 Eliminar torneo
                </button>
              </div>
            </div>
          )
        })()
      ) : (
        /* ── LIST VIEW ── */
        <div>
          <div className="ta-list-header">
            <div>
              <h2 className="ta-list-title">Torneos</h2>
              <p className="ta-list-desc">
                {torneos.length} torneo{torneos.length !== 1 ? 's' : ''} · {enCurso} en curso · {inscripcion} en inscripción
              </p>
            </div>
            <button onClick={() => setShowNew(true)} className="ta-new-btn">+ Nuevo Torneo</button>
          </div>

          <div className="ta-summary-stats">
            {[
              { label: 'Total', value: torneos.length },
              { label: 'En curso', value: enCurso },
              { label: 'Inscripción', value: inscripcion },
            ].map(s => (
              <div key={s.label} className="ta-summary-card">
                <div className="ta-summary-value">{s.value}</div>
                <div className="ta-summary-label">{s.label}</div>
              </div>
            ))}
          </div>

          {torneos.length === 0 ? (
            <div className="ta-empty">
              <div className="ta-empty-icon">🏆</div>
              <p className="ta-empty-text">Creá el primer torneo con "+ Nuevo Torneo"</p>
            </div>
          ) : (
            <div className="ta-cards-grid">
              {torneos.map(t => {
                const col = getTorneoColor(t)
                const st = STATUS_STYLE[t.estado] || STATUS_STYLE['Inscripción']
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="ta-card"
                    onMouseEnter={e => { e.currentTarget.style.borderColor = col; e.currentTarget.style.background = '#161620' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.background = '#13131a' }}
                  >
                    <div className="ta-card-accent" style={{ background: col }} />
                    <div className="ta-card-body">
                      <div className="ta-card-head">
                        <h3 className="ta-card-title">{t.nombre}</h3>
                        <span
                          style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          {t.estado}
                        </span>
                      </div>
                      <div className="ta-card-meta">
                        <span style={{ padding: '2px 7px', borderRadius: 20, background: `${col}18`, border: `1px solid ${col}40`, color: col, fontSize: 10, fontWeight: 600 }}>{t.categoriaName}</span>
                        {t.fechaInicio && <span style={{ color: '#6666a0', fontSize: 10 }}>📅 {t.fechaInicio}</span>}
                      </div>
                      <div className="ta-card-footer">
                        <span className="ta-card-footer-text">Ver detalle →</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      {showNew && <NewTorneoModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
      {editModal && <EditTorneoModal torneo={editModal} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); load() }} />}
      {duplasModal && (
        <AddDuplasModal
          torneoId={duplasModal.id}
          torneoNombre={duplasModal.nombre}
          torneoEstado={duplasModal.estado}
          torneoTipoTorneo={duplasModal.tipoTorneo}
          torneoCategoriaValor={duplasModal.categoriaValor}
          torneoSexo={duplasModal.sexo}
          torneoCosto={duplasModal.costoPorJugador}
          onClose={() => setDuplasModal(null)}
          onFixtureGenerated={load}
        />
      )}
      {fixtureConfirm && (
        <div className="ta-modal-overlay" style={{ zIndex: 1200 }}>
          <div className="ta-confirm-modal">
            <div className="ta-confirm-icon">⚡</div>
            <h3 className="ta-confirm-title">¿Generar fixture?</h3>
            <p className="ta-confirm-name"><strong style={{ color: '#f1f1f5' }}>{fixtureConfirm.nombre}</strong></p>
            <div className="ta-confirm-badges">
              <span className="ta-confirm-badge-orange">{fixtureConfirm.tamanoZona || 4} parejas / zona</span>
              <span className="ta-confirm-badge-purple">{fixtureConfirm.clasificadosPorZona || 1} clasifican</span>
            </div>
            <p className="ta-confirm-desc">Se generarán las zonas y cruces automáticamente. Si ya existía un fixture, será reemplazado.</p>
            <div className="ta-confirm-actions">
              <button onClick={() => setFixtureConfirm(null)} disabled={generatingFixture} className="ta-btn-secondary">Cancelar</button>
              <button onClick={() => handleGenerateFixture(fixtureConfirm.id)} disabled={generatingFixture} className="ta-btn-purple" style={{ cursor: generatingFixture ? 'wait' : 'pointer', opacity: generatingFixture ? 0.7 : 1 }}>
                {generatingFixture ? 'Generando...' : '⚡ Generar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {llaveConfirm && (
        <div className="ta-modal-overlay" style={{ zIndex: 1200 }}>
          <div className="ta-confirm-modal">
            <div className="ta-confirm-icon">🏅</div>
            <h3 className="ta-confirm-title">¿Generar llave?</h3>
            <p className="ta-confirm-name"><strong style={{ color: '#f1f1f5' }}>{llaveConfirm.nombre}</strong></p>
            <div className="ta-confirm-badges">
              <span className="ta-confirm-badge-green">{(llaveConfirm.zonas || 1)} zona{(llaveConfirm.zonas || 1) !== 1 ? 's' : ''}</span>
              <span className="ta-confirm-badge-purple">{llaveConfirm.clasificadosPorZona || 1} clasifican / zona</span>
            </div>
            <p className="ta-confirm-desc">Se arma el bracket con los clasificados de la fase de grupos. Si ya existía una llave, será reemplazada.</p>
            <div className="ta-confirm-actions">
              <button onClick={() => setLlaveConfirm(null)} disabled={generatingLlave} className="ta-btn-secondary">Cancelar</button>
              <button onClick={() => handleGenerateLlave(llaveConfirm.id)} disabled={generatingLlave} className="ta-btn-green" style={{ cursor: generatingLlave ? 'wait' : 'pointer', opacity: generatingLlave ? 0.7 : 1 }}>
                {generatingLlave ? 'Generando...' : '🏅 Generar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="ta-modal-overlay" style={{ zIndex: 1200 }}>
          <div className="ta-confirm-modal">
            <div className="ta-confirm-icon">⚠️</div>
            <h3 className="ta-confirm-title">¿Eliminar torneo?</h3>
            <p className="ta-confirm-name"><strong style={{ color: '#f1f1f5' }}>{confirmDelete.nombre}</strong></p>
            <p className="ta-confirm-error">Se eliminarán también todas las duplas, zonas y partidos. Esta acción no se puede deshacer.</p>
            <div className="ta-confirm-actions">
              <button onClick={() => setConfirmDelete(null)} className="ta-btn-secondary">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete.id)} disabled={deleting} className="ta-btn-danger" style={{ cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
