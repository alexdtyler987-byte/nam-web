import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabaseClient'
import Logo from './Logo'
import { calcularIMC, categoriaIMC, edadDesde, fechaHoy, nombrePaciente } from './utilidades'
import { fechaLarga } from './fechasConsulta'
import { diasCompletos, gramosDeMacro, promedioDeDias, redondear } from './nutricionPlan'
import { armarSemana, hayComidas, preparaciones, textoCantidad, textoPorcion } from './armarPlanImpreso'
import './PlanImprimible.css'

// Vista previa del plan nutricional del paciente, lista para imprimir o guardar como PDF.
// - plan: plan nutricional guardado (meta, objetivos, macronutrientes, recomendaciones) o null
// - nutricionista: nombre del profesional (puede ser un correo si no tiene nombre cargado)
function PlanImprimible({ paciente, plan, nutricionista, onCerrar }) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const botonImprimirRef = useRef(null)

  // Mientras está abierta: el título de la pestaña será el nombre sugerido del PDF y la página de fondo no se desplaza
  useEffect(() => {
    const tituloAnterior = document.title
    const desbordeAnterior = document.body.style.overflow
    document.title = `Plan nutricional - ${nombrePaciente(paciente)}`
    document.body.style.overflow = 'hidden'

    return () => {
      document.title = tituloAnterior
      document.body.style.overflow = desbordeAnterior
    }
  }, [paciente])

  useEffect(() => {
    function alTeclear(event) {
      if (event.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError('')

      const [c, d, n, i, p, ficha, consulta] = await Promise.all([
        supabase.from('COMIDAS').select('id, nombre, tipo, preparacion'),
        supabase.from('DIETA-PACIENTE').select('*').eq('paciente_id', paciente.id),
        supabase.from('COMIDA-NUTRIENTES').select('*'),
        supabase.from('COMIDA-INGREDIENTES').select('comida_id, producto_id, cantidad, unidad'),
        supabase.from('PRODUCTOS').select('id, nombre'),
        supabase.from('HISTORIA-CLINICA').select('*').eq('paciente_id', paciente.id).maybeSingle(),
        supabase
          .from('CONSULTAS')
          .select('fecha, proxima_cita')
          .eq('paciente_id', paciente.id)
          .order('fecha', { ascending: false })
          .order('id', { ascending: false })
          .limit(1),
      ])

      if (cancelado) return

      // Los cinco primeros son indispensables. La historia clínica y las consultas son un complemento.
      const fallo = c.error || d.error || n.error || i.error || p.error
      if (fallo) {
        setError('No se pudo preparar el plan: ' + fallo.message)
        setCargando(false)
        return
      }

      const mapaNutrientes = {}
      ;(n.data ?? []).forEach((fila) => {
        mapaNutrientes[fila.comida_id] = fila
      })

      const alergias = ficha.error ? '' : String(ficha.data?.alergias ?? '').trim()
      const proxima = consulta.error ? null : (consulta.data?.[0]?.proxima_cita ?? null)

      setDatos({
        comidas: c.data ?? [],
        dieta: d.data ?? [],
        nutrientes: mapaNutrientes,
        ingredientes: i.data ?? [],
        productos: p.data ?? [],
        alergias,
        // Solo se muestra si el próximo control es de hoy en adelante
        proximoControl: proxima && String(proxima).slice(0, 10) >= fechaHoy() ? String(proxima).slice(0, 10) : null,
      })
      setCargando(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [paciente.id])

  useEffect(() => {
    if (!cargando) botonImprimirRef.current?.focus()
  }, [cargando])

  const semana = datos ? armarSemana(datos.dieta, datos.comidas, datos.nutrientes) : []
  const conComidas = hayComidas(semana)
  const recetas = datos ? preparaciones(datos.dieta, datos.comidas, datos.ingredientes, datos.productos) : []
  const promedio = promedioDeDias(diasCompletos(semana.map((d) => d.total)))

  const imc = calcularIMC(paciente['Peso actual'], paciente.Altura)
  const edad = edadDesde(paciente.fecha_nacimiento)
  const meta = plan?.meta_kcal != null ? Number(plan.meta_kcal) : null
  const tieneMacros = plan?.proteinas_pct != null
  const tieneObjetivo = Boolean(plan?.objetivo || plan?.peso_objetivo || plan?.fecha_objetivo)
  const nombreProfesional = nutricionista && !nutricionista.includes('@') ? nutricionista : ''

  const macros = tieneMacros
    ? [
        ['Proteínas', 'proteinas', Number(plan.proteinas_pct)],
        ['Carbohidratos', 'carbohidratos', Number(plan.carbohidratos_pct)],
        ['Grasas', 'grasas', Number(plan.grasas_pct)],
      ]
    : []

  return createPortal(
    <div className="plan-print-raiz" role="dialog" aria-modal="true" aria-label="Vista previa del plan nutricional">
      <div className="plan-print-barra">
        <p>
          Vista previa. Al imprimir, elige <strong>«Guardar como PDF»</strong> y desactiva los encabezados y pies de
          página del navegador para un resultado más limpio.
        </p>
        <button type="button" className="btn-secundario" onClick={onCerrar}>
          Cerrar
        </button>
        <button
          ref={botonImprimirRef}
          type="button"
          className="registro-boton"
          onClick={() => window.print()}
          disabled={cargando || !conComidas}
        >
          Imprimir o guardar como PDF
        </button>
      </div>

      {cargando ? (
        <p className="plan-print-estado" role="status">
          Preparando el plan…
        </p>
      ) : null}

      {error ? (
        <p className="plan-print-estado registro-error" role="alert">
          {error}
        </p>
      ) : null}

      {!cargando && !error ? (
        <article className="hoja">
          <header className="hoja-cabecera">
            <Logo ancho={120} />
            <div className="hoja-titulo">
              <h1>Plan nutricional</h1>
              <p>Emitido el {fechaLarga(fechaHoy())}</p>
            </div>
          </header>

          {!conComidas ? (
            <p className="hoja-vacio">
              Este paciente aún no tiene comidas asignadas. Arma el plan semanal en «Editar plan» para poder imprimirlo.
            </p>
          ) : null}

          {/* ---------- Datos del paciente ---------- */}
          <section className="hoja-seccion">
            <h2>Datos del paciente</h2>
            <dl className="hoja-datos">
              <div>
                <dt>Paciente</dt>
                <dd>{nombrePaciente(paciente)}</dd>
              </div>
              {paciente.DNI ? (
                <div>
                  <dt>DNI</dt>
                  <dd>{paciente.DNI}</dd>
                </div>
              ) : null}
              {edad != null ? (
                <div>
                  <dt>Edad</dt>
                  <dd>{edad} años</dd>
                </div>
              ) : null}
              {paciente.sexo ? (
                <div>
                  <dt>Sexo</dt>
                  <dd>{paciente.sexo}</dd>
                </div>
              ) : null}
              {paciente['Peso actual'] ? (
                <div>
                  <dt>Peso</dt>
                  <dd>{paciente['Peso actual']} kg</dd>
                </div>
              ) : null}
              {paciente.Altura ? (
                <div>
                  <dt>Talla</dt>
                  <dd>{paciente.Altura} m</dd>
                </div>
              ) : null}
              {imc != null ? (
                <div>
                  <dt>IMC</dt>
                  <dd>
                    {imc.toFixed(1)} ({categoriaIMC(imc)})
                  </dd>
                </div>
              ) : null}
              {paciente.Diagnostico ? (
                <div className="hoja-datos-ancho">
                  <dt>Diagnóstico nutricional</dt>
                  <dd>{paciente.Diagnostico}</dd>
                </div>
              ) : null}
            </dl>

            {datos?.alergias ? (
              <p className="hoja-alerta">Alergias registradas: {datos.alergias}</p>
            ) : null}
          </section>

          {/* ---------- Objetivo ---------- */}
          {tieneObjetivo ? (
            <section className="hoja-seccion">
              <h2>Objetivo</h2>
              <dl className="hoja-datos">
                {plan.objetivo ? (
                  <div>
                    <dt>Objetivo</dt>
                    <dd>{plan.objetivo}</dd>
                  </div>
                ) : null}
                {plan.peso_objetivo ? (
                  <div>
                    <dt>Peso objetivo</dt>
                    <dd>{plan.peso_objetivo} kg</dd>
                  </div>
                ) : null}
                {plan.fecha_objetivo ? (
                  <div>
                    <dt>Fecha objetivo</dt>
                    <dd>{fechaLarga(plan.fecha_objetivo)}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {/* ---------- Meta energética y macronutrientes ---------- */}
          {meta || tieneMacros ? (
            <section className="hoja-seccion">
              <h2>Tu meta diaria</h2>
              <div className="hoja-metricas">
                {meta ? (
                  <div className="hoja-metrica">
                    <strong>{meta}</strong>
                    <span>kcal al día</span>
                  </div>
                ) : null}
                {macros.map(([etiqueta, clave, porcentaje]) => (
                  <div key={clave} className="hoja-metrica">
                    <strong>{meta ? `${redondear(gramosDeMacro(meta, porcentaje, clave))} g` : `${porcentaje} %`}</strong>
                    <span>
                      {etiqueta}
                      {meta ? ` (${porcentaje} %)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* ---------- Plan semanal ---------- */}
          {conComidas ? (
            <section className="hoja-seccion hoja-seccion-tabla">
              <h2>Plan semanal</h2>
              <table className="hoja-tabla">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Desayuno</th>
                    <th>Almuerzo</th>
                    <th>Cena</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {semana.map((dia) => (
                    <tr key={dia.nombre}>
                      <th scope="row">{dia.nombre}</th>
                      {dia.comidas.map((comida) => (
                        <td key={comida.tipo}>
                          {comida.vacia ? (
                            <span className="hoja-nada">—</span>
                          ) : (
                            <>
                              <strong>{comida.nombre}</strong>
                              <small>
                                {[
                                  textoPorcion(comida.porcion) ? `${textoPorcion(comida.porcion)} porción` : '',
                                  comida.kcal != null ? `${comida.kcal} kcal${comida.incompleto ? '*' : ''}` : '',
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </small>
                            </>
                          )}
                        </td>
                      ))}
                      <td className="hoja-total">
                        {dia.total.comidas > 0 ? (
                          <>
                            <strong>
                              {redondear(dia.total.kcal)} kcal{dia.total.incompleto ? '*' : ''}
                            </strong>
                            {dia.total.comidas < 3 ? <small>{dia.total.comidas}/3 comidas</small> : null}
                          </>
                        ) : (
                          <span className="hoja-nada">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {promedio ? (
                <p className="hoja-nota">
                  Promedio de los días completos: <strong>{redondear(promedio.kcal)} kcal</strong> · Proteínas{' '}
                  {redondear(promedio.proteinas)} g · Carbohidratos {redondear(promedio.carbohidratos)} g · Grasas{' '}
                  {redondear(promedio.grasa)} g · Fibra {redondear(promedio.fibra)} g
                </p>
              ) : null}
              <p className="hoja-nota">
                Valores estimados con la Tabla Peruana de Composición de Alimentos (INS/CENAN). El asterisco (*)
                indica que a una preparación le falta algún dato nutricional.
              </p>
            </section>
          ) : null}

          {/* ---------- Recomendaciones y próximo control ---------- */}
          {plan?.recomendaciones || datos?.proximoControl ? (
            <section className="hoja-seccion">
              <h2>Recomendaciones</h2>
              {plan?.recomendaciones ? <p className="hoja-texto">{plan.recomendaciones}</p> : null}
              {datos?.proximoControl ? (
                <p className="hoja-control">Próximo control: {fechaLarga(datos.proximoControl)}</p>
              ) : null}
            </section>
          ) : null}

          {/* ---------- Preparaciones e ingredientes ---------- */}
          {recetas.length > 0 ? (
            <section className="hoja-seccion hoja-prep">
              <h2>Preparaciones e ingredientes</h2>
              {recetas.map((receta) => (
                <article key={receta.id} className="hoja-receta">
                  <h3>
                    {receta.nombre} <span className="hoja-etiqueta">{receta.tipo}</span>
                  </h3>
                  {receta.ingredientes.length > 0 ? (
                    <>
                      <p className="hoja-subtitulo">
                        Ingredientes{textoPorcion(receta.porcion) ? ` para ${textoPorcion(receta.porcion)} porción` : ''}
                      </p>
                      <ul className="hoja-ingredientes">
                        {receta.ingredientes.map((ingrediente) => (
                          <li key={`${ingrediente.nombre}-${ingrediente.unidad}`}>
                            {ingrediente.nombre}: {textoCantidad(ingrediente)}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {receta.preparacion ? (
                    <>
                      <p className="hoja-subtitulo">Preparación</p>
                      <p className="hoja-texto">{receta.preparacion}</p>
                    </>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}

          <footer className="hoja-pie">
            <p>
              Este plan es personal y fue elaborado para {nombrePaciente(paciente)}. No reemplaza la consulta con tu
              nutricionista: ante cualquier duda o molestia, consúltale.
            </p>
            <div className="hoja-firma">
              {nombreProfesional ? <strong>{nombreProfesional}</strong> : null}
              <span>Nutricionista</span>
            </div>
          </footer>
        </article>
      ) : null}
    </div>,
    document.body,
  )
}

export default PlanImprimible