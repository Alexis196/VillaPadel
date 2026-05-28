import { useState, useEffect, useRef } from 'react'
import './DocumentosAdmin.css'

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

      <div id="doc-print-area" className="do-print-area" aria-hidden="true">
        <div style={{ width: '90%', margin: '0 auto', paddingTop: '5%', fontFamily: 'Times New Roman, serif', fontSize: '13px', lineHeight: '1.8', color: '#000', boxSizing: 'border-box' }}>
          {activeDoc === 'nota_municipio' ? (
            <>
              <div style={{ textAlign: 'right', marginBottom: '1em' }}>{nota.split('\n')[0]}</div>
              <div>
                {nota.split('\n').slice(1).map((line, i) => {
                  const isRight = /^\s{30,}\S/.test(line)
                  return (
                    <div key={i} style={{ textAlign: isRight ? 'right' : 'justify', textAlignLast: isRight ? 'right' : 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {isRight ? line.trim() : (line || ' ')}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', width: '100%' }}>{nota}</div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2 className="do-page-title">Gestión Documental</h2>
        <p className="do-page-desc">Editor de notas — guardado automático por documento</p>
      </div>

      <div className="do-tabs">
        {DOCS.map(d => (
          <button
            key={d.id}
            onClick={() => { setActiveDoc(d.id); setSaved(false) }}
            className="do-tab"
            style={{
              fontWeight: activeDoc === d.id ? 600 : 400,
              background: activeDoc === d.id ? 'rgba(249,115,22,0.15)' : 'transparent',
              color: activeDoc === d.id ? '#f97316' : '#9999b0',
            }}
          >
            <span style={{ fontSize: 15 }}>📄</span>
            {d.label}
          </button>
        ))}
      </div>

      <div className="do-toolbar">
        <button onClick={handleDownloadTxt} className="do-btn-download">
          <span>⬇</span> Descargar .txt
        </button>
        <button onClick={handlePrint} disabled={printing} className="do-btn-print">
          <span>🖨</span> {printing ? 'Abriendo...' : 'Imprimir / PDF'}
        </button>
        <div className="do-toolbar-right">
          {saved && (
            <span className="do-saved-indicator"><span>✓</span> Guardado</span>
          )}
          <button onClick={handleReset} className="do-btn-reset">Restaurar plantilla</button>
        </div>
      </div>

      <div className="do-editor-wrap">
        <textarea
          key={activeDoc}
          value={nota}
          onChange={e => handleChange(e.target.value)}
          spellCheck={false}
          className="do-editor"
        />
        <div className="do-char-count">{nota.length} caracteres</div>
      </div>

      <div className="do-tips">
        {[
          { col: '#f97316', text: 'Cada nota se guarda por separado en el navegador' },
          { col: '#3b82f6', text: 'Descargar .txt genera un archivo de texto plano' },
          { col: '#10b981', text: 'Imprimir / PDF abre el diálogo de impresión del navegador' },
        ].map(({ col, text }) => (
          <div key={text} className="do-tip">
            <span className="do-tip-dot" style={{ background: col }} />
            <span className="do-tip-text">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
