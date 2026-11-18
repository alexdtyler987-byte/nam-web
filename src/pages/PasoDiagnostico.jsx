import { useEffect, useState } from 'react'
import Diagnosticos from './Diagnosticos'
import usePlanNutricional from './usePlanNutricional'
import { OBJETIVOS_TRATAMIENTO } from './nutricionPlan'
import { sincronizarPlanRecomendado } from './sincronizacionApp'
import { fechaHoy } from './utilidades'

function aNumero(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Paso 5: con la evaluación ya hecha, se registra el diagnóstico (CIE-10) y el objetivo del tratamiento.
// - onPaciente(paciente): la fila del paciente cambió (el diagnóstico principal y el plan se copian a PACIENTES para la app)
// - onFinalizar(): terminar el asistente
function PasoDiagnostico({ paciente, onPaciente, onAtras, onFinalizar }) {
  const { plan, cargando, error: errorPlan, guardar } = usePlanNutricional(paciente.id)
  const [form, setForm] = useState({ objetivo: '', pesoObjetivo: '', fechaObjetivo: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // El formulario se llena cuando termina de cargar el plan de este paciente
  useEffect(() => {
    if (cargando) return
    setForm({
      objetivo: plan?.objetivo ?? '',
      pesoObjetivo: plan?.peso_objetivo ?? '',
      fechaObjetivo: plan?.fecha_objetivo ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.id, cargando])

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function finalizar() {
    setError('')

    const peso = aNumero(form.pesoObjetivo)
    if (form.pesoObjetivo !== '' && (!peso || peso < 20 || peso > 400)) {
      return setError('El peso objetivo debe estar entre 20 y 400 kg.')
    }
    if (form.fechaObjetivo && form.fechaObjetivo < fechaHoy()) {
      return setError('La fecha objetivo no puede ser anterior a hoy.')
    }

    // Si no se escribió ningún objetivo, simplemente se termina
    if (form.objetivo || peso || form.fechaObjetivo) {
      setGuardando(true)

      const respuesta = await guardar({
        objetivo: form.objetivo || null,
        peso_objetivo: peso ?? null,
        fecha_objetivo: form.fechaObjetivo || null,
      })

      if (!respuesta.ok) {
        setGuardando(false)
        return setError('No se pudo guardar el objetivo: ' + respuesta.mensaje)
      }

      // La app móvil lee "Plan recomendado": se mantiene al día con el objetivo
      const fila = await sincronizarPlanRecomendado(paciente, respuesta.plan)
      if (fila) onPaciente(fila)
      setGuardando(false)
    }

    onFinalizar()
  }

  return (
    <div className="asistente-form">
      <p className="asistente-ayuda">
        Con la evaluación hecha, registra el diagnóstico. El principal se mostrará también en la app del paciente.
      </p>

      <Diagnosticos paciente={paciente} onPacienteActualizado={onPaciente} />

      <section className="tarjeta" style={{ marginTop: '16px' }}>
        <h2>Objetivo del tratamiento</h2>
        <p className="asistente-ayuda">
          Opcional por ahora. Después puedes completar la meta calórica, los macronutrientes y el plan semanal en la
          pestaña «Gasto y plan».
        </p>

        {errorPlan ? (
          <p className="registro-error" role="alert">
            {errorPlan}
          </p>
        ) : null}
        {error ? (
          <p className="registro-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="form-grid">
          <label className="campo">
            Objetivo
            <select
              value={form.objetivo}
              onChange={(e) => cambiar('objetivo', e.target.value)}
              disabled={guardando || cargando}
            >
              <option value="">Sin definir</option>
              {OBJETIVOS_TRATAMIENTO.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            Peso objetivo (kg)
            <input
              type="number"
              step="0.1"
              value={form.pesoObjetivo}
              onChange={(e) => cambiar('pesoObjetivo', e.target.value)}
              disabled={guardando || cargando}
            />
          </label>
          <label className="campo">
            Fecha objetivo
            <input
              type="date"
              min={fechaHoy()}
              value={form.fechaObjetivo}
              onChange={(e) => cambiar('fechaObjetivo', e.target.value)}
              disabled={guardando || cargando}
            />
          </label>
        </div>
      </section>

      <div className="asistente-acciones">
        <button type="button" className="btn-secundario" onClick={onAtras} disabled={guardando}>
          Atrás
        </button>
        <span className="asistente-acciones-espacio" />
        <button type="button" className="registro-boton" onClick={finalizar} disabled={guardando || cargando}>
          {guardando ? 'Guardando…' : 'Finalizar primera consulta'}
        </button>
      </div>
    </div>
  )
}

export default PasoDiagnostico