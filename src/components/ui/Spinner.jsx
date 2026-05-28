import Logo from '../../assets/nuevologo.png'

export default function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <img
        src={Logo}
        alt="VillaPadel"
        style={{
          height: 72, width: 'auto', borderRadius: 12,
          animation: 'respirar 2s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes respirar {
          0%   { transform: scale(1);    box-shadow: 0 0 8px 2px rgba(255,255,255,0.4); }
          50%  { transform: scale(1.08); box-shadow: 0 0 24px 8px rgba(255,255,255,0.65); }
          100% { transform: scale(1);    box-shadow: 0 0 8px 2px rgba(255,255,255,0.4); }
        }
      `}</style>
    </div>
  )
}
