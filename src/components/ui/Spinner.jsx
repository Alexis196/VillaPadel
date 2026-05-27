import Logo from '../../assets/villapadel-icon.png'

export default function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div style={{
        width: 60,
        height: 60,
        background: '#ffffff',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 8px 2px rgba(255,255,255,0.6), inset 0 0 4px rgba(255,255,255,0.5)',
        animation: 'respirar 2s ease-in-out infinite',
        overflow: 'hidden',
      }}>
        <img src={Logo} alt="VillaPadel" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
      </div>
      <style>{`
        @keyframes respirar {
          0%   { transform: scale(1);    box-shadow: 0 0 8px 2px rgba(255,255,255,0.6), inset 0 0 4px rgba(255,255,255,0.5); }
          50%  { transform: scale(1.08); box-shadow: 0 0 20px 6px rgba(255,255,255,0.8), inset 0 0 4px rgba(255,255,255,0.5); }
          100% { transform: scale(1);    box-shadow: 0 0 8px 2px rgba(255,255,255,0.6), inset 0 0 4px rgba(255,255,255,0.5); }
        }
      `}</style>
    </div>
  )
}
