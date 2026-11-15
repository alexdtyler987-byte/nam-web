import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  TIPOS_DIETA,
  TOLERANCIA_MACROS,
  diasCompletos,
  estadoContraMeta,
  porcentajesDeEnergia,
  promedioDeDias,
  redondear,
  totalesPorDia,
} from './nutricionPlan'
import './PlanNutricional.css'

const ETIQUETAS_ESTADO = {
  ok: 'En la meta',
  bajo: 'Por debajo de la meta',
  alto: 'Por encima de la meta',
}

// Resumen nutricional del plan semanal de un paciente, comparado con su meta calórica y su distribución objetivo.
// - plan: plan nutricional guardado (o null)
// - version: cambia cuando se edita el plan, para volver a calcular
function ResumenNutricional({ paciente, plan, version }) {
  const [dieta, setDieta] = useState([])
  const [nutrientes, setNutrientes] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError('')

      const [d, n] = await Promise.all([
        supabase.from('DIETA-PACIENTE').select('*').eq('paciente_id', paciente.id),
        supabase.from('COMIDA-NUTRIENTES').select('*'),
      ])

      if (cancelado) return

      const fallo = d.error || n.error
      if (fallo) {
        setError('No se pudo calcular el resumen: ' + fallo.message)
        setCargando(false)
        return
      }

      const mapa = {}
      ;(n.data ?? []).forEach((fila) => {
        mapa[fila.comida_id] = fila
      })

      setDieta(d.data ?? [])
      setNutrientes(mapa)
      setCargando(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [paciente.id, version])

  const totales = totalesPorDia(dieta, nutrientes)
  const completos = diasCompletos(totales)
  const promedio = promedioDeDias(completos)
  const incompleto = completos.some((d) => d.incompleto)
  const energia = promedio ? porcentajesDeEnergia(promedio) : null
  const meta = plan?.meta_kcal != null ? Number(plan.meta_kcal) : null
  const comparacion = promedio && meta ? estadoContraMeta(promedio.kcal, meta) : null
  const tieneDistribucion = plan?.proteinas_pct != null

  const macros = promedio
    ? [
        ['Proteínas', promedio.proteinas, energia?.proteinas, plan?.proteinas_pct],
        ['Carbohidratos', promedio.carbohidratos, energia?.carbohidratos, plan?.carbohidratos_pct],
        ['Grasas', promedio.grasa, energia?.grasas, plan?.grasas_pct],
      ]
    : []

  return (
    <div className="resumen-plan">
      <h3>Resumen nutricional del plan</h3>

      {error ? (
        <p className="registro-error" role="alert">
          {error}
        </p>
      ) : null}

      {cargando ? <div className="esqueleto esq-detalle" aria-label="Calculando resumen" /> : null}

      {!cargando && !error && !promedio ? (
        <p className="estado">
          Asigna desayuno, almuerzo y cena en al menos un día para ver el resumen nutricional.
        </p>
      ) : null}

      {!cargando && promedio ? (
        <>
          <div className="medidas">
            <div className="medida">
              <span>Promedio diario</span>
              <strong>{redondear(promedio.kcal)} kcal</strong>
            </div>
            <div className="medida">
              <span>Meta calórica</span>
              <strong>{meta ? `${meta} kcal` : '—'}</strong>
            </div>
            <div className={comparacion ? `medida resumen-${comparacion.estado}` : 'medida'}>
              <span>Diferencia con la meta</span>
              <strong>
                {comparacion
                  ? `${comparacion.diferencia > 0 ? '+' : ''}${redondear(comparacion.diferencia)} kcal`
                  : '—'}
              </strong>
              {comparacion ? (
                <small>
                  {ETIQUETAS_ESTADO[comparacion.estado]} ({redondear(comparacion.porcentaje)} %)
                </small>
              ) : null}
            </div>
          </div>

          {!meta ? (
            <p className="estado">
              Guarda la meta calórica del paciente en «Gasto energético estimado» para compararla aquí.
            </p>
          ) : null}

          <div className="tabla-wrap" style={{ marginTop: '14px' }}>
            <table className="tabla resumen-tabla">
              <thead>
                <tr>
                  <th>Macronutriente</th>
                  <th>Promedio diario</th>
                  <th>% de las calorías</th>
                  <th>Objetivo</th>
                </tr>
              </thead>
              <tbody>
                {macros.map(([nombre, gramos, real, objetivo]) => {
                  const cerca =
                    objetivo != null && real != null && Math.abs(real - Number(objetivo)) <= TOLERANCIA_MACROS
                  return (
                    <tr key={nombre}>
                      <td>{nombre}</td>
                      <td>{redondear(gramos)} g</td>
                      <td>{real != null ? `${redondear(real)} %` : '—'}</td>
                      <td>
                        {tieneDistribucion ? (
                          <span className={cerca ? 'resumen-chip resumen-chip-ok' : 'resumen-chip resumen-chip-ajustar'}>
                            {Number(objetivo)} % · {cerca ? 'cerca' : 'ajustar'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td>Fibra</td>
                  <td>{redondear(promedio.fibra)} g</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="actualizacion">
            Calculado con los {completos.length} {completos.length === 1 ? 'día' : 'días'} que tienen{' '}
            {TIPOS_DIETA.join(', ').toLowerCase()} (de 7). No incluye colaciones. Valores aproximados según la TPCA.
            {incompleto
              ? ' A algunas comidas les falta algún dato nutricional, así que los totales pueden ser algo menores.'
              : ''}
          </p>
        </>
      ) : null}
    </div>
  )
}

export default ResumenNutricional