import { useState, useEffect, useRef } from 'react'

const DOCS = [
  {
    id: 'nota_cancha',
    label: 'Nota solicitud de cancha',
    storageKey: 'padel_nota_cancha',
    template: `NOTA DE SOLICITUD DE CANCHA
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
`,
  },
  {
    id: 'nota_municipio',
    label: 'Nota al municipio',
    storageKey: 'padel_nota_municipio',
    template: `Mayor Villafañe, [DÍA] de [MES] de [AÑO].

SR. INTENDENTE DE LA MUNICIPALIDAD
DE MAYOR EDMUNDO VILLAFAÑE
DON VICTOR OSORIO.
SU DESPACHO________________________/

          Tengo el agrado de dirigirme a Ud., y por su intermedio a quien corresponda, con el fin de solicitarle tenga el bien de concederme las canchas de [TIPO DE CANCHA], ubicadas en el [UBICACIÓN DE LAS CANCHAS].

          Dicha solicitud es para realizar [DESCRIPCIÓN DEL EVENTO], el día [DÍA DE SEMANA] [DÍA] del corriente mes y año, desde las [HORA INICIO] hs. hasta las [HORA FIN] hs.

          Sin otro particular lo saludo a Ud. muy atentamente.



                                                        ............................

                                                        [APELLIDO], [NOMBRE].

                                                        DNI N°: [DNI]
`,
  },
]

export default function DocumentosAdmin() {
  const [activeDoc, setActiveDoc] = useState(DOCS[0].id)
  const [texts, setTexts] = useState({})
  const [saved, setSaved] = useState(false)
  const [printing, setPrinting] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    const loaded = {}
    for (const doc of DOCS) {
      const stored = localStorage.getItem(doc.storageKey)
      loaded[doc.id] = stored !== null ? stored : doc.template
    }
    setTexts(loaded)
  }, [])

  const doc = DOCS.find(d => d.id === activeDoc)
  const nota = texts[activeDoc] ?? ''

  function handleChange(val) {
    setTexts(prev => ({ ...prev, [activeDoc]: val }))
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(doc.storageKey, val)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }, 600)
  }

  function handleReset() {
    if (!window.confirm('¿Restaurar la plantilla por defecto? Se perderá el texto actual.')) return
    const tpl = doc.template
    setTexts(prev => ({ ...prev, [activeDoc]: tpl }))
    localStorage.setItem(doc.storageKey, tpl)
  }

  function handleDownloadTxt() {
    const blob = new Blob([nota], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.label.toLowerCase().replace(/\s+/g, '-')}.txt`
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

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #doc-print-area { display: block !important; visibility: visible !important; }
          #doc-print-area * { visibility: visible !important; }
          #doc-print-area {
            position: fixed !important;
            inset: 0 !important;
            background: #fff !important;
          }
        }
      `}</style>

      <div id="doc-print-area" style={{ display: 'none' }} aria-hidden="true">
        <div style={{
          width: '90%',
          margin: '0 auto',
          paddingTop: '5%',
          fontFamily: 'Times New Roman, serif',
          fontSize: '13px',
          lineHeight: '1.8',
          color: '#000',
          boxSizing: 'border-box',
        }}>
          {activeDoc === 'nota_municipio' ? (
            <>
              <div style={{ textAlign: 'right', marginBottom: '1em' }}>
                {nota.split('\n')[0]}
              </div>
              <div>
                {nota.split('\n').slice(1).map((line, i) => {
                  const isRight = /^\s{30,}\S/.test(line)
                  return (
                    <div key={i} style={{
                      textAlign: isRight ? 'right' : 'justify',
                      textAlignLast: isRight ? 'right' : 'left',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {isRight ? line.trim() : (line || ' ')}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              width: '100%',
            }}>
              {nota}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#f1f1f5', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Gestión Documental</h2>
        <p style={{ color: '#9999b0', fontSize: 13, margin: 0 }}>Editor de notas — guardado automático por documento</p>
      </div>

      {/* Document selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#13131a', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid #2a2a38' }}>
        {DOCS.map(d => (
          <button
            key={d.id}
            onClick={() => { setActiveDoc(d.id); setSaved(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeDoc === d.id ? 600 : 400,
              background: activeDoc === d.id ? 'rgba(249,115,22,0.15)' : 'transparent',
              color: activeDoc === d.id ? '#f97316' : '#9999b0',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 15 }}>📄</span>
            {d.label}
          </button>
        ))}
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
          key={activeDoc}
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
            overflowX: 'auto',
          }}
          onFocus={e => e.target.style.borderColor = '#f97316'}
          onBlur={e => e.target.style.borderColor = '#2a2a38'}
        />
        <div style={{ position: 'absolute', bottom: 10, right: 14, color: '#44445a', fontSize: 11 }}>
          {nota.length} caracteres
        </div>
      </div>

      {/* Tips */}
      <div style={{ marginTop: 14, padding: '12px 16px', background: '#13131a', border: '1px solid #2a2a38', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {[
          { col: '#f97316', text: 'Cada nota se guarda por separado en el navegador' },
          { col: '#3b82f6', text: 'Descargar .txt genera un archivo de texto plano' },
          { col: '#10b981', text: 'Imprimir / PDF abre el diálogo de impresión del navegador' },
        ].map(({ col, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
            <span style={{ color: '#9999b0', fontSize: 12 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
