import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './Panel.css'

function calcularIMC(peso, altura) {
  const pesoNum = Number(peso)
  const alturaNum = Number(altura)

  if (!Number.isFinite(pesoNum) || !Number.isFinite(alturaNum) || alturaNum === 0) {
    return null
  }

  return Math.round((pesoNum / (alturaNum * alturaNum)) * 10) / 10
}

function categoriaIMC(imc) {
  if (imc == null) return 'Sin datos'
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Normal'
  if (imc < 30) return 'Sobrepeso'
  return 'Obesidad'
}

function claseCategoria(categoria) {
  if (categoria === 'Bajo peso') return 'panel-etiqueta panel-etiqueta-bajo'
  if (categoria === 'Normal') return 'panel-etiqueta panel-etiqueta-normal'
  if (categoria === 'Sobrepeso') return 'panel-etiqueta panel-etiqueta-sobrepeso'
  if (categoria === 'Obesidad') return 'panel-etiqueta panel-etiqueta-obesidad'
  return 'panel-etiqueta'
}

function nombrePaciente(paciente) {
  return paciente.nombre || paciente.nombre_completo || 'Sin nombre'
}

function correoPaciente(paciente) {
  return paciente.correo || paciente.email || 'Sin correo'
}

function Panel() {
  const [pacientes, setPacientes] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false

    async function cargarPacientes() {
      setCargando(true)
      setError('')

      const { data, error: consultaError } = await supabase
        .from('pacientes')
        .select('*')

      if (cancelado) return

      if (consultaError) {
        setError(
          consultaError.message ||
            'No se pudieron cargar los pacientes. Inténtalo de nuevo.',
        )
        setPacientes([])
        setSeleccionado(null)
        setCargando(false)
        return
      }

      const lista = data ?? []
      setPacientes(lista)
      setSeleccionado(lista[0] ?? null)
      setCargando(false)
    }

    cargarPacientes()

    return () => {
      cancelado = true
    }
  }, [])

  const imc = seleccionado
    ? calcularIMC(seleccionado.peso, seleccionado.altura)
    : null
  const categoria = seleccionado ? categoriaIMC(imc) : null

  return (
    <main className="panel">
      <header className="panel-cabecera">
        <h1>Panel de pacientes</h1>
        <p>Selecciona un paciente para ver su información antropométrica.</p>
      </header>

      {cargando ? <p className="panel-estado">Cargando pacientes…</p> : null}

      {error ? (
        <p className="panel-error" role="alert">
          {error}
        </p>
      ) : null}

      {!cargando && !error && pacientes.length === 0 ? (
        <p className="panel-estado">No hay pacientes registrados.</p>
      ) : null}

      {!cargando && !error && pacientes.length > 0 ? (
        <div className="panel-cuerpo">
          <aside className="panel-lista">
            <h2>Pacientes</h2>
            <ul>
              {pacientes.map((paciente, indice) => {
                const activo = paciente === seleccionado

                return (
                  <li key={paciente.id ?? indice}>
                    <button
                      type="button"
                      className={activo ? 'panel-item panel-item-activo' : 'panel-item'}
                      onClick={() => setSeleccionado(paciente)}
                    >
                      <span className="panel-item-nombre">
                        {nombrePaciente(paciente)}
                      </span>
                      <span className="panel-item-correo">
                        {correoPaciente(paciente)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          <section className="panel-detalle" aria-live="polite">
            {seleccionado ? (
              <>
                <h2>{nombrePaciente(seleccionado)}</h2>
                <p className="panel-detalle-correo">
                  {correoPaciente(seleccionado)}
                </p>

                <dl className="panel-datos">
                  <div>
                    <dt>Peso</dt>
                    <dd>
                      {seleccionado.peso != null ? `${seleccionado.peso} kg` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Altura</dt>
                    <dd>
                      {seleccionado.altura != null ? `${seleccionado.altura} m` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>IMC</dt>
                    <dd>{imc != null ? imc.toFixed(1) : '—'}</dd>
                  </div>
                </dl>

                <p className={claseCategoria(categoria)}>{categoria}</p>
              </>
            ) : (
              <p className="panel-estado">Selecciona un paciente.</p>
            )}
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default Panel
