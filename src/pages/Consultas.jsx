import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import EstadoVacio from './EstadoVacio'
import FormularioConsulta from './FormularioConsulta'
import { fechaHoy } from './utilidades'
import { TIPOS_CONSULTA, aFechaLocal, diasEntre, fechaLarga, textoPlazo } from './fechasConsulta'
import './Consultas.css'

const BLOQUES = [
  ['motivo', 'Motivo'],
  ['valoracion', 'Valoración'],
  ['intervencion', 'Intervención e indicaciones'],
  ['acuerdos', 'Acuerdos y metas'],
]

function Consultas({ paciente }) {
  const [consultas, setConsultas] = useState([])
  const [medidas, setMedidas] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [version, setVersion] = useState(0)
  const [formulario, setFormulario] = useState(null) // null | 'nueva' | { consulta }

  useEffect(() => {
    setFormulario(null)
    setAviso('')
  }, [paciente.id])

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError('')

      const [resConsultas, resMedidas] = await Promise.all([
        supabase
          .from('CONSULTAS')
          .select('*')
          .eq('paciente_id', paciente.id)
          .order('fecha', { ascending: false })
          .order('id', { ascending: false }),
        supabase
          .from('HISTORIAL-MEDIDAS')
          .select('fecha, peso, imc')
          .eq('paciente_id', paciente.id),
      ])

      if (cancelado) return

      if (resConsultas.error) {
        setError('No se pudieron cargar las consultas: ' + resConsultas.error.message)
        setCargando(false)
        return
      }

      // Si el historial de medidas falla, la línea de tiempo igual se muestra (sin el dato del peso).
      const porFecha = {}
      ;(resMedidas.data ?? []).forEach((m) => {
        porFecha[String(m.fecha).slice(0, 10)] = m
      })

      setConsultas(resConsultas.data ?? [])
      setMedidas(porFecha)
      setCargando(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [paciente.id, version])

  useEffect(() => {
    if (!aviso) return
    const temporizador = setTimeout(() => setAviso(''), 5000)
    return () => clearTimeout(temporizador)
  }, [aviso])

  function alGuardar(esEdicion) {
    setFormulario(null)
    setAviso(esEdicion ? 'Consulta actualizada.' : 'Consulta guardada.')
    setVersion((v) => v + 1)
  }

  async function eliminar(consulta) {
    const confirmado = window.confirm(
      `¿Eliminar la consulta del ${fechaLarga(consulta.fecha)}? Esta acción no se puede deshacer.`,
    )
    if (!confirmado) return

    setError('')
    const { error: errorBorrado } = await supabase.from('CONSULTAS').delete().eq('id', consulta.id)

    if (errorBorrado) {
      setError('No se pudo eliminar la consulta: ' + errorBorrado.message)
      return
    }

    setAviso('Consulta eliminada.')
    setVersion((v) => v + 1)
  }

  // El próximo control es el de la consulta más reciente.
  const ultima = consultas[0]
  const proxima = ultima?.proxima_cita ?? null
  const dias = proxima ? diasEntre(fechaHoy(), String(proxima).slice(0, 10)) : null

  return (
    <section className="tarjeta">
      <div className="tarjeta-encabezado">
        <h2>Consultas</h2>
        <button type="button" className="registro-boton" onClick={() => setFormulario('nueva')}>
          + Nueva consulta
        </button>
      </div>

      {error ? (
        <p className="registro-error" role="alert">
          {error}
        </p>
      ) : null}

      {aviso ? (
        <p className="aviso-guardado" role="status" style={{ marginTop: 0 }}>
          {aviso}
        </p>
      ) : null}

      {!cargando && ultima ? (
        proxima ? (
          <p className={dias < 0 ? 'proximo-control proximo-control-vencido' : 'proximo-control'}>
            Próximo control: {fechaLarga(proxima)} · {textoPlazo(dias)}
          </p>
        ) : (
          <p className="proximo-control proximo-control-sin">
            No hay un próximo control programado. Puedes agregarlo editando la última consulta.
          </p>
        )
      ) : null}

      {cargando ? <div className="esqueleto esq-tira" aria-label="Cargando consultas" /> : null}

      {!cargando && !error && consultas.length === 0 ? (
        <EstadoVacio fruta="pera" titulo="Aún no hay consultas registradas">
          Registra la primera para empezar el historial de atención de este paciente.
        </EstadoVacio>
      ) : null}

      {!cargando && consultas.length > 0 ? (
        <ol className="consultas-lista">
          {consultas.map((c) => {
            const fecha = aFechaLocal(c.fecha)
            const medida = medidas[String(c.fecha).slice(0, 10)]
            const imc = medida ? Number(medida.imc) : NaN

            return (
              <li key={c.id} className="consulta-item">
                <div className="consulta-fecha" aria-hidden="true">
                  <strong>{fecha.getDate()}</strong>
                  <span>{fecha.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')}</span>
                  <small>{fecha.getFullYear()}</small>
                </div>

                <article className="consulta-cuerpo">
                  <div className="consulta-cabecera">
                    <h3>{fechaLarga(c.fecha)}</h3>
                    <span className={`chip chip-consulta-${c.tipo}`}>
                      {TIPOS_CONSULTA[c.tipo] ?? c.tipo}
                    </span>
                    <div className="consulta-acciones">
                      <button type="button" onClick={() => setFormulario({ consulta: c })}>
                        Editar
                      </button>
                      <button type="button" className="consulta-eliminar" onClick={() => eliminar(c)}>
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {medida ? (
                    <p className="consulta-medidas">
                      Medición de ese día: {medida.peso} kg
                      {Number.isFinite(imc) ? ` · IMC ${imc.toFixed(1)}` : ''}
                    </p>
                  ) : null}

                  {BLOQUES.map(([campo, titulo]) =>
                    c[campo] ? (
                      <div key={campo} className="consulta-bloque">
                        <h4>{titulo}</h4>
                        <p>{c[campo]}</p>
                      </div>
                    ) : null,
                  )}

                  {c.proxima_cita ? (
                    <p className="consulta-proxima">Próximo control: {fechaLarga(c.proxima_cita)}</p>
                  ) : null}
                </article>
              </li>
            )
          })}
        </ol>
      ) : null}

      {formulario ? (
        <FormularioConsulta
          paciente={paciente}
          consulta={formulario === 'nueva' ? null : formulario.consulta}
          tipoSugerido={consultas.length === 0 ? 'primera' : 'control'}
          onGuardada={alGuardar}
          onCerrar={() => setFormulario(null)}
        />
      ) : null}
    </section>
  )
}

export default Consultas