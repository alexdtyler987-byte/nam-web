import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ANCHO = 640
const ALTO = 260
const M = { izq: 48, der: 20, arr: 16, aba: 38 }

const BANDAS = [
  { desde: 0, hasta: 18.5, color: '#D9F1FC', nombre: 'Bajo peso' },
  { desde: 18.5, hasta: 25, color: '#E3F6D0', nombre: 'Normal' },
  { desde: 25, hasta: 30, color: '#FFF3C4', nombre: 'Sobrepeso' },
  { desde: 30, hasta: 100, color: '#FDE0D6', nombre: 'Obesidad' },
]

function aMs(fecha) {
  return new Date(`${fecha}T00:00:00`).getTime()
}

function formatoDia(fecha) {
  return String(fecha).split('-').reverse().join('/')
}

function aNumero(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function EvolucionPeso({ paciente, version }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [metrica, setMetrica] = useState('peso')

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError('')

      const { data, error: consultaError } = await supabase
        .from('HISTORIAL-MEDIDAS')
        .select('*')
        .eq('paciente_id', paciente.id)
        .order('fecha', { ascending: true })

      if (cancelado) return

      if (consultaError) {
        setError('No se pudo cargar el historial: ' + consultaError.message)
        setCargando(false)
        return
      }

      setRegistros(data ?? [])
      setCargando(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [paciente.id, version])

  const esPeso = metrica === 'peso'
  const unidad = esPeso ? 'kg' : ''

  const puntos = registros
    .map((r) => ({
      fecha: r.fecha,
      x: aMs(r.fecha),
      y: Number(esPeso ? r.peso : r.imc),
    }))
    .filter((p) => Number.isFinite(p.y) && p.y > 0)

  const ideal = esPeso ? aNumero(paciente['Peso ideal']) : null

  let grafica = null

  if (puntos.length > 0) {
    const valores = puntos.map((p) => p.y)
    if (ideal) valores.push(ideal)

    const min = Math.min(...valores)
    const max = Math.max(...valores)
    const rango = max - min || Math.max(1, max * 0.05)
    const yMin = min - rango * 0.2
    const yMax = max + rango * 0.2
    const xMin = puntos[0].x
    const xMax = puntos[puntos.length - 1].x
    const anchoUtil = ANCHO - M.izq - M.der
    const altoUtil = ALTO - M.arr - M.aba

    const xEsc = (x) =>
      xMax === xMin ? M.izq + anchoUtil / 2 : M.izq + ((x - xMin) / (xMax - xMin)) * anchoUtil
    const yEsc = (y) => M.arr + (1 - (y - yMin) / (yMax - yMin)) * altoUtil

    const marcas = [0, 1, 2, 3].map((i) => yMin + ((yMax - yMin) * i) / 3)
    const trazo = puntos
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xEsc(p.x)} ${yEsc(p.y)}`)
      .join(' ')

    grafica = (
      <svg
        className="evo-grafica"
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label={`Gráfica de ${esPeso ? 'peso' : 'IMC'} con ${puntos.length} registro(s)`}
      >
        {!esPeso
          ? BANDAS.map((b) => {
              const techo = Math.min(b.hasta, yMax)
              const piso = Math.max(b.desde, yMin)
              if (techo <= piso) return null
              return (
                <rect
                  key={b.nombre}
                  x={M.izq}
                  y={yEsc(techo)}
                  width={anchoUtil}
                  height={yEsc(piso) - yEsc(techo)}
                  fill={b.color}
                />
              )
            })
          : null}

        {marcas.map((v) => (
          <g key={v}>
            <line x1={M.izq} x2={ANCHO - M.der} y1={yEsc(v)} y2={yEsc(v)} stroke="#E7E3D8" strokeWidth="1" />
            <text className="evo-eje" x={M.izq - 8} y={yEsc(v) + 4} textAnchor="end">
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {ideal ? (
          <line className="evo-ideal" x1={M.izq} x2={ANCHO - M.der} y1={yEsc(ideal)} y2={yEsc(ideal)} />
        ) : null}

        <path key={metrica} className="evo-linea" pathLength="1" d={trazo} />

        {puntos.map((p) => (
          <circle key={p.fecha} className="evo-punto" cx={xEsc(p.x)} cy={yEsc(p.y)} r="5">
            <title>{`${formatoDia(p.fecha)}: ${p.y.toFixed(1)} ${unidad}`}</title>
          </circle>
        ))}

        <text
          className="evo-eje"
          x={xEsc(xMin)}
          y={ALTO - 10}
          textAnchor={xMax === xMin ? 'middle' : 'start'}
        >
          {formatoDia(puntos[0].fecha)}
        </text>
        {xMax !== xMin ? (
          <text className="evo-eje" x={xEsc(xMax)} y={ALTO - 10} textAnchor="end">
            {formatoDia(puntos[puntos.length - 1].fecha)}
          </text>
        ) : null}
      </svg>
    )
  }

  const primero = puntos[0]
  const ultimo = puntos[puntos.length - 1]
  const cambio = puntos.length > 1 ? ultimo.y - primero.y : null
  const recientes = [...registros].reverse().slice(0, 8)

  function mostrar(valor, decimales = 1) {
    return valor == null ? '—' : Number(valor).toFixed(decimales)
  }

  return (
    <section className="tarjeta">
      <div className="evo-cabecera">
        <h2>Evolución</h2>
        <div className="evo-tabs" role="group" aria-label="Métrica de la gráfica">
          <button
            type="button"
            className={esPeso ? 'evo-tab evo-tab-activo' : 'evo-tab'}
            aria-pressed={esPeso}
            onClick={() => setMetrica('peso')}
          >
            Peso
          </button>
          <button
            type="button"
            className={!esPeso ? 'evo-tab evo-tab-activo' : 'evo-tab'}
            aria-pressed={!esPeso}
            onClick={() => setMetrica('imc')}
          >
            IMC
          </button>
        </div>
      </div>

      {cargando ? <div className="esqueleto esq-tira" aria-label="Cargando evolución" /> : null}
      {error ? <p className="registro-error" role="alert">{error}</p> : null}

      {!cargando && !error && registros.length === 0 ? (
        <p className="estado">
          Aún no hay registros. Se crea uno cada vez que guardas peso y talla en "Actualizar datos".
        </p>
      ) : null}

      {!cargando && !error && puntos.length > 0 ? (
        <>
          <div className="evo-resumen">
            <div className="medida">
              <span>Inicial · {formatoDia(primero.fecha)}</span>
              <strong>{primero.y.toFixed(1)} {unidad}</strong>
            </div>
            <div className="medida">
              <span>Actual · {formatoDia(ultimo.fecha)}</span>
              <strong>{ultimo.y.toFixed(1)} {unidad}</strong>
            </div>
            <div className="medida">
              <span>Cambio</span>
              <strong>
                {cambio == null ? '—' : `${cambio > 0 ? '+' : ''}${cambio.toFixed(1)} ${unidad}`}
              </strong>
            </div>
          </div>

          {grafica}

          <div className="evo-leyenda">
            {!esPeso
              ? BANDAS.map((b) => (
                  <span key={b.nombre}>
                    <i style={{ background: b.color }} /> {b.nombre}
                  </span>
                ))
              : null}
            {ideal ? (
              <span>
                <i className="evo-leyenda-ideal" /> Peso ideal: {ideal} kg
              </span>
            ) : null}
          </div>

          {puntos.length < 2 ? (
            <p className="estado">
              Con un solo registro aún no hay evolución. Se irá armando con cada actualización.
            </p>
          ) : null}

          <div className="tabla-wrap" style={{ marginTop: '14px' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Peso (kg)</th>
                  <th>IMC</th>
                  <th>Cintura (cm)</th>
                  <th>Cadera (cm)</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td>{formatoDia(r.fecha)}</td>
                    <td>{mostrar(r.peso)}</td>
                    <td>{mostrar(r.imc)}</td>
                    <td>{mostrar(r.cintura)}</td>
                    <td>{mostrar(r.cadera)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  )
}

export default EvolucionPeso