import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createTorneo, updateTorneo, deleteTorneo, addDupla, generateFixture, generateBracket } from '../../firebase/torneoService'
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

const inputStyle = {
  background: '#16161e', border: '1px solid #2a2a38', borderRadius: 8,
  padding: '10px 14px', color: '#f1f1f5', fontSize: 14, width: '100%',
  outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
}
const labelStyle = {
  color: '#9999b0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.4px', marginBottom: 6, display: 'block',
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
        <div style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width,
          zIndex: 9999, background: '#1a1a22', border: '1px solid #3a3a50', borderRadius: 6,
          maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', color: '#9999b0', fontSize: 12 }}>Sin resultados</div>
          ) : filtered.map(j => (
            <div
              key={j.id}
              onMouseDown={() => handleSelect(j)}
              style={{
                padding: '7px 12px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: j.id === selectedId ? 'rgba(249,115,22,0.08)' : 'transparent',
                borderBottom: '1px solid #1c1c28',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.background = j.id === selectedId ? 'rgba(249,115,22,0.08)' : 'transparent' }}
            >
              <span style={{ color: '#f1f1f5', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6 }}>{j.name}</span>
              <span style={{ color: j.categoryColor || '#9999b0', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{j.displayCategory || j.categoryName}</span>
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

  const rowInput = {
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

    // Exclude players already in this torneo's duplas + any slot in the current form
    const usedNames = new Set([
      ...existingPlayerNames,
      ...duplas.flatMap(d => [d.jugador1, d.jugador2]).filter(n => n.trim()),
    ])
    if (currentName.trim()) usedNames.delete(currentName)
    const availablePlayers = eligibleJugadores.filter(j => !usedNames.has(j.name))

    return (
      <div key={num} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 96px 116px 76px', gap: 6, marginBottom: num === 1 ? 5 : 0, alignItems: 'center' }}>
        <span style={{ color: labelColor, fontSize: 11, fontWeight: 700, alignSelf: 'center' }}>J{num}</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
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
            style={{ ...rowInput, width: '100%' }}
            mode={isSuma ? 'select' : 'freeform'}
          />
          {isSuma && num === 2 && bothSelected && (
            <span style={{
              fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
              color: sumaOk ? '#22c55e' : '#ef4444',
              background: sumaOk ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
              padding: '2px 6px', borderRadius: 4,
            }}>
              Σ{duplaSum}/{sumaMinima}
            </span>
          )}
        </div>
        <select value={pago.estado} onChange={e => updatePago(i, num, 'estado', e.target.value)} style={{ ...rowInput, cursor: 'pointer' }}>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
        </select>
        <select value={pago.metodo} onChange={e => updatePago(i, num, 'metodo', e.target.value)} style={{ ...rowInput, cursor: 'pointer' }} disabled={pago.estado !== 'pagado'}>
          <option value="">— Método</option>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <input type="number" placeholder="$0" value={pago.monto} onChange={e => updatePago(i, num, 'monto', e.target.value)} style={rowInput} disabled={pago.estado !== 'pagado'} />
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div style={{ background: '#1a1a22', borderRadius: 14, border: '1px solid #2a2a38', width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a38', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#f1f1f5', fontSize: 18, fontWeight: 700, margin: 0 }}>
              {isEnCurso ? 'Agregar Duplas' : 'Cargar Duplas'}
            </h2>
            <p style={{ color: '#9999b0', fontSize: 13, margin: '3px 0 0' }}>
              {torneoNombre}
              {isSuma && <span style={{ color: '#8b5cf6', fontWeight: 600, marginLeft: 8 }}>· Suma mínima: {sumaMinima}</span>}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>

        {step === 'done' ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ color: '#22c55e', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>¡Duplas guardadas!</h3>
            <p style={{ color: '#9999b0', margin: '0 0 24px', fontSize: 14 }}>
              Las duplas fueron guardadas. Podés generar el fixture desde el panel del torneo.
            </p>
            <button onClick={onClose} style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Ver Torneos →
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: '10px 24px 4px', background: '#13131a', borderBottom: '1px solid #2a2a38' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 96px 116px 76px 32px', gap: 6 }}>
                {['', 'Jugador', 'Estado', 'Método', 'Monto', ''].map((h, idx) => (
                  <div key={idx} style={{ color: '#6666a0', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', paddingBottom: 6 }}>{h}</div>
                ))}
              </div>
            </div>

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
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
                {duplas.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'stretch' }}>
                    <div style={{ flex: 1, background: '#13131a', borderRadius: 8, border: '1px solid #2a2a38', padding: '10px 12px' }}>
                      {pagoRow(i, 1)}
                      {pagoRow(i, 2)}
                    </div>
                    <button
                      onClick={() => setDuplas(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 6, cursor: 'pointer', fontSize: 16, width: 32, alignSelf: 'stretch' }}
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setDuplas(prev => [...prev, defaultDupla(costo)])}
                  style={{ background: 'transparent', border: '1px dashed #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '8px 16px', cursor: 'pointer', width: '100%' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.color = '#9999b0' }}
                >+ Agregar dupla</button>
                {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>}
              </div>
            )}

            <div style={{ padding: '16px 24px', borderTop: '1px solid #2a2a38', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#9999b0', fontSize: 13 }}>
                {duplas.filter(d => d.jugador1.trim() && d.jugador2.trim()).length} duplas válidas
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '8px 18px', cursor: 'pointer' }}>Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={saving || (isSuma && jugadores.length === 0)}
                  style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: (saving || (isSuma && jugadores.length === 0)) ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
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
  const [form, setForm] = useState({
    nombre: '', tipoTorneo: 'categoria', categoriaId: 'cat-8va',
    sumaValor: '', fechaInicio: '', costoPorJugador: '', sexo: 'masculino',
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
      tipoTorneo: form.tipoTorneo,
      color,
      sexo: form.sexo,
      tamanoZona: form.tamanoZona,
      clasificadosPorZona: form.clasificadosPorZona,
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

  const toggleStyle = (active) => ({
    flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: active ? '#f97316' : 'transparent',
    color: active ? '#fff' : '#9999b0',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div style={{ background: '#1a1a22', borderRadius: 14, border: '1px solid #2a2a38', width: '100%', maxWidth: 520 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a38', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#f1f1f5', fontSize: 18, fontWeight: 700, margin: 0 }}>Nuevo Torneo</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Nombre del torneo</label>
            <input
              placeholder="ej. Copa Villa Padel — Masculino 3ra"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#f97316'}
              onBlur={e => e.target.style.borderColor = '#2a2a38'}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Tipo de torneo</label>
            <div style={{ display: 'flex', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, padding: 4, gap: 4 }}>
              <button type="button" style={toggleStyle(form.tipoTorneo === 'categoria')} onClick={() => setForm(p => ({ ...p, tipoTorneo: 'categoria' }))}>
                Por categoría
              </button>
              <button type="button" style={toggleStyle(form.tipoTorneo === 'suma')} onClick={() => setForm(p => ({ ...p, tipoTorneo: 'suma' }))}>
                Por suma
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Modalidad</label>
            <div style={{ display: 'flex', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, padding: 4, gap: 4 }}>
              {[{ v: 'masculino', label: 'Masculino' }, { v: 'femenino', label: 'Femenino' }, { v: 'mixto', label: 'Mixto' }].map(({ v, label }) => (
                <button key={v} type="button" style={toggleStyle(form.sexo === v)} onClick={() => setForm(p => ({ ...p, sexo: v }))}>{label}</button>
              ))}
            </div>
          </div>

          {form.tipoTorneo === 'categoria' ? (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Categoría</label>
              <select
                value={form.categoriaId}
                onChange={e => setForm(p => ({ ...p, categoriaId: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {CAT_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Valor de suma</label>
              <input
                type="number"
                placeholder="ej. 15, 14, 13..."
                value={form.sumaValor}
                onChange={e => setForm(p => ({ ...p, sumaValor: e.target.value }))}
                style={inputStyle}
                min="1"
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#2a2a38'}
              />
              <p style={{ color: '#9999b0', fontSize: 11, margin: '4px 0 0' }}>
                La suma de los niveles de ambos jugadores de la dupla.
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Fecha de inicio</label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#2a2a38'}
              />
            </div>
            <div>
              <label style={labelStyle}>Costo por jugador ($)</label>
              <input
                type="number"
                placeholder="ej. 18000"
                value={form.costoPorJugador}
                onChange={e => setForm(p => ({ ...p, costoPorJugador: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#2a2a38'}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Parejas por zona</label>
              <div style={{ display: 'flex', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, padding: 4, gap: 4 }}>
                {[3, 4].map(n => (
                  <button key={n} type="button" style={toggleStyle(form.tamanoZona === n)} onClick={() => setForm(p => ({ ...p, tamanoZona: n }))}>{n} parejas</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Clasifican por zona</label>
              <div style={{ display: 'flex', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, padding: 4, gap: 4 }}>
                {[1, 2].map(n => (
                  <button key={n} type="button" style={toggleStyle(form.clasificadosPorZona === n)} onClick={() => setForm(p => ({ ...p, clasificadosPorZona: n }))}>{n === 1 ? '1 pareja' : '2 parejas'}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: `${previewColor}10`, border: `1px solid ${previewColor}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: previewColor, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: previewColor, fontSize: 13, fontWeight: 600 }}>{previewName}</span>
            {form.fechaInicio && (
              <span style={{ color: '#9999b0', fontSize: 12, marginLeft: 'auto' }}>
                {form.fechaInicio > new Date().toISOString().split('T')[0] ? '📋 Inscripción' : '▶️ En curso'}
              </span>
            )}
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '9px 18px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creando...' : 'Crear torneo →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditTorneoModal({ torneo, onClose, onSaved }) {
  const isSuma = torneo.tipoTorneo === 'suma'
  const [form, setForm] = useState({
    nombre: torneo.nombre,
    tipoTorneo: isSuma ? 'suma' : 'categoria',
    categoriaId: isSuma ? 'cat-8va' : (torneo.categoriaId || 'cat-8va'),
    sumaValor: isSuma ? String(torneo.categoriaValor || '') : '',
    fechaInicio: torneo.fechaInicio || '',
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
      fechaInicio: form.fechaInicio, tipoTorneo: form.tipoTorneo, color,
      sexo: form.sexo,
      tamanoZona: form.tamanoZona,
      clasificadosPorZona: form.clasificadosPorZona,
    })
    setSaving(false)
    onSaved()
  }

  const previewColor = form.tipoTorneo === 'suma' ? '#8b5cf6' : (CAT_OPTIONS.find(c => c.id === form.categoriaId)?.color || '#f97316')
  const previewName = form.tipoTorneo === 'suma' ? (form.sumaValor ? `Suma ${form.sumaValor}` : 'Suma —') : (CAT_OPTIONS.find(c => c.id === form.categoriaId)?.name || '—')
  const toggleStyle = (active) => ({
    flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: active ? '#f97316' : 'transparent', color: active ? '#fff' : '#9999b0', transition: 'all 0.15s',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div style={{ background: '#1a1a22', borderRadius: 14, border: '1px solid #2a2a38', width: '100%', maxWidth: 520 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a38', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#f1f1f5', fontSize: 18, fontWeight: 700, margin: 0 }}>Editar Torneo</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9999b0', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Nombre del torneo</label>
            <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = '#2a2a38'} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Tipo de torneo</label>
            <div style={{ display: 'flex', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, padding: 4, gap: 4 }}>
              <button type="button" style={toggleStyle(form.tipoTorneo === 'categoria')} onClick={() => setForm(p => ({ ...p, tipoTorneo: 'categoria' }))}>Por categoría</button>
              <button type="button" style={toggleStyle(form.tipoTorneo === 'suma')} onClick={() => setForm(p => ({ ...p, tipoTorneo: 'suma' }))}>Por suma</button>
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Modalidad</label>
            <div style={{ display: 'flex', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, padding: 4, gap: 4 }}>
              {[{ v: 'masculino', label: 'Masculino' }, { v: 'femenino', label: 'Femenino' }, { v: 'mixto', label: 'Mixto' }].map(({ v, label }) => (
                <button key={v} type="button" style={toggleStyle(form.sexo === v)} onClick={() => setForm(p => ({ ...p, sexo: v }))}>{label}</button>
              ))}
            </div>
          </div>
          {form.tipoTorneo === 'categoria' ? (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Categoría</label>
              <select value={form.categoriaId} onChange={e => setForm(p => ({ ...p, categoriaId: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CAT_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Valor de suma</label>
              <input type="number" placeholder="ej. 15, 14, 13..." value={form.sumaValor} onChange={e => setForm(p => ({ ...p, sumaValor: e.target.value }))} style={inputStyle} min="1"
                onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = '#2a2a38'} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Fecha de inicio</label>
              <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = '#2a2a38'} />
            </div>
            <div>
              <label style={labelStyle}>Costo por jugador ($)</label>
              <input type="number" placeholder="ej. 18000" value={form.costoPorJugador} onChange={e => setForm(p => ({ ...p, costoPorJugador: e.target.value }))} style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#f97316'} onBlur={e => e.target.style.borderColor = '#2a2a38'} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Parejas por zona</label>
              <div style={{ display: 'flex', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, padding: 4, gap: 4 }}>
                {[3, 4].map(n => (
                  <button key={n} type="button" style={toggleStyle(form.tamanoZona === n)} onClick={() => setForm(p => ({ ...p, tamanoZona: n }))}>{n} parejas</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Clasifican por zona</label>
              <div style={{ display: 'flex', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, padding: 4, gap: 4 }}>
                {[1, 2].map(n => (
                  <button key={n} type="button" style={toggleStyle(form.clasificadosPorZona === n)} onClick={() => setForm(p => ({ ...p, clasificadosPorZona: n }))}>{n === 1 ? '1 pareja' : '2 parejas'}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ background: `${previewColor}10`, border: `1px solid ${previewColor}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: previewColor, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: previewColor, fontSize: 13, fontWeight: 600 }}>{previewName}</span>
            {form.fechaInicio && (
              <span style={{ color: '#9999b0', fontSize: 12, marginLeft: 'auto' }}>
                {form.fechaInicio > new Date().toISOString().split('T')[0] ? '📋 Inscripción' : '▶️ En curso'}
              </span>
            )}
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '9px 18px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TorneosAdmin() {
  const [torneos, setTorneos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [duplasModal, setDuplasModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [fixtureConfirm, setFixtureConfirm] = useState(null)
  const [generatingFixture, setGeneratingFixture] = useState(false)
  const [llaveConfirm, setLlaveConfirm] = useState(null)
  const [generatingLlave, setGeneratingLlave] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'torneos'), orderBy('createdAt', 'desc')))
    setTorneos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  async function handleDelete(id) {
    setDeleting(true)
    await deleteTorneo(id)
    setDeleting(false)
    setConfirmDelete(null)
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#f1f1f5', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Torneos</h2>
          <p style={{ color: '#9999b0', fontSize: 13, margin: 0 }}>
            {torneos.length} torneo{torneos.length !== 1 ? 's' : ''} · {enCurso} en curso · {inscripcion} en inscripción
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 16px rgba(249,115,22,0.3)' }}
        >
          + Nuevo Torneo
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: torneos.length, color: '#f97316' },
          { label: 'En curso', value: enCurso, color: '#22c55e' },
          { label: 'Inscripción', value: inscripcion, color: '#f97316' },
        ].map(s => (
          <div key={s.label} style={{ background: '#13131a', border: '1px solid #2a2a38', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: '#f1f1f5', fontSize: 28, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: '#9999b0', fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {torneos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#13131a', borderRadius: 12, border: '1px dashed #2a2a38', color: '#9999b0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏆</div>
          <p style={{ margin: 0, fontSize: 14 }}>Creá el primer torneo con "+ Nuevo Torneo"</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {torneos.map(t => {
            const col = getTorneoColor(t)
            const st = STATUS_STYLE[t.estado] || STATUS_STYLE['Inscripción']
            return (
              <div key={t.id} style={{ background: '#13131a', borderRadius: 12, border: '1px solid #2a2a38', overflow: 'hidden' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = col}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a38'}>
                <div style={{ height: 3, background: col }} />
                <div style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ color: '#f1f1f5', fontSize: 14, fontWeight: 700, margin: 0, flex: 1, paddingRight: 10, lineHeight: 1.4 }}>{t.nombre}</h3>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>{t.estado}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: `${col}18`, border: `1px solid ${col}40`, color: col, fontSize: 11, fontWeight: 600 }}>{t.categoriaName}</span>
                    {t.fechaInicio && <span style={{ color: '#9999b0', fontSize: 12, display: 'flex', alignItems: 'center' }}>📅 {t.fechaInicio}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid #2a2a38', marginBottom: 14 }}>
                    <div><div style={{ color: '#f1f1f5', fontSize: 16, fontWeight: 800 }}>{t.zonas ?? '—'}</div><div style={{ color: '#9999b0', fontSize: 11 }}>Zonas</div></div>
                    <div><div style={{ color: '#f1f1f5', fontSize: 16, fontWeight: 800 }}>{t.tamanoZona || 4}</div><div style={{ color: '#9999b0', fontSize: 11 }}>por zona</div></div>
                    <div><div style={{ color: '#f1f1f5', fontSize: 16, fontWeight: 800 }}>{t.clasificadosPorZona || 1}</div><div style={{ color: '#9999b0', fontSize: 11 }}>clasifican</div></div>
                    <div><div style={{ color: '#f1f1f5', fontSize: 16, fontWeight: 800 }}>{t.costoPorJugador ? `$${Number(t.costoPorJugador).toLocaleString()}` : '—'}</div><div style={{ color: '#9999b0', fontSize: 11 }}>$/jugador</div></div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button
                      onClick={() => setEditModal(t)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 12, fontWeight: 500, padding: '7px 0', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.color = '#9999b0' }}
                    >✎ Editar</button>
                    <button
                      onClick={() => setConfirmDelete(t)}
                      style={{ width: 36, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                    >🗑</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setDuplasModal({ id: t.id, nombre: t.nombre, estado: t.estado, tipoTorneo: t.tipoTorneo, categoriaValor: t.categoriaValor, sexo: t.sexo, costoPorJugador: t.costoPorJugador })}
                      style={{ flex: 1, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, color: '#f97316', fontSize: 12, fontWeight: 600, padding: '8px 0', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f97316'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; e.currentTarget.style.color = '#f97316' }}
                    >
                      👥 Agregar duplas
                    </button>
                    <button
                      onClick={() => setFixtureConfirm(t)}
                      style={{ flex: 1, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#8b5cf6', fontSize: 12, fontWeight: 600, padding: '8px 0', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#8b5cf6'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.color = '#8b5cf6' }}
                    >
                      ⚡ Generar fixture
                    </button>
                  </div>
                  {t.estado === 'Llave' && (
                    <div style={{ marginTop: 6 }}>
                      <button
                        onClick={() => setLlaveConfirm(t)}
                        style={{ width: '100%', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: 12, fontWeight: 600, padding: '8px 0', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.color = '#10b981' }}
                      >
                        🏅 Regenerar llave
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20 }}>
          <div style={{ background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 14, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
            <h3 style={{ color: '#f1f1f5', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>¿Generar fixture?</h3>
            <p style={{ color: '#9999b0', fontSize: 14, margin: '0 0 6px' }}>
              <strong style={{ color: '#f1f1f5' }}>{fixtureConfirm.nombre}</strong>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
              <span style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316', borderRadius: 6, fontSize: 12, fontWeight: 600, padding: '3px 10px' }}>
                {fixtureConfirm.tamanoZona || 4} parejas / zona
              </span>
              <span style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8b5cf6', borderRadius: 6, fontSize: 12, fontWeight: 600, padding: '3px 10px' }}>
                {fixtureConfirm.clasificadosPorZona || 1} clasifican
              </span>
            </div>
            <p style={{ color: '#9999b0', fontSize: 13, margin: '0 0 24px' }}>
              Se generarán las zonas y cruces automáticamente. Si ya existía un fixture, será reemplazado.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setFixtureConfirm(null)} disabled={generatingFixture} style={{ background: 'transparent', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '9px 20px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleGenerateFixture(fixtureConfirm.id)} disabled={generatingFixture} style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: generatingFixture ? 'wait' : 'pointer', opacity: generatingFixture ? 0.7 : 1 }}>
                {generatingFixture ? 'Generando...' : '⚡ Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {llaveConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20 }}>
          <div style={{ background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 14, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏅</div>
            <h3 style={{ color: '#f1f1f5', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>¿Generar llave?</h3>
            <p style={{ color: '#9999b0', fontSize: 14, margin: '0 0 6px' }}>
              <strong style={{ color: '#f1f1f5' }}>{llaveConfirm.nombre}</strong>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', borderRadius: 6, fontSize: 12, fontWeight: 600, padding: '3px 10px' }}>
                {(llaveConfirm.zonas || 1)} zona{(llaveConfirm.zonas || 1) !== 1 ? 's' : ''}
              </span>
              <span style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8b5cf6', borderRadius: 6, fontSize: 12, fontWeight: 600, padding: '3px 10px' }}>
                {llaveConfirm.clasificadosPorZona || 1} clasifican / zona
              </span>
            </div>
            <p style={{ color: '#9999b0', fontSize: 13, margin: '0 0 24px' }}>
              Se arma el bracket con los clasificados de la fase de grupos. Si ya existía una llave, será reemplazada.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setLlaveConfirm(null)} disabled={generatingLlave} style={{ background: 'transparent', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '9px 20px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleGenerateLlave(llaveConfirm.id)} disabled={generatingLlave} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: generatingLlave ? 'wait' : 'pointer', opacity: generatingLlave ? 0.7 : 1 }}>
                {generatingLlave ? 'Generando...' : '🏅 Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20 }}>
          <div style={{ background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 14, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: '#f1f1f5', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>¿Eliminar torneo?</h3>
            <p style={{ color: '#9999b0', fontSize: 14, margin: '0 0 6px' }}>
              <strong style={{ color: '#f1f1f5' }}>{confirmDelete.nombre}</strong>
            </p>
            <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 24px' }}>
              Se eliminarán también todas las duplas, zonas y partidos. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ background: 'transparent', border: '1px solid #2a2a38', borderRadius: 8, color: '#9999b0', fontSize: 13, padding: '9px 20px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete.id)} disabled={deleting} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
