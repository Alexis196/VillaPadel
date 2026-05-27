import { useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function ShareButton({ targetRef, title = 'VillaPadel', filename = 'villapadel' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function capture() {
    const el = targetRef.current
    const width = Math.round(el.getBoundingClientRect().width)
    return html2canvas(el, {
      backgroundColor: '#1a1a22',
      scale: 2,
      useCORS: true,
      logging: false,
      width,
      windowWidth: document.documentElement.clientWidth,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('*').forEach(node => {
          const s = node.style
          if (s && s.display === 'flex' && !s.alignItems) {
            s.alignItems = 'center'
          }
        })
      },
    })
  }

  async function shareImage() {
    setLoading(true)
    setOpen(false)
    try {
      const canvas = await capture()
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      const file = new File([blob], `${filename}.png`, { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text: `${title} — VillaPadel` })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setLoading(false)
    }
  }

  async function sharePDF() {
    setLoading(true)
    setOpen(false)
    try {
      const canvas = await capture()
      const imgData = canvas.toDataURL('image/png')
      const w = canvas.width / 2
      const h = canvas.height / 2
      const pdf = new jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'px', format: [w, h] })
      pdf.addImage(imgData, 'PNG', 0, 0, w, h)
      pdf.save(`${filename}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8,
          background: loading ? 'rgba(37,211,102,0.08)' : 'rgba(37,211,102,0.12)',
          border: '1px solid rgba(37,211,102,0.3)',
          color: '#25d366', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', transition: 'all 0.15s',
        }}
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

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 200,
          background: '#1a1a22', border: '1px solid #2a2a38', borderRadius: 10,
          overflow: 'hidden', minWidth: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <button
            onClick={shareImage}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'transparent', border: 'none', color: '#f1f1f5', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#2a2a38'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: 16 }}>📷</span>
            <div>
              <div style={{ fontWeight: 600 }}>Compartir como imagen</div>
              <div style={{ color: '#9999b0', fontSize: 11 }}>WhatsApp / Guardar PNG</div>
            </div>
          </button>
          <div style={{ height: 1, background: '#2a2a38' }} />
          <button
            onClick={sharePDF}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'transparent', border: 'none', color: '#f1f1f5', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#2a2a38'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: 16 }}>📄</span>
            <div>
              <div style={{ fontWeight: 600 }}>Descargar PDF</div>
              <div style={{ color: '#9999b0', fontSize: 11 }}>Guardar y compartir por WhatsApp</div>
            </div>
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
