import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'padel_nota_cancha'

const DEFAULT_TEMPLATE = `NOTA DE SOLICITUD DE CANCHA
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fecha: [FECHA]

Por medio de la presente, la organización de VillaPadel solicita formalmente la reserva de instalaciones para la realización de actividades deportivas en el marco del torneo oficial.

DATOS DEL EVENTO
─────────────────
Torneo:       [NOMBRE DEL TORNEO]
Categoría:    [CATEGORÍA]
Fecha inicio: [FECHA DE INICIO]
Horario:      [HORARIO DE 09:00 A 18:00 HS]
Cantidad de canchas requeridas: [Nº CANCHAS]

DESCRIPCIÓN
────────────
[Completar con detalle del evento, número de participantes, requerimientos especiales, etc.]

ORGANIZADOR
────────────
Nombre:    [NOMBRE COMPLETO]
Contacto:  [TELÉFONO / EMAIL]
DNI/CUIL:  [DOCUMENTO]

OBSERVACIONES
──────────────
[Cualquier aclaración adicional sobre la solicitud.]

────────────────────────────
Firma del solicitante

_______________________________
VillaPadel — Organización de Torneos
`

export default function DocumentosAdmin() {
  const [nota, setNota] = useState('')
  const [saved, setSaved] = useState(false)
  const [printing, setPrinting] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setNota(stored !== null ? stored : DEFAULT_TEMPLATE)
  }, [])

  function handleChange(val) {
    setNota(val)
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, val)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }, 600)
  }

  function handleReset() {
    if (!window.confirm('¿Restaurar la plantilla por defecto? Se perderá el texto actual.')) return
    setNota(DEFAULT_TEMPLATE)
    localStorage.setItem(STORAGE_KEY, DEFAULT_TEMPLATE)
  }

  function handleDownloadTxt() {
    const blob = new Blob([nota], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nota-solicitud-cancha.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 100)
  }

  const charCount = nota.length

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #doc-print-area, #doc-print-area * { visibility: visible !important; }
          #doc-print-area {
            position: fixed !important;
            inset: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Courier New', monospace !important;
            font-size: 13px !important;
            white-space: pre-wrap !important;
            padding: 32px 40px !important;
            line-height: 1.6 !important;
          }
        }
      `}</style>

      {/* Print-only area */}
      <div id="doc-print-area" style={{ display: 'none' }}>{nota}</div>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#f1f1f5', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Gestión Documental</h2>
        <p style={{ color: '#9999b0', fontSize: 13, margin: 0 }}>Editor de nota de solicitud de cancha — guardado automático en el navegador</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={handleDownloadTxt}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
        >
          <span>⬇</span> Descargar .txt
        </button>
        <button
          onClick={handlePrint}
          disabled={printing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', opacity: printing ? 0.7 : 1 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
        >
          <span>🖨</span> {printing ? 'Abriendo...' : 'Imprimir / PDF'}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && (
            <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>✓</span> Guardado
            </span>
          )}
          <button
            onClick={handleReset}
            style={{ padding: '6px 13px', borderRadius: 8, border: '1px solid #2a2a38', background: 'transparent', color: '#6666a0', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.color = '#6666a0' }}
          >
            Restaurar plantilla
          </button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={nota}
          onChange={e => handleChange(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 560,
            background: '#0f0f13',
            border: '1px solid #2a2a38',
            borderRadius: 10,
            padding: '20px 22px',
            color: '#e2e2f0',
            fontSize: 13,
            fontFamily: "'Courier New', 'Consolas', monospace",
            lineHeight: 1.7,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
            whiteSpace: 'pre',
            overflowX: 'auto',
          }}
          onFocus={e => e.target.style.borderColor = '#f97316'}
          onBlur={e => e.target.style.borderColor = '#2a2a38'}
        />
        <div style={{ position: 'absolute', bottom: 10, right: 14, color: '#44445a', fontSize: 11 }}>
          {charCount} caracteres
        </div>
      </div>

      {/* Tips */}
      <div style={{ marginTop: 14, padding: '12px 16px', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
          <span style={{ color: '#9999b0', fontSize: 12 }}>El texto se guarda automáticamente en el navegador</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
          <span style={{ color: '#9999b0', fontSize: 12 }}>Descargar .txt genera un archivo de texto plano</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <span style={{ color: '#9999b0', fontSize: 12 }}>Imprimir / PDF abre el diálogo de impresión del navegador</span>
        </div>
      </div>
    </div>
  )
}
