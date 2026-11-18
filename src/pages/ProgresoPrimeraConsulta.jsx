import { useEffect, useState } from 'react'
import { PASOS, consultarEstado, pasosPendientes } from './estadoPrimeraConsulta'
import './Pestanas.css'
import './ProgresoPrimeraConsulta.css'

function claveOculta(pacienteId) {
  return `nam-primera-consulta-oculta-${pacienteId}`
}

// Tarjeta de la ficha del paciente: muestra qué pasos de la primera consulta faltan y permite retomarlos.
// Se calcula con los datos guardados, así que siempre es fiel a la realidad. Desaparece sola al completarse.
// - activo: true cuando la pestaña Resumen está visible (se vuelve a calcular al volver a ella)
// - refresco: número que cambia cuando hay que volver a calcular
// - onContinuar(paso): abre el asistente en ese paso
function ProgresoPrimeraConsulta({ paciente, activo, refresco, onContinuar }) {
  const [estado, setEstado] = useState(null)
  const [oculta, setOculta] = useState(false)

  useEffect(() => {
    try {
      setOculta(localStorage.getItem(claveOculta(paciente.id)) === '1')
    } catch {
      setOculta(false)
    }
  }, [paciente.id])

  useEffect(() => {
    if (!activo) return
    let cancelado = false

    consultarEstado(paciente.id).then((resultado) => {
      if (!cancelado) setEstado(resultado)
    })

    return () => {
      cancelado = true
    }
  }, [paciente.id, activo, refresco])

  function ocultar() {
    try {
      localStorage.setItem(claveOculta(paciente.id), '1')
    } catch {
      // si el navegador no permite guardar, igual se oculta mientras dure la pantalla
    }
    setOculta(true)
  }

  if (!estado || oculta) return null

  const pendientes = pasosPendientes(estado)
  if (pendientes.length === 0) return null

  const hechos = PASOS.length - pendientes.length

  return (
    <section className="tarjeta progreso-consulta" aria-label="Primera consulta">
      <div className="tarjeta-encabezado">
        <h2>
          Primera consulta: {hechos} de {PASOS.length} pasos
        </h2>
        <div className="progreso-acciones">
          <button type="button" className="registro-boton" onClick={() => onContinuar(pendientes[0])}>
            Continuar primera consulta
          </button>
          <button type="button" className="progreso-ocultar" onClick={ocultar}>
            Ocultar
          </button>
        </div>
      </div>

      <div
        className="progreso-barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={PASOS.length}
        aria-valuenow={hechos}
      >
        <span style={{ width: `${(hechos / PASOS.length) * 100}%` }} />
      </div>

      <ul className="progreso-lista">
        {PASOS.map((paso) => (
          <li key={paso.id} className={estado[paso.id] ? 'progreso-hecho' : 'progreso-pendiente'}>
            <span className="progreso-marca" aria-hidden="true">
              {estado[paso.id] ? '✓' : paso.id}
            </span>
            <span>
              <strong>{paso.titulo}</strong>
              <small>{estado[paso.id] ? 'Listo' : paso.detalle}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProgresoPrimeraConsulta