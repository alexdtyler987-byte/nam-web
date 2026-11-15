import { useEffect, useState } from 'react'
import { fechaHoy } from './utilidades'
import { diasEntre } from './fechasConsulta'
import {
  DISTRIBUCION_SUGERIDA,
  RANGOS_AMDR,
  gramosDeMacro,
  redondear,
  ritmoSemanal,
} from './nutricionPlan'
import './PlanNutricional.css'

const OBJETIVOS = [
  'Bajar de peso',
  'Mantener peso',
  'Subir de peso',
  'Mejorar hábitos',
  'Control de una condición',
]

const MACROS = [
  ['proteinas', 'Proteínas'],
  ['carbohidratos', 'Carbohidratos'],
  ['grasas', 'Grasas'],
]

const VACIO = {
  objetivo: '',
  pesoObjetivo: '',
  fechaObjetivo: '',
  proteinas: '',
  carbohidratos: '',
  grasas: '',
  recomendaciones: '',
}

function desdePlan(plan) {
  if (!plan) return VACIO
  return {
    objetivo: plan.objetivo ?? '',
    pesoObjetivo: plan.peso_objetivo ?? '',
    fechaObjetivo: plan.fecha_objetivo ?? '',
    proteinas: plan.proteinas_pct ?? '',
    carbohidratos: plan.carbohidratos_pct ?? '',
    grasas: plan.grasas_pct ?? '',
    recomendaciones: plan.recomendaciones ?? '',
  }
}

function aNumero(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Un porcentaje puede ser 0, por eso no se usa aNumero
function aPorcentaje(valor) {
  if (valor === '' || valor == null) return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

// - errorPlan: texto si no se pudo cargar el plan (por ejemplo, si la tabla aún no existe)
function ObjetivosPlan({ paciente, plan, planCargado, errorPlan, onGuardarPlan }) {
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)

  // El formulario se llena una vez que termina de cargar el plan de ESTE paciente.
  // No depende de "plan" a propósito: si otra tarjeta guarda algo, aquí no se pierde lo que se está escribiendo.
  useEffect(() => {
    if (planCargado) setForm(desdePlan(plan))
    setAviso(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.id, planCargado])

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  const pesoActual = aNumero(paciente['Peso actual'])
  const pesoObjetivo = aNumero(form.pesoObjetivo)
  const dias = form.fechaObjetivo ? diasEntre(fechaHoy(), form.fechaObjetivo) : null
  const ritmo = pesoActual && pesoObjetivo && dias > 0 ? ritmoSemanal(pesoActual, pesoObjetivo, dias) : null

  const avisosObjetivo = []
  if (pesoActual && pesoObjetivo) {
    if (form.objetivo === 'Bajar de peso' && pesoObjetivo >= pesoActual) {
      avisosObjetivo.push('Para bajar de peso, el peso objetivo debería ser menor que el actual.')
    }
    if (form.objetivo === 'Subir de peso' && pesoObjetivo <= pesoActual) {
      avisosObjetivo.push('Para subir de peso, el peso objetivo debería ser mayor que el actual.')
    }
  }
  if (ritmo != null && ritmo > 1) {
    avisosObjetivo.push(
      `Ese plazo exige bajar ${redondear(ritmo, 2)} kg por semana, más rápido de lo habitual (0,5 a 1 kg por semana).`,
    )
  }
  if (ritmo != null && ritmo < -0.5) {
    avisosObjetivo.push(
      `Ese plazo exige subir ${redondear(Math.abs(ritmo), 2)} kg por semana, más rápido de lo habitual.`,
    )
  }

  const porcentajes = MACROS.map(([clave]) => aPorcentaje(form[clave]))
  const hayAlgunMacro = MACROS.some(([clave]) => form[clave] !== '')
  // Se redondea para evitar errores de decimales de JavaScript (33,3 + 33,3 + 33,4)
  const suma = Math.round(porcentajes.reduce((s, v) => s + (v ?? 0), 0) * 100) / 100
  const metaKcal = plan?.meta_kcal != null ? Number(plan.meta_kcal) : null

  function usarSugeridos() {
    setForm((actual) => ({
      ...actual,
      proteinas: DISTRIBUCION_SUGERIDA.proteinas,
      carbohidratos: DISTRIBUCION_SUGERIDA.carbohidratos,
      grasas: DISTRIBUCION_SUGERIDA.grasas,
    }))
  }

  async function guardar(event) {
    event.preventDefault()
    setAviso(null)

    if (form.pesoObjetivo !== '' && !pesoObjetivo) {
      setAviso({ tipo: 'error', texto: 'El peso objetivo no es válido.' })
      return
    }
    if (pesoObjetivo && (pesoObjetivo < 20 || pesoObjetivo > 400)) {
      setAviso({ tipo: 'error', texto: 'El peso objetivo debe estar entre 20 y 400 kg.' })
      return
    }
    if (form.fechaObjetivo && form.fechaObjetivo < fechaHoy()) {
      setAviso({ tipo: 'error', texto: 'La fecha objetivo no puede ser anterior a hoy.' })
      return
    }
    if (hayAlgunMacro) {
      if (porcentajes.some((p) => p == null || p < 0)) {
        setAviso({ tipo: 'error', texto: 'Completa los tres porcentajes de macronutrientes.' })
        return
      }
      if (suma !== 100) {
        setAviso({ tipo: 'error', texto: `Los porcentajes deben sumar 100 % (ahora suman ${suma} %).` })
        return
      }
    }

    setGuardando(true)

    const respuesta = await onGuardarPlan({
      objetivo: form.objetivo || null,
      peso_objetivo: pesoObjetivo ?? null,
      fecha_objetivo: form.fechaObjetivo || null,
      proteinas_pct: hayAlgunMacro ? porcentajes[0] : null,
      carbohidratos_pct: hayAlgunMacro ? porcentajes[1] : null,
      grasas_pct: hayAlgunMacro ? porcentajes[2] : null,
      recomendaciones: form.recomendaciones.trim() || null,
    })

    setGuardando(false)
    setAviso(
      respuesta.ok
        ? { tipo: 'ok', texto: 'Objetivos guardados.' }
        : { tipo: 'error', texto: 'No se pudo guardar: ' + respuesta.mensaje },
    )
  }

  return (
    <section className="tarjeta">
      <h2>Objetivos y distribución de macronutrientes</h2>

      {errorPlan ? (
        <p className="registro-error" role="alert">
          {errorPlan}
        </p>
      ) : null}

      <form onSubmit={guardar} noValidate>
        <h3 className="plan-seccion">Objetivo del tratamiento</h3>
        <div className="form-grid">
          <label className="campo">
            Objetivo
            <select
              value={form.objetivo}
              onChange={(e) => cambiar('objetivo', e.target.value)}
              disabled={guardando}
            >
              <option value="">Sin definir</option>
              {OBJETIVOS.map((o) => (
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
              disabled={guardando}
            />
          </label>
          <label className="campo">
            Fecha objetivo
            <input
              type="date"
              min={fechaHoy()}
              value={form.fechaObjetivo}
              onChange={(e) => cambiar('fechaObjetivo', e.target.value)}
              disabled={guardando}
            />
          </label>
        </div>

        {pesoActual && pesoObjetivo ? (
          <p className="objetivo-info">
            Peso actual {pesoActual} kg · diferencia hasta el objetivo{' '}
            <strong>
              {redondear(pesoObjetivo - pesoActual, 1) > 0 ? '+' : ''}
              {redondear(pesoObjetivo - pesoActual, 1)} kg
            </strong>
            {ritmo != null && Math.abs(ritmo) <= 1 ? (
              <> · ritmo necesario: {redondear(Math.abs(ritmo), 2)} kg por semana</>
            ) : null}
          </p>
        ) : null}

        {avisosObjetivo.map((texto) => (
          <p key={texto} className="hc-aviso" role="status">
            {texto}
          </p>
        ))}

        <h3 className="plan-seccion">Distribución de macronutrientes (% de las calorías)</h3>
        <div className="macros-grid">
          {MACROS.map(([clave, etiqueta], indice) => {
            const valor = porcentajes[indice]
            const [minimo, maximo] = RANGOS_AMDR[clave]
            const fuera = valor != null && (valor < minimo || valor > maximo)
            const gramos = metaKcal && valor != null ? gramosDeMacro(metaKcal, valor, clave) : null

            return (
              <div key={clave} className="macro-caja">
                <label className="campo">
                  {etiqueta} (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form[clave]}
                    onChange={(e) => cambiar(clave, e.target.value)}
                    disabled={guardando}
                  />
                </label>
                {gramos != null ? (
                  <p className="macro-gramos">
                    <strong>{redondear(gramos)} g</strong> al día
                    {pesoActual ? ` · ${redondear(gramos / pesoActual, 1)} g/kg` : ''}
                  </p>
                ) : null}
                <p className={fuera ? 'macro-rango macro-rango-fuera' : 'macro-rango'}>
                  Referencia: {minimo} a {maximo} %{fuera ? ' · fuera de rango' : ''}
                </p>
              </div>
            )
          })}
        </div>

        <div className="macros-pie">
          {hayAlgunMacro ? (
            <p className={suma === 100 ? 'suma-ok' : 'suma-mal'} role="status">
              Suma: {suma} %{suma === 100 ? ' ✓' : ' (debe ser 100 %)'}
            </p>
          ) : (
            <p className="meta-estado">Sin distribución definida.</p>
          )}
          <button type="button" className="btn-secundario" onClick={usarSugeridos} disabled={guardando}>
            Usar valores sugeridos ({DISTRIBUCION_SUGERIDA.proteinas} / {DISTRIBUCION_SUGERIDA.carbohidratos} /{' '}
            {DISTRIBUCION_SUGERIDA.grasas})
          </button>
        </div>

        {!metaKcal ? (
          <p className="estado">
            Guarda la meta calórica en «Gasto energético estimado» para ver cuántos gramos de cada macronutriente
            corresponden.
          </p>
        ) : null}

        <label className="campo" style={{ marginTop: '14px' }}>
          Recomendaciones generales para el paciente
          <textarea
            rows={3}
            value={form.recomendaciones}
            onChange={(e) => cambiar('recomendaciones', e.target.value)}
            disabled={guardando}
            placeholder="Hidratación, horarios de comida, actividad física... Saldrán en el plan impreso."
          />
        </label>

        {aviso ? (
          <p
            className={aviso.tipo === 'ok' ? 'aviso-guardado' : 'registro-error'}
            role={aviso.tipo === 'ok' ? 'status' : 'alert'}
          >
            {aviso.texto}
          </p>
        ) : null}

        <div className="meta-acciones">
          <button type="submit" className="registro-boton" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar objetivos'}
          </button>
        </div>
      </form>

      <p className="actualizacion">
        Los rangos de referencia son los de distribución aceptable de macronutrientes para adultos (AMDR). La
        distribución final de cada paciente la decide la nutricionista.
      </p>
    </section>
  )
}

export default ObjetivosPlan