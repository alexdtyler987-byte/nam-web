import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { edadDesde, formatoFecha } from './utilidades'
import './PlanNutricional.css'

const FACTORES = {
  Sedentaria: 1.2,
  Ligera: 1.375,
  Moderada: 1.55,
  Intensa: 1.725,
}

function aNumero(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function tasaBasal(formula, sexo, peso, tallaCm, edad) {
  const hombre = sexo === 'Hombre'

  if (formula === 'harris') {
    return hombre
      ? 88.362 + 13.397 * peso + 4.799 * tallaCm - 5.677 * edad
      : 447.593 + 9.247 * peso + 3.098 * tallaCm - 4.33 * edad
  }

  return 10 * peso + 6.25 * tallaCm - 5 * edad + (hombre ? 5 : -161)
}

// - plan: plan nutricional guardado del paciente (o null)
// - planCargado: true cuando ya terminó de consultarse el plan
// - onGuardarPlan(cambios): guarda en PLAN-NUTRICIONAL y devuelve { ok, mensaje }
function GastoEnergetico({ paciente, version, plan, planCargado, onGuardarPlan }) {
  const [actividadFicha, setActividadFicha] = useState('')
  // Valores elegidos a mano en esta pantalla (null = todavía no se tocó, se usa el guardado o el de la ficha)
  const [actividadManual, setActividadManual] = useState(null)
  const [formulaManual, setFormulaManual] = useState(null)
  const [ajusteManual, setAjusteManual] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    setActividadManual(null)
    setFormulaManual(null)
    setAjusteManual(null)
    setAviso(null)
  }, [paciente.id])

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setError('')

      const { data, error: consultaError } = await supabase
        .from('HISTORIA-CLINICA')
        .select('actividad_fisica')
        .eq('paciente_id', paciente.id)
        .maybeSingle()

      if (cancelado) return

      if (consultaError) {
        setError('No se pudo leer la actividad física: ' + consultaError.message)
        return
      }

      setActividadFicha(data?.actividad_fisica ?? '')
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [paciente.id, version])

  // Prioridad: lo que se elige aquí > la ficha clínica > lo guardado en el plan
  const actividad = actividadManual ?? (actividadFicha || plan?.actividad || '')
  const formula = formulaManual ?? plan?.formula ?? 'mifflin'
  const ajuste = ajusteManual ?? String(plan?.ajuste_kcal ?? 0)

  const peso = aNumero(paciente['Peso actual'])
  const altura = aNumero(paciente.Altura)
  const edad = edadDesde(paciente.fecha_nacimiento)
  const sexo = paciente.sexo

  const faltan = []
  if (!peso || peso < 10 || peso > 400) faltan.push('peso')
  if (!altura || altura < 0.5 || altura > 2.5) faltan.push('talla en metros')
  if (edad == null) faltan.push('fecha de nacimiento')
  if (!sexo) faltan.push('sexo')

  const esMenor = edad != null && edad < 18
  const calculable = faltan.length === 0 && !esMenor && actividad !== ''

  let basal = null
  let total = null
  let meta = null

  if (calculable) {
    basal = tasaBasal(formula, sexo, peso, altura * 100, edad)
    total = basal * FACTORES[actividad]
    meta = total + (Number(ajuste) || 0)
  }

  const metaGuardada = plan?.meta_kcal != null ? Number(plan.meta_kcal) : null
  const metaActual = meta != null ? Math.round(meta) : null
  const coincide = metaGuardada != null && metaActual != null && metaGuardada === metaActual

  async function guardarMeta() {
    setGuardando(true)
    setAviso(null)

    const respuesta = await onGuardarPlan({
      formula,
      actividad,
      ajuste_kcal: Math.round(Number(ajuste) || 0),
      tasa_basal: Math.round(basal),
      gasto_total: Math.round(total),
      meta_kcal: metaActual,
      meta_calculada_en: new Date().toISOString(),
    })

    setGuardando(false)
    setAviso(
      respuesta.ok
        ? { tipo: 'ok', texto: 'Meta guardada para este paciente.' }
        : { tipo: 'error', texto: 'No se pudo guardar la meta: ' + respuesta.mensaje },
    )
  }

  return (
    <section className="tarjeta">
      <h2>Gasto energético estimado</h2>

      {error ? <p className="registro-error" role="alert">{error}</p> : null}

      {faltan.length > 0 ? (
        <p className="estado">
          Para calcularlo falta completar: {faltan.join(', ')}. Se actualizan en «Registrar nueva medición»
          (pestaña Resumen).
        </p>
      ) : null}

      {esMenor ? (
        <p className="estado">
          Estas fórmulas son para adultos. Para menores de 18 años hay que usar otros métodos.
        </p>
      ) : null}

      <div className="form-grid">
        <label className="campo">
          Fórmula
          <select value={formula} onChange={(e) => setFormulaManual(e.target.value)}>
            <option value="mifflin">Mifflin-St Jeor</option>
            <option value="harris">Harris-Benedict revisada</option>
          </select>
        </label>

        <label className="campo">
          Actividad física
          <select value={actividad} onChange={(e) => setActividadManual(e.target.value)}>
            <option value="">Elige un nivel</option>
            {Object.keys(FACTORES).map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel} (×{FACTORES[nivel]})
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          Ajuste (kcal)
          <input
            type="number"
            step="50"
            min="-1500"
            max="1500"
            value={ajuste}
            onChange={(e) => setAjusteManual(e.target.value)}
          />
        </label>
      </div>

      {faltan.length === 0 && !esMenor && actividad === '' ? (
        <p className="estado" style={{ marginTop: '12px' }}>
          Elige un nivel de actividad, o complétalo en la ficha clínica.
        </p>
      ) : null}

      {calculable ? (
        <>
          <div className="medidas" style={{ marginTop: '14px' }}>
            <div className="medida">
              <span>Tasa basal</span>
              <strong>{Math.round(basal)} kcal</strong>
            </div>
            <div className="medida">
              <span>Gasto total</span>
              <strong>{Math.round(total)} kcal</strong>
            </div>
            <div className="medida medida-imc">
              <span>Meta calórica</span>
              <strong>{metaActual} kcal</strong>
            </div>
          </div>

          {meta < basal ? (
            <p className="hc-aviso" role="status" style={{ marginTop: '12px' }}>
              La meta está por debajo de la tasa basal. Revisa el ajuste.
            </p>
          ) : null}
        </>
      ) : null}

      {/* ---------- Meta guardada del paciente ---------- */}
      {planCargado ? (
        <div className="meta-bloque">
          {metaGuardada == null ? (
            <p className="meta-estado">Aún no hay una meta calórica guardada para este paciente.</p>
          ) : coincide ? (
            <p className="meta-estado meta-estado-ok">
              Meta guardada: <strong>{metaGuardada} kcal</strong> · {formatoFecha(plan.meta_calculada_en)}
            </p>
          ) : calculable ? (
            <p className="meta-estado meta-estado-aviso">
              La meta guardada es de <strong>{metaGuardada} kcal</strong> ({formatoFecha(plan.meta_calculada_en)}) y la
              calculada ahora es de <strong>{metaActual} kcal</strong>. Si cambió el peso o la actividad, actualízala.
            </p>
          ) : (
            <p className="meta-estado">
              Meta guardada: <strong>{metaGuardada} kcal</strong> · {formatoFecha(plan.meta_calculada_en)}
            </p>
          )}

          {calculable ? (
            <div className="meta-acciones">
              <button
                type="button"
                className="registro-boton"
                onClick={guardarMeta}
                disabled={guardando || coincide}
              >
                {guardando
                  ? 'Guardando…'
                  : coincide
                    ? 'Meta guardada'
                    : metaGuardada != null
                      ? 'Actualizar meta guardada'
                      : 'Guardar como meta del paciente'}
              </button>
            </div>
          ) : null}

          {aviso ? (
            <p className={aviso.tipo === 'ok' ? 'aviso-guardado' : 'registro-error'} role="status">
              {aviso.texto}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="actualizacion">
        Estimación orientativa para adultos: el criterio final es de la nutricionista. No considera embarazo,
        lactancia ni condiciones clínicas especiales.
      </p>
    </section>
  )
}

export default GastoEnergetico