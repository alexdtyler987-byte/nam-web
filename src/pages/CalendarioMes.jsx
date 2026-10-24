import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { capitalizar, diaLima, fechaHoy, horaLima } from './utilidades'

const ETIQUETAS_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const TIPOS = ['desayuno', 'almuerzo', 'cena']

function dos(n) {
  return String(n).padStart(2, '0')
}

function clave(anio, mes, dia) {
  return `${anio}-${dos(mes + 1)}-${dos(dia)}`
}

function diaSemana(anio, mes, dia) {
  return ((new Date(Date.UTC(anio, mes, dia)).getUTCDay() + 6) % 7) + 1
}

function diasEnMes(anio, mes) {
  return new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
}

function inicioMes(anio, mes) {
  const d = new Date(Date.UTC(anio, mes, 1))
  return `${clave(d.getUTCFullYear(), d.getUTCMonth(), 1)}T00:00:00-05:00`
}

function CalendarioMes({ paciente, refresco, versionPlan }) {
  const hoy = fechaHoy()
  const [anio, setAnio] = useState(Number(hoy.slice(0, 4)))
  const [mes, setMes] = useState(Number(hoy.slice(5, 7)) - 1)
  const [plan, setPlan] = useState([])
  const [nombres, setNombres] = useState({})
  const [completadas, setCompletadas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [elegido, setElegido] = useState(null)

  useEffect(() => {
    setElegido(null)
  }, [paciente.id])

  useEffect(() => {
    let cancelado = false

    async function cargarPlan() {
      const [dieta, comidas] = await Promise.all([
        supabase
          .from('DIETA-PACIENTE')
          .select('dia_semana, tipo_comida, comida_id')
          .eq('paciente_id', paciente.id),
        supabase.from('COMIDAS').select('id, nombre'),
      ])

      if (cancelado) return

      const fallo = dieta.error || comidas.error
      if (fallo) {
        setError('No se pudo cargar el plan: ' + fallo.message)
        return
      }

      const mapa = {}
      ;(comidas.data ?? []).forEach((c) => {
        mapa[c.id] = c.nombre
      })
      setNombres(mapa)
      setPlan(dieta.data ?? [])
    }

    cargarPlan()

    return () => {
      cancelado = true
    }
  }, [paciente.id, versionPlan])

  useEffect(() => {
    let cancelado = false

    async function cargarMes() {
      setCargando(true)
      setError('')

      const { data, error: consultaError } = await supabase
        .from('PROGRESO-COMIDAS')
        .select('tipo_comida, hora_completado')
        .eq('paciente_id', paciente.id)
        .eq('completado', true)
        .gte('hora_completado', inicioMes(anio, mes))
        .lt('hora_completado', inicioMes(anio, mes + 1))

      if (cancelado) return

      if (consultaError) {
        setError('No se pudo cargar el progreso: ' + consultaError.message)
        setCargando(false)
        return
      }

      setCompletadas(data ?? [])
      setCargando(false)
    }

    cargarMes()

    return () => {
      cancelado = true
    }
  }, [paciente.id, anio, mes, refresco])

  const mapaPlan = {}
  plan.forEach((f) => {
    if (!mapaPlan[f.dia_semana]) mapaPlan[f.dia_semana] = {}
    mapaPlan[f.dia_semana][String(f.tipo_comida).toLowerCase()] = f.comida_id
  })

  const porDia = {}
  completadas.forEach((c) => {
    const dia = diaLima(c.hora_completado)
    if (!dia) return
    if (!porDia[dia]) porDia[dia] = {}
    porDia[dia][String(c.tipo_comida).toLowerCase()] = c.hora_completado
  })

  function evaluar(dia) {
    const k = clave(anio, mes, dia)
    const semana = diaSemana(anio, mes, dia)
    const previstas = Object.keys(mapaPlan[semana] || {})
    const hechas = previstas.filter((t) => porDia[k] && porDia[k][t]).length

    let estado
    if (k > hoy) estado = 'futuro'
    else if (paciente.fecha_alta && k < paciente.fecha_alta) estado = 'previo'
    else if (previstas.length === 0) estado = 'sinplan'
    else if (k === hoy) estado = 'hoy'
    else if (hechas === 0) estado = 'rojo'
    else if (hechas >= previstas.length) estado = 'verde'
    else estado = 'amarillo'

    return { k, semana, previstas, hechas, estado }
  }

  const total = diasEnMes(anio, mes)
  const desplazamiento = diaSemana(anio, mes, 1) - 1
  const dias = Array.from({ length: total }, (_, i) => ({ dia: i + 1, ...evaluar(i + 1) }))

  const resumen = { verde: 0, amarillo: 0, rojo: 0, previstas: 0, hechas: 0 }
  dias.forEach((d) => {
    if (d.estado === 'verde' || d.estado === 'amarillo' || d.estado === 'rojo') {
      resumen[d.estado] += 1
      resumen.previstas += d.previstas.length
      resumen.hechas += Math.min(d.hechas, d.previstas.length)
    }
  })
  const porcentaje =
    resumen.previstas > 0 ? Math.round((resumen.hechas / resumen.previstas) * 100) : null

  const tituloMes = capitalizar(
    new Date(Date.UTC(anio, mes, 1)).toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  )

  const esMesActual = clave(anio, mes, 1).slice(0, 7) === hoy.slice(0, 7)

  function mover(delta) {
    const d = new Date(Date.UTC(anio, mes + delta, 1))
    setAnio(d.getUTCFullYear())
    setMes(d.getUTCMonth())
    setElegido(null)
  }

  function textoCelda(d) {
    if (d.estado === 'sinplan') return '—'
    if (['verde', 'amarillo', 'rojo', 'hoy'].includes(d.estado)) {
      return `${d.hechas}/${d.previstas.length}`
    }
    return ''
  }

  function descripcion(d) {
    const nombreDia = `${d.dia} de ${tituloMes.split(' ')[0].toLowerCase()}`
    if (d.estado === 'futuro') return `${nombreDia}: aún no ocurre`
    if (d.estado === 'previo') return `${nombreDia}: anterior al alta del paciente`
    if (d.estado === 'sinplan') return `${nombreDia}: sin comidas asignadas`
    if (d.estado === 'hoy') return `${nombreDia}: en curso, ${d.hechas} de ${d.previstas.length} comidas confirmadas`
    return `${nombreDia}: ${d.hechas} de ${d.previstas.length} comidas confirmadas`
  }

  const detalle = elegido ? dias.find((d) => d.dia === elegido) : null
  const tiposDetalle = detalle
    ? TIPOS.filter((t) => detalle.previstas.includes(t) || (porDia[detalle.k] && porDia[detalle.k][t]))
    : []

  return (
    <section className="tarjeta">
      <div className="cal-cabecera">
        <h2>Cumplimiento del mes</h2>
        <div className="cal-nav">
          <button type="button" className="btn-secundario" onClick={() => mover(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <strong>{tituloMes}</strong>
          <button
            type="button"
            className="btn-secundario"
            onClick={() => mover(1)}
            disabled={esMesActual}
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {error ? <p className="registro-error" role="alert">{error}</p> : null}

      <div className="cal-resumen">
        <div className="medida">
          <span>Días completos</span>
          <strong>{resumen.verde}</strong>
        </div>
        <div className="medida">
          <span>Días parciales</span>
          <strong>{resumen.amarillo}</strong>
        </div>
        <div className="medida">
          <span>Días sin registro</span>
          <strong>{resumen.rojo}</strong>
        </div>
        <div className="medida medida-imc">
          <span>Cumplimiento</span>
          <strong>{porcentaje == null ? '—' : `${porcentaje}%`}</strong>
        </div>
      </div>

      {cargando ? (
        <div className="esqueleto esq-tira" aria-label="Cargando calendario" />
      ) : (
        <div className="cal-grid">
          {ETIQUETAS_DIA.map((n) => (
            <div key={n} className="cal-semana">{n}</div>
          ))}

          {Array.from({ length: desplazamiento }, (_, i) => (
            <div key={`v${i}`} />
          ))}

          {dias.map((d) => (
            <button
              key={d.dia}
              type="button"
              className={`cal-dia cal-${d.estado}${elegido === d.dia ? ' cal-elegido' : ''}`}
              onClick={() => setElegido(d.dia)}
              disabled={d.estado === 'futuro'}
              aria-label={descripcion(d)}
              aria-pressed={elegido === d.dia}
            >
              <span className="cal-num">{d.dia}</span>
              <span className="cal-cuenta">{textoCelda(d)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="cal-leyenda">
        <span><i className="cal-verde" /> Completo (3/3)</span>
        <span><i className="cal-amarillo" /> Parcial (1/3, 2/3)</span>
        <span><i className="cal-rojo" /> Sin registro (0/3)</span>
        <span><i className="cal-futuro" /> Sin datos</span>
      </div>
      <p className="actualizacion">
        Solo cuenta lo que el paciente confirma en la app: un día sin registro no significa que no haya comido.
      </p>

      {detalle ? (
        <div className="cal-detalle">
          <h3>
            {detalle.dia} de {tituloMes.split(' ')[0].toLowerCase()}
          </h3>

          {detalle.estado === 'previo' ? (
            <p className="estado">Este día es anterior al alta del paciente.</p>
          ) : null}

          {detalle.estado !== 'previo' && tiposDetalle.length === 0 ? (
            <p className="estado">No hay comidas asignadas este día.</p>
          ) : null}

          <ul>
            {tiposDetalle.map((t) => {
              const hora = porDia[detalle.k] && porDia[detalle.k][t]
              const idComida = mapaPlan[detalle.semana] && mapaPlan[detalle.semana][t]
              let estadoTexto = 'Sin registro'
              if (hora) estadoTexto = `Confirmada · ${horaLima(hora)}`
              else if (detalle.estado === 'hoy') estadoTexto = 'Pendiente'

              return (
                <li key={t}>
                  <strong>{capitalizar(t)}</strong>
                  <span>{idComida ? nombres[idComida] || 'Comida' : 'No estaba en el plan'}</span>
                  <em className={hora ? 'cal-ok' : 'cal-no'}>{estadoTexto}</em>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

export default CalendarioMes