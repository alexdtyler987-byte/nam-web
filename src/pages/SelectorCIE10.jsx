import { useEffect, useState } from 'react'
import { cargarCatalogo, normalizar } from './cie10'
import './Diagnosticos.css'

// Buscador de diagnósticos CIE-10.
// - value: { codigo, descripcion } o null (si hay valor, se muestra como etiqueta con "Quitar")
// - onChange(item | null): se llama al elegir (item) o al quitar (null)
// - excluir: lista de códigos que no deben aparecer (por ejemplo, los que el paciente ya tiene)
function SelectorCIE10({
  value = null,
  onChange,
  excluir = [],
  disabled = false,
  placeholder = 'Buscar por código o nombre (ej. E66, obesidad)',
}) {
  const [catalogo, setCatalogo] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [consulta, setConsulta] = useState('')
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    let cancelado = false
    cargarCatalogo()
      .then((filas) => {
        if (cancelado) return
        setCatalogo(filas)
        setCargando(false)
      })
      .catch((e) => {
        if (cancelado) return
        setErrorCarga('No se pudo cargar el catálogo CIE-10: ' + (e.message || 'error desconocido'))
        setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const q = normalizar(consulta.trim())
  const resultados = catalogo.filter(
    (item) =>
      !excluir.includes(item.codigo) &&
      (!q || normalizar(item.codigo).includes(q) || normalizar(item.descripcion).includes(q)),
  )

  function elegir(item) {
    onChange(item)
    setConsulta('')
    setAbierto(false)
  }

  if (value) {
    return (
      <div className="cie-elegido">
        <span className="cie-codigo">{value.codigo}</span>
        <span className="cie-nombre">{value.descripcion}</span>
        {!disabled ? (
          <button type="button" className="cie-quitar" onClick={() => onChange(null)}>
            Quitar
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="cie-selector">
      <input
        type="text"
        value={consulta}
        placeholder={cargando ? 'Cargando catálogo…' : placeholder}
        disabled={disabled || cargando || Boolean(errorCarga)}
        aria-label="Buscar diagnóstico CIE-10"
        autoComplete="off"
        onChange={(e) => {
          setConsulta(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Evita que Enter envíe el formulario completo.
            e.preventDefault()
            if (q && resultados[0]) elegir(resultados[0])
          } else if (e.key === 'Escape') {
            setAbierto(false)
          }
        }}
      />

      {errorCarga ? (
        <p className="registro-error" role="alert">
          {errorCarga}
        </p>
      ) : null}

      {abierto && !cargando && !errorCarga ? (
        // onMouseDown evita que el input pierda el foco antes de registrar el clic.
        <ul className="cie-lista" onMouseDown={(e) => e.preventDefault()}>
          {resultados.length === 0 ? (
            <li className="cie-vacio">No hay diagnósticos que coincidan con la búsqueda.</li>
          ) : (
            resultados.map((item) => (
              <li key={item.codigo}>
                <button type="button" className="cie-opcion" onClick={() => elegir(item)}>
                  <span className="cie-codigo">{item.codigo}</span>
                  <span className="cie-nombre">{item.descripcion}</span>
                  <span className="cie-grupo">{item.grupo}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

export default SelectorCIE10