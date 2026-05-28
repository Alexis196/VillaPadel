import { useState } from 'react'
import { toCanvas } from 'html-to-image'
import jsPDF from 'jspdf'

export default function ShareButton({ targetRef, title = 'VillaPadel', filename = 'villapadel' }) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null) // { dataUrl, canvas }

  async function capture() {
    const el = targetRef.current

    const prev = { overflow: el.style.overflow, overflowX: el.style.overflowX, overflowY: el.style.overflowY }
    el.style.overflow = 'visible'
    el.style.overflowX = 'visible'
    el.style.overflowY = 'visible'
    const fullWidth = el.scrollWidth
    const fullHeight = el.scrollHeight

    try {
      return await toCanvas(el, {
        backgroundColor: '#1a1a22',
        pixelRatio: 2,
        width: fullWidth,
        height: fullHeight,
        style: {
          overflow: 'visible',
          overflowX: 'visible',
          overflowY: 'visible',
          width: fullWidth + 'px',
          height: fullHeight + 'px',
        },
        filter: node => {
          // Exclude elements that shouldn't appear in the capture
          if (node.tagName === 'SCRIPT' || node.tagName === 'NOSCRIPT') return false
          return true
        },
      })
    } finally {
      el.style.overflow = prev.overflow
      el.style.overflowX = prev.overflowX
      el.style.overflowY = prev.overflowY
    }
  }

  async function openPreview() {
    setLoading(true)
    try {
      const canvas = await capture()
      setPreview({ dataUrl: canvas.toDataURL('image/png'), canvas })
    } finally {
      setLoading(false)
    }
  }

  async function shareImage() {
    const { canvas } = preview
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    const file = new File([blob], `${filename}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text: `${title} — VillaPadel` })
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.png`
      a.click()
      URL.revokeObjectURL(url)
    }
    setPreview(null)
  }

  async function sharePDF() {
    const { canvas, dataUrl } = preview
    const w = canvas.width / 2
    const h = canvas.height / 2
    const pdf = new jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'px', format: [w, h] })
    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
    pdf.save(`${filename}.pdf`)
    setPreview(null)
  }

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8,
    background: loading ? 'rgba(37,211,102,0.08)' : 'rgba(37,211,102,0.12)',
    border: '1px solid rgba(37,211,102,0.3)',
    color: '#25d366', fontSize: 13, fontWeight: 600,
    cursor: loading ? 'wait' : 'pointer', transition: 'all 0.15s',
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={openPreview}
        disabled={loading}
        style={btnStyle}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#25d366'; e.currentTarget.style.color = '#fff' } }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.12)'; e.currentTarget.style.color = '#25d366' }}
      >
        {loading ? (
          <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #25d366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.522 5.845L.057 23.504a.5.5 0 0 0 .613.612l5.701-1.455A11.926 11.926 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.938a9.9 9.9 0 0 1-5.031-1.369l-.361-.214-3.738.955.98-3.65-.236-.374A9.878 9.878 0 0 1 2.062 12C2.062 6.51 6.51 2.062 12 2.062c5.49 0 9.938 4.448 9.938 9.938 0 5.49-4.448 9.938-9.938 9.938z"/>
          </svg>
        )}
        {loading ? 'Generando...' : 'Compartir'}
      </button>

      {/* Preview modal */}
      {preview && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setPreview(null) }}
        >
          <p style={{ color: '#9999b0', fontSize: 12, margin: '0 0 12px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>
            Vista previa
          </p>

          {/* Image container */}
          <div style={{ maxWidth: '92vw', maxHeight: '70vh', overflow: 'auto', borderRadius: 10, border: '1px solid #2a2a38', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
            <img src={preview.dataUrl} alt="Vista previa" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => setPreview(null)}
              style={{ padding: '9px 20px', borderRadius: 8, background: 'transparent', border: '1px solid #3a3a50', color: '#9999b0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={sharePDF}
              style={{ padding: '9px 20px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              📄 Descargar PDF
            </button>
            <button
              onClick={shareImage}
              style={{ padding: '9px 20px', borderRadius: 8, background: '#25d366', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              📷 Compartir imagen
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
