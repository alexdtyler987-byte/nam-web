function Silueta({ sexo, color }) {
  const etiqueta = sexo === 'Hombre' ? 'hombre' : sexo === 'Mujer' ? 'mujer' : 'paciente'

  return (
    <svg className="silueta" viewBox="0 0 100 220" role="img" aria-label={`Silueta de ${etiqueta}`}>
      <g fill={color}>
        <circle cx="50" cy="22" r="17" />
        <rect x="45" y="36" width="10" height="12" rx="4" />

        {sexo === 'Mujer' ? (
          <>
            <path d="M34 46 Q50 40 66 46 L62 88 Q70 104 68 126 L32 126 Q30 104 38 88 Z" />
            <rect x="21" y="48" width="10" height="72" rx="5" />
            <rect x="69" y="48" width="10" height="72" rx="5" />
            <rect x="33" y="122" width="15" height="90" rx="7.5" />
            <rect x="52" y="122" width="15" height="90" rx="7.5" />
          </>
        ) : sexo === 'Hombre' ? (
          <>
            <path d="M28 46 Q50 38 72 46 L66 90 L64 126 L36 126 L34 90 Z" />
            <rect x="14" y="48" width="12" height="76" rx="6" />
            <rect x="74" y="48" width="12" height="76" rx="6" />
            <rect x="35" y="122" width="14" height="90" rx="7" />
            <rect x="51" y="122" width="14" height="90" rx="7" />
          </>
        ) : (
          <>
            <path d="M30 50 Q50 40 70 50 L78 130 Q50 145 22 130 Z" />
            <rect x="8" y="55" width="14" height="70" rx="7" />
            <rect x="78" y="55" width="14" height="70" rx="7" />
            <rect x="28" y="132" width="18" height="80" rx="9" />
            <rect x="54" y="132" width="18" height="80" rx="9" />
          </>
        )}
      </g>
    </svg>
  )
}

export default Silueta