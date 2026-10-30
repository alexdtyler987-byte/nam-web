import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { urlFirmada } from './fotos'
import './Fotos.css'

// Miniatura de la foto de una comida. Al hacer clic se abre ampliada.
// - path: ruta en el bucket (si no hay, no muestra nada)
// - titulo: texto alternativo y pie del visor
// - tamano: 'mini' (alertas) o 'media' (tarjetas)
function FotoComida({ path, titulo = 'Foto de la comida', tamano = 'media' }) {
  const [url, setUrl] = useState(null)
  const [fallo, setFallo] = useState(false)
  const [reintentada, setReintentada] = useState(false)
  const [abierta, setAbierta] = useState(false)

  useEffect(() => {
    setUrl(null)
    setFallo(false)
    setReintentada(false)
    setAbierta(false)
    if (!path) return

    let cancelado = false
    urlFirmada(path).then((enlace) => {
      if (cancelado) return
      if (enlace) setUrl(enlace)
      else setFallo(true)
    })

    return () => {
      cancelado = true
    }
  }, [path])

  useEffect(() => {
    if (!abierta) return
    function alTeclear(event) {
      if (event.key === 'Escape') setAbierta(false)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierta])

  // Si el enlace venció (pestaña abierta más de una hora), se pide uno nuevo una sola vez.
  async function alFallar() {
    if (reintentada) {
      setFallo(true)
      return
    }
    setReintentada(true)
    const nuevo = await urlFirmada(path, true)
    if (nuevo) setUrl(nuevo)
    else setFallo(true)
  }

  if (!path) return null
  if (fallo) return <span className="foto-nd">Foto no disponible</span>

  return (
    <>
      <button
        type="button"
        className={`foto foto-${tamano}`}
        onClick={() => url && setAbierta(true)}
        aria-label={`Ampliar: ${titulo}`}
      >
        {url ? (
          <img src={url} alt={titulo} loading="lazy" onError={alFallar} />
        ) : (
          <span className="esqueleto foto-carga" />
        )}
      </button>

      {abierta && url
        ? createPortal(
            <div
              className="modal-fondo"
              role="dialog"
              aria-modal="true"
              aria-label={titulo}
              onClick={() => setAbierta(false)}
            >
              <div className="foto-visor" onClick={(e) => e.stopPropagation()}>
                <img src={url} alt={titulo} />
                <div className="foto-visor-pie">
                  <span>{titulo}</span>
                  <button type="button" className="btn-secundario" onClick={() => setAbierta(false)}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export default FotoComida