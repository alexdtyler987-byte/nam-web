import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './Panel.css'

const TIPOS_COMIDA = ['desayuno', 'almuerzo', 'cena']

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

function fechaHoy() {
  return new Date().toLocaleDateString('en-CA')
}

function capitalizar(texto) {
  const t = String(texto || '')
  return t.charAt(0).toUpperCase() + t.slice(1)
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
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [nuevoPeso, setNuevoPeso] = useState('')
  const [nuevaAltura, setNuevaAltura] = useState('')
  const [nuevoPesoIdeal, setNuevoPesoIdeal] = useState('')
  const [nuevoHistorial, setNuevoHistorial] = useState('')
  const [nuevoDiagnostico, setNuevoDiagnostico] = useState('')
  const [nuevoPlan, setNuevoPlan] = useState('')
  const [creandoPaciente, setCreandoPaciente] = useState(false)
  const [errorNuevoPaciente, setErrorNuevoPaciente] = useState('')

  const [comidasHoy, setComidasHoy] = useState([])
  const [alertas, setAlertas] = useState([])

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

  useEffect(() => {
    if (pacientes.length === 0) return

    const ids = pacientes.map((p) => p.id)
    let cancelado = false

    async function cargarComidasHoy() {
      const { data } = await supabase
        .from('PROGRESO-COMIDAS')
        .select('*')
        .in('paciente_id', ids)
        .eq('fecha', fechaHoy())

      if (!cancelado) setComidasHoy(data ?? [])
    }

    cargarComidasHoy()

    const canal = supabase
      .channel('progreso-comidas-nutricionista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'PROGRESO-COMIDAS' },
        (payload) => {
          const fila = payload.new
          if (!fila || !ids.includes(fila.paciente_id)) return

          setComidasHoy((actual) => {
            const sinEsta = actual.filter((c) => c.id !== fila.id)
            return fila.fecha === fechaHoy() ? [...sinEsta, fila] : sinEsta
          })

          if (fila.completado) {
            const paciente = pacientes.find((p) => p.id === fila.paciente_id)
            setAlertas((actual) =>
              [
                {
                  clave: `${fila.id}-${Date.now()}`,
                  nombre: paciente ? nombrePaciente(paciente) : 'Un paciente',
                  tipo: fila.tipo_comida,
                  hora: fila.hora_completado || new Date().toISOString(),
                },
                ...actual,
              ].slice(0, 10),
            )
          }
        },
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [pacientes])

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

  const comidasDelSeleccionado = seleccionado
    ? comidasHoy.filter((c) => c.paciente_id === seleccionado.id)
    : []

  function comidaCompletada(tipo) {
    return comidasDelSeleccionado.some(
      (c) => c.completado && String(c.tipo_comida).toLowerCase() === tipo,
    )
  }

  return (
    <main className="panel">
      <header className="panel-cabecera">
        <h1>Panel de pacientes</h1>
        <p>Selecciona un paciente para ver su información antropométrica.</p>
      </header>

      {alertas.length > 0 ? (
        <section className="panel-alertas" aria-live="polite">
          <div className="panel-alertas-cabecera">
            <h2>Alertas recientes</h2>
            <button type="button" onClick={() => setAlertas([])}>
              Limpiar todas
            </button>
          </div>
          <ul>
            {alertas.map((a) => (
              <li key={a.clave}>
                <span>
                  <strong>{a.nombre}</strong> confirmó su {String(a.tipo).toLowerCase()} ·{' '}
                  {new Date(a.hora).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <button
                  type="button"
                  aria-label="Descartar alerta"
                  onClick={() =>
                    setAlertas((actual) => actual.filter((x) => x.clave !== a.clave))
                  }
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

                <div className="panel-comidas">
                  <h3>Comidas de hoy</h3>
                  <ul>
                    {TIPOS_COMIDA.map((tipo) => (
                      <li
                        key={tipo}
                        className={comidaCompletada(tipo) ? 'comida-ok' : 'comida-pendiente'}
                      >
                        {comidaCompletada(tipo) ? '✓' : '○'} {capitalizar(tipo)}
                      </li>
                    ))}
                  </ul>
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