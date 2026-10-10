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
  return paciente.Nombre || 'Sin nombre'
}

function colorCategoria(imc) {
  if (imc < 18.5) return '#4FA8D8'
  if (imc < 25) return '#6FBF3C'
  if (imc < 30) return '#F2B33D'
  return '#E4572E'
}

function BodySilhouette({ color }) {
  return (
    <svg viewBox="0 0 100 220" width="90" height="200">
      <circle cx="50" cy="26" r="20" fill={color} />
      <path d="M30 50 Q50 40 70 50 L78 130 Q50 145 22 130 Z" fill={color} />
      <rect x="8" y="55" width="14" height="70" rx="7" fill={color} />
      <rect x="78" y="55" width="14" height="70" rx="7" fill={color} />
      <rect x="28" y="132" width="18" height="82" rx="9" fill={color} />
      <rect x="54" y="132" width="18" height="82" rx="9" fill={color} />
    </svg>
  )
}

function Panel() {
  const [pacientes, setPacientes] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [pesoEditado, setPesoEditado] = useState('')
  const [alturaEditado, setAlturaEditado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajeGuardado, setMensajeGuardado] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoDni, setNuevoDni] = useState('')
  const [nuevoPeso, setNuevoPeso] = useState('')
  const [nuevaAltura, setNuevaAltura] = useState('')
  const [nuevoDiagnostico, setNuevoDiagnostico] = useState('')
  const [nuevoPlan, setNuevoPlan] = useState('')
  const [creandoPaciente, setCreandoPaciente] = useState(false)
  const [errorNuevoPaciente, setErrorNuevoPaciente] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [nuevoHistorial, setNuevoHistorial] = useState('')
  const [nuevoPesoIdeal, setNuevoPesoIdeal] = useState('')

  async function cargarPacientes() {
    setCargando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error: consultaError } = await supabase
      .from('PACIENTES')
      .select('*')
      .eq('nutricionista_id', user.id)

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

  useEffect(() => {
    cargarPacientes()
  }, [])

  useEffect(() => {
    if (seleccionado) {
      setPesoEditado(seleccionado['Peso actual'] ?? '')
      setAlturaEditado(seleccionado.Altura ?? '')
      setMensajeGuardado('')
    }
  }, [seleccionado])

  async function guardarCambios() {
    setGuardando(true)
    setMensajeGuardado('')
  
    const imcCalculado = calcularIMC(pesoEditado, alturaEditado)
  
    const { data, error: updateError } = await supabase
      .from('PACIENTES')
      .update({
        'Peso actual': pesoEditado,
        Altura: alturaEditado,
        IMC: imcCalculado,
      })
      .eq('id', seleccionado.id)
      .select()
  
    setGuardando(false)
  
    if (updateError) {
      setMensajeGuardado('Error al guardar: ' + updateError.message)
      return
    }
  
    const pacienteActualizado = data[0]
    setPacientes((listaActual) =>
      listaActual.map((p) => (p.id === pacienteActualizado.id ? pacienteActualizado : p))
    )
    setSeleccionado(pacienteActualizado)
    setMensajeGuardado('Cambios guardados correctamente.')
  }

  async function agregarPaciente(event) {
    event.preventDefault()
    setErrorNuevoPaciente('')
  
    const nombre = nuevoNombre.trim()
    const dni = nuevoDni.trim()
  
    if (!nombre) {
      setErrorNuevoPaciente('El nombre es obligatorio.')
      return
    }
  
    if (!/^\d{8}$/.test(dni)) {
      setErrorNuevoPaciente('El DNI debe tener exactamente 8 números.')
      return
    }
  
    if (nuevaPassword.length < 6) {
      setErrorNuevoPaciente('La contraseña debe tener al menos 6 caracteres.')
      return
    }
  
    const imcCalculado = calcularIMC(nuevoPeso, nuevaAltura)
  
    setCreandoPaciente(true)
  
    const { data, error: fnError } = await supabase.functions.invoke('crear-paciente', {
      body: {
        nombre,
        dni,
        password: nuevaPassword,
        peso: nuevoPeso.trim() || null,
        altura: nuevaAltura.trim() || null,
        pesoIdeal: nuevoPesoIdeal.trim() || null,
        historial: nuevoHistorial.trim() || null,
        diagnostico: nuevoDiagnostico.trim() || null,
        plan: nuevoPlan.trim() || null,
        imc: imcCalculado,
      },
    })
  
    setCreandoPaciente(false)
  
    if (fnError || data?.error) {
      setErrorNuevoPaciente(data?.error || fnError.message)
      return
    }
  
    const pacienteCreado = data.paciente
    setPacientes((listaActual) => [...listaActual, pacienteCreado])
    setSeleccionado(pacienteCreado)
  
    setNuevoNombre('')
    setNuevoDni('')
    setNuevaPassword('')
    setNuevoPeso('')
    setNuevaAltura('')
    setNuevoPesoIdeal('')
    setNuevoHistorial('')
    setNuevoDiagnostico('')
    setNuevoPlan('')
    setMostrarFormulario(false)
  }

  const imc = seleccionado
    ? calcularIMC(seleccionado['Peso actual'], seleccionado.Altura)
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

      {!cargando && !error ? (
        <div className="panel-cuerpo">
          <aside className="panel-lista">
            <h2>Pacientes</h2>

            <button
              type="button"
              className="registro-boton"
              onClick={() => setMostrarFormulario((v) => !v)}
              style={{ marginBottom: '12px' }}
            >
              {mostrarFormulario ? 'Cancelar' : '+ Nuevo paciente'}
            </button>

            {mostrarFormulario ? (
              <form onSubmit={agregarPaciente} className="panel-editar">
                {errorNuevoPaciente ? (
                  <p className="registro-error" role="alert">{errorNuevoPaciente}</p>
                ) : null}

                <label>
                  Nombre *
                  <input
                    type="text"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    disabled={creandoPaciente}
                  />
                </label>

                <label>
                  DNI (8 dígitos) *
                  <input
                    type="text"
                    maxLength={8}
                    value={nuevoDni}
                    onChange={(e) => setNuevoDni(e.target.value.replace(/\D/g, ''))}
                    disabled={creandoPaciente}
                  />
                </label>

                <label>
                  Contraseña inicial del paciente *
                  <input
                    type="text"
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    disabled={creandoPaciente}
                  />
                </label>

                <label>
                  Peso (kg)
                  <input
                    type="number"
                    step="0.1"
                    value={nuevoPeso}
                    onChange={(e) => setNuevoPeso(e.target.value)}
                    disabled={creandoPaciente}
                  />
                </label>

                <label>
                  Altura (m)
                  <input
                    type="number"
                    step="0.01"
                    value={nuevaAltura}
                    onChange={(e) => setNuevaAltura(e.target.value)}
                    disabled={creandoPaciente}
                  />
                </label>

                <label>
                  Peso ideal (kg)
                  <input
                    type="number"
                    step="0.1"
                    value={nuevoPesoIdeal}
                    onChange={(e) => setNuevoPesoIdeal(e.target.value)}
                    disabled={creandoPaciente}
                  />
                </label>

                <label>
                  Historial
                  <textarea
                    value={nuevoHistorial}
                    onChange={(e) => setNuevoHistorial(e.target.value)}
                    disabled={creandoPaciente}
                    rows={3}
                  />
                </label>

                <label>
                  Diagnóstico
                  <input
                    type="text"
                    value={nuevoDiagnostico}
                    onChange={(e) => setNuevoDiagnostico(e.target.value)}
                    disabled={creandoPaciente}
                  />
                </label>

                <label>
                  Plan recomendado
                  <input
                    type="text"
                    value={nuevoPlan}
                    onChange={(e) => setNuevoPlan(e.target.value)}
                    disabled={creandoPaciente}
                  />
                </label>

                <button type="submit" disabled={creandoPaciente}>
                  {creandoPaciente ? 'Guardando...' : 'Guardar paciente'}
                </button>
              </form>
            ) : null}

            {pacientes.length === 0 ? (
              <p className="panel-estado">Aún no tienes pacientes registrados.</p>
            ) : (
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
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          <section className="panel-detalle" aria-live="polite">
            {seleccionado ? (
              <>
                <h2>{nombrePaciente(seleccionado)}</h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  {imc != null ? <BodySilhouette color={colorCategoria(imc)} /> : null}

                  <div>
                    <dl className="panel-datos">
                      <div>
                        <dt>Peso</dt>
                        <dd>
                          {seleccionado['Peso actual'] != null ? `${seleccionado['Peso actual']} kg` : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Altura</dt>
                        <dd>
                          {seleccionado.Altura != null ? `${seleccionado.Altura} m` : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>IMC</dt>
                        <dd>{imc != null ? imc.toFixed(1) : '—'}</dd>
                      </div>
                    </dl>

                    <p className={claseCategoria(categoria)}>{categoria}</p>
                  </div>
                </div>

                <div className="panel-editar">
                  <h3>Actualizar datos</h3>
                  <label>
                    Peso (kg)
                    <input
                      type="number"
                      step="0.1"
                      value={pesoEditado}
                      onChange={(e) => setPesoEditado(e.target.value)}
                    />
                  </label>
                  <label>
                    Altura (m)
                    <input
                      type="number"
                      step="0.01"
                      value={alturaEditado}
                      onChange={(e) => setAlturaEditado(e.target.value)}
                    />
                  </label>
                  <button type="button" onClick={guardarCambios} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  {mensajeGuardado ? <p>{mensajeGuardado}</p> : null}
                </div>
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