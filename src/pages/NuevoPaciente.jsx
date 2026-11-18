import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { nombrePaciente } from './utilidades'
import { PASOS, consultarEstado } from './estadoPrimeraConsulta'
import PasoPaciente from './PasoPaciente'
import HistoriaClinica from './HistoriaClinica'
import PasoMedidas from './PasoMedidas'
import PasoConsulta from './PasoConsulta'
import PasoDiagnostico from './PasoDiagnostico'
import './NuevoPaciente.css'

// Asistente de primera consulta. Cada paso se GUARDA al avanzar: si se interrumpe, nada se pierde.
//
// Props:
// - onCerrar(): cerrar sin haber creado a nadie
// - onCreado(paciente): se llama al terminar o al salir DESPUÉS de crear al paciente (para mostrarlo en la lista)
// - pacienteInicial y pasoInicial: para retomar la primera consulta de un paciente que ya existe
// - pacientesExistentes: lista opcional para avisar de un DNI repetido
// - onPacienteActualizado(paciente): la fila del paciente cambió (por ejemplo, al sincronizar datos para la app)
function NuevoPaciente({
  onCerrar,
  onCreado,
  pacienteInicial = null,
  pasoInicial = 2,
  pacientesExistentes = [],
  onPacienteActualizado,
}) {
  const retomando = Boolean(pacienteInicial)
  const [paciente, setPaciente] = useState(pacienteInicial)
  const [paso, setPaso] = useState(retomando ? Math.min(5, Math.max(2, pasoInicial)) : 1)
  const [hechos, setHechos] = useState({ 1: retomando })
  const [credencial, setCredencial] = useState(null)
  const [copiada, setCopiada] = useState(false)
  const [sucio, setSucio] = useState(false)

  const pacienteRef = useRef(pacienteInicial) // siempre la fila más reciente (el estado se actualiza con retraso)
  const cajaRef = useRef(null)
  const cuerpoRef = useRef(null)

  // La página de fondo no se desplaza mientras el asistente está abierto
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  // Al retomar, se calcula qué pasos ya están hechos según los datos guardados
  useEffect(() => {
    if (!pacienteInicial) return
    let cancelado = false
    consultarEstado(pacienteInicial.id).then((estado) => {
      if (!cancelado && estado) setHechos(estado)
    })
    return () => {
      cancelado = true
    }
  }, [pacienteInicial?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar de paso, el contenido vuelve arriba
  useEffect(() => {
    cuerpoRef.current?.scrollTo({ top: 0 })
  }, [paso])

  function actualizarPaciente(nuevo) {
    pacienteRef.current = nuevo
    setPaciente(nuevo)
    if (onPacienteActualizado) onPacienteActualizado(nuevo)
  }

  function marcarHecho(numero) {
    setHechos((actual) => ({ ...actual, [numero]: true }))
  }

  function salida() {
    if (retomando || !onCreado) onCerrar()
    else onCreado(pacienteRef.current)
  }

  function salir() {
    if (pacienteRef.current) {
      const confirmado = window.confirm(
        'Lo que ya registraste quedó guardado. Podrás completar la primera consulta después desde la ficha del paciente. ¿Salir del asistente?',
      )
      if (confirmado) salida()
      return
    }

    if (sucio && !window.confirm('Hay datos escritos que no se guardarán. ¿Salir de todos modos?')) return
    onCerrar()
  }

  function terminar() {
    marcarHecho(5)
    salida()
  }

  async function copiarCredencial() {
    try {
      await navigator.clipboard.writeText(`DNI: ${credencial.dni}\nContraseña: ${credencial.password}`)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2500)
    } catch {
      setCopiada(false)
    }
  }

  // Mantiene el foco dentro del asistente mientras está abierto
  function atraparTab(event) {
    if (event.key !== 'Tab' || !cajaRef.current) return
    const enfocables = Array.from(
      cajaRef.current.querySelectorAll('input, select, textarea, button, a[href]'),
    ).filter((el) => !el.disabled && el.offsetParent !== null)
    if (enfocables.length === 0) return

    const primero = enfocables[0]
    const ultimo = enfocables[enfocables.length - 1]
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault()
      ultimo.focus()
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault()
      primero.focus()
    }
  }

  const pasoActual = PASOS.find((p) => p.id === paso)
  const titulo = paciente ? `Primera consulta · ${nombrePaciente(paciente)}` : 'Nuevo paciente'

  return createPortal(
    <div className="asistente-fondo">
      <div
        ref={cajaRef}
        className="asistente"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asistente-titulo"
        onKeyDown={atraparTab}
      >
        <header className="asistente-cabecera">
          <div>
            <h2 id="asistente-titulo">{titulo}</h2>
            <p>
              Paso {paso} de {PASOS.length} · {pasoActual.detalle}
            </p>
          </div>
          <button type="button" className="btn-secundario" onClick={salir}>
            {paciente ? 'Guardar y salir' : 'Cancelar'}
          </button>
        </header>

        <ol className="asistente-pasos" aria-label="Pasos de la primera consulta">
          {PASOS.map((p) => {
            const estado = p.id === paso ? 'actual' : hechos[p.id] ? 'hecho' : 'pendiente'
            return (
              <li key={p.id} className={`asistente-paso asistente-paso-${estado}`}>
                <button
                  type="button"
                  aria-current={p.id === paso ? 'step' : undefined}
                  disabled={!paciente && p.id !== 1}
                  onClick={() => setPaso(p.id)}
                >
                  <span className="asistente-paso-num" aria-hidden="true">
                    {estado === 'hecho' ? '✓' : p.id}
                  </span>
                  <span className="asistente-paso-texto">{p.titulo}</span>
                  {estado === 'hecho' ? <span className="sr-only"> (listo)</span> : null}
                </button>
              </li>
            )
          })}
        </ol>

        {credencial && paso !== 1 ? (
          <div className="asistente-credencial" role="status">
            <span>
              Acceso del paciente a la app: <code>{credencial.dni}</code> · contraseña inicial{' '}
              <code>{credencial.password}</code>
            </span>
            <button type="button" className="btn-secundario" onClick={copiarCredencial}>
              {copiada ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        ) : null}

        <div className="asistente-cuerpo" ref={cuerpoRef}>
          {paso === 1 ? (
            <PasoPaciente
              paciente={paciente}
              credencial={credencial}
              pacientesExistentes={pacientesExistentes}
              onSucio={setSucio}
              onCreado={(nuevo, datosAcceso) => {
                pacienteRef.current = nuevo
                setPaciente(nuevo)
                setCredencial(datosAcceso)
                setSucio(false)
                marcarHecho(1)
              }}
              onSiguiente={() => setPaso(2)}
            />
          ) : null}

          {paso === 2 && paciente ? (
            <HistoriaClinica
              modo="asistente"
              paciente={paciente}
              onPacienteActualizado={actualizarPaciente}
              onGuardada={() => {
                marcarHecho(2)
                setPaso(3)
              }}
              onAtras={() => setPaso(1)}
              onOmitir={() => setPaso(3)}
            />
          ) : null}

          {paso === 3 && paciente ? (
            <PasoMedidas
              paciente={paciente}
              onPaciente={actualizarPaciente}
              onAtras={() => setPaso(2)}
              onOmitir={() => setPaso(4)}
              onSiguiente={() => {
                marcarHecho(3)
                setPaso(4)
              }}
            />
          ) : null}

          {paso === 4 && paciente ? (
            <PasoConsulta
              paciente={paciente}
              onAtras={() => setPaso(3)}
              onOmitir={() => setPaso(5)}
              onSiguiente={() => {
                marcarHecho(4)
                setPaso(5)
              }}
            />
          ) : null}

          {paso === 5 && paciente ? (
            <PasoDiagnostico
              paciente={paciente}
              onPaciente={actualizarPaciente}
              onAtras={() => setPaso(4)}
              onFinalizar={terminar}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default NuevoPaciente